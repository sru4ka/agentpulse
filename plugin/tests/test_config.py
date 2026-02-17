"""Tests for agentpulse.config — configuration loading and saving."""

import os
import tempfile
import pytest
import yaml
from agentpulse.config import load_config, save_config, DEFAULT_CONFIG


class TestConfig:
    def test_load_defaults_when_no_file(self):
        config = load_config("/nonexistent/path/agentpulse.yaml")
        assert config["endpoint"] == "https://agentpulses.com/api/events"
        assert config["agent_name"] == "default"
        assert config["framework"] == "openclaw"
        assert config["proxy_enabled"] is False
        assert config["proxy_port"] == 8787

    def test_load_merges_with_defaults(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            yaml.dump({"api_key": "ap_test", "agent_name": "my-bot"}, f)
            f.flush()

            config = load_config(f.name)
            assert config["api_key"] == "ap_test"
            assert config["agent_name"] == "my-bot"
            # Defaults should still be present
            assert config["endpoint"] == "https://agentpulses.com/api/events"
            assert config["proxy_port"] == 8787

        os.unlink(f.name)

    def test_save_and_reload(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "agentpulse.yaml")
            config = {"api_key": "ap_xyz", "agent_name": "roundtrip"}
            save_config(config, path)

            loaded = load_config(path)
            assert loaded["api_key"] == "ap_xyz"
            assert loaded["agent_name"] == "roundtrip"

    def test_auto_detect_log_path(self):
        config = load_config("/nonexistent/path/agentpulse.yaml")
        # Should auto-detect — the path should be non-empty
        assert config["log_path"] != ""
        assert "openclaw" in config["log_path"]

    def test_explicit_log_path_not_overridden(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            yaml.dump({"log_path": "/custom/logs/"}, f)
            f.flush()

            config = load_config(f.name)
            assert config["log_path"] == "/custom/logs/"

        os.unlink(f.name)

    def test_save_creates_parent_dirs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "deep", "nested", "agentpulse.yaml")
            save_config({"api_key": "test"}, path)
            assert os.path.exists(path)
