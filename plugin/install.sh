#!/bin/bash
# AgentPulse Plugin Installer (v0.3.0)
# Run this on your VPS: curl -sSL https://raw.githubusercontent.com/sru4ka/agentpulse/main/plugin/install.sh | bash
# Or copy-paste this entire script

set -e

echo "=== AgentPulse Plugin Installer ==="

# Create venv if not active
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Creating virtual environment..."
    python3 -m venv ~/.agentpulse-venv
    source ~/.agentpulse-venv/bin/activate
fi

echo "Installing pyyaml..."
pip install pyyaml

# Create plugin directory
PLUGIN_DIR="/tmp/agentpulse-plugin"
rm -rf "$PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR/agentpulse"

# ────────────────────────────────────────────
# __init__.py
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/__init__.py" << 'PYEOF'
"""AgentPulse — AI Agent Observability Plugin"""
__version__ = "0.3.0"
PYEOF

# ────────────────────────────────────────────
# __main__.py
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/__main__.py" << 'PYEOF'
"""Allow running as: python3 -m agentpulse"""
from agentpulse.cli import main

main()
PYEOF

# ────────────────────────────────────────────
# _bootstrap_sitecustomize.py
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/_bootstrap_sitecustomize.py" << 'PYEOF'
"""
Bootstrap module injected by `agentpulse run`.

This file is placed in a temporary directory that's prepended to PYTHONPATH.
Python loads sitecustomize.py automatically on startup, so this runs before
the user's script — patching OpenAI/Anthropic SDKs transparently.
"""
import os as _os
import sys as _sys


def _agentpulse_bootstrap():
    _pkg_path = _os.environ.get("_AGENTPULSE_PKG_PATH", "")
    if _pkg_path and _pkg_path not in _sys.path:
        _sys.path.insert(0, _pkg_path)

    try:
        import agentpulse
        agentpulse.init()
        agentpulse.auto_instrument()
    except Exception:
        pass  # never crash the user's script


_agentpulse_bootstrap()
del _agentpulse_bootstrap
PYEOF

# ────────────────────────────────────────────
# config.py
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/config.py" << 'PYEOF'
import os
import glob as globmod
import yaml
from pathlib import Path

DEFAULT_CONFIG_PATH = os.path.expanduser("~/.openclaw/agentpulse.yaml")


def detect_openclaw_log_path():
    """Auto-detect OpenClaw log directory."""
    # Try current user's UID first
    uid_path = f"/tmp/openclaw-{os.getuid()}/"
    if os.path.isdir(uid_path):
        return uid_path

    # Scan for any openclaw-* directory with log files
    candidates = sorted(globmod.glob("/tmp/openclaw-*/"), key=os.path.getmtime, reverse=True)
    for candidate in candidates:
        if globmod.glob(os.path.join(candidate, "openclaw-*.log")):
            return candidate

    # Legacy path (older OpenClaw versions)
    if os.path.isdir("/tmp/openclaw/"):
        return "/tmp/openclaw/"

    return f"/tmp/openclaw-{os.getuid()}/"


DEFAULT_CONFIG = {
    "api_key": "",
    "endpoint": "https://agentpulses.com/api/events",
    "agent_name": "default",
    "framework": "openclaw",
    "log_path": "",
    "poll_interval": 5,
    "batch_interval": 30,
    "proxy_enabled": True,
    "proxy_port": 8787,
}

def load_config(path=DEFAULT_CONFIG_PATH):
    if os.path.exists(path):
        with open(path, "r") as f:
            config = yaml.safe_load(f) or {}
        merged = {**DEFAULT_CONFIG, **config}
    else:
        merged = DEFAULT_CONFIG.copy()

    # Auto-detect log path if not explicitly configured
    if not merged.get("log_path"):
        merged["log_path"] = detect_openclaw_log_path()

    return merged

def save_config(config, path=DEFAULT_CONFIG_PATH):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
PYEOF

# ────────────────────────────────────────────
# parser.py
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/parser.py" << 'PYEOF'
import re
import json
import logging

logger = logging.getLogger("agentpulse.parser")

