import re
from datetime import datetime
from typing import Optional

# Patterns for OpenClaw gateway logs
MODEL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+agent model:\s+(.+)')
ERROR_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(error|Error|ERROR|rate.limit|Rate.limit|auth.error|timeout)', re.IGNORECASE)
TOOL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\].*tool[_\s]*(call|result|use).*?:\s*(\w+)', re.IGNORECASE)
TOKEN_PATTERN = re.compile(r'tokens?[:\s]+(\d+)', re.IGNORECASE)
LATENCY_PATTERN = re.compile(r'(\d+)\s*ms|latency[:\s]+(\d+)', re.IGNORECASE)

# Patterns for capturing prompts and responses
PROMPT_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(?:prompt|user|input|message|request):\s*(.*)', re.IGNORECASE)
RESPONSE_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(?:response|assistant|output|completion):\s*(.*)', re.IGNORECASE)
TOOL_CALL_DETAIL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+tool[_\s]*(call|invoke|use)[:\s]+(\w+)\s*(?:\((.*?)\))?', re.IGNORECASE)
SYSTEM_PROMPT_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(?:system|system_prompt|instructions):\s*(.*)', re.IGNORECASE)

# Model pricing per million tokens
MODEL_PRICING = {
    "minimax/MiniMax-M2.5": {"input": 15, "output": 120},
    "MiniMax-M2.5": {"input": 15, "output": 120},
    "anthropic/claude-sonnet-4-5": {"input": 3, "output": 15},
    "claude-sonnet-4-5": {"input": 3, "output": 15},
    "anthropic/claude-haiku-3.5": {"input": 0.80, "output": 4},
    "anthropic/claude-opus-4": {"input": 15, "output": 75},
    "claude-opus-4": {"input": 15, "output": 75},
    "openai/gpt-4o": {"input": 2.50, "output": 10},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "openai/o3-mini": {"input": 1.10, "output": 4.40},
}

def estimate_tokens(line: str) -> tuple[int, int]:
    """Rough token estimation from log line content."""
    # Very rough: ~4 chars per token for English text
    content_length = len(line)
    input_tokens = max(100, content_length // 4)
    output_tokens = max(50, input_tokens // 3)
    return input_tokens, output_tokens

def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost from model pricing."""
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        # Try partial match
        for key, val in MODEL_PRICING.items():
            if key.lower() in model.lower() or model.lower() in key.lower():
                pricing = val
                break
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

        input_tokens, output_tokens = estimate_tokens(line)
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
