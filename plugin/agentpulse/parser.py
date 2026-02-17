import re
import json
from datetime import datetime
from typing import Optional

# Patterns for OpenClaw gateway logs
MODEL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+agent model:\s+(.+)')
ERROR_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(error|Error|ERROR|rate.limit|Rate.limit|auth.error|timeout)', re.IGNORECASE)
TOOL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\].*tool[_\s]*(call|result|use).*?:\s*(\w+)', re.IGNORECASE)
LATENCY_PATTERN = re.compile(r'(\d+)\s*ms|latency[:\s]+(\d+)', re.IGNORECASE)

# Token extraction patterns — match various gateway log formats
TOKEN_TOTAL_PATTERN = re.compile(r'(?:total[_ ])?tokens?[:\s=]+(\d+)', re.IGNORECASE)
TOKEN_INPUT_PATTERN = re.compile(r'(?:input|prompt|request)[_ ]?tokens?[:\s=]+(\d+)', re.IGNORECASE)
TOKEN_OUTPUT_PATTERN = re.compile(r'(?:output|completion|response)[_ ]?tokens?[:\s=]+(\d+)', re.IGNORECASE)
# JSON-style usage: {"prompt_tokens": 800, "completion_tokens": 434}
TOKEN_JSON_PATTERN = re.compile(r'"(?:prompt|input)[_ ]?tokens?":\s*(\d+).*?"(?:completion|output)[_ ]?tokens?":\s*(\d+)', re.IGNORECASE)
# usage line from gateway
USAGE_LINE_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(?:usage|tokens|token_usage)', re.IGNORECASE)
# JSON response block from gateway (may span multiple lines)
RESPONSE_JSON_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(?:response|api_response|result|http_response)[:\s]*(\{.*)$', re.IGNORECASE)

# Patterns for capturing prompts and responses
PROMPT_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(?:prompt|user|input|message|request):\s*(.*)', re.IGNORECASE)
RESPONSE_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(?:response|assistant|output|completion):\s*(.*)', re.IGNORECASE)
TOOL_CALL_DETAIL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+tool[_\s]*(call|invoke|use)[:\s]+(\w+)\s*(?:\((.*?)\))?', re.IGNORECASE)
SYSTEM_PROMPT_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(?:system|system_prompt|instructions):\s*(.*)', re.IGNORECASE)

# Comprehensive model pricing per million tokens (USD)
# Covers all major providers. Prices as of Feb 2026.
MODEL_PRICING = {
    # ── MiniMax ──
    "minimax/MiniMax-M2.5": {"input": 15, "output": 120},
    "MiniMax-M2.5": {"input": 15, "output": 120},
    "minimax-m1": {"input": 5, "output": 40},
    "MiniMax-Text-02": {"input": 1, "output": 5},
    "abab6.5s-chat": {"input": 1, "output": 5},
    "abab6.5-chat": {"input": 5, "output": 25},
    # ── Anthropic ──
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
    # ── OpenAI ──
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
    # ── Google ──
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-2.0-pro": {"input": 1.25, "output": 10},
    "gemini-1.5-pro": {"input": 1.25, "output": 5},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.0-pro": {"input": 0.50, "output": 1.50},
    # ── Mistral ──
    "mistral-large-latest": {"input": 2, "output": 6},
    "mistral-large": {"input": 2, "output": 6},
    "mistral-medium": {"input": 2.70, "output": 8.10},
    "mistral-small-latest": {"input": 0.20, "output": 0.60},
    "mistral-small": {"input": 0.20, "output": 0.60},
    "codestral-latest": {"input": 0.30, "output": 0.90},
    "codestral": {"input": 0.30, "output": 0.90},
    "open-mixtral-8x22b": {"input": 2, "output": 6},
    "open-mixtral-8x7b": {"input": 0.70, "output": 0.70},
    # ── Cohere ──
    "command-r-plus": {"input": 2.50, "output": 10},
    "command-r": {"input": 0.15, "output": 0.60},
    "command-r-plus-08-2024": {"input": 2.50, "output": 10},
    # ── Meta / Llama (via various providers) ──
    "llama-3.3-70b": {"input": 0.79, "output": 0.79},
    "llama-3.1-405b": {"input": 3, "output": 3},
    "llama-3.1-70b": {"input": 0.79, "output": 0.79},
    "llama-3.1-8b": {"input": 0.05, "output": 0.05},
    "llama-3-70b": {"input": 0.79, "output": 0.79},
    "llama-3-8b": {"input": 0.05, "output": 0.05},
    # ── DeepSeek ──
    "deepseek-chat": {"input": 0.14, "output": 0.28},
    "deepseek-coder": {"input": 0.14, "output": 0.28},
    "deepseek-r1": {"input": 0.55, "output": 2.19},
    "deepseek-v3": {"input": 0.27, "output": 1.10},
    # ── xAI / Grok ──
    "grok-2": {"input": 2, "output": 10},
    "grok-3": {"input": 3, "output": 15},
    "grok-3-mini": {"input": 0.30, "output": 0.50},
    # ── Amazon ──
    "amazon.nova-pro": {"input": 0.80, "output": 3.20},
    "amazon.nova-lite": {"input": 0.06, "output": 0.24},
    "amazon.nova-micro": {"input": 0.035, "output": 0.14},
    # ── Perplexity ──
    "sonar-pro": {"input": 3, "output": 15},
    "sonar": {"input": 1, "output": 1},
}

# Aliases: provider-prefixed model names resolve to the same pricing
_PROVIDER_PREFIXES = [
    "anthropic/", "openai/", "google/", "mistral/", "cohere/",
    "meta/", "deepseek/", "xai/", "minimax/", "amazon/",
    "together/", "groq/", "fireworks/", "perplexity/", "anyscale/",
]


def _lookup_pricing(model: str) -> Optional[dict]:
    """Look up pricing for a model, handling provider prefixes and fuzzy matching."""
    # Exact match
    if model in MODEL_PRICING:
        return MODEL_PRICING[model]

    # Strip provider prefix and try again
    for prefix in _PROVIDER_PREFIXES:
        if model.startswith(prefix):
            stripped = model[len(prefix):]
            if stripped in MODEL_PRICING:
                return MODEL_PRICING[stripped]

    # Fuzzy: check if model name contains a known key (or vice versa)
    model_lower = model.lower()
    for key, val in MODEL_PRICING.items():
        if key.lower() in model_lower or model_lower in key.lower():
            return val

    return None


def extract_usage_from_api_response(response_json: dict) -> Optional[dict]:
    """Extract exact token usage from an LLM API response JSON.

    Supports all major providers:
    - OpenAI / OpenAI-compatible (MiniMax, Together, Groq, Fireworks, etc.)
    - Anthropic
    - Google Gemini
    - Cohere
    - Mistral
    - Any provider that returns usage in a standard format
    """
    usage = None

    # ── OpenAI / OpenAI-compatible (MiniMax, Together, Groq, etc.) ──
    # {"usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}}
    # Anthropic also uses "usage" but with input_tokens/output_tokens
    if "usage" in response_json and isinstance(response_json["usage"], dict):
        u = response_json["usage"]
        input_t = u.get("prompt_tokens") or u.get("input_tokens") or 0
        output_t = u.get("completion_tokens") or u.get("output_tokens") or 0

        # Some responses only have total_tokens
        if not input_t and not output_t and u.get("total_tokens"):
            total = u["total_tokens"]
            input_t = int(total * 0.7)
            output_t = total - input_t

        if input_t or output_t:
            usage = {
                "input_tokens": input_t,
                "output_tokens": output_t,
                "source": "api_response",
            }
            # Capture cache info if present (Anthropic, OpenAI)
            if u.get("cache_read_input_tokens"):
                usage["cache_read_tokens"] = u["cache_read_input_tokens"]
            if u.get("cache_creation_input_tokens"):
                usage["cache_creation_tokens"] = u["cache_creation_input_tokens"]

    # ── Google Gemini ──
    # {"usageMetadata": {"promptTokenCount": 100, "candidatesTokenCount": 50}}
    if not usage and "usageMetadata" in response_json:
        um = response_json["usageMetadata"]
        input_t = um.get("promptTokenCount") or 0
        output_t = um.get("candidatesTokenCount") or 0
        if not output_t and um.get("totalTokenCount"):
            output_t = max(0, um["totalTokenCount"] - input_t)
        if input_t or output_t:
            usage = {
                "input_tokens": input_t,
                "output_tokens": max(0, output_t),
                "source": "api_response",
            }

    # ── Cohere ──
    # {"meta": {"tokens": {"input_tokens": 100, "output_tokens": 50}}}
    if not usage and "meta" in response_json and isinstance(response_json["meta"], dict):
        meta = response_json["meta"]
        if "tokens" in meta and isinstance(meta["tokens"], dict):
            t = meta["tokens"]
            input_t = t.get("input_tokens") or 0
            output_t = t.get("output_tokens") or 0
            if input_t or output_t:
                usage = {
                    "input_tokens": input_t,
                    "output_tokens": output_t,
                    "source": "api_response",
                }

    # ── Mistral ──
    # Same as OpenAI format (handled above), but check "message" wrapper
    if not usage and "message" in response_json and isinstance(response_json.get("usage"), dict):
        # Already handled by OpenAI block
        pass

    # Extract model name from response if present
    if usage:
        model = (
            response_json.get("model")
            or response_json.get("model_version")
            or response_json.get("modelVersion")
            or None
        )
        if model:
            usage["model"] = model

    return usage


def try_parse_json_in_line(line: str) -> Optional[dict]:
    """Try to extract and parse a JSON object from a log line.
    Returns the parsed dict or None."""
    # Find the first { in the line
    brace_idx = line.find("{")
    if brace_idx == -1:
        return None

    json_str = line[brace_idx:]

    # Try to find matching closing brace
    depth = 0
    for i, ch in enumerate(json_str):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(json_str[: i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def extract_tokens_from_line(line: str) -> tuple[int, int]:
    """Try to extract real token counts from a log line.
    Returns (input_tokens, output_tokens). Either may be 0 if not found."""
    input_tokens = 0
    output_tokens = 0

    # Try JSON-style first: {"prompt_tokens": 800, "completion_tokens": 434}
    json_match = TOKEN_JSON_PATTERN.search(line)
    if json_match:
        return int(json_match.group(1)), int(json_match.group(2))

    # Try to parse as a full API response JSON (e.g. gateway logged entire response)
    parsed = try_parse_json_in_line(line)
    if parsed:
        usage = extract_usage_from_api_response(parsed)
        if usage:
            return usage["input_tokens"], usage["output_tokens"]

    # Try separate input/output patterns
    input_match = TOKEN_INPUT_PATTERN.search(line)
    if input_match:
        input_tokens = int(input_match.group(1))
    output_match = TOKEN_OUTPUT_PATTERN.search(line)
    if output_match:
        output_tokens = int(output_match.group(1))

    if input_tokens or output_tokens:
        return input_tokens, output_tokens

    # Fall back to total tokens (split 70/30 input/output)
    total_match = TOKEN_TOTAL_PATTERN.search(line)
    if total_match:
        total = int(total_match.group(1))
        return int(total * 0.7), total - int(total * 0.7)

    return 0, 0


def estimate_tokens_from_content(line: str) -> tuple[int, int]:
    """Fallback: rough token estimation from log line content length.
    Only used when no real token data is available."""
    content_length = len(line)
    input_tokens = max(100, content_length // 4)
    output_tokens = max(50, input_tokens // 3)
    return input_tokens, output_tokens


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost from model pricing."""
    pricing = _lookup_pricing(model)
    if not pricing:
        return 0.0
    return (input_tokens / 1_000_000) * pricing["input"] + (output_tokens / 1_000_000) * pricing["output"]


def parse_prompt_line(line: str) -> Optional[dict]:
    """Parse a prompt/response/tool log line and return context data."""
    line = line.strip()
    if not line:
        return None

    # Check for prompt/user message
    prompt_match = PROMPT_PATTERN.match(line)
    if prompt_match:
        return {
            "type": "prompt",
            "timestamp": prompt_match.group(1),
            "content": prompt_match.group(2).strip(),
        }

    # Check for response/assistant message
    response_match = RESPONSE_PATTERN.match(line)
    if response_match:
        return {
            "type": "response",
            "timestamp": response_match.group(1),
            "content": response_match.group(2).strip(),
        }

    # Check for system prompt
    system_match = SYSTEM_PROMPT_PATTERN.match(line)
    if system_match:
        return {
            "type": "system_prompt",
            "timestamp": system_match.group(1),
            "content": system_match.group(2).strip(),
        }

    # Check for detailed tool calls
    tool_detail_match = TOOL_CALL_DETAIL_PATTERN.match(line)
    if tool_detail_match:
        return {
            "type": "tool_call",
            "timestamp": tool_detail_match.group(1),
            "tool_name": tool_detail_match.group(3),
            "tool_args": tool_detail_match.group(4) or "",
        }

    return None


def parse_usage_line(line: str) -> Optional[dict]:
    """Parse a token usage line from gateway logs.
    Returns a dict with token info to be attached to the previous model event."""
    line = line.strip()
    if not line:
        return None

    # Check if this is a gateway usage/token line
    if not USAGE_LINE_PATTERN.match(line) and not TOKEN_INPUT_PATTERN.search(line) and not TOKEN_OUTPUT_PATTERN.search(line) and not TOKEN_JSON_PATTERN.search(line):
        # Also check for lines that contain token counts but aren't model/error/prompt lines
        if not TOKEN_TOTAL_PATTERN.search(line):
            return None
        # Only consider it a usage line if it's from the gateway
        if '[gateway]' not in line:
            return None

    input_tokens, output_tokens = extract_tokens_from_line(line)
    if input_tokens > 0 or output_tokens > 0:
        return {
            "type": "usage",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
        }
    return None


def parse_json_response_start(line: str) -> Optional[str]:
    """Check if a line starts a JSON API response block.
    Returns the partial JSON string if it does, None otherwise."""
    line = line.strip()
    match = RESPONSE_JSON_PATTERN.match(line)
    if match:
        return match.group(2)

    # Also detect lines that are just raw JSON from the gateway
    if '[gateway]' in line and '{' in line:
        idx = line.find('{')
        candidate = line[idx:]
        # Must have an opening brace and look like JSON
        if candidate.startswith('{"'):
            return candidate

    return None


def parse_line(line: str) -> Optional[dict]:
    """Parse a single log line and return an event dict if it's an LLM call."""
    line = line.strip()
    if not line:
        return None

    # Check for model usage line (primary event indicator)
    model_match = MODEL_PATTERN.match(line)
    if model_match:
        timestamp = model_match.group(1)
        model = model_match.group(2).strip()
        provider = model.split("/")[0] if "/" in model else "unknown"
        model_name = model.split("/")[-1] if "/" in model else model

        # Try to extract real tokens from the model line itself
        input_tokens, output_tokens = extract_tokens_from_line(line)

        # If no real tokens found, use content-based estimation as fallback
        if input_tokens == 0 and output_tokens == 0:
            input_tokens, output_tokens = estimate_tokens_from_content(line)

        cost = estimate_cost(model, input_tokens, output_tokens)

        # Check for latency
        latency_match = LATENCY_PATTERN.search(line)
        latency_ms = None
        if latency_match:
            latency_ms = int(latency_match.group(1) or latency_match.group(2))

        return {
            "timestamp": timestamp,
            "provider": provider,
            "model": model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": round(cost, 6),
            "latency_ms": latency_ms,
            "status": "success",
            "error_message": None,
            "task_context": None,
            "tools_used": [],
            "prompt_messages": [],
            "response_text": None,
        }

    # Check for error lines
    error_match = ERROR_PATTERN.match(line)
    if error_match:
        timestamp = error_match.group(1)
        error_type = error_match.group(2).lower()

        status = "error"
        if "rate" in error_type and "limit" in error_type:
            status = "rate_limit"

        return {
            "timestamp": timestamp,
            "provider": "unknown",
            "model": "unknown",
            "input_tokens": 0,
            "output_tokens": 0,
            "cost_usd": 0,
            "latency_ms": None,
            "status": status,
            "error_message": line,
            "task_context": None,
            "tools_used": [],
            "prompt_messages": [],
            "response_text": None,
        }

    return None