# ─── Model pricing per million tokens (USD) ───
MODEL_PRICING = {
    # MiniMax
    "minimax/MiniMax-M2.5": {"input": 0.30, "output": 1.20},
    "MiniMax-M2.5": {"input": 0.30, "output": 1.20},
    "minimax-m1": {"input": 5, "output": 40},
    "MiniMax-Text-02": {"input": 1, "output": 5},
    "abab6.5s-chat": {"input": 1, "output": 5},
    "abab6.5-chat": {"input": 5, "output": 25},
    # Anthropic
    "claude-opus-4": {"input": 15, "output": 75},
    "claude-opus-4-6": {"input": 15, "output": 75},
    "claude-opus-4-5": {"input": 15, "output": 75},
    "claude-sonnet-4-6": {"input": 3, "output": 15},
    "claude-sonnet-4-5": {"input": 3, "output": 15},
    "claude-sonnet-4": {"input": 3, "output": 15},
    "claude-haiku-4-5": {"input": 1, "output": 5},
    "claude-haiku-4": {"input": 1, "output": 5},
    "claude-haiku-3.5": {"input": 0.80, "output": 4},
    "claude-3.5-sonnet": {"input": 3, "output": 15},
    "claude-3-5-sonnet": {"input": 3, "output": 15},
    "claude-3-5-haiku": {"input": 0.80, "output": 4},
    "claude-3-opus": {"input": 15, "output": 75},
    "claude-3-sonnet": {"input": 3, "output": 15},
    "claude-3-haiku": {"input": 0.25, "output": 1.25},
    # OpenAI
    "gpt-4o": {"input": 2.50, "output": 10},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10, "output": 30},
    "gpt-4": {"input": 30, "output": 60},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "o3": {"input": 2, "output": 8},
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
PROMPT_END_RE = re.compile(
    r'embedded run prompt end:.*?runId=(\S+).*?sessionId=(\S+).*?durationMs=(\d+)'
)
RUN_DONE_RE = re.compile(
    r'embedded run done:.*?runId=(\S+).*?sessionId=(\S+).*?durationMs=(\d+)(?:.*?aborted=(\w+))?'
)
TOOL_START_RE = re.compile(
    r'embedded run tool start:.*?runId=(\S+)\s+tool=(\S+)\s+toolCallId=(\S+)'
)
TOOL_END_RE = re.compile(
    r'embedded run tool end:.*?runId=(\S+)\s+tool=(\S+)\s+toolCallId=(\S+)'
)
RUN_START_RE = re.compile(
    r'embedded run start:.*?runId=(\S+).*?sessionId=(\S+).*?provider=(\S+).*?model=(\S+)'
)
AGENT_END_RE = re.compile(r'embedded run agent end:.*?runId=(\S+)')
TOOL_ERROR_RE = re.compile(r'\[tools\]\s+(\w+)\s+failed:\s*(.*)')
TOKEN_JSON_RE = re.compile(
    r'"(?:prompt|input)[_ ]?tokens?":\s*(\d+).*?"(?:completion|output)[_ ]?tokens?":\s*(\d+)',
    re.IGNORECASE,
)
MODEL_IN_MSG_RE = re.compile(r'model[=:\s]+(\S+)', re.IGNORECASE)


def _lookup_pricing(model):
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


def estimate_cost(model, input_tokens, output_tokens):
    """Calculate cost from model pricing."""
    pricing = _lookup_pricing(model)
    if not pricing:
        return 0.0
    return (input_tokens / 1_000_000) * pricing["input"] + (output_tokens / 1_000_000) * pricing["output"]


def extract_usage_from_api_response(response_json):
    """Extract exact token usage from an LLM API response JSON."""
    usage = None

    if "usage" in response_json and isinstance(response_json["usage"], dict):
        u = response_json["usage"]
        input_t = u.get("prompt_tokens") or u.get("input_tokens") or 0
        output_t = u.get("completion_tokens") or u.get("output_tokens") or 0
        # Anthropic cache tokens — must be included for accurate cost
        cache_read = u.get("cache_read_input_tokens", 0)
        cache_creation = u.get("cache_creation_input_tokens", 0)
        input_t += cache_read + cache_creation
        if not input_t and not output_t and u.get("total_tokens"):
            total = u["total_tokens"]
            input_t = int(total * 0.7)
            output_t = total - input_t
        if input_t or output_t:
            usage = {"input_tokens": input_t, "output_tokens": output_t, "source": "api_response"}

    if not usage and "usageMetadata" in response_json:
        um = response_json["usageMetadata"]
        input_t = um.get("promptTokenCount") or 0
        output_t = um.get("candidatesTokenCount") or 0
        if not output_t and um.get("totalTokenCount"):
            output_t = max(0, um["totalTokenCount"] - input_t)
        if input_t or output_t:
            usage = {"input_tokens": input_t, "output_tokens": max(0, output_t), "source": "api_response"}

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

def parse_openclaw_line(raw_line):
    """Parse a single OpenClaw structured JSON log line."""
    raw_line = raw_line.strip()
    if not raw_line:
        return None

    try:
        obj = json.loads(raw_line)
    except (json.JSONDecodeError, ValueError):
        return None

    subsystem_raw = obj.get("0", "")
    message = obj.get("1", "")
    meta = obj.get("_meta", {})
    timestamp = meta.get("date") or obj.get("time", "")
    log_level = meta.get("logLevelName", "DEBUG")

    if isinstance(message, dict):
        message = json.dumps(message)

    subsystem = ""
    if isinstance(subsystem_raw, dict):
        subsystem = subsystem_raw.get("subsystem", "")
    else:
        try:
            sub_obj = json.loads(subsystem_raw)
            subsystem = sub_obj.get("subsystem", "")
        except (json.JSONDecodeError, ValueError, TypeError):
            subsystem = subsystem_raw

    if not message:
        return None

    # ── "embedded run start" ──
    m = RUN_START_RE.search(message)
    if m:
        return {
            "type": "run_start",
            "run_id": m.group(1),
            "session_id": m.group(2),
            "provider": m.group(3),
            "model": m.group(4),
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── "embedded run prompt end" ──
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

    # ── "embedded run done" ──
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

    # ── Check for token/usage data ──
    token_match = TOKEN_JSON_RE.search(message)
    if token_match:
        return {
            "type": "usage",
            "input_tokens": int(token_match.group(1)),
            "output_tokens": int(token_match.group(2)),
            "timestamp": timestamp,
            "subsystem": subsystem,
        }

    # ── Check for embedded API response JSON ──
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


# ─── Legacy aliases ───
def parse_line(line):
    return parse_openclaw_line(line)
PYEOF

# ────────────────────────────────────────────
# sender.py
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/sender.py" << 'PYEOF'
import json
import time
import logging
import urllib.request
import urllib.error

logger = logging.getLogger("agentpulse")


class _PostRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Follow 307/308 redirects while preserving POST method and body."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if code in (307, 308):
            new_headers = {
                k: v for k, v in req.header_items()
                if k.lower() not in ("host", "content-length")
            }
            new_headers["Content-length"] = str(len(req.data)) if req.data else "0"
            return urllib.request.Request(
                newurl, data=req.data,
                headers=new_headers,
                method=req.get_method(),
            )
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_PostRedirectHandler)


