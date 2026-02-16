#!/bin/bash
# AgentPulse Plugin Installer
# Run this on your VPS: curl -sSL https://raw.githubusercontent.com/sru4ka/agentpulse/main/plugin/install.sh | bash
# Or copy-paste this entire script

set -e

echo "=== AgentPulse Plugin Installer ==="

# Create venv if not active
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Creating virtual environment..."
    python3 -m venv ~/.agentpulse-venv
    source ~/.agentpulse-venv/bin/activate
fi

echo "Installing pyyaml..."
pip install pyyaml

# Create plugin directory
PLUGIN_DIR="/tmp/agentpulse-plugin"
rm -rf "$PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR/agentpulse"

# __init__.py
cat > "$PLUGIN_DIR/agentpulse/__init__.py" << 'PYEOF'
"""AgentPulse — AI Agent Observability Plugin"""
__version__ = "0.1.0"
PYEOF

# config.py
cat > "$PLUGIN_DIR/agentpulse/config.py" << 'PYEOF'
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

def load_config(path=DEFAULT_CONFIG_PATH):
    if os.path.exists(path):
        with open(path, "r") as f:
            config = yaml.safe_load(f) or {}
        return {**DEFAULT_CONFIG, **config}
    return DEFAULT_CONFIG.copy()

def save_config(config, path=DEFAULT_CONFIG_PATH):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
PYEOF

# parser.py
cat > "$PLUGIN_DIR/agentpulse/parser.py" << 'PYEOF'
import re

MODEL_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+agent model:\s+(.+)')
ERROR_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[gateway\]\s+(error|Error|ERROR|rate.limit|Rate.limit|auth.error|timeout)', re.IGNORECASE)

MODEL_PRICING = {
    "minimax/MiniMax-M2.5": {"input": 15, "output": 120},
    "MiniMax-M2.5": {"input": 15, "output": 120},
    "anthropic/claude-sonnet-4-5": {"input": 3, "output": 15},
    "claude-sonnet-4-5": {"input": 3, "output": 15},
    "anthropic/claude-haiku-3.5": {"input": 0.80, "output": 4},
    "openai/gpt-4o": {"input": 2.50, "output": 10},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60},
}

def estimate_cost(model, input_tokens, output_tokens):
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        for key, val in MODEL_PRICING.items():
            if key.lower() in model.lower() or model.lower() in key.lower():
                pricing = val
                break
    if not pricing:
        return 0.0
    return (input_tokens / 1_000_000) * pricing["input"] + (output_tokens / 1_000_000) * pricing["output"]

