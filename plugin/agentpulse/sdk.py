"""
AgentPulse Python SDK — auto-instrument LLM calls for exact cost tracking.

Usage:
    import agentpulse
    agentpulse.init(api_key="ap_...", agent_name="my-bot")
    agentpulse.auto_instrument()

    # All OpenAI / Anthropic / MiniMax calls are now tracked automatically.
"""

import json
import time
import threading
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional

from .config import load_config
from .parser import estimate_cost, _lookup_pricing

logger = logging.getLogger("agentpulse.sdk")

# ── Global state ──
_config: dict = {}
_buffer: list = []
_buffer_lock = threading.Lock()
_flush_thread: Optional[threading.Thread] = None
_running = False
_initialized = False
_events_sent = 0
_global_user_id: Optional[str] = None
_global_task_context: Optional[str] = None


class _PostRedirectHandler(urllib.request.HTTPRedirectHandler):
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


def init(api_key: str = None, agent_name: str = None, endpoint: str = None, user_id: str = None):
    """Initialize AgentPulse SDK.

    Args:
        api_key: Your AgentPulse API key. If None, reads from config file.
        agent_name: Name for this agent (shown in dashboard).
        endpoint: API endpoint URL (defaults to agentpulses.com).
        user_id: Identifies who/what is making calls (e.g. "dan", "bot-1").
            Useful when multiple users or bots share the same VM.
            Shows up in the dashboard so you can filter by user.

    If no arguments are provided, reads from ~/.openclaw/agentpulse.yaml
    (created by `agentpulse init`).
    """
    global _config, _initialized, _running, _global_user_id

    # Load from config file as defaults
    file_config = load_config()

    _config = {
        "api_key": api_key or file_config.get("api_key", ""),
        "agent_name": agent_name or file_config.get("agent_name", "default"),
        "endpoint": endpoint or file_config.get("endpoint", "https://agentpulses.com/api/events"),
        "framework": file_config.get("framework", "python-sdk"),
    }

    _global_user_id = user_id

    if not _config["api_key"]:
        logger.warning(
            "AgentPulse: No API key set. "
            "Pass api_key= to init() or run `agentpulse init` first. "
            "Sign up at https://agentpulses.com/signup"
        )
        return

    _initialized = True
    _running = True

    # Start background flush thread
    _start_flush_thread()
    logger.info(f"AgentPulse SDK initialized (agent: {_config['agent_name']})")


def _start_flush_thread():
    """Start a background thread that flushes events every 10 seconds."""
    global _flush_thread

    def _flush_loop():
        while _running:
            time.sleep(10)
            _flush()

    _flush_thread = threading.Thread(target=_flush_loop, daemon=True)
    _flush_thread.start()


def _add_event(event: dict):
    """Add an event to the buffer (thread-safe)."""
    with _buffer_lock:
        _buffer.append(event)

    # Auto-flush if buffer is large
    if len(_buffer) >= 50:
        _flush()


