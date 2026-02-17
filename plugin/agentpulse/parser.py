import re
import json
import logging
from typing import Optional

logger = logging.getLogger("agentpulse.parser")

# ─── Model pricing per million tokens (USD) ───
MODEL_PRICING = {
    # MiniMax
    "minimax/MiniMax-M2.5": {"input": 15, "output": 120},
    "MiniMax-M2.5": {"input": 15, "output": 120},
    "minimax-m1": {"input": 5, "output": 40},
    "MiniMax-Text-02": {"input": 1, "output": 5},
    "abab6.5s-chat": {"input": 1, "output": 5},
    "abab6.5-chat": {"input": 5, "output": 25},
    # Anthropic
    "claude-opus-4": {"input": 15, "output": 75},
    "claude-opus-4-6": {"input": 15, "output": 75},
    "claude-sonnet-4-5": {"input": 3, "output": 15},
    "claude-sonnet-4": {"input": 3, "output": 15},
    "claude-haiku-4": {"input": 0.80, "output": 4},
    "claude-haiku-3.5": {"input": 0.80, "output": 4},
    "claude-3.5-sonnet": {"input": 3, "output": 15},
    "claude-3-opus": {"input": 15, "output": 75},
    "claude-3-sonnet": {"input": 3, "output": 15},
    "claude-3-haiku": {"input": 0.25, "output": 1.25},
    # OpenAI
    "gpt-4o": {"input": 2.50, "output": 10},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10, "output": 30},
    "gpt-4": {"input": 30, "output": 60},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "o3": {"input": 10, "output": 40},
    "o3-mini": {"input": 1.10, "output": 4.40},
    "o1": {"input": 15, "output": 60},
    "o1-mini": {"input": 3, "output": 12},
    "o1-preview": {"input": 15, "output": 60},
    # Google
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-2.0-pro": {"input": 1.25, "output": 10},
    "gemini-1.5-pro": {"input": 1.25, "output": 5},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.0-pro": {"input": 0.50, "output": 1.50},
    # Mistral
    "mistral-large-latest": {"input": 2, "output": 6},
    "mistral-large": {"input": 2, "output": 6},
    "mistral-medium": {"input": 2.70, "output": 8.10},
    "mistral-small-latest": {"input": 0.20, "output": 0.60},
    "mistral-small": {"input": 0.20, "output": 0.60},
    "codestral-latest": {"input": 0.30, "output": 0.90},
    "codestral": {"input": 0.30, "output": 0.90},
    "open-mixtral-8x22b": {"input": 2, "output": 6},
    "open-mixtral-8x7b": {"input": 0.70, "output": 0.70},
    # Cohere
    "command-r-plus": {"input": 2.50, "output": 10},
    "command-r": {"input": 0.15, "output": 0.60},
    "command-r-plus-08-2024": {"input": 2.50, "output": 10},
    # Meta / Llama
    "llama-3.3-70b": {"input": 0.79, "output": 0.79},
    "llama-3.1-405b": {"input": 3, "output": 3},
    "llama-3.1-70b": {"input": 0.79, "output": 0.79},
    "llama-3.1-8b": {"input": 0.05, "output": 0.05},
    "llama-3-70b": {"input": 0.79, "output": 0.79},
    "llama-3-8b": {"input": 0.05, "output": 0.05},
    # DeepSeek
    "deepseek-chat": {"input": 0.14, "output": 0.28},
    "deepseek-coder": {"input": 0.14, "output": 0.28},
    "deepseek-r1": {"input": 0.55, "output": 2.19},
    "deepseek-v3": {"input": 0.27, "output": 1.10},
    # xAI / Grok
    "grok-2": {"input": 2, "output": 10},
    "grok-3": {"input": 3, "output": 15},
    "grok-3-mini": {"input": 0.30, "output": 0.50},
    # Amazon
    "amazon.nova-pro": {"input": 0.80, "output": 3.20},
    "amazon.nova-lite": {"input": 0.06, "output": 0.24},
    "amazon.nova-micro": {"input": 0.035, "output": 0.14},
    # Perplexity
    "sonar-pro": {"input": 3, "output": 15},
    "sonar": {"input": 1, "output": 1},
}

_PROVIDER_PREFIXES = [
    "anthropic/", "openai/", "google/", "mistral/", "cohere/",
    "meta/", "deepseek/", "xai/", "minimax/", "amazon/",
    "together/", "groq/", "fireworks/", "perplexity/", "anyscale/",
]

