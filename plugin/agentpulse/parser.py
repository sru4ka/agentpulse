import re
from datetime import datetime
from typing import Optional

# Patterns for OpenClaw gateway logs
MODEL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+agent model:\s+(.+)')
ERROR_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(error|Error|ERROR|rate.limit|Rate.limit|auth.error|timeout)', re.IGNORECASE)
TOOL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\].*tool[_\s]*(call|result|use).*?:\s*(\w+)', re.IGNORECASE)
TOKEN_PATTERN = re.compile(r'tokens?[:\s]+(\d+)', re.IGNORECASE)
LATENCY_PATTERN = re.compile(r'(\d+)\s*ms|latency[:\s]+(\d+)', re.IGNORECASE)

# Model pricing per million tokens
MODEL_PRICING = {
    "minimax/MiniMax-M2.5": {"input": 15, "output": 120},
    "MiniMax-M2.5": {"input": 15, "output": 120},
    "anthropic/claude-sonnet-4-5": {"input": 3, "output": 15},
    "claude-sonnet-4-5": {"input": 3, "output": 15},
    "anthropic/claude-haiku-3.5": {"input": 0.80, "output": 4},
    "openai/gpt-4o": {"input": 2.50, "output": 10},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60},
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
        }

    return None
