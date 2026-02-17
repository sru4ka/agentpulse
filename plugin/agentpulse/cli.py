import os
import sys
import signal
import logging
import argparse
import shutil
import subprocess
import tempfile

from .config import load_config, save_config, DEFAULT_CONFIG, DEFAULT_CONFIG_PATH
from .daemon import AgentPulseDaemon

PID_FILE = "/tmp/agentpulse.pid"
LOG_FILE = os.path.expanduser("~/.openclaw/agentpulse.log")

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
    print(f"\nStart monitoring with:")
    print(f"   agentpulse start -d")
    print(f"\nAll LLM calls will be tracked automatically in the background.")

def cmd_run(args):
    """Run a command with automatic LLM instrumentation.

    Wraps the given command so that all OpenAI/Anthropic SDK calls made by the
    process are captured and sent to AgentPulse — no code changes required.

    Usage: agentpulse run python my_bot.py
           agentpulse run python -m my_module
    """
    config = load_config()
    if not config.get("api_key"):
        print("❌ No API key configured.")
        print("   Run 'agentpulse init' first.")
        sys.exit(1)

    if not args.cmd:
        print("❌ No command provided.")
        print("   Usage: agentpulse run python my_bot.py")
        sys.exit(1)

    # Find the agentpulse package directory (parent of this file's dir)
    pkg_dir = os.path.dirname(os.path.abspath(__file__))
    pkg_parent = os.path.dirname(pkg_dir)

    # Create a temporary directory with sitecustomize.py for auto-injection
    bootstrap_dir = tempfile.mkdtemp(prefix="agentpulse_")
    bootstrap_src = os.path.join(pkg_dir, "_bootstrap_sitecustomize.py")
    bootstrap_dst = os.path.join(bootstrap_dir, "sitecustomize.py")
    shutil.copy2(bootstrap_src, bootstrap_dst)

    # Set up environment for the subprocess
    env = os.environ.copy()

    # Tell the bootstrap where to find the agentpulse package
    env["_AGENTPULSE_PKG_PATH"] = pkg_parent

    # Prepend bootstrap dir to PYTHONPATH so sitecustomize.py gets loaded
    existing = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = bootstrap_dir + (":" + existing if existing else "")

    agent_name = config.get("agent_name", "default")
    print(f"🚀 AgentPulse: monitoring LLM calls for '{agent_name}'")
    print(f"   Running: {' '.join(args.cmd)}\n")

    try:
        result = subprocess.run(args.cmd, env=env)
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        sys.exit(130)
    except FileNotFoundError:
        print(f"❌ Command not found: {args.cmd[0]}")
        sys.exit(127)
    finally:
        shutil.rmtree(bootstrap_dir, ignore_errors=True)


def cmd_start(args):
    """Start the daemon (foreground or background)."""
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
            print(f"   Use 'agentpulse stop' first, or 'agentpulse status' to check.")
            sys.exit(1)
        except OSError:
            os.remove(PID_FILE)

    background = getattr(args, "background", False)

    if background:
        _start_background(config)
    else:
        _start_foreground(config)


def _start_background(config):
    """Fork into the background and run as a daemon."""
    # Ensure log directory exists
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

    pid = os.fork()
    if pid > 0:
        # Parent process — just print status and exit
        print(f"🚀 AgentPulse started in background (PID {pid})")
        print(f"   Agent: {config['agent_name']}")
        print(f"   Watching: {config['log_path']}")
        print(f"   Logs: {LOG_FILE}")
        print(f"\n   Use 'agentpulse status' to check, 'agentpulse stop' to stop.")
        # Write PID from parent so it's available immediately
        with open(PID_FILE, "w") as f:
            f.write(str(pid))
        sys.exit(0)

    # Child process — detach and run
    os.setsid()

    # Redirect stdout/stderr to log file
    log_fd = os.open(LOG_FILE, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    os.dup2(log_fd, sys.stdout.fileno())
    os.dup2(log_fd, sys.stderr.fileno())
    os.close(log_fd)

    # Close stdin
    devnull = os.open(os.devnull, os.O_RDONLY)
    os.dup2(devnull, sys.stdin.fileno())
    os.close(devnull)

    # Setup logging to file
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    try:
        daemon = AgentPulseDaemon()
        daemon.run()
    finally:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)


def _start_foreground(config):
    """Run in the foreground (original behavior)."""
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
    print(f"   Press Ctrl+C to stop")
    print(f"   Tip: use 'agentpulse start -d' to run in the background\n")

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

        # Use a redirect handler that re-sends POST on 307/308
        class PostRedirectHandler(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                if code in (307, 308):
                    # Strip Host header to avoid mismatch on cross-domain redirects
                    new_headers = {
                        k: v for k, v in req.header_items()
                        if k.lower() not in ("host", "content-length")
                    }
                    new_headers["Content-length"] = str(len(req.data)) if req.data else "0"
                    return urllib.request.Request(
                        newurl, data=req.data,
                        headers=new_headers,
                        method=req.get_method(),
                    )
                return super().redirect_request(req, fp, code, msg, headers, newurl)

        opener = urllib.request.build_opener(PostRedirectHandler)
        req = urllib.request.Request(
            config["endpoint"],
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with opener.open(req, timeout=15) as resp:
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
    print(f"   Daemon log: {LOG_FILE}")

def main():
    parser = argparse.ArgumentParser(description="AgentPulse — AI Agent Observability")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("init", help="Interactive setup")
    run_parser = subparsers.add_parser("run", help="Run a command with LLM monitoring")
    run_parser.add_argument("cmd", nargs=argparse.REMAINDER,
                            help="Command to run (e.g. python my_bot.py)")
    start_parser = subparsers.add_parser("start", help="Start the log-tail daemon (OpenClaw)")
    start_parser.add_argument("-d", "--background", action="store_true",
                              help="Run in the background (daemonize)")
    subparsers.add_parser("stop", help="Stop the daemon")
    subparsers.add_parser("status", help="Check daemon status")
    subparsers.add_parser("test", help="Send a test event to verify connection")

    args = parser.parse_args()

    commands = {
        "init": cmd_init,
        "run": cmd_run,
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