class EventSender:
    def __init__(self, api_key, endpoint, agent_name, framework):
        self.api_key = api_key
        self.endpoint = endpoint
        self.agent_name = agent_name
        self.framework = framework
        self.buffer = []
        self.last_send = time.time()
        self.events_sent = 0
        self.errors = 0

    def add_event(self, event):
        self.buffer.append(event)

    def should_flush(self, batch_interval=30):
        if len(self.buffer) >= 50:
            return True
        if self.buffer and (time.time() - self.last_send) >= batch_interval:
            return True
        return False

    def flush(self):
        if not self.buffer:
            return True

        # Strip internal keys (prefixed with _) before sending
        clean_events = [
            {k: v for k, v in event.items() if not k.startswith("_")}
            for event in self.buffer
        ]

        payload = {
            "api_key": self.api_key,
            "agent_name": self.agent_name,
            "framework": self.framework,
            "events": clean_events,
        }
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint, data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with _opener.open(req, timeout=10) as resp:
                if resp.status == 200:
                    self.events_sent += len(self.buffer)
                    logger.info(f"Sent {len(self.buffer)} events (total: {self.events_sent})")
                    self.buffer = []
                    self.last_send = time.time()
                    return True
                else:
                    self.errors += 1
                    logger.error(f"API returned status {resp.status}")
                    return False
        except urllib.error.HTTPError as e:
            self.errors += 1
            logger.error(f"HTTP error: {e.code} - {e.reason}")
            return False
        except Exception as e:
            self.errors += 1
            logger.error(f"Send failed: {e}")
            return False
PYEOF

# ────────────────────────────────────────────
# proxy.py  (NEW — LLM API reverse proxy)
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/proxy.py" << 'PYEOF'
"""LLM API reverse proxy for capturing prompts and responses.

Sits between OpenClaw and the LLM provider APIs. Forwards all requests
transparently while capturing request/response data for AgentPulse.

Usage:
  Configure OpenClaw to send API calls through the proxy by setting
  provider base URLs to http://127.0.0.1:<port>/<provider>

  Example for Anthropic:
    ANTHROPIC_BASE_URL=http://127.0.0.1:8787/anthropic

  Example for OpenAI:
    OPENAI_BASE_URL=http://127.0.0.1:8787/openai
"""

import http.client
import http.server
import json
import logging
import ssl
import threading
import urllib.parse
from collections import deque
from datetime import datetime, timezone

logger = logging.getLogger("agentpulse.proxy")

# Provider API base URLs
PROVIDERS = {
    "anthropic": "https://api.anthropic.com",
    "openai": "https://api.openai.com",
    "minimax": "https://api.minimax.chat",
    "deepseek": "https://api.deepseek.com",
    "google": "https://generativelanguage.googleapis.com",
    "mistral": "https://api.mistral.ai",
    "groq": "https://api.groq.com",
    "together": "https://api.together.xyz",
    "fireworks": "https://api.fireworks.ai",
}

# Reusable SSL context for outbound HTTPS
_ssl_ctx = ssl.create_default_context()


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    """HTTP handler that proxies LLM API requests and captures data."""

    def log_message(self, format, *args):
        pass

    def do_POST(self):
        self._proxy_request("POST")

    def do_GET(self):
        self._proxy_request("GET")

    def do_PUT(self):
        self._proxy_request("PUT")

    def do_DELETE(self):
        self._proxy_request("DELETE")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def _proxy_request(self, method):
        """Forward request to the real API, capturing POST body/response."""
        parts = self.path.lstrip("/").split("/", 1)
        provider_name = parts[0].lower() if parts else ""
        api_path = "/" + parts[1] if len(parts) > 1 else "/"

        if provider_name not in PROVIDERS:
            self.send_error(
                404,
                f"Unknown provider '{provider_name}'. "
                f"Use one of: {', '.join(sorted(PROVIDERS))}",
            )
            return

        target_base = PROVIDERS[provider_name]

        content_length = int(self.headers.get("Content-Length", 0))
        request_body = self.rfile.read(content_length) if content_length > 0 else b""

        request_json = {}
        if method == "POST" and request_body:
            try:
                request_json = json.loads(request_body)
            except (json.JSONDecodeError, ValueError):
                pass

        forward_headers = {}
        for key in self.headers:
            lower = key.lower()
            if lower in ("host", "transfer-encoding"):
                continue
            forward_headers[key] = self.headers[key]
        if request_body:
            forward_headers["Content-Length"] = str(len(request_body))

        is_streaming = request_json.get("stream", False)

        try:
            parsed = urllib.parse.urlparse(target_base)
            if parsed.scheme == "https":
                conn = http.client.HTTPSConnection(
                    parsed.hostname, parsed.port or 443, context=_ssl_ctx, timeout=300
                )
            else:
                conn = http.client.HTTPConnection(
                    parsed.hostname, parsed.port or 80, timeout=300
                )

            conn.request(method, api_path, body=request_body, headers=forward_headers)
            resp = conn.getresponse()

            self.send_response(resp.status)
            resp_headers = resp.getheaders()
            for key, val in resp_headers:
                lower = key.lower()
                if lower in ("transfer-encoding",):
                    continue
                self.send_header(key, val)
            self.end_headers()

            if is_streaming:
                response_body = self._forward_streaming(resp)
            else:
                response_body = resp.read()
                self.wfile.write(response_body)

            conn.close()

            if method == "POST" and resp.status < 400 and request_json:
                self._capture(provider_name, request_json, response_body, is_streaming)

        except Exception as e:
            logger.error(f"Proxy forward error: {e}")
            try:
                self.send_error(502, f"Proxy error: {e}")
            except Exception:
                pass

    def _forward_streaming(self, resp):
        """Forward streaming response chunks while buffering for capture."""
        buf = bytearray()
        while True:
            chunk = resp.read(4096)
            if not chunk:
                break
            self.wfile.write(chunk)
            self.wfile.flush()
            buf.extend(chunk)
        return bytes(buf)

    def _capture(self, provider, request_json, response_body, is_streaming):
        """Extract prompt/response data and store for the daemon."""
        try:
            prompt_messages = _extract_prompt(provider, request_json)
            model = request_json.get("model", "unknown")

            if is_streaming:
                response_text, input_tokens, output_tokens = _extract_streaming_response(
                    provider, response_body
                )
            else:
                response_text, input_tokens, output_tokens = _extract_response(
                    provider, response_body
                )

            capture = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "provider": provider,
                "model": model,
                "prompt_messages": prompt_messages,
                "response_text": response_text,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "claimed": False,
            }

            self.server.captures.append(capture)
            logger.info(
                f"Captured: {provider}/{model} "
                f"{input_tokens}in/{output_tokens}out "
                f"prompt_msgs={len(prompt_messages)}"
            )
        except Exception as e:
            logger.error(f"Capture extraction error: {e}")


