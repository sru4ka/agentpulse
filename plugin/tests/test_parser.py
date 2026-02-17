"""Tests for agentpulse.parser — model pricing, cost calculation, and log parsing."""

import json
import pytest
from agentpulse.parser import (
    estimate_cost,
    _lookup_pricing,
    extract_usage_from_api_response,
    parse_openclaw_line,
    MODEL_PRICING,
)


# ── Pricing lookup ──

class TestLookupPricing:
    def test_exact_match(self):
        p = _lookup_pricing("gpt-4o")
        assert p is not None
        assert p["input"] == 2.50
        assert p["output"] == 10

    def test_provider_prefix_stripped(self):
        p = _lookup_pricing("anthropic/claude-sonnet-4")
        assert p is not None
        assert p["input"] == 3

    def test_fuzzy_match(self):
        p = _lookup_pricing("claude-sonnet-4-5-20250929")
        assert p is not None
        assert p["input"] == 3

    def test_unknown_model_returns_none(self):
        assert _lookup_pricing("totally-fake-model-xyz") is None

    def test_all_known_models_have_both_fields(self):
        for model, pricing in MODEL_PRICING.items():
            assert "input" in pricing, f"{model} missing 'input'"
            assert "output" in pricing, f"{model} missing 'output'"
            assert pricing["input"] >= 0
            assert pricing["output"] >= 0


# ── Cost estimation ──

class TestEstimateCost:
    def test_gpt4o_cost(self):
        # 1M input tokens at $2.50 + 1M output tokens at $10 = $12.50
        cost = estimate_cost("gpt-4o", 1_000_000, 1_000_000)
        assert abs(cost - 12.50) < 0.01

    def test_claude_sonnet_cost(self):
        # 1000 input at $3/M + 500 output at $15/M
        cost = estimate_cost("claude-sonnet-4-5", 1000, 500)
        expected = (1000 / 1e6) * 3 + (500 / 1e6) * 15
        assert abs(cost - expected) < 1e-6

    def test_zero_tokens(self):
        assert estimate_cost("gpt-4o", 0, 0) == 0.0

    def test_unknown_model_returns_zero(self):
        assert estimate_cost("unknown-model", 1000, 1000) == 0.0

    def test_large_token_count(self):
        cost = estimate_cost("claude-opus-4", 10_000_000, 5_000_000)
        expected = (10_000_000 / 1e6) * 15 + (5_000_000 / 1e6) * 75
        assert abs(cost - expected) < 0.01


# ── Extract usage from API responses ──

class TestExtractUsage:
    def test_openai_response(self):
        resp = {
            "model": "gpt-4o",
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "total_tokens": 150,
            },
        }
        usage = extract_usage_from_api_response(resp)
        assert usage is not None
        assert usage["input_tokens"] == 100
        assert usage["output_tokens"] == 50
        assert usage["model"] == "gpt-4o"

    def test_anthropic_response(self):
        resp = {
            "model": "claude-sonnet-4-5",
            "usage": {
                "input_tokens": 200,
                "output_tokens": 80,
            },
        }
        usage = extract_usage_from_api_response(resp)
        assert usage is not None
        assert usage["input_tokens"] == 200
        assert usage["output_tokens"] == 80

    def test_gemini_response(self):
        resp = {
            "usageMetadata": {
                "promptTokenCount": 300,
                "candidatesTokenCount": 120,
                "totalTokenCount": 420,
            }
        }
        usage = extract_usage_from_api_response(resp)
        assert usage is not None
        assert usage["input_tokens"] == 300
        assert usage["output_tokens"] == 120

    def test_cohere_response(self):
        resp = {
            "meta": {
                "tokens": {
                    "input_tokens": 50,
                    "output_tokens": 30,
                }
            }
        }
        usage = extract_usage_from_api_response(resp)
        assert usage is not None
        assert usage["input_tokens"] == 50
        assert usage["output_tokens"] == 30

    def test_empty_response(self):
        assert extract_usage_from_api_response({}) is None

    def test_total_only_fallback(self):
        resp = {"usage": {"total_tokens": 100}}
        usage = extract_usage_from_api_response(resp)
        assert usage is not None
        assert usage["input_tokens"] + usage["output_tokens"] == 100


