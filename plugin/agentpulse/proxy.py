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
        # Suppress default access logs; we log our own
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
        # CORS preflight
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def _proxy_request(self, method):
        """Forward request to the real API, capturing POST body/response."""
        # Parse path: /<provider>/<api-path>
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

        # Read request body
        content_length = int(self.headers.get("Content-Length", 0))
        request_body = self.rfile.read(content_length) if content_length > 0 else b""

        # Parse request JSON (for POST to capture prompts)
        request_json = {}
        if method == "POST" and request_body:
            try:
                request_json = json.loads(request_body)
            except (json.JSONDecodeError, ValueError):
                pass

        # Build forward headers (pass through auth, content-type, etc.)
        forward_headers = {}
        for key in self.headers:
            lower = key.lower()
            if lower in ("host", "transfer-encoding"):
                continue
            forward_headers[key] = self.headers[key]
        if request_body:
            forward_headers["Content-Length"] = str(len(request_body))

        # Determine if streaming
        is_streaming = request_json.get("stream", False)

        # Forward the request
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

            # Forward response headers to client
            self.send_response(resp.status)
            resp_headers = resp.getheaders()
            for key, val in resp_headers:
                lower = key.lower()
                if lower in ("transfer-encoding",):
                    continue
                self.send_header(key, val)
            self.end_headers()

            # Read and forward response body
            if is_streaming:
                response_body = self._forward_streaming(resp)
            else:
                response_body = resp.read()
                self.wfile.write(response_body)

            conn.close()

            # Capture data from POST requests to chat/message endpoints
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
        # System prompt
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
    else:
        # OpenAI-compatible
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
                input_tokens = usage.get("input_tokens", input_tokens)
        else:
            # OpenAI-compatible streaming
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
        """Get the oldest unclaimed capture (FIFO order), or None.

        Uses FIFO instead of LIFO to correctly match captures to events
        when multiple LLM calls happen in quick succession.
        """
        for i in range(len(self.captures)):
            try:
                cap = self.captures[i]
                if not cap["claimed"]:
                    cap["claimed"] = True
                    return cap
            except (IndexError, KeyError):
                continue
        return None