# ─── Prompt/response extraction helpers ───


def _extract_prompt(provider, request_json):
    """Extract prompt messages from the API request body."""
    messages = []

    if provider == "anthropic":
        system = request_json.get("system")
        if system:
            if isinstance(system, str):
                messages.append({"role": "system", "content": system[:2000]})
            elif isinstance(system, list):
                text = " ".join(
                    b.get("text", "")
                    for b in system
                    if isinstance(b, dict) and b.get("type") == "text"
                )
                if text:
                    messages.append({"role": "system", "content": text[:2000]})

        for msg in request_json.get("messages", []):
            if not isinstance(msg, dict):
                continue
            content = msg.get("content", "")
            if isinstance(content, list):
                text = " ".join(
                    b.get("text", "")
                    for b in content
                    if isinstance(b, dict) and b.get("type") == "text"
                )
                content = text
            messages.append({
                "role": msg.get("role", "user"),
                "content": str(content)[:2000],
            })
    else:
        # OpenAI-compatible (MiniMax, OpenAI, DeepSeek, Groq, etc.)
        for msg in request_json.get("messages", []):
            if not isinstance(msg, dict):
                continue
            content = msg.get("content", "")
            if isinstance(content, list):
                text = " ".join(
                    p.get("text", "")
                    for p in content
                    if isinstance(p, dict) and p.get("type") == "text"
                )
                content = text
            messages.append({
                "role": msg.get("role", "user"),
                "content": str(content)[:2000],
            })

    return messages


def _extract_response(provider, response_body):
    """Extract response text and token usage from a non-streaming response."""
    response_text = ""
    input_tokens = 0
    output_tokens = 0

    try:
        resp = json.loads(response_body)
    except (json.JSONDecodeError, ValueError):
        return response_text, input_tokens, output_tokens

    if provider == "anthropic":
        for block in resp.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text":
                response_text += block.get("text", "")
        usage = resp.get("usage", {})
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)
        cache_read_tokens = usage.get("cache_read_input_tokens", 0)
        cache_creation_tokens = usage.get("cache_creation_input_tokens", 0)
        # Include cache tokens in input count for accurate cost tracking
        input_tokens += cache_read_tokens + cache_creation_tokens
    else:
        choices = resp.get("choices", [])
        if choices and isinstance(choices[0], dict):
            msg = choices[0].get("message", {})
            response_text = msg.get("content", "") or ""
        usage = resp.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0) or usage.get("input_tokens", 0)
        output_tokens = (
            usage.get("completion_tokens", 0) or usage.get("output_tokens", 0)
        )

    return response_text, input_tokens, output_tokens


def _extract_streaming_response(provider, response_body):
    """Extract data from a buffered streaming (SSE) response."""
    text_parts = []
    input_tokens = 0
    output_tokens = 0

    for line in response_body.decode("utf-8", errors="replace").split("\n"):
        if not line.startswith("data: "):
            continue
        data = line[6:].strip()
        if data == "[DONE]":
            break
        try:
            event = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            continue

        if provider == "anthropic":
            etype = event.get("type", "")
            if etype == "content_block_delta":
                delta = event.get("delta", {})
                if delta.get("type") == "text_delta":
                    text_parts.append(delta.get("text", ""))
            elif etype == "message_delta":
                usage = event.get("usage", {})
                output_tokens = usage.get("output_tokens", output_tokens)
            elif etype == "message_start":
                msg = event.get("message", {})
                usage = msg.get("usage", {})
                base_input = usage.get("input_tokens", 0)
                cache_read = usage.get("cache_read_input_tokens", 0)
                cache_creation = usage.get("cache_creation_input_tokens", 0)
                # Include cache tokens for accurate cost tracking
                input_tokens = base_input + cache_read + cache_creation
        else:
            choices = event.get("choices", [])
            if choices and isinstance(choices[0], dict):
                delta = choices[0].get("delta", {})
                content = delta.get("content")
                if content:
                    text_parts.append(content)
            usage = event.get("usage")
            if usage:
                input_tokens = (
                    usage.get("prompt_tokens", 0)
                    or usage.get("input_tokens", input_tokens)
                )
                output_tokens = (
                    usage.get("completion_tokens", 0)
                    or usage.get("output_tokens", output_tokens)
                )

    return "".join(text_parts), input_tokens, output_tokens