# ─── Regex patterns for extracting data from OpenClaw message strings ───
# "embedded run prompt end: runId=xxx sessionId=xxx durationMs=121466"
PROMPT_END_RE = re.compile(
    r'embedded run prompt end:.*?runId=(\S+).*?sessionId=(\S+).*?durationMs=(\d+)'
)
# "embedded run done: runId=xxx sessionId=xxx durationMs=121751 aborted=false"
RUN_DONE_RE = re.compile(
    r'embedded run done:.*?runId=(\S+).*?sessionId=(\S+).*?durationMs=(\d+)(?:.*?aborted=(\w+))?'
)
# "embedded run tool start: runId=xxx tool=exec toolCallId=xxx"
TOOL_START_RE = re.compile(
    r'embedded run tool start:.*?runId=(\S+)\s+tool=(\S+)\s+toolCallId=(\S+)'
)
# "embedded run tool end: runId=xxx tool=exec toolCallId=xxx"
TOOL_END_RE = re.compile(
    r'embedded run tool end:.*?runId=(\S+)\s+tool=(\S+)\s+toolCallId=(\S+)'
)
# "embedded run agent end: runId=xxx"
AGENT_END_RE = re.compile(r'embedded run agent end:.*?runId=(\S+)')
# "[tools] edit failed: ..."
TOOL_ERROR_RE = re.compile(r'\[tools\]\s+(\w+)\s+failed:\s*(.*)')
# Token/usage patterns (in case gateway logs them)
TOKEN_JSON_RE = re.compile(
    r'"(?:prompt|input)[_ ]?tokens?":\s*(\d+).*?"(?:completion|output)[_ ]?tokens?":\s*(\d+)',
    re.IGNORECASE,
)
# Model name in message (in case gateway logs it)
MODEL_IN_MSG_RE = re.compile(r'model[=:\s]+(\S+)', re.IGNORECASE)


