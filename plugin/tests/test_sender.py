"""Tests for agentpulse.sender — EventSender batching and flushing."""

import json
from unittest.mock import patch, MagicMock
import pytest
from agentpulse.sender import EventSender


class TestEventSender:
    def setup_method(self):
        self.sender = EventSender(
            api_key="ap_test123",
            endpoint="https://example.com/api/events",
            agent_name="test-agent",
            framework="test",
        )

    def test_add_event(self):
        self.sender.add_event({"type": "test", "model": "gpt-4o"})
        assert len(self.sender.buffer) == 1

    def test_should_flush_at_50(self):
        for i in range(49):
            self.sender.add_event({"type": "test", "index": i})
        assert not self.sender.should_flush()

        self.sender.add_event({"type": "test", "index": 49})
        assert self.sender.should_flush()

    def test_should_flush_on_interval(self):
        self.sender.add_event({"type": "test"})
        self.sender.last_send = 0  # long ago
        assert self.sender.should_flush(batch_interval=30)

    def test_should_not_flush_empty(self):
        assert not self.sender.should_flush()

    def test_flush_empty_returns_true(self):
        assert self.sender.flush() is True

    def test_flush_strips_internal_keys(self):
        self.sender.add_event({"model": "gpt-4o", "_internal": "secret", "status": "success"})

        with patch("agentpulse.sender._opener.open") as mock_open:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = b'{"success": true}'
            mock_resp.__enter__ = MagicMock(return_value=mock_resp)
            mock_resp.__exit__ = MagicMock(return_value=False)
            mock_open.return_value = mock_resp

            self.sender.flush()

            # Check the payload
            call_args = mock_open.call_args
            req = call_args[0][0]
            payload = json.loads(req.data.decode())
            assert len(payload["events"]) == 1
            assert "_internal" not in payload["events"][0]
            assert payload["events"][0]["model"] == "gpt-4o"

    def test_flush_success_clears_buffer(self):
        self.sender.add_event({"type": "test"})

        with patch("agentpulse.sender._opener.open") as mock_open:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = b'{"success": true}'
            mock_resp.__enter__ = MagicMock(return_value=mock_resp)
            mock_resp.__exit__ = MagicMock(return_value=False)
            mock_open.return_value = mock_resp

            result = self.sender.flush()
            assert result is True
            assert len(self.sender.buffer) == 0
            assert self.sender.events_sent == 1

    def test_flush_failure_keeps_buffer(self):
        self.sender.add_event({"type": "test"})

        with patch("agentpulse.sender._opener.open") as mock_open:
            mock_open.side_effect = Exception("Network error")

            result = self.sender.flush()
            assert result is False
            assert self.sender.errors == 1

    def test_payload_structure(self):
        self.sender.add_event({"model": "gpt-4o"})

        with patch("agentpulse.sender._opener.open") as mock_open:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = b'{"success": true}'
            mock_resp.__enter__ = MagicMock(return_value=mock_resp)
            mock_resp.__exit__ = MagicMock(return_value=False)
            mock_open.return_value = mock_resp

            self.sender.flush()

            req = mock_open.call_args[0][0]
            payload = json.loads(req.data.decode())
            assert payload["api_key"] == "ap_test123"
            assert payload["agent_name"] == "test-agent"
            assert payload["framework"] == "test"
            assert isinstance(payload["events"], list)
