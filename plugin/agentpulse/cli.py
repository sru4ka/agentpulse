import os
import sys
import signal
import logging
import argparse

from .config import load_config, save_config, DEFAULT_CONFIG, DEFAULT_CONFIG_PATH
from .daemon import AgentPulseDaemon

PID_FILE = "/tmp/agentpulse.pid"

def cmd_init(args):
    """Interactive setup."""
    print("🔧 AgentPulse Setup\n")

    config = load_config()

    # If no API key yet, guide user to sign up
    existing_key = config.get("api_key", "")
    if not existing_key:
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("  Welcome to AgentPulse!")
        print("  You need an API key to get started.")
        print("")
        print("  1. Sign up at: https://agentpulses.com/signup")
        print("  2. Go to Dashboard → Settings")
        print("  3. Copy your API key")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("")

    api_key = input(f"API Key [{existing_key}]: ").strip()
    if api_key:
        config["api_key"] = api_key
    elif not existing_key:
        print("\n❌ API key is required. Sign up at https://agentpulses.com/signup")
        sys.exit(1)

    agent_name = input(f"Agent name [{config.get('agent_name', 'default')}]: ").strip()
    if agent_name:
        config["agent_name"] = agent_name

    endpoint = input(f"API endpoint [{config.get('endpoint', DEFAULT_CONFIG['endpoint'])}]: ").strip()
    if endpoint:
        config["endpoint"] = endpoint

    log_path = input(f"OpenClaw log path [{config.get('log_path', '/tmp/openclaw/')}]: ").strip()
    if log_path:
        config["log_path"] = log_path

    save_config(config)
    print(f"\n✅ Config saved to {DEFAULT_CONFIG_PATH}")
    print(f"   Agent: {config['agent_name']}")
    print(f"   Endpoint: {config['endpoint']}")
    print(f"\nRun 'agentpulse start' to begin monitoring.")

def cmd_start(args):
    """Start the daemon."""
    config = load_config()
    if not config.get("api_key"):
        print("❌ No API key configured.")
        print("   Run 'agentpulse init' to set up your API key.")
        print("   Don't have an account? Sign up at https://agentpulses.com/signup")
        sys.exit(1)

    # Check if already running
    if os.path.exists(PID_FILE):
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        try:
            os.kill(pid, 0)
            print(f"⚠️  AgentPulse is already running (PID {pid})")
            sys.exit(1)
        except OSError:
            os.remove(PID_FILE)

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    # Save PID
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

    print(f"🚀 AgentPulse daemon starting...")
    print(f"   Agent: {config['agent_name']}")
    print(f"   Watching: {config['log_path']}")
    print(f"   Press Ctrl+C to stop\n")

    try:
        daemon = AgentPulseDaemon()
        daemon.run()
    finally:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)

def cmd_stop(args):
    """Stop the daemon."""
    if not os.path.exists(PID_FILE):
        print("ℹ️  AgentPulse is not running.")
        return

    with open(PID_FILE, "r") as f:
        pid = int(f.read().strip())

    try:
        os.kill(pid, signal.SIGTERM)
        print(f"🛑 Stopped AgentPulse (PID {pid})")
    except OSError:
        print(f"⚠️  Process {pid} not found. Cleaning up PID file.")

    os.remove(PID_FILE)

def cmd_test(args):
    """Send a test event to verify connection."""
    import json
    import urllib.request
    import urllib.error
    from datetime import datetime

    config = load_config()
    if not config.get("api_key"):
        print("❌ No API key configured. Run 'agentpulse init' first.")
        sys.exit(1)

    print("🔍 Testing connection to AgentPulse...\n")
    print(f"   Endpoint: {config['endpoint']}")
    print(f"   Agent: {config['agent_name']}")
    print(f"   API Key: {config['api_key'][:10]}...\n")

    test_event = {
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "provider": "agentpulse",
        "model": "connection-test",
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0,
        "latency_ms": 1,
        "status": "success",
        "error_message": None,
        "task_context": "AgentPulse connection test",
        "tools_used": [],
    }

    payload = {
        "api_key": config["api_key"],
        "agent_name": config["agent_name"],
        "framework": config.get("framework", "openclaw"),
        "events": [test_event],
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            config["endpoint"],
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            if resp.status == 200 and result.get("success"):
                print("✅ Connection successful!")
                print(f"   Agent '{config['agent_name']}' is now visible in your dashboard.")
                print(f"   Go to: https://agentpulses.com/dashboard/agents")
            else:
                print(f"❌ Unexpected response: {result}")
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"❌ API error ({e.code}): {body}")
        if e.code == 401:
            print("   Your API key may be invalid. Check it at https://agentpulses.com/dashboard/settings")
        elif e.code == 403:
            print("   Agent limit reached on your plan. Upgrade at https://agentpulses.com/pricing")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print(f"   Check that the endpoint is correct: {config['endpoint']}")


def cmd_status(args):
    """Check daemon status."""
    config = load_config()

    if os.path.exists(PID_FILE):
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        try:
            os.kill(pid, 0)
            print(f"✅ AgentPulse is running (PID {pid})")
        except OSError:
            print(f"❌ AgentPulse is not running (stale PID file)")
            os.remove(PID_FILE)
    else:
        print("❌ AgentPulse is not running")

    print(f"\n📋 Configuration:")
    print(f"   Config: {DEFAULT_CONFIG_PATH}")
    print(f"   Agent: {config.get('agent_name', 'not set')}")
    print(f"   API Key: {'configured' if config.get('api_key') else 'NOT SET'}")
    print(f"   Endpoint: {config.get('endpoint', 'not set')}")
    print(f"   Log path: {config.get('log_path', 'not set')}")

def main():
    parser = argparse.ArgumentParser(description="AgentPulse — AI Agent Observability")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("init", help="Interactive setup")
    subparsers.add_parser("start", help="Start the daemon")
    subparsers.add_parser("stop", help="Stop the daemon")
    subparsers.add_parser("status", help="Check daemon status")
    subparsers.add_parser("test", help="Send a test event to verify connection")

    args = parser.parse_args()

    commands = {
        "init": cmd_init,
        "start": cmd_start,
        "stop": cmd_stop,
        "status": cmd_status,
        "test": cmd_test,
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
