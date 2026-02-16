# AgentPulse Plugin

Observability plugin for AI agents. Tracks LLM API calls, costs, and performance.

## Install

```bash
pip install agentpulse
```

## Setup

```bash
agentpulse init     # Interactive configuration
agentpulse start    # Start monitoring daemon
agentpulse status   # Check if running
agentpulse stop     # Stop daemon
```

## Configuration

Config file: `~/.openclaw/agentpulse.yaml`

```yaml
api_key: "ap_your_key_here"
endpoint: "https://agentpulse.vercel.app/api/events"
agent_name: "MyBot"
framework: "openclaw"
log_path: "/tmp/openclaw/"
poll_interval: 5
batch_interval: 30
```