# ── OpenClaw log line parsing ──

class TestParseOpenclawLine:
    def test_run_start(self):
        line = json.dumps({
            "0": '{"subsystem":"agent"}',
            "1": "embedded run start: runId=abc123 sessionId=sess1 provider=anthropic model=claude-haiku-4-5 thinking=low messageChannel=unknown",
            "_meta": {"date": "2025-01-01T00:00:00Z"},
        })
        result = parse_openclaw_line(line)
        assert result is not None
        assert result["type"] == "run_start"
        assert result["run_id"] == "abc123"
        assert result["provider"] == "anthropic"
        assert result["model"] == "claude-haiku-4-5"

    def test_prompt_end(self):
        line = json.dumps({
            "0": "agent",
            "1": "embedded run prompt end: runId=abc123 sessionId=sess1 durationMs=5000",
            "_meta": {"date": "2025-01-01T00:00:05Z"},
        })
        result = parse_openclaw_line(line)
        assert result is not None
        assert result["type"] == "prompt_end"
        assert result["duration_ms"] == 5000

    def test_run_done(self):
        line = json.dumps({
            "0": "agent",
            "1": "embedded run done: runId=abc123 sessionId=sess1 durationMs=10000 aborted=false",
            "_meta": {"date": "2025-01-01T00:00:10Z"},
        })
        result = parse_openclaw_line(line)
        assert result is not None
        assert result["type"] == "run_done"
        assert result["aborted"] is False

    def test_tool_start(self):
        line = json.dumps({
            "0": "agent",
            "1": "embedded run tool start: runId=abc123 tool=exec toolCallId=tc1",
            "_meta": {"date": "2025-01-01T00:00:01Z"},
        })
        result = parse_openclaw_line(line)
        assert result is not None
        assert result["type"] == "tool_start"
        assert result["tool"] == "exec"

    def test_tool_end(self):
        line = json.dumps({
            "0": "agent",
            "1": "embedded run tool end: runId=abc123 tool=exec toolCallId=tc1",
            "_meta": {"date": "2025-01-01T00:00:02Z"},
        })
        result = parse_openclaw_line(line)
        assert result is not None
        assert result["type"] == "tool_end"

    def test_tool_error(self):
        line = json.dumps({
            "0": "agent",
            "1": "[tools] edit failed: file not found",
            "_meta": {"date": "2025-01-01", "logLevelName": "WARN"},
        })
        result = parse_openclaw_line(line)
        assert result is not None
        assert result["type"] == "tool_error"
        assert "file not found" in result["error"]

    def test_error_level_line(self):
        line = json.dumps({
            "0": "agent",
            "1": "something broke badly",
            "_meta": {"date": "2025-01-01", "logLevelName": "ERROR"},
        })
        result = parse_openclaw_line(line)
        assert result is not None
        assert result["type"] == "error"

    def test_usage_in_message(self):
        line = json.dumps({
            "0": "agent",
            "1": '"prompt_tokens": 500, "completion_tokens": 200',
            "_meta": {"date": "2025-01-01"},
        })
        result = parse_openclaw_line(line)
        assert result is not None
        assert result["type"] == "usage"
        assert result["input_tokens"] == 500
        assert result["output_tokens"] == 200

    def test_empty_line(self):
        assert parse_openclaw_line("") is None
        assert parse_openclaw_line("   ") is None

    def test_invalid_json(self):
        assert parse_openclaw_line("not json at all") is None

    def test_uninteresting_line(self):
        line = json.dumps({
            "0": "system",
            "1": "just a normal debug message",
            "_meta": {"date": "2025-01-01", "logLevelName": "DEBUG"},
        })
        assert parse_openclaw_line(line) is None
