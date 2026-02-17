<p align="center">
  <img src="https://img.shields.io/badge/AgentPulse-AI%20Agent%20Observability-7C3AED?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTIyIDEyaC00bC0zIDlMOSAzbC0zIDlIMiIgLz48L3N2Zz4=" alt="AgentPulse" />
</p>

<h1 align="center">AgentPulse</h1>

<p align="center">
  <strong>Real-time observability for AI agents. Track costs, monitor errors, replay prompts.</strong>
</p>

<p align="center">
  <a href="https://agentpulses.com">Website</a> &middot;
  <a href="https://agentpulses.com/docs">Documentation</a> &middot;
  <a href="https://agentpulses.com/signup">Get Started Free</a> &middot;
  <a href="https://x.com/agentpulses">@agentpulses</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Python-3.9+-blue?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## What is AgentPulse?

AgentPulse is a **real-time monitoring and observability platform** for AI agents. It captures every LLM API call your agent makes and gives you a dashboard to track costs, monitor errors, analyze token usage, and replay exact prompts.

**The problem:** AI agents make hundreds of LLM calls per session. Without observability, you're flying blind — burning money, missing errors, and unable to debug why your agent behaved a certain way.

**The solution:** Install the AgentPulse plugin alongside your agent. It captures every LLM call and streams it to your dashboard in real-time.

## Key Features

- **Real-time Cost Tracking** — Know exactly how much every LLM call costs, broken down by model, provider, and task
- **Prompt Replay** — See the exact prompts your agent sent and responses it received (new in v0.2)
- **Error Monitoring** — Catch rate limits, API failures, and auth errors before your users notice
- **Smart Alerts** — Get notified when costs spike, errors accumulate, or rate limits hit
- **Model Analytics** — Compare token usage, latency, and costs across providers
- **AI Recommendations** — Get suggestions to optimize costs and reduce errors
- **Multi-agent Support** — Monitor multiple agents from a single dashboard
- **Mobile Responsive** — Check your agents from your phone

## Quick Start

### 1. Create an account

Sign up at [agentpulses.com/signup](https://agentpulses.com/signup) and get your API key from Settings.

### 2. Install the plugin

> **Important:** Do NOT use `pip install agentpulse` — that's an unrelated PyPI package.

```bash
# Recommended (one-liner)
sudo apt install -y pipx && pipx install "git+https://github.com/sru4ka/agentpulse.git#subdirectory=plugin" && pipx ensurepath && source ~/.bashrc
```

### 3. Configure

```bash
agentpulse init
```

This creates `~/.openclaw/agentpulse.yaml` with your API key and settings.

### 4. Start monitoring

```bash
agentpulse start -d
```

The `-d` flag runs the daemon in the background. Use `agentpulse status` to check and `agentpulse stop` to stop.

Run `agentpulse test` first to verify the connection works.

### 5. View your dashboard

Open [agentpulses.com/dashboard](https://agentpulses.com/dashboard) to see your agent's activity in real-time.

## Supported Frameworks

| Framework | Status | Notes |
|-----------|--------|-------|
| OpenClaw | Full support | Primary integration |
| LangChain | Coming soon | Python SDK |
| CrewAI | Coming soon | Python SDK |
| AutoGen | Coming soon | Python SDK |

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Your Agent  │────▶│  AgentPulse      │────▶│  AgentPulse     │
│  (OpenClaw)  │     │  Plugin (Python) │     │  Dashboard      │
│              │     │                  │     │  (Next.js)      │
│  Logs LLM    │     │  Parses logs     │     │                 │
│  calls to    │     │  Batches events  │     │  Real-time      │
│  files       │     │  POSTs to API    │     │  charts, costs, │
│              │     │                  │     │  prompt replay  │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Recharts
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Auth)
- **Plugin:** Python 3.9+, zero dependencies (stdlib only)
- **Payments:** Stripe (credit card), Ethereum (crypto)
- **Hosting:** Vercel

## Development

```bash
# Clone the repo
git clone https://github.com/sru4ka/agentpulse.git
cd agentpulse

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase and Stripe keys

# Run development server
npm run dev
```

## Plugin Development

```bash
cd plugin

# Install in development mode
pip install -e .

# Run tests
agentpulse test

# Check status
agentpulse status
```

## API Reference

### POST `/api/events`

Send agent events to the dashboard.

```json
{
  "api_key": "your-api-key",
  "agent_name": "my-agent",
  "framework": "openclaw",
  "events": [
    {
      "timestamp": "2026-02-16T14:32:01Z",
      "provider": "anthropic",
      "model": "claude-sonnet-4-5",
      "input_tokens": 1200,
      "output_tokens": 450,
      "cost_usd": 0.0103,
      "latency_ms": 2100,
      "status": "success",
      "prompt_messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is the weather?"}
      ],
      "response_text": "I don't have access to real-time weather data...",
      "tools_used": ["web_search"],
      "task_context": "weather-query"
    }
  ]
}
```

## Pricing

| Plan | Price | Agents | History | Features |
|------|-------|--------|---------|----------|
| Free | $0/mo | 1 | 7 days | Basic dashboard |
| Pro | $29/mo | 5 | 90 days | Alerts, prompt replay, recommendations |
| Team | $99/mo | 25 | 1 year | Team dashboard, API, webhooks |
| Enterprise | Custom | Unlimited | Unlimited | Custom integrations, dedicated support |

Pay with credit card (Stripe) or crypto (ETH for lifetime access).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built for developers who run AI agents in production.</strong>
  <br />
  <a href="https://agentpulses.com">agentpulses.com</a> &middot;
  <a href="https://x.com/agentpulses">DM us on X</a>
</p>