# ─── Server wrapper ───


class LLMProxyServer:
    """Manages the LLM API proxy server in a background thread."""

    def __init__(self, port=8787):
        self.port = port
        self.captures = deque(maxlen=200)
        self.server = None
        self.thread = None

    def start(self):
        """Start proxy server in a daemon thread."""
        self.server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", self.port), ProxyHandler
        )
        self.server.captures = self.captures

        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

        logger.info(f"LLM proxy listening on http://127.0.0.1:{self.port}")
        logger.info(
            "Configure provider base URLs to route through proxy, e.g.:"
        )
        logger.info(
            f"  ANTHROPIC_BASE_URL=http://127.0.0.1:{self.port}/anthropic"
        )
        logger.info(
            f"  OPENAI_BASE_URL=http://127.0.0.1:{self.port}/openai"
        )

    def stop(self):
        """Stop the proxy server."""
        if self.server:
            self.server.shutdown()
            logger.info("LLM proxy stopped")

    def get_latest_capture(self):
        """Get the oldest unclaimed capture (FIFO order), or None."""
        for i in range(len(self.captures)):
            try:
                cap = self.captures[i]
                if not cap["claimed"]:
                    cap["claimed"] = True
                    return cap
            except (IndexError, KeyError):
                continue
        return None
PYEOF

# ────────────────────────────────────────────
# daemon.py (with proxy integration)
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/daemon.py" << 'PYEOF'
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
    def __init__(self, config_path=None):
        self.config = load_config(config_path) if config_path else load_config()
        self.sender = EventSender(
            api_key=self.config["api_key"],
            endpoint=self.config["endpoint"],
            agent_name=self.config["agent_name"],
            framework=self.config["framework"],
        )
        self.running = False
        self.file_positions = {}

        # Per-run state: collect tool calls, model info between prompt_end events
        self._runs = {}

        # Default model for cost estimation (OpenClaw uses MiniMax by default)
        self._default_model = self.config.get("model", "MiniMax-M2.5")

        # Proxy server (started if enabled in config)
        self._proxy = None

    def get_latest_log_file(self):
        log_path = self.config["log_path"]
        today = datetime.now().strftime("%Y-%m-%d")

        today_file = os.path.join(log_path, f"openclaw-{today}.log")
        if os.path.exists(today_file):
            return today_file

        pattern = os.path.join(log_path, "openclaw-*.log")
        files = sorted(glob.glob(pattern), reverse=True)
        return files[0] if files else None

    def tail_file(self, filepath):
        """Read new lines from file since last position."""
        if filepath not in self.file_positions:
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

    def _get_run(self, run_id):
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
        """Try to get the most recent unclaimed proxy capture."""
        if not self._proxy:
            return None
        for attempt in range(retries):
            cap = self._proxy.get_latest_capture()
            if cap:
                return cap
            if attempt < retries - 1:
                time.sleep(delay)
        return None

    def process_lines(self, lines):
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
                if tool != "message":
                    run["tools"].add(tool)
                continue

            if event_type == "tool_end":
                continue

            # ── Collect tool errors ──
            if event_type == "tool_error":
                if self._runs:
                    last_run = list(self._runs.values())[-1]
                    last_run["errors"].append(f"{parsed['tool']}: {parsed['error']}")
                continue

            # ── "prompt_end" = one LLM call completed ──
            if event_type == "prompt_end":
                run_id = parsed["run_id"]
                run = self._get_run(run_id)
                duration_ms = parsed["duration_ms"]

                model = run.get("model") or self._default_model
                provider = run.get("provider") or (
                    model.split("/")[0] if "/" in model else "minimax"
                )

                # Check proxy for captured prompt/response data
                capture = self._try_get_proxy_capture()

                if capture:
                    input_tokens = capture["input_tokens"]
                    output_tokens = capture["output_tokens"]
                    prompt_messages = capture["prompt_messages"]
                    response_text = capture["response_text"]
                    if capture.get("model"):
                        model = capture["model"]
                else:
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

                run["tools"] = set()
                run["errors"] = []
                continue

            # ── "run_done" = entire agent run finished ──
            if event_type == "run_done":
                run_id = parsed["run_id"]
                self._runs.pop(run_id, None)
                continue

            # ── Usage data ──
            if event_type == "usage":
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

            env_map = {
                "ANTHROPIC_BASE_URL": "anthropic",
                "OPENAI_BASE_URL": "openai",
                "MINIMAX_BASE_URL": "minimax",
                "DEEPSEEK_BASE_URL": "deepseek",
            }
            for env_var, provider in env_map.items():
                os.environ[env_var] = f"http://127.0.0.1:{port}/{provider}"

            self._persist_proxy_env(port, env_map)
            logger.info("Auto-set provider BASE_URL env vars for proxy routing")
        except Exception as e:
            logger.error(f"Failed to start proxy: {e}")

    @staticmethod
    def _persist_proxy_env(port, env_map):
        """Write proxy env vars to .bashrc so other processes can source them."""
        marker = "# agentpulse-proxy"
        home = os.path.expanduser("~")
        rc_path = os.path.join(home, ".bashrc") if os.path.exists(os.path.join(home, ".bashrc")) else os.path.join(home, ".profile")

        export_lines = [
            f'export {env_var}=http://127.0.0.1:{port}/{provider}  {marker}'
            for env_var, provider in env_map.items()
        ]
        try:
            existing = ""
            if os.path.exists(rc_path):
                with open(rc_path, "r") as f:
                    existing = f.read()
            lines = [l for l in existing.splitlines() if marker not in l]
            lines.extend(export_lines)
            with open(rc_path, "w") as f:
                f.write("\n".join(lines) + "\n")
            logger.info(f"Persisted proxy env vars to {rc_path}")
        except Exception as e:
            logger.warning(f"Could not persist proxy env to {rc_path}: {e}")

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
PYEOF