def parse_line(line):
    line = line.strip()
    if not line:
        return None

    model_match = MODEL_PATTERN.match(line)
    if model_match:
        timestamp = model_match.group(1)
        model = model_match.group(2).strip()
        provider = model.split("/")[0] if "/" in model else "unknown"
        input_tokens = max(100, len(line) // 4)
        output_tokens = max(50, input_tokens // 3)
        cost = estimate_cost(model, input_tokens, output_tokens)
        return {
            "timestamp": timestamp,
            "provider": provider,
            "model": model.split("/")[-1] if "/" in model else model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": round(cost, 6),
            "latency_ms": None,
            "status": "success",
            "error_message": None,
            "task_context": None,
            "tools_used": [],
        }

    error_match = ERROR_PATTERN.match(line)
    if error_match:
        timestamp = error_match.group(1)
        error_type = error_match.group(2).lower()
        status = "rate_limit" if "rate" in error_type and "limit" in error_type else "error"
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
PYEOF

# sender.py
cat > "$PLUGIN_DIR/agentpulse/sender.py" << 'PYEOF'
import json
import time
import logging
import urllib.request
import urllib.error

logger = logging.getLogger("agentpulse")

class EventSender:
    def __init__(self, api_key, endpoint, agent_name, framework):
        self.api_key = api_key
        self.endpoint = endpoint
        self.agent_name = agent_name
        self.framework = framework
        self.buffer = []
        self.last_send = time.time()
        self.events_sent = 0
        self.errors = 0

    def add_event(self, event):
        self.buffer.append(event)

    def should_flush(self, batch_interval=30):
        if len(self.buffer) >= 50:
            return True
        if self.buffer and (time.time() - self.last_send) >= batch_interval:
            return True
        return False

    def flush(self):
        if not self.buffer:
            return True
        payload = {
            "api_key": self.api_key,
            "agent_name": self.agent_name,
            "framework": self.framework,
            "events": self.buffer,
        }
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint, data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    self.events_sent += len(self.buffer)
                    logger.info(f"Sent {len(self.buffer)} events (total: {self.events_sent})")
                    self.buffer = []
                    self.last_send = time.time()
                    return True
                else:
                    self.errors += 1
                    logger.error(f"API returned status {resp.status}")
                    return False
        except Exception as e:
            self.errors += 1
            logger.error(f"Send failed: {e}")
            return False
PYEOF

# daemon.py
cat > "$PLUGIN_DIR/agentpulse/daemon.py" << 'PYEOF'
import os
import time
import glob
import logging
from datetime import datetime
from .config import load_config
from .parser import parse_line
from .sender import EventSender

logger = logging.getLogger("agentpulse")

class AgentPulseDaemon:
    def __init__(self, config_path=None):
        self.config = load_config(config_path) if config_path else load_config()
        self.sender = EventSender(
            api_key=self.config["api_key"],
            endpoint=self.config["endpoint"],
            agent_name=self.config["agent_name"],
            framework=self.config["framework"],
        )
        self.running = False
        self.file_positions = {}

    def get_latest_log_file(self):
        log_path = self.config["log_path"]
        today = datetime.now().strftime("%Y-%m-%d")
        today_file = os.path.join(log_path, f"openclaw-{today}.log")
        if os.path.exists(today_file):
            return today_file
        pattern = os.path.join(log_path, "openclaw-*.log")
        files = sorted(glob.glob(pattern), reverse=True)
        return files[0] if files else None

    def tail_file(self, filepath):
        if filepath not in self.file_positions:
            size = os.path.getsize(filepath)
            self.file_positions[filepath] = size
            return []
        try:
            with open(filepath, "r") as f:
                f.seek(self.file_positions[filepath])
                new_lines = f.readlines()
                self.file_positions[filepath] = f.tell()
                return new_lines
        except Exception as e:
            logger.error(f"Error reading {filepath}: {e}")
            return []

    def process_lines(self, lines):
        for line in lines:
            event = parse_line(line)
            if event:
                self.sender.add_event(event)
                logger.debug(f"Parsed event: {event['model']} ({event['status']})")

    def run(self):
        if not self.config.get("api_key"):
            logger.error("No API key configured. Run 'agentpulse init' first.")
            return
        self.running = True
        poll_interval = self.config.get("poll_interval", 5)
        batch_interval = self.config.get("batch_interval", 30)
        logger.info(f"AgentPulse daemon started")
        logger.info(f"Watching: {self.config['log_path']}")
        logger.info(f"Agent: {self.config['agent_name']} ({self.config['framework']})")
        while self.running:
            try:
                log_file = self.get_latest_log_file()
                if log_file:
                    new_lines = self.tail_file(log_file)
                    if new_lines:
                        self.process_lines(new_lines)
                if self.sender.should_flush(batch_interval):
                    self.sender.flush()
                time.sleep(poll_interval)
            except KeyboardInterrupt:
                logger.info("Shutting down...")
                self.running = False
                self.sender.flush()
                break
            except Exception as e:
                logger.error(f"Daemon error: {e}")
                time.sleep(poll_interval)

    def stop(self):
        self.running = False
        self.sender.flush()
PYEOF

# cli.py
cat > "$PLUGIN_DIR/agentpulse/cli.py" << 'PYEOF'
import os
import sys
import signal
import logging
import argparse
from .config import load_config, save_config, DEFAULT_CONFIG, DEFAULT_CONFIG_PATH
from .daemon import AgentPulseDaemon

PID_FILE = "/tmp/agentpulse.pid"

def cmd_init(args):
    print("AgentPulse Setup\n")
    config = load_config()
    api_key = input(f"API Key [{config.get('api_key', '')}]: ").strip()
    if api_key: config["api_key"] = api_key
    agent_name = input(f"Agent name [{config.get('agent_name', 'default')}]: ").strip()
    if agent_name: config["agent_name"] = agent_name
    endpoint = input(f"API endpoint [{config.get('endpoint', DEFAULT_CONFIG['endpoint'])}]: ").strip()
    if endpoint: config["endpoint"] = endpoint
    log_path = input(f"Log path [{config.get('log_path', '/tmp/openclaw/')}]: ").strip()
    if log_path: config["log_path"] = log_path
    save_config(config)
    print(f"\nConfig saved to {DEFAULT_CONFIG_PATH}")
    print(f"Run 'agentpulse start' to begin monitoring.")

def cmd_start(args):
    config = load_config()
    if not config.get("api_key"):
        print("No API key configured. Run 'agentpulse init' first.")
        sys.exit(1)
    if os.path.exists(PID_FILE):
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        try:
            os.kill(pid, 0)
            print(f"AgentPulse is already running (PID {pid})")
            sys.exit(1)
        except OSError:
            os.remove(PID_FILE)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))
    print(f"AgentPulse daemon starting...")
    print(f"Agent: {config['agent_name']}")
    print(f"Watching: {config['log_path']}")
    print(f"Press Ctrl+C to stop\n")
    try:
        daemon = AgentPulseDaemon()
        daemon.run()
    finally:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)

