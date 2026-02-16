import os
import yaml
from pathlib import Path

DEFAULT_CONFIG_PATH = os.path.expanduser("~/.openclaw/agentpulse.yaml")

DEFAULT_CONFIG = {
    "api_key": "",
    "endpoint": "https://agentpulses.com/api/events",
    "agent_name": "default",
    "framework": "openclaw",
    "log_path": "/tmp/openclaw/",
    "poll_interval": 5,
    "batch_interval": 30,
}

def load_config(path: str = DEFAULT_CONFIG_PATH) -> dict:
    if os.path.exists(path):
        with open(path, "r") as f:
            config = yaml.safe_load(f) or {}
        return {**DEFAULT_CONFIG, **config}
    return DEFAULT_CONFIG.copy()

def save_config(config: dict, path: str = DEFAULT_CONFIG_PATH):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
