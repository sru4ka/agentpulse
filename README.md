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

- **Accurate Cost Tracking** — Exact per-call costs parsed directly from LLM API responses (not estimates)
- **50+ Models Supported** — OpenAI, Anthropic, MiniMax, Google Gemini, Mistral, Cohere, DeepSeek, Grok, Llama, and more
- **Prompt Replay** — See the exact prompts your agent sent and responses it received
- **Error Monitoring** — Catch rate limits, API failures, and auth errors before your users notice
- **Smart Alerts** — Get notified when costs spike, errors accumulate, or rate limits hit
- **Model Analytics** — Compare token usage, latency, and costs across providers
- **AI Recommendations** — Get suggestions to optimize costs and reduce errors
- **Multi-agent Support** — Monitor multiple agents from a single dashboard
- **Mobile Responsive** — Check your agents from your phone

## Quick Start

SSH into your server and run:

```bash
sudo apt install -y pipx && pipx install "git+https://github.com/sru4ka/agentpulse.git#subdirectory=plugin" && pipx ensurepath && source ~/.bashrc
agentpulse init          # paste your API key
agentpulse start -d      # runs in background, tracks all LLM calls
```

That's it. Sign up at [agentpulses.com/signup](https://agentpulses.com/signup) to get your API key, then view your dashboard at [agentpulses.com/dashboard](https://agentpulses.com/dashboard).

> **Important:** Do NOT use `pip install agentpulse` — that's an unrelated PyPI package. Always install from the git URL above.

## Supported Models & Providers

AgentPulse extracts exact token counts and costs from API responses. Any model that returns usage data is supported automatically.

| Provider | Models | Cost Tracking |
|----------|--------|---------------|
| Anthropic | Claude Opus 4, Sonnet 4.5, Haiku 4, and older | Exact (from API response) |
| OpenAI | GPT-4o, GPT-4o-mini, o3, o1, GPT-4 Turbo | Exact (from API response) |
| MiniMax | MiniMax-M2.5, MiniMax-M1, Text-02 | Exact (from API response) |
| Google | Gemini 2.0 Flash/Pro, 1.5 Pro/Flash | Exact (from API response) |
| Mistral | Large, Small, Codestral, Mixtral | Exact (from API response) |
| DeepSeek | DeepSeek-R1, V3, Chat, Coder | Exact (from API response) |
| xAI | Grok-3, Grok-2 | Exact (from API response) |
| Cohere | Command R+, Command R | Exact (from API response) |
| Meta | Llama 3.3, 3.1 (via any provider) | Exact (from API response) |
| Amazon | Nova Pro, Lite, Micro | Exact (from API response) |
| Any other | OpenAI-compatible APIs | Exact if usage field present |

## Supported Frameworks

| Framework | Status | Integration |
|-----------|--------|-------------|
| Any Python agent | Full support | Python SDK (auto-instrument) |
| OpenClaw | Full support | SDK or Daemon |
| LangChain | Full support | Python SDK |
| CrewAI | Full support | Python SDK |
| AutoGen | Full support | Python SDK |

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Your Agent  │────▶│  AgentPulse SDK  │────▶│  AgentPulse     │
│  (any        │     │  (Python)        │     │  Dashboard      │
│   framework) │     │                  │     │  (Next.js)      │
│              │     │  Intercepts LLM  │     │                 │
│  OpenAI /    │     │  SDK calls       │     │  Real-time      │
│  Anthropic / │     │  Exact tokens    │     │  charts, costs, │
│  MiniMax ... │     │  POSTs to API    │     │  prompt replay  │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Recharts
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Auth)
- **Plugin:** Python 3.10+, auto-instruments OpenAI & Anthropic SDKs
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