def _flush():
    """Send buffered events to the AgentPulse API."""
    global _events_sent

    with _buffer_lock:
        if not _buffer:
            return
        events = _buffer.copy()
        _buffer.clear()

    if not _config.get("api_key"):
        return

    payload = {
        "api_key": _config["api_key"],
        "agent_name": _config["agent_name"],
        "framework": _config.get("framework", "python-sdk"),
        "events": events,
    }

    try:
        data = json.dumps(payload, default=str).encode("utf-8")
        req = urllib.request.Request(
            _config["endpoint"],
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _opener.open(req, timeout=10) as resp:
            if resp.status == 200:
                _events_sent += len(events)
                logger.debug(f"AgentPulse: sent {len(events)} events (total: {_events_sent})")
            else:
                logger.warning(f"AgentPulse: API returned {resp.status}")
    except Exception as e:
        logger.warning(f"AgentPulse: failed to send events: {e}")
        # Re-add events to buffer for retry
        with _buffer_lock:
            _buffer.extend(events)


def set_user(user_id: str):
    """Set the current user/bot identity for all subsequent LLM calls.

    Use this when multiple users or bots share the same process.
    Example:
        agentpulse.set_user("dan")       # Dan's calls
        agentpulse.set_user("trading-bot") # Bot's calls
    """
    global _global_user_id
    _global_user_id = user_id


def set_context(task_context: str):
    """Set the current task context for all subsequent LLM calls.

    Example:
        agentpulse.set_context("customer-support")
        agentpulse.set_context("code-review")
    """
    global _global_task_context
    _global_task_context = task_context


def shutdown():
    """Flush remaining events and stop background thread."""
    global _running
    _running = False
    _flush()


def track(response, provider: str = None, latency_ms: int = None, task_context: str = None, messages: list = None):
    """Manually track an LLM API response.

    Works with:
    - OpenAI SDK responses (ChatCompletion objects)
    - Anthropic SDK responses (Message objects)
    - Raw dicts with a 'usage' field

    Args:
        messages: Optional list of prompt messages (each a dict with 'role' and 'content').
            Pass the same messages you sent to the LLM to capture them in the dashboard.

    Example:
        msgs = [{"role": "user", "content": "Hello"}]
        response = client.chat.completions.create(model="gpt-4o", messages=msgs)
        agentpulse.track(response, messages=msgs)
    """
    if not _initialized:
        logger.warning("AgentPulse: call agentpulse.init() before tracking")
        return

    event = _extract_event_from_response(response, provider, latency_ms, task_context)
    if event:
        if messages:
            event["prompt_messages"] = [
                {"role": m.get("role", "user"), "content": m.get("content", "")}
                for m in messages if isinstance(m, dict)
            ]
        _add_event(event)


def _extract_event_from_response(response, provider=None, latency_ms=None, task_context=None) -> Optional[dict]:
    """Extract an event dict from an LLM SDK response object."""
    # Convert to dict if it's an SDK object
    if hasattr(response, "model_dump"):
        data = response.model_dump()
    elif hasattr(response, "to_dict"):
        data = response.to_dict()
    elif isinstance(response, dict):
        data = response
    else:
        # Try to read attributes directly
        data = {}
        for attr in ("model", "usage", "id", "choices", "content"):
            if hasattr(response, attr):
                val = getattr(response, attr)
                if hasattr(val, "model_dump"):
                    data[attr] = val.model_dump()
                elif hasattr(val, "__dict__"):
                    data[attr] = vars(val)
                else:
                    data[attr] = val

    if not data:
        return None

    model = data.get("model", "unknown")
    input_tokens = 0
    output_tokens = 0

    # Extract usage — handles OpenAI, Anthropic, and compatible formats
    usage = data.get("usage", {})
    if isinstance(usage, dict):
        input_tokens = usage.get("prompt_tokens") or usage.get("input_tokens") or 0
        output_tokens = usage.get("completion_tokens") or usage.get("output_tokens") or 0

        if not input_tokens and not output_tokens and usage.get("total_tokens"):
            total = usage["total_tokens"]
            input_tokens = int(total * 0.7)
            output_tokens = total - input_tokens

    # Detect provider from model name or base_url
    if not provider:
        if "claude" in model.lower():
            provider = "anthropic"
        elif "gpt" in model.lower() or "o1" in model.lower() or "o3" in model.lower():
            provider = "openai"
        elif "minimax" in model.lower() or "abab" in model.lower():
            provider = "minimax"
        elif "gemini" in model.lower():
            provider = "google"
        elif "mistral" in model.lower() or "mixtral" in model.lower():
            provider = "mistral"
        elif "deepseek" in model.lower():
            provider = "deepseek"
        elif "grok" in model.lower():
            provider = "xai"
        elif "llama" in model.lower():
            provider = "meta"
        elif "command" in model.lower():
            provider = "cohere"
        else:
            provider = "unknown"

    # Calculate cost from exact tokens
    cost = estimate_cost(model, input_tokens, output_tokens)

    # Extract prompt messages if available
    prompt_messages = []
    response_text = None
    tools_used = []

    # OpenAI format
    choices = data.get("choices", [])
    if choices and isinstance(choices, list):
        first = choices[0] if choices else {}
        if isinstance(first, dict):
            msg = first.get("message", {})
            if isinstance(msg, dict):
                response_text = msg.get("content")
                # Extract tool calls
                tool_calls = msg.get("tool_calls", [])
                if tool_calls and isinstance(tool_calls, list):
                    for tc in tool_calls:
                        if isinstance(tc, dict):
                            func = tc.get("function", {})
                            if isinstance(func, dict) and func.get("name"):
                                tools_used.append(func["name"])

    # Anthropic format
    content_blocks = data.get("content", [])
    if content_blocks and isinstance(content_blocks, list):
        if not response_text:
            parts = []
            for block in content_blocks:
                if isinstance(block, dict) and block.get("type") == "text":
                    parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    parts.append(block)
            if parts:
                response_text = "\n".join(parts)
        # Extract Anthropic tool_use blocks
        for block in content_blocks:
            if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("name"):
                tools_used.append(block["name"])

    return {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "provider": provider,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": round(cost, 6),
        "latency_ms": latency_ms,
        "status": "success",
        "error_message": None,
        "task_context": task_context or _global_task_context,
        "tools_used": tools_used,
        "prompt_messages": prompt_messages,
        "response_text": response_text,
        "user_id": _global_user_id,
    }


# ── Streaming wrappers ──

class _OpenAIStreamWrapper:
    """Wraps an OpenAI streaming response to capture metrics when stream completes."""

    def __init__(self, stream, kwargs, provider, start_time):
        self._stream = stream
        self._kwargs = kwargs
        self._provider = provider
        self._start_time = start_time
        self._content_parts = []
        self._tool_names = []
        self._model = kwargs.get("model", "unknown")
        self._input_tokens = 0
        self._output_tokens = 0

    def __getattr__(self, name):
        return getattr(self._stream, name)

    def __iter__(self):
        try:
            for chunk in self._stream:
                self._process_chunk(chunk)
                yield chunk
        finally:
            self._emit_event()

    def __enter__(self):
        if hasattr(self._stream, "__enter__"):
            self._stream.__enter__()
        return self

    def __exit__(self, *args):
        if hasattr(self._stream, "__exit__"):
            return self._stream.__exit__(*args)

    def _process_chunk(self, chunk):
        try:
            if hasattr(chunk, "model") and chunk.model:
                self._model = chunk.model
            if hasattr(chunk, "choices") and chunk.choices:
                delta = getattr(chunk.choices[0], "delta", None)
                if delta:
                    content = getattr(delta, "content", None)
                    if content:
                        self._content_parts.append(content)
                    tool_calls = getattr(delta, "tool_calls", None)
                    if tool_calls:
                        for tc in tool_calls:
                            func = getattr(tc, "function", None)
                            if func:
                                name = getattr(func, "name", None)
                                if name and name not in self._tool_names:
                                    self._tool_names.append(name)
            if hasattr(chunk, "usage") and chunk.usage:
                usage = chunk.usage
                self._input_tokens = getattr(usage, "prompt_tokens", 0) or 0
                self._output_tokens = getattr(usage, "completion_tokens", 0) or 0
        except Exception:
            pass

    def _emit_event(self):
        try:
            latency = int((time.time() - self._start_time) * 1000)
            response_text = "".join(self._content_parts) if self._content_parts else None

            # Estimate tokens from text if usage not available (stream without include_usage)
            if not self._input_tokens and not self._output_tokens:
                prompt_text = " ".join(
                    m.get("content", "") for m in self._kwargs.get("messages", [])
                    if isinstance(m, dict) and m.get("content")
                )
                self._input_tokens = max(1, len(prompt_text) // 4) if prompt_text else 0
                self._output_tokens = max(1, len(response_text) // 4) if response_text else 0

            cost = estimate_cost(self._model, self._input_tokens, self._output_tokens)

            _add_event({
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "provider": self._provider,
                "model": self._model,
                "input_tokens": self._input_tokens,
                "output_tokens": self._output_tokens,
                "cost_usd": round(cost, 6),
                "latency_ms": latency,
                "status": "success",
                "error_message": None,
                "task_context": _global_task_context,
                "tools_used": self._tool_names,
                "prompt_messages": _extract_prompt_messages(self._kwargs),
                "response_text": response_text,
                "user_id": _global_user_id,
            })
        except Exception as e:
            logger.debug(f"AgentPulse: error finalizing stream event: {e}")


class _OpenAIAsyncStreamWrapper:
    """Wraps an OpenAI async streaming response to capture metrics."""

    def __init__(self, stream, kwargs, provider, start_time):
        self._stream = stream
        self._kwargs = kwargs
        self._provider = provider
        self._start_time = start_time
        self._content_parts = []
        self._tool_names = []
        self._model = kwargs.get("model", "unknown")
        self._input_tokens = 0
        self._output_tokens = 0

    def __getattr__(self, name):
        return getattr(self._stream, name)

    async def __aiter__(self):
        try:
            async for chunk in self._stream:
                self._process_chunk(chunk)
                yield chunk
        finally:
            self._emit_event()

    async def __aenter__(self):
        if hasattr(self._stream, "__aenter__"):
            await self._stream.__aenter__()
        return self

    async def __aexit__(self, *args):
        if hasattr(self._stream, "__aexit__"):
            return await self._stream.__aexit__(*args)

    # Reuse same chunk processing and event emission
    _process_chunk = _OpenAIStreamWrapper._process_chunk
    _emit_event = _OpenAIStreamWrapper._emit_event


class _AnthropicStreamWrapper:
    """Wraps an Anthropic streaming response to capture metrics."""

    def __init__(self, stream, kwargs, start_time):
        self._stream = stream
        self._kwargs = kwargs
        self._start_time = start_time
        self._content_parts = []
        self._tool_names = []
        self._model = kwargs.get("model", "unknown")
        self._input_tokens = 0
        self._output_tokens = 0

    def __getattr__(self, name):
        return getattr(self._stream, name)

    def __iter__(self):
        try:
            for event in self._stream:
                self._process_chunk(event)
                yield event
        finally:
            self._emit_event()

    def __enter__(self):
        if hasattr(self._stream, "__enter__"):
            self._stream.__enter__()
        return self

    def __exit__(self, *args):
        if hasattr(self._stream, "__exit__"):
            return self._stream.__exit__(*args)

    def _process_chunk(self, event):
        try:
            event_type = getattr(event, "type", "")
            if event_type == "message_start":
                msg = getattr(event, "message", None)
                if msg:
                    self._model = getattr(msg, "model", self._model)
                    usage = getattr(msg, "usage", None)
                    if usage:
                        self._input_tokens = getattr(usage, "input_tokens", 0) or 0
            elif event_type == "content_block_delta":
                delta = getattr(event, "delta", None)
                if delta:
                    text = getattr(delta, "text", None)
                    if text:
                        self._content_parts.append(text)
            elif event_type == "content_block_start":
                block = getattr(event, "content_block", None)
                if block and getattr(block, "type", "") == "tool_use":
                    name = getattr(block, "name", None)
                    if name and name not in self._tool_names:
                        self._tool_names.append(name)
            elif event_type == "message_delta":
                usage = getattr(event, "usage", None)
                if usage:
                    self._output_tokens = getattr(usage, "output_tokens", 0) or 0
        except Exception:
            pass

    def _emit_event(self):
        try:
            latency = int((time.time() - self._start_time) * 1000)
            response_text = "".join(self._content_parts) if self._content_parts else None

            if not self._input_tokens and not self._output_tokens:
                prompt_text = " ".join(
                    m.get("content", "") for m in self._kwargs.get("messages", [])
                    if isinstance(m, dict) and m.get("content")
                )
                self._input_tokens = max(1, len(prompt_text) // 4) if prompt_text else 0
                self._output_tokens = max(1, len(response_text) // 4) if response_text else 0

            cost = estimate_cost(self._model, self._input_tokens, self._output_tokens)

            _add_event({
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "provider": "anthropic",
                "model": self._model,
                "input_tokens": self._input_tokens,
                "output_tokens": self._output_tokens,
                "cost_usd": round(cost, 6),
                "latency_ms": latency,
                "status": "success",
                "error_message": None,
                "task_context": _global_task_context,
                "tools_used": self._tool_names,
                "prompt_messages": _extract_anthropic_messages(self._kwargs),
                "response_text": response_text,
                "user_id": _global_user_id,
            })
        except Exception as e:
            logger.debug(f"AgentPulse: error finalizing stream event: {e}")


class _AnthropicAsyncStreamWrapper:
    """Wraps an Anthropic async streaming response to capture metrics."""

    def __init__(self, stream, kwargs, start_time):
        self._stream = stream
        self._kwargs = kwargs
        self._start_time = start_time
        self._content_parts = []
        self._tool_names = []
        self._model = kwargs.get("model", "unknown")
        self._input_tokens = 0
        self._output_tokens = 0

    def __getattr__(self, name):
        return getattr(self._stream, name)

    async def __aiter__(self):
        try:
            async for event in self._stream:
                self._process_chunk(event)
                yield event
        finally:
            self._emit_event()

    async def __aenter__(self):
        if hasattr(self._stream, "__aenter__"):
            await self._stream.__aenter__()
        return self

    async def __aexit__(self, *args):
        if hasattr(self._stream, "__aexit__"):
            return await self._stream.__aexit__(*args)

    _process_chunk = _AnthropicStreamWrapper._process_chunk
    _emit_event = _AnthropicStreamWrapper._emit_event


# ── Auto-instrumentation ──

_patched = set()


def auto_instrument():
    """Automatically instrument all LLM SDK calls.

    Patches:
    - OpenAI SDK (v1.x) — covers OpenAI, MiniMax, Together, Groq, Fireworks, etc.
    - Anthropic SDK
    """
    if not _initialized:
        logger.warning("AgentPulse: call agentpulse.init() before auto_instrument()")
        return

    _patch_openai()
    _patch_anthropic()
    logger.info("AgentPulse: auto-instrumentation active")


def _patch_openai():
    """Patch the OpenAI SDK to capture all chat completion calls."""
    if "openai" in _patched:
        return

    try:
        from openai.resources.chat import completions as chat_mod
    except ImportError:
        logger.debug("AgentPulse: openai SDK not installed, skipping patch")
        return

    original_create = chat_mod.Completions.create

    def patched_create(self, *args, **kwargs):
        start = time.time()
        error_msg = None
        status = "success"
        try:
            response = original_create(self, *args, **kwargs)
        except Exception as e:
            error_msg = str(e)
            status = "rate_limit" if "rate" in str(e).lower() and "limit" in str(e).lower() else "error"
            _add_event({
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "provider": _detect_provider_from_client(self, kwargs),
                "model": kwargs.get("model", "unknown"),
                "input_tokens": 0,
                "output_tokens": 0,
                "cost_usd": 0,
                "latency_ms": int((time.time() - start) * 1000),
                "status": status,
                "error_message": error_msg,
                "task_context": _global_task_context,
                "tools_used": [],
                "prompt_messages": _extract_prompt_messages(kwargs),
                "response_text": None,
                "user_id": _global_user_id,
            })
            raise

        latency = int((time.time() - start) * 1000)
        provider = _detect_provider_from_client(self, kwargs)

        # Wrap streaming responses to capture metrics when stream completes
        if kwargs.get("stream"):
            return _OpenAIStreamWrapper(response, kwargs, provider, start)

        event = _extract_event_from_response(
            response,
            provider=provider,
            latency_ms=latency,
        )
        if event:
            event["prompt_messages"] = _extract_prompt_messages(kwargs)
            _add_event(event)

        return response

    chat_mod.Completions.create = patched_create
    _patched.add("openai")
    logger.debug("AgentPulse: patched OpenAI SDK")

    # Also patch async version if available
    try:
        original_async = chat_mod.AsyncCompletions.create

        async def patched_async_create(self, *args, **kwargs):
            start = time.time()
            try:
                response = await original_async(self, *args, **kwargs)
            except Exception as e:
                error_msg = str(e)
                status = "rate_limit" if "rate" in str(e).lower() and "limit" in str(e).lower() else "error"
                _add_event({
                    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    "provider": _detect_provider_from_client(self, kwargs),
                    "model": kwargs.get("model", "unknown"),
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cost_usd": 0,
                    "latency_ms": int((time.time() - start) * 1000),
                    "status": status,
                    "error_message": error_msg,
                    "task_context": None,
                    "tools_used": [],
                    "prompt_messages": _extract_prompt_messages(kwargs),
                    "response_text": None,
                })
                raise

            latency = int((time.time() - start) * 1000)
            provider = _detect_provider_from_client(self, kwargs)

            if kwargs.get("stream"):
                return _OpenAIAsyncStreamWrapper(response, kwargs, provider, start)

            event = _extract_event_from_response(
                response,
                provider=provider,
                latency_ms=latency,
            )
            if event:
                event["prompt_messages"] = _extract_prompt_messages(kwargs)
                _add_event(event)

            return response

        chat_mod.AsyncCompletions.create = patched_async_create
        logger.debug("AgentPulse: patched OpenAI async SDK")
    except (AttributeError, ImportError):
        pass


def _patch_anthropic():
    """Patch the Anthropic SDK to capture all message creation calls."""
    if "anthropic" in _patched:
        return

    try:
        from anthropic.resources import messages as messages_mod
    except ImportError:
        logger.debug("AgentPulse: anthropic SDK not installed, skipping patch")
        return

    original_create = messages_mod.Messages.create

    def patched_create(self, *args, **kwargs):
        start = time.time()
        try:
            response = original_create(self, *args, **kwargs)
        except Exception as e:
            error_msg = str(e)
            status = "rate_limit" if "rate" in str(e).lower() and "limit" in str(e).lower() else "error"
            _add_event({
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "provider": "anthropic",
                "model": kwargs.get("model", "unknown"),
                "input_tokens": 0,
                "output_tokens": 0,
                "cost_usd": 0,
                "latency_ms": int((time.time() - start) * 1000),
                "status": status,
                "error_message": error_msg,
                "task_context": _global_task_context,
                "tools_used": [],
                "prompt_messages": _extract_anthropic_messages(kwargs),
                "response_text": None,
                "user_id": _global_user_id,
            })
            raise

        latency = int((time.time() - start) * 1000)

        if kwargs.get("stream"):
            return _AnthropicStreamWrapper(response, kwargs, start)

        event = _extract_event_from_response(response, provider="anthropic", latency_ms=latency)
        if event:
            event["prompt_messages"] = _extract_anthropic_messages(kwargs)
            _add_event(event)

        return response

    messages_mod.Messages.create = patched_create
    _patched.add("anthropic")
    logger.debug("AgentPulse: patched Anthropic SDK")

    # Async version
    try:
        original_async = messages_mod.AsyncMessages.create

        async def patched_async_create(self, *args, **kwargs):
            start = time.time()
            try:
                response = await original_async(self, *args, **kwargs)
            except Exception as e:
                error_msg = str(e)
                status = "rate_limit" if "rate" in str(e).lower() and "limit" in str(e).lower() else "error"
                _add_event({
                    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    "provider": "anthropic",
                    "model": kwargs.get("model", "unknown"),
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cost_usd": 0,
                    "latency_ms": int((time.time() - start) * 1000),
                    "status": status,
                    "error_message": error_msg,
                    "task_context": None,
                    "tools_used": [],
                    "prompt_messages": _extract_anthropic_messages(kwargs),
                    "response_text": None,
                })
                raise

            latency = int((time.time() - start) * 1000)

            if kwargs.get("stream"):
                return _AnthropicAsyncStreamWrapper(response, kwargs, start)

            event = _extract_event_from_response(response, provider="anthropic", latency_ms=latency)
            if event:
                event["prompt_messages"] = _extract_anthropic_messages(kwargs)
                _add_event(event)

            return response

        messages_mod.AsyncMessages.create = patched_async_create
        logger.debug("AgentPulse: patched Anthropic async SDK")
    except (AttributeError, ImportError):
        pass


# ── Helpers ──

def _detect_provider_from_client(completions_self, kwargs) -> str:
    """Try to detect the provider from the OpenAI client's base_url."""
    try:
        # Walk up: Completions -> Chat -> client
        client = completions_self._client
        base_url = str(getattr(client, "base_url", ""))

        if "minimax" in base_url.lower():
            return "minimax"
        elif "together" in base_url.lower():
            return "together"
        elif "groq" in base_url.lower():
            return "groq"
        elif "fireworks" in base_url.lower():
            return "fireworks"
        elif "deepseek" in base_url.lower():
            return "deepseek"
        elif "perplexity" in base_url.lower():
            return "perplexity"
        elif "openai" in base_url.lower() or "api.openai" in base_url.lower():
            return "openai"
    except Exception:
        pass

    # Fallback: detect from model name
    model = kwargs.get("model", "")
    if "claude" in model.lower():
        return "anthropic"
    if "minimax" in model.lower() or "abab" in model.lower():
        return "minimax"
    if "deepseek" in model.lower():
        return "deepseek"
    if "llama" in model.lower():
        return "meta"
    return "openai"


def _extract_prompt_messages(kwargs) -> list:
    """Extract prompt messages from OpenAI-style kwargs."""
    messages = kwargs.get("messages", [])
    result = []
    for msg in messages:
        if isinstance(msg, dict):
            result.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })
    return result


def _extract_anthropic_messages(kwargs) -> list:
    """Extract prompt messages from Anthropic-style kwargs."""
    messages = kwargs.get("messages", [])
    result = []

    # System prompt
    system = kwargs.get("system")
    if system:
        result.append({"role": "system", "content": system})

    for msg in messages:
        if isinstance(msg, dict):
            content = msg.get("content", "")
            if isinstance(content, list):
                # Anthropic content blocks
                text_parts = []
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        text_parts.append(block.get("text", ""))
                content = "\n".join(text_parts)
            result.append({
                "role": msg.get("role", "user"),
                "content": content,
            })
    return result