# ────────────────────────────────────────────
# cli.py (with enable-proxy, background mode, test)
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/agentpulse/cli.py" << 'PYEOF'
import os
import sys
import signal
import logging
import argparse
import shutil
import subprocess
import tempfile

from .config import load_config, save_config, DEFAULT_CONFIG, DEFAULT_CONFIG_PATH, detect_openclaw_log_path
from .daemon import AgentPulseDaemon

PID_FILE = "/tmp/agentpulse.pid"
LOG_FILE = os.path.expanduser("~/.openclaw/agentpulse.log")

def cmd_init(args):
    """Interactive setup."""
    print("AgentPulse Setup\n")

    config = load_config()

    existing_key = config.get("api_key", "")
    if not existing_key:
        print("---------------------------------------------")
        print("  Welcome to AgentPulse!")
        print("  You need an API key to get started.")
        print("")
        print("  1. Sign up at: https://agentpulses.com/signup")
        print("  2. Go to Dashboard > Settings")
        print("  3. Copy your API key")
        print("---------------------------------------------")
        print("")

    api_key = input(f"API Key [{existing_key}]: ").strip()
    if api_key:
        config["api_key"] = api_key
    elif not existing_key:
        print("\nAPI key is required. Sign up at https://agentpulses.com/signup")
        sys.exit(1)

    agent_name = input(f"Agent name [{config.get('agent_name', 'default')}]: ").strip()
    if agent_name:
        config["agent_name"] = agent_name

    detected_path = detect_openclaw_log_path()
    if not config.get("log_path"):
        config["log_path"] = detected_path

    save_config(config)
    print(f"\nConfig saved to {DEFAULT_CONFIG_PATH}")
    print(f"   Agent: {config['agent_name']}")
    print(f"   Log path: {config['log_path']}")
    print(f"\nStart monitoring with:")
    print(f"   agentpulse start -d")

def cmd_run(args):
    """Run a command with automatic LLM instrumentation."""
    config = load_config()
    if not config.get("api_key"):
        print("No API key configured.")
        print("   Run 'agentpulse init' first.")
        sys.exit(1)

    if not args.cmd:
        print("No command provided.")
        print("   Usage: agentpulse run python my_bot.py")
        sys.exit(1)

    pkg_dir = os.path.dirname(os.path.abspath(__file__))
    pkg_parent = os.path.dirname(pkg_dir)

    bootstrap_dir = tempfile.mkdtemp(prefix="agentpulse_")
    bootstrap_src = os.path.join(pkg_dir, "_bootstrap_sitecustomize.py")
    bootstrap_dst = os.path.join(bootstrap_dir, "sitecustomize.py")
    shutil.copy2(bootstrap_src, bootstrap_dst)

    env = os.environ.copy()
    env["_AGENTPULSE_PKG_PATH"] = pkg_parent
    existing = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = bootstrap_dir + (":" + existing if existing else "")

    agent_name = config.get("agent_name", "default")
    print(f"AgentPulse: monitoring LLM calls for '{agent_name}'")
    print(f"   Running: {' '.join(args.cmd)}\n")

    try:
        result = subprocess.run(args.cmd, env=env)
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        sys.exit(130)
    except FileNotFoundError:
        print(f"Command not found: {args.cmd[0]}")
        sys.exit(127)
    finally:
        shutil.rmtree(bootstrap_dir, ignore_errors=True)


def cmd_start(args):
    """Start the daemon (foreground or background)."""
    config = load_config()
    if not config.get("api_key"):
        print("No API key configured.")
        print("   Run 'agentpulse init' to set up your API key.")
        print("   Don't have an account? Sign up at https://agentpulses.com/signup")
        sys.exit(1)

    if os.path.exists(PID_FILE):
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        try:
            os.kill(pid, 0)
            print(f"AgentPulse is already running (PID {pid})")
            print(f"   Use 'agentpulse stop' first, or 'agentpulse status' to check.")
            sys.exit(1)
        except OSError:
            os.remove(PID_FILE)

    background = getattr(args, "background", False)

    if background:
        _start_background(config)
    else:
        _start_foreground(config)


