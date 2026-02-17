import os
import glob as globmod
import yaml
from pathlib import Path

DEFAULT_CONFIG_PATH = os.path.expanduser("~/.openclaw/agentpulse.yaml")


def detect_openclaw_log_path() -> str:
    """Auto-detect OpenClaw log directory.

    OpenClaw writes logs to /tmp/openclaw-<UID>/ where UID is the user id
    of the process. Try the current user's UID first, then fall back to
    scanning /tmp for any openclaw-* directory that contains log files.
    """
    # Try current user's UID first
    uid_path = f"/tmp/openclaw-{os.getuid()}/"
    if os.path.isdir(uid_path):
        return uid_path

    # Scan for any openclaw-* directory with log files
    candidates = sorted(globmod.glob("/tmp/openclaw-*/"), key=os.path.getmtime, reverse=True)
    for candidate in candidates:
        if globmod.glob(os.path.join(candidate, "openclaw-*.log")):
            return candidate

    # Legacy path (older OpenClaw versions)
    if os.path.isdir("/tmp/openclaw/"):
        return "/tmp/openclaw/"

    return f"/tmp/openclaw-{os.getuid()}/"


DEFAULT_CONFIG = {
    "api_key": "",
    "endpoint": "https://agentpulses.com/api/events",
    "agent_name": "default",
    "framework": "openclaw",
    "log_path": "",  # auto-detected at load time
    "poll_interval": 5,
    "batch_interval": 30,
    "proxy_enabled": False,
    "proxy_port": 8787,
}

def load_config(path: str = DEFAULT_CONFIG_PATH) -> dict:
    if os.path.exists(path):
        with open(path, "r") as f:
            config = yaml.safe_load(f) or {}
        merged = {**DEFAULT_CONFIG, **config}
    else:
        merged = DEFAULT_CONFIG.copy()

    # Auto-detect log path if not explicitly configured
    if not merged.get("log_path"):
        merged["log_path"] = detect_openclaw_log_path()

    return merged

def save_config(config: dict, path: str = DEFAULT_CONFIG_PATH):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