def _lookup_pricing(model: str) -> Optional[dict]:
    """Look up pricing for a model, handling provider prefixes and fuzzy matching."""
    if model in MODEL_PRICING:
        return MODEL_PRICING[model]
    for prefix in _PROVIDER_PREFIXES:
        if model.startswith(prefix):
            stripped = model[len(prefix):]
            if stripped in MODEL_PRICING:
                return MODEL_PRICING[stripped]
    model_lower = model.lower()
    for key, val in MODEL_PRICING.items():
        if key.lower() in model_lower or model_lower in key.lower():
            return val
    return None


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost from model pricing."""
    pricing = _lookup_pricing(model)
    if not pricing:
        return 0.0
    return (input_tokens / 1_000_000) * pricing["input"] + (output_tokens / 1_000_000) * pricing["output"]


def extract_usage_from_api_response(response_json: dict) -> Optional[dict]:
    """Extract exact token usage from an LLM API response JSON."""
    usage = None

    # OpenAI / OpenAI-compatible / Anthropic
    if "usage" in response_json and isinstance(response_json["usage"], dict):
        u = response_json["usage"]
        input_t = u.get("prompt_tokens") or u.get("input_tokens") or 0
        output_t = u.get("completion_tokens") or u.get("output_tokens") or 0
        if not input_t and not output_t and u.get("total_tokens"):
            total = u["total_tokens"]
            input_t = int(total * 0.7)
            output_t = total - input_t
        if input_t or output_t:
            usage = {"input_tokens": input_t, "output_tokens": output_t, "source": "api_response"}

    # Google Gemini
    if not usage and "usageMetadata" in response_json:
        um = response_json["usageMetadata"]
        input_t = um.get("promptTokenCount") or 0
        output_t = um.get("candidatesTokenCount") or 0
        if not output_t and um.get("totalTokenCount"):
            output_t = max(0, um["totalTokenCount"] - input_t)
        if input_t or output_t:
            usage = {"input_tokens": input_t, "output_tokens": max(0, output_t), "source": "api_response"}

    # Cohere
    if not usage and "meta" in response_json and isinstance(response_json.get("meta"), dict):
        meta = response_json["meta"]
        if "tokens" in meta and isinstance(meta["tokens"], dict):
            t = meta["tokens"]
            input_t = t.get("input_tokens") or 0
            output_t = t.get("output_tokens") or 0
            if input_t or output_t:
                usage = {"input_tokens": input_t, "output_tokens": output_t, "source": "api_response"}

    if usage:
        model = response_json.get("model") or response_json.get("model_version") or None
        if model:
            usage["model"] = model

    return usage


# ─── OpenClaw JSON log parser ───

def parse_openclaw_line(raw_line: str) -> Optional[dict]:
    """Parse a single OpenClaw structured JSON log line.

    OpenClaw writes one JSON object per line:
      {"0": "<subsystem>", "1": "<message>", "_meta": {...}, "time": "..."}

    Returns a dict describing what happened, or None if not interesting.
    """
    raw_line = raw_line.strip()
    if not raw_line:
        return None

    try:
        obj = json.loads(raw_line)
    except (json.JSONDecodeError, ValueError):
        return None

    # Extract fields
    subsystem_raw = obj.get("0", "")
    message = obj.get("1", "")
    meta = obj.get("_meta", {})
    timestamp = meta.get("date") or obj.get("time", "")
    log_level = meta.get("logLevelName", "DEBUG")

    # Some log lines have a dict instead of a string in the message field
    if isinstance(message, dict):
        message = json.dumps(message)

    # Parse subsystem name from the JSON-encoded "0" field
    subsystem = ""
    try:
        sub_obj = json.loads(subsystem_raw)
        subsystem = sub_obj.get("subsystem", "")
    except (json.JSONDecodeError, ValueError, TypeError):
        subsystem = subsystem_raw

    if not message:
        return None

    # ── "embedded run prompt end" = one LLM interaction completed ──
    m = PROMPT_END_RE.search(message)
    if m:
        return {
            "type": "prompt_end",
            "run_id": m.group(1),
            "session_id": m.group(2),
            "duration_ms": int(m.group(3)),
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── "embedded run done" = entire run finished ──
    m = RUN_DONE_RE.search(message)
    if m:
        return {
            "type": "run_done",
            "run_id": m.group(1),
            "session_id": m.group(2),
            "duration_ms": int(m.group(3)),
            "aborted": m.group(4) == "true" if m.group(4) else False,
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── "embedded run agent end" ──
    m = AGENT_END_RE.search(message)
    if m:
        return {
            "type": "agent_end",
            "run_id": m.group(1),
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── Tool start ──
    m = TOOL_START_RE.search(message)
    if m:
        return {
            "type": "tool_start",
            "run_id": m.group(1),
            "tool": m.group(2),
            "tool_call_id": m.group(3),
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── Tool end ──
    m = TOOL_END_RE.search(message)
    if m:
        return {
            "type": "tool_end",
            "run_id": m.group(1),
            "tool": m.group(2),
            "tool_call_id": m.group(3),
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── Tool errors ──
    m = TOOL_ERROR_RE.search(message)
    if m:
        return {
            "type": "tool_error",
            "tool": m.group(1),
            "error": m.group(2),
            "timestamp": timestamp,
            "subsystem": subsystem,
            "log_level": log_level,
        }

    # ── ERROR-level lines ──
    if log_level == "ERROR":
        return {
            "type": "error",
            "message": message,
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── Check for token/usage data in any message ──
    token_match = TOKEN_JSON_RE.search(message)
    if token_match:
        return {
            "type": "usage",
            "input_tokens": int(token_match.group(1)),
            "output_tokens": int(token_match.group(2)),
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── Check if message contains an embedded API response JSON ──
    brace_idx = message.find("{")
    if brace_idx != -1 and '"usage"' in message:
        try:
            inner = json.loads(message[brace_idx:])
            usage = extract_usage_from_api_response(inner)
            if usage:
                return {
                    "type": "usage",
                    "input_tokens": usage["input_tokens"],
                    "output_tokens": usage["output_tokens"],
                    "model": usage.get("model"),
                    "timestamp": timestamp,
                    "subsystem": subsystem,
                }
        except (json.JSONDecodeError, ValueError):
            pass

    return None


# ─── Keep old interface names for backward compat with daemon.py ───
# These are no longer used by the new daemon but kept so nothing breaks on import.

def parse_line(line: str) -> Optional[dict]:
    """Legacy: delegates to parse_openclaw_line."""
    return parse_openclaw_line(line)

def parse_prompt_line(line: str) -> Optional[dict]:
    return None

def parse_usage_line(line: str) -> Optional[dict]:
    return None

def parse_json_response_start(line: str) -> Optional[str]:
    return None

def extract_tokens_from_line(line: str) -> tuple[int, int]:
    return 0, 0