def _start_background(config):
    """Fork into the background and run as a daemon."""
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

    pid = os.fork()
    if pid > 0:
        print(f"AgentPulse started in background (PID {pid})")
        print(f"   Agent: {config['agent_name']}")
        print(f"   Watching: {config['log_path']}")
        print(f"   Logs: {LOG_FILE}")
        if config.get("proxy_enabled"):
            port = config.get("proxy_port", 8787)
            print(f"   LLM Proxy: http://127.0.0.1:{port}")
        print(f"\n   Use 'agentpulse status' to check, 'agentpulse stop' to stop.")
        with open(PID_FILE, "w") as f:
            f.write(str(pid))
        sys.exit(0)

    os.setsid()

    log_fd = os.open(LOG_FILE, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    os.dup2(log_fd, sys.stdout.fileno())
    os.dup2(log_fd, sys.stderr.fileno())
    os.close(log_fd)

    devnull = os.open(os.devnull, os.O_RDONLY)
    os.dup2(devnull, sys.stdin.fileno())
    os.close(devnull)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    try:
        daemon = AgentPulseDaemon()
        daemon.run()
    finally:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)


def _start_foreground(config):
    """Run in the foreground."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

    print(f"AgentPulse daemon starting...")
    print(f"   Agent: {config['agent_name']}")
    print(f"   Watching: {config['log_path']}")
    if config.get("proxy_enabled"):
        port = config.get("proxy_port", 8787)
        print(f"   LLM Proxy: http://127.0.0.1:{port}")
    print(f"   Press Ctrl+C to stop")
    print(f"   Tip: use 'agentpulse start -d' to run in the background\n")

    try:
        daemon = AgentPulseDaemon()
        daemon.run()
    finally:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)

def cmd_stop(args):
    """Stop the daemon."""
    if not os.path.exists(PID_FILE):
        print("AgentPulse is not running.")
        return

    with open(PID_FILE, "r") as f:
        pid = int(f.read().strip())

    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Stopped AgentPulse (PID {pid})")
    except OSError:
        print(f"Process {pid} not found. Cleaning up PID file.")

    os.remove(PID_FILE)

def cmd_test(args):
    """Send a test event to verify connection."""
    import json
    import urllib.request
    import urllib.error
    from datetime import datetime

    config = load_config()
    if not config.get("api_key"):
        print("No API key configured. Run 'agentpulse init' first.")
        sys.exit(1)

    print("Testing connection to AgentPulse...\n")
    print(f"   Endpoint: {config['endpoint']}")
    print(f"   Agent: {config['agent_name']}")
    print(f"   API Key: {config['api_key'][:10]}...\n")

    test_event = {
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "provider": "agentpulse",
        "model": "connection-test",
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0,
        "latency_ms": 1,
        "status": "success",
        "error_message": None,
        "task_context": "AgentPulse connection test",
        "tools_used": [],
    }

    payload = {
        "api_key": config["api_key"],
        "agent_name": config["agent_name"],
        "framework": config.get("framework", "openclaw"),
        "events": [test_event],
    }

    try:
        data = json.dumps(payload).encode("utf-8")

        class PostRedirectHandler(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                if code in (307, 308):
                    new_headers = {
                        k: v for k, v in req.header_items()
                        if k.lower() not in ("host", "content-length")
                    }
                    new_headers["Content-length"] = str(len(req.data)) if req.data else "0"
                    return urllib.request.Request(
                        newurl, data=req.data,
                        headers=new_headers,
                        method=req.get_method(),
                    )
                return super().redirect_request(req, fp, code, msg, headers, newurl)

        opener = urllib.request.build_opener(PostRedirectHandler)
        req = urllib.request.Request(
            config["endpoint"],
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with opener.open(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            if resp.status == 200 and result.get("success"):
                print("Connection successful!")
                print(f"   Agent '{config['agent_name']}' is now visible in your dashboard.")
                print(f"   Go to: https://agentpulses.com/dashboard/agents")
            else:
                print(f"Unexpected response: {result}")
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"API error ({e.code}): {body}")
        if e.code == 401:
            print("   Your API key may be invalid. Check at https://agentpulses.com/dashboard/settings")
        elif e.code == 403:
            print("   Agent limit reached on your plan. Upgrade at https://agentpulses.com/pricing")
    except Exception as e:
        print(f"Connection failed: {e}")
        print(f"   Check that the endpoint is correct: {config['endpoint']}")


def cmd_status(args):
    """Check daemon status."""
    config = load_config()

    if os.path.exists(PID_FILE):
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        try:
            os.kill(pid, 0)
            print(f"AgentPulse is running (PID {pid})")
        except OSError:
            print(f"AgentPulse is not running (stale PID file)")
            os.remove(PID_FILE)
    else:
        print("AgentPulse is not running")

    proxy_enabled = config.get("proxy_enabled", False)
    proxy_port = config.get("proxy_port", 8787)

    print(f"\nConfiguration:")
    print(f"   Config: {DEFAULT_CONFIG_PATH}")
    print(f"   Agent: {config.get('agent_name', 'not set')}")
    print(f"   API Key: {'configured' if config.get('api_key') else 'NOT SET'}")
    print(f"   Endpoint: {config.get('endpoint', 'not set')}")
    print(f"   Log path: {config.get('log_path', 'not set')}")
    print(f"   Daemon log: {LOG_FILE}")
    print(f"   LLM Proxy: {'enabled (port {})'.format(proxy_port) if proxy_enabled else 'disabled'}")
    if proxy_enabled:
        print(f"\n   Proxy active -- provider BASE_URLs are configured in {_get_bashrc_path()}")

PROXY_MARKER = "# agentpulse-proxy"


def _get_bashrc_path():
    """Return the shell rc file to modify."""
    home = os.path.expanduser("~")
    bashrc = os.path.join(home, ".bashrc")
    if os.path.exists(bashrc):
        return bashrc
    return os.path.join(home, ".profile")


PROXY_ENV_VARS = {
    "ANTHROPIC_BASE_URL": "anthropic",
    "OPENAI_BASE_URL": "openai",
    "MINIMAX_BASE_URL": "minimax",
    "DEEPSEEK_BASE_URL": "deepseek",
}


def _install_proxy_env(port):
    """Add provider base URL exports to the user's shell rc file."""
    rc_path = _get_bashrc_path()

    export_lines = []
    for env_var, provider in PROXY_ENV_VARS.items():
        export_lines.append(f'export {env_var}=http://127.0.0.1:{port}/{provider}  {PROXY_MARKER}')

    existing = ""
    if os.path.exists(rc_path):
        with open(rc_path, "r") as f:
            existing = f.read()

    lines = [l for l in existing.splitlines() if PROXY_MARKER not in l]
    lines.extend(export_lines)

    with open(rc_path, "w") as f:
        f.write("\n".join(lines) + "\n")

    for env_var, provider in PROXY_ENV_VARS.items():
        os.environ[env_var] = f"http://127.0.0.1:{port}/{provider}"

    return rc_path


