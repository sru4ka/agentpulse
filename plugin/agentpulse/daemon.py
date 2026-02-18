import os
import glob
import time
import logging
from datetime import datetime

from .config import load_config
from .parser import parse_openclaw_line, estimate_cost
from .sender import EventSender

logger = logging.getLogger("agentpulse")


class AgentPulseDaemon:
    def __init__(self, config_path: str = None):
        self.config = load_config(config_path) if config_path else load_config()
        self.sender = EventSender(
            api_key=self.config["api_key"],
            endpoint=self.config["endpoint"],
            agent_name=self.config["agent_name"],
            framework=self.config["framework"],
        )
        self.running = False
        self.file_positions: dict[str, int] = {}

        # Per-run state: collect tool calls, model info between prompt_end events
        # { run_id: { "tools": set(), "errors": [], "model": str, "provider": str } }
        self._runs: dict[str, dict] = {}

        # Default model for cost estimation (OpenClaw uses MiniMax by default)
        self._default_model = self.config.get("model", "MiniMax-M2.5")

        # Proxy server (started if enabled in config)
        self._proxy = None

    def get_latest_log_file(self) -> str | None:
        log_path = self.config["log_path"]
        today = datetime.now().strftime("%Y-%m-%d")

        today_file = os.path.join(log_path, f"openclaw-{today}.log")
        if os.path.exists(today_file):
            return today_file

        # Fall back to most recent log file
        pattern = os.path.join(log_path, "openclaw-*.log")
        files = sorted(glob.glob(pattern), reverse=True)
        return files[0] if files else None

    def tail_file(self, filepath: str) -> list[str]:
        """Read new lines from file since last position."""
        if filepath not in self.file_positions:
            # Start from end of file for existing files (don't re-parse old data)
            try:
                self.file_positions[filepath] = os.path.getsize(filepath)
                logger.info(f"New file discovered, watching from end: {filepath}")
            except OSError:
                self.file_positions[filepath] = 0
                logger.info(f"New file discovered, reading from start: {filepath}")

        try:
            with open(filepath, "r") as f:
                f.seek(self.file_positions[filepath])
                new_lines = f.readlines()
                self.file_positions[filepath] = f.tell()
                return new_lines
        except Exception as e:
            logger.error(f"Error reading {filepath}: {e}")
            return []

    def _get_run(self, run_id: str) -> dict:
        """Get or create per-run tracking state."""
        if run_id not in self._runs:
            self._runs[run_id] = {
                "tools": set(),
                "errors": [],
                "model": None,
                "provider": None,
            }
        return self._runs[run_id]

    def _try_get_proxy_capture(self, retries=4, delay=0.3):
        """Try to get the most recent unclaimed proxy capture.

        Retries with a short delay to handle the race condition where
        the log line arrives before the proxy finishes capturing the response.
        """
        if not self._proxy:
            return None
        for attempt in range(retries):
            cap = self._proxy.get_latest_capture()
            if cap:
                return cap
            if attempt < retries - 1:
                time.sleep(delay)
        return None

    def process_lines(self, lines: list[str]):
        """Parse OpenClaw JSON log lines and emit events."""
        for raw_line in lines:
            parsed = parse_openclaw_line(raw_line)
            if not parsed:
                continue

            event_type = parsed["type"]

            # ── "run_start" = new LLM run, captures model/provider ──
            if event_type == "run_start":
                run = self._get_run(parsed["run_id"])
                run["model"] = parsed["model"]
                run["provider"] = parsed["provider"]
                continue

            # ── Collect tool calls per run ──
            if event_type == "tool_start":
                run = self._get_run(parsed["run_id"])
                tool = parsed["tool"]
                if tool != "message":  # skip message tool (just TG output)
                    run["tools"].add(tool)
                continue

            if event_type == "tool_end":
                continue  # nothing extra needed

            # ── Collect tool errors ──
            if event_type == "tool_error":
                # Attach to the most recent run if we can
                if self._runs:
                    last_run = list(self._runs.values())[-1]
                    last_run["errors"].append(f"{parsed['tool']}: {parsed['error']}")
                continue

            # ── "prompt_end" = one LLM call completed ──
            if event_type == "prompt_end":
                run_id = parsed["run_id"]
                run = self._get_run(run_id)
                duration_ms = parsed["duration_ms"]

                # Use real model/provider from run_start, fall back to defaults
                model = run.get("model") or self._default_model
                provider = run.get("provider") or (
                    model.split("/")[0] if "/" in model else "minimax"
                )

                # Check proxy for captured prompt/response data
                capture = self._try_get_proxy_capture()

                if capture:
                    # Exact data from proxy
                    input_tokens = capture["input_tokens"]
                    output_tokens = capture["output_tokens"]
                    prompt_messages = capture["prompt_messages"]
                    response_text = capture["response_text"]
                    # Prefer proxy model if available
                    if capture.get("model"):
                        model = capture["model"]
                else:
                    # Estimate tokens from duration (rough heuristic)
                    output_tokens = max(50, int(duration_ms / 1000 * 50))
                    input_tokens = max(100, output_tokens * 2)
                    prompt_messages = []
                    response_text = None

                cost = estimate_cost(model, input_tokens, output_tokens)

                tools_list = sorted(run["tools"]) if run["tools"] else []
                error_msg = "; ".join(run["errors"]) if run["errors"] else None

                source = "proxy" if capture else "estimated"

                event = {
                    "timestamp": parsed["timestamp"],
                    "provider": provider,
                    "model": model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": round(cost, 6),
                    "latency_ms": duration_ms,
                    "status": "error" if error_msg else "success",
                    "error_message": error_msg,
                    "task_context": f"session:{parsed.get('session_id', 'unknown')}",
                    "tools_used": tools_list,
                    "prompt_messages": prompt_messages,
                    "response_text": response_text,
                }

                self.sender.add_event(event)
                logger.info(
                    f"LLM call: {provider}/{model} {duration_ms}ms "
                    f"{input_tokens}in/{output_tokens}out "
                    f"${cost:.4f} tools={tools_list} [{source}]"
                )

                # Reset tools for the next prompt within this run
                run["tools"] = set()
                run["errors"] = []
                continue

            # ── "run_done" = entire agent run finished ──
            if event_type == "run_done":
                run_id = parsed["run_id"]
                # Clean up run state
                self._runs.pop(run_id, None)
                continue

            # ── Usage data (if gateway ever logs it) ──
            if event_type == "usage":
                # Exact token data — emit directly
                input_t = parsed.get("input_tokens", 0)
                output_t = parsed.get("output_tokens", 0)
                model = parsed.get("model", self._default_model)
                cost = estimate_cost(model, input_t, output_t)

                event = {
                    "timestamp": parsed["timestamp"],
                    "provider": model.split("/")[0] if "/" in model else "minimax",
                    "model": model.split("/")[-1] if "/" in model else model,
                    "input_tokens": input_t,
                    "output_tokens": output_t,
                    "cost_usd": round(cost, 6),
                    "latency_ms": None,
                    "status": "success",
                    "error_message": None,
                    "task_context": None,
                    "tools_used": [],
                    "prompt_messages": [],
                    "response_text": None,
                }

                self.sender.add_event(event)
                logger.info(f"Exact usage: {model} {input_t}in/{output_t}out ${cost:.4f}")
                continue

            # ── Errors ──
            if event_type == "error":
                event = {
                    "timestamp": parsed["timestamp"],
                    "provider": "openclaw",
                    "model": self._default_model,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cost_usd": 0,
                    "latency_ms": None,
                    "status": "error",
                    "error_message": parsed.get("message", "Unknown error"),
                    "task_context": None,
                    "tools_used": [],
                    "prompt_messages": [],
                    "response_text": None,
                }

                self.sender.add_event(event)
                logger.info(f"Error event: {parsed.get('message', '')[:80]}")
                continue

    def _start_proxy(self):
        """Start the LLM proxy if enabled in config."""
        if not self.config.get("proxy_enabled"):
            return

        try:
            from .proxy import LLMProxyServer
            port = self.config.get("proxy_port", 8787)
            self._proxy = LLMProxyServer(port=port)
            self._proxy.start()
        except Exception as e:
            logger.error(f"Failed to start proxy: {e}")

    def _stop_proxy(self):
        """Stop the LLM proxy if running."""
        if self._proxy:
            self._proxy.stop()
            self._proxy = None

    def run(self):
        """Main daemon loop."""
        if not self.config.get("api_key"):
            logger.error("No API key configured. Run 'agentpulse init' first.")
            return

        self.running = True
        poll_interval = self.config.get("poll_interval", 5)
        batch_interval = self.config.get("batch_interval", 30)

        logger.info(f"AgentPulse daemon started")
        logger.info(f"Watching: {self.config['log_path']}")
        logger.info(f"Agent: {self.config['agent_name']} ({self.config['framework']})")
        logger.info(f"Default model: {self._default_model}")
        logger.info(f"Endpoint: {self.config['endpoint']}")
        logger.info(f"Poll interval: {poll_interval}s, Batch interval: {batch_interval}s")

        # Start proxy if enabled
        self._start_proxy()

        while self.running:
            try:
                log_file = self.get_latest_log_file()
                if log_file:
                    new_lines = self.tail_file(log_file)
                    if new_lines:
                        self.process_lines(new_lines)

                if self.sender.should_flush(batch_interval):
                    self.sender.flush()

                time.sleep(poll_interval)

            except KeyboardInterrupt:
                logger.info("Shutting down...")
                self.running = False
                self._stop_proxy()
                self.sender.flush()
                break
            except Exception as e:
                logger.error(f"Daemon error: {e}", exc_info=True)
                time.sleep(poll_interval)

    def stop(self):
        self.running = False
        self._stop_proxy()
        self.sender.flush()