def cmd_stop(args):
    if not os.path.exists(PID_FILE):
        print("AgentPulse is not running.")
        return
    with open(PID_FILE, "r") as f:
        pid = int(f.read().strip())
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Stopped AgentPulse (PID {pid})")
    except OSError:
        print(f"Process {pid} not found. Cleaning up.")
    os.remove(PID_FILE)

def cmd_status(args):
    config = load_config()
    if os.path.exists(PID_FILE):
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        try:
            os.kill(pid, 0)
            print(f"AgentPulse is running (PID {pid})")
        except OSError:
            print("AgentPulse is not running (stale PID)")
            os.remove(PID_FILE)
    else:
        print("AgentPulse is not running")
    print(f"\nConfig: {DEFAULT_CONFIG_PATH}")
    print(f"Agent: {config.get('agent_name', 'not set')}")
    print(f"API Key: {'configured' if config.get('api_key') else 'NOT SET'}")
    print(f"Endpoint: {config.get('endpoint', 'not set')}")
    print(f"Log path: {config.get('log_path', 'not set')}")

def main():
    parser = argparse.ArgumentParser(description="AgentPulse")
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("init", help="Setup")
    subparsers.add_parser("start", help="Start daemon")
    subparsers.add_parser("stop", help="Stop daemon")
    subparsers.add_parser("status", help="Check status")
    args = parser.parse_args()
    cmds = {"init": cmd_init, "start": cmd_start, "stop": cmd_stop, "status": cmd_status}
    if args.command in cmds:
        cmds[args.command](args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
PYEOF

# pyproject.toml
cat > "$PLUGIN_DIR/pyproject.toml" << 'PYEOF'
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "agentpulse"
version = "0.1.0"
description = "AI Agent Observability"
requires-python = ">=3.10"
dependencies = ["pyyaml>=6.0"]

[project.scripts]
agentpulse = "agentpulse.cli:main"

[tool.setuptools.packages.find]
where = ["."]
PYEOF

# Install
echo ""
echo "Installing AgentPulse plugin..."
cd "$PLUGIN_DIR"
pip install .

echo ""
echo "=== AgentPulse installed! ==="
echo "Run: agentpulse init"
echo "Then: agentpulse start"
