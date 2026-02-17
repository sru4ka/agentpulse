"""Tests for agentpulse.sdk — event extraction and tracking."""

import pytest
from agentpulse.sdk import (
    _extract_event_from_response,
    _extract_prompt_messages,
    _extract_anthropic_messages,
    _detect_provider_from_client,
)


class TestExtractEvent:
    def test_openai_dict_response(self):
        resp = {
            "model": "gpt-4o",
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "total_tokens": 150,
            },
            "choices": [
                {"message": {"role": "assistant", "content": "Hello there!"}}
            ],
        }
        event = _extract_event_from_response(resp)
        assert event is not None
        assert event["model"] == "gpt-4o"
        assert event["input_tokens"] == 100
        assert event["output_tokens"] == 50
        assert event["provider"] == "openai"
        assert event["status"] == "success"
        assert event["response_text"] == "Hello there!"
        assert event["cost_usd"] > 0

    def test_anthropic_dict_response(self):
        resp = {
            "model": "claude-sonnet-4-5",
            "usage": {
                "input_tokens": 200,
                "output_tokens": 80,
            },
            "content": [
                {"type": "text", "text": "Here is the answer."}
            ],
        }
        event = _extract_event_from_response(resp)
        assert event is not None
        assert event["model"] == "claude-sonnet-4-5"
        assert event["input_tokens"] == 200
        assert event["output_tokens"] == 80
        assert event["provider"] == "anthropic"
        assert event["response_text"] == "Here is the answer."

    def test_provider_detection(self):
        cases = [
            ("claude-sonnet-4", "anthropic"),
            ("gpt-4o-mini", "openai"),
            ("o3-mini", "openai"),
            ("minimax-m1", "minimax"),
            ("gemini-2.0-flash", "google"),
            ("mistral-large", "mistral"),
            ("deepseek-chat", "deepseek"),
            ("grok-3", "xai"),
            ("llama-3.1-70b", "meta"),
            ("command-r-plus", "cohere"),
        ]
        for model, expected_provider in cases:
            resp = {"model": model, "usage": {"prompt_tokens": 10, "completion_tokens": 5}}
            event = _extract_event_from_response(resp)
            assert event["provider"] == expected_provider, f"Expected {expected_provider} for {model}, got {event['provider']}"

    def test_empty_response(self):
        # Empty dict has no data to extract — returns None
        event = _extract_event_from_response({})
        assert event is None

    def test_total_tokens_fallback(self):
        resp = {"model": "gpt-4", "usage": {"total_tokens": 100}}
        event = _extract_event_from_response(resp)
        assert event["input_tokens"] + event["output_tokens"] == 100


class TestExtractPromptMessages:
    def test_openai_messages(self):
        kwargs = {
            "messages": [
                {"role": "system", "content": "You are helpful."},
                {"role": "user", "content": "Hi"},
            ]
        }
        msgs = _extract_prompt_messages(kwargs)
        assert len(msgs) == 2
        assert msgs[0]["role"] == "system"
        assert msgs[1]["content"] == "Hi"

    def test_empty_messages(self):
        assert _extract_prompt_messages({}) == []
        assert _extract_prompt_messages({"messages": []}) == []


class TestExtractAnthropicMessages:
    def test_with_system(self):
        kwargs = {
            "system": "You are a coding assistant.",
            "messages": [
                {"role": "user", "content": "Write a function"},
            ],
        }
        msgs = _extract_anthropic_messages(kwargs)
        assert len(msgs) == 2
        assert msgs[0]["role"] == "system"
        assert msgs[0]["content"] == "You are a coding assistant."

    def test_content_blocks(self):
        kwargs = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Part 1"},
                        {"type": "text", "text": "Part 2"},
                    ],
                }
            ]
        }
        msgs = _extract_anthropic_messages(kwargs)
        assert len(msgs) == 1
        assert "Part 1" in msgs[0]["content"]
        assert "Part 2" in msgs[0]["content"]

    def test_no_system(self):
        kwargs = {"messages": [{"role": "user", "content": "Hello"}]}
        msgs = _extract_anthropic_messages(kwargs)
        assert len(msgs) == 1
        assert msgs[0]["role"] == "user"