def _uninstall_proxy_env():
    """Remove provider base URL exports from the user's shell rc file."""
    rc_path = _get_bashrc_path()
    if not os.path.exists(rc_path):
        return rc_path

    with open(rc_path, "r") as f:
        existing = f.read()

    lines = [l for l in existing.splitlines() if PROXY_MARKER not in l]

    with open(rc_path, "w") as f:
        f.write("\n".join(lines) + "\n")

    for env_var in PROXY_ENV_VARS:
        os.environ.pop(env_var, None)

    return rc_path


def cmd_enable_proxy(args):
    """Enable or disable the LLM proxy for prompt capture."""
    config = load_config()

    if args.disable:
        config["proxy_enabled"] = False
        save_config(config)
        rc_path = _uninstall_proxy_env()
        print("LLM proxy disabled.")
        print(f"   Removed proxy env vars from {rc_path}")
        print("   Restart agentpulse to apply: agentpulse stop && agentpulse start -d")
        return

    port = args.port or config.get("proxy_port", 8787)
    config["proxy_enabled"] = True
    config["proxy_port"] = port
    save_config(config)

    rc_path = _install_proxy_env(port)

    print(f"LLM proxy enabled on port {port}")
    print(f"   Added to {rc_path}:")
    for env_var, provider in PROXY_ENV_VARS.items():
        print(f"     {env_var}=http://127.0.0.1:{port}/{provider}")
    print(f"\n   Restart agentpulse and source your shell to activate:")
    print(f"   agentpulse stop && agentpulse start -d")
    print(f"   source {rc_path}")


def main():
    parser = argparse.ArgumentParser(description="AgentPulse -- AI Agent Observability")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("init", help="Interactive setup")
    run_parser = subparsers.add_parser("run", help="Run a command with LLM monitoring")
    run_parser.add_argument("cmd", nargs=argparse.REMAINDER,
                            help="Command to run (e.g. python my_bot.py)")
    start_parser = subparsers.add_parser("start", help="Start the log-tail daemon (OpenClaw)")
    start_parser.add_argument("-d", "--background", action="store_true",
                              help="Run in the background (daemonize)")
    subparsers.add_parser("stop", help="Stop the daemon")
    subparsers.add_parser("status", help="Check daemon status")
    subparsers.add_parser("test", help="Send a test event to verify connection")
    proxy_parser = subparsers.add_parser("enable-proxy",
                                          help="Enable LLM proxy for prompt/response capture")
    proxy_parser.add_argument("--port", type=int, default=None,
                               help="Proxy port (default: 8787)")
    proxy_parser.add_argument("--disable", action="store_true",
                               help="Disable the proxy")

    args = parser.parse_args()

    commands = {
        "init": cmd_init,
        "run": cmd_run,
        "start": cmd_start,
        "stop": cmd_stop,
        "status": cmd_status,
        "test": cmd_test,
        "enable-proxy": cmd_enable_proxy,
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
PYEOF

# ────────────────────────────────────────────
# pyproject.toml
# ────────────────────────────────────────────
cat > "$PLUGIN_DIR/pyproject.toml" << 'PYEOF'
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "agentpulse"
version = "0.3.0"
description = "AI Agent Observability"
requires-python = ">=3.10"
dependencies = ["pyyaml>=6.0"]

[project.scripts]
agentpulse = "agentpulse.cli:main"

[tool.setuptools.packages.find]
where = ["."]
PYEOF

# Install
echo ""
echo "Installing AgentPulse plugin..."
cd "$PLUGIN_DIR"
pip install .

# Auto-enable proxy (writes env vars to .bashrc)
agentpulse enable-proxy 2>/dev/null || true

echo ""
echo "=== AgentPulse v0.3.0 installed! ==="
echo ""
echo "Quick start:"
echo "  agentpulse init              # Setup API key"
echo "  agentpulse start -d          # Start daemon in background"
echo "  source ~/.bashrc             # Load proxy env vars"
echo "  # Then RESTART OpenClaw so it routes through the proxy"
echo ""
echo "Commands:"
echo "  agentpulse status            # Check status"
echo "  agentpulse test              # Send test event"
echo "  agentpulse stop              # Stop daemon"
echo "  agentpulse enable-proxy --disable  # Disable proxy"
