import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Navigation */}
      <nav className="border-b border-[#2A2A2D] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[#FAFAFA] font-bold text-xl">AgentPulse</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-[#A1A1AA] hover:text-[#FAFAFA] transition">Home</Link>
            <Link href="/dashboard" className="text-[#A1A1AA] hover:text-[#FAFAFA] transition">Dashboard</Link>
            <Link href="/docs" className="text-[#FAFAFA] font-medium">Docs</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-[#FAFAFA] mb-4">Documentation</h1>
        <p className="text-lg text-[#A1A1AA] mb-12">Get your AI agent connected to AgentPulse in under 5 minutes.</p>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center text-white text-sm font-bold">1</span>
            Create an Account
          </h2>
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
            <p className="text-[#A1A1AA] mb-4">
              Sign up at AgentPulse to get your API key. After creating your account, go to{" "}
              <Link href="/dashboard/settings" className="text-[#7C3AED] hover:text-[#8B5CF6] transition">
                Settings
              </Link>{" "}
              to find your API key.
            </p>
            <div className="flex gap-3">
              <Link href="/signup" className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                Sign Up Free
              </Link>
              <Link href="/login" className="border border-[#2A2A2D] hover:border-[#3A3A3D] text-[#FAFAFA] px-4 py-2 rounded-lg text-sm font-medium transition">
                Login
              </Link>
            </div>
          </div>
        </section>

        {/* Install */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center text-white text-sm font-bold">2</span>
            Install the Plugin
          </h2>
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 space-y-4">
            <p className="text-[#A1A1AA]">
              SSH into your server where OpenClaw is running, then install AgentPulse:
            </p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4">
              <code className="text-sm text-[#10B981]">pip install agentpulse</code>
            </div>
            <p className="text-[#A1A1AA]">
              Or install from source if pip isn&apos;t available:
            </p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4 space-y-1">
              <code className="text-sm text-[#A1A1AA] block">git clone https://github.com/sru4ka/agentpulse.git</code>
              <code className="text-sm text-[#A1A1AA] block">cd agentpulse/plugin</code>
              <code className="text-sm text-[#10B981] block">pip install .</code>
            </div>
          </div>
        </section>

        {/* Configure */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center text-white text-sm font-bold">3</span>
            Configure
          </h2>
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 space-y-4">
            <p className="text-[#A1A1AA]">
              Run the interactive setup to configure your API key and agent:
            </p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4">
              <code className="text-sm text-[#10B981]">agentpulse init</code>
            </div>
            <p className="text-[#A1A1AA]">
              You&apos;ll be prompted for:
            </p>
            <ul className="space-y-2 text-sm text-[#A1A1AA]">
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-1">-</span>
                <span><strong className="text-[#FAFAFA]">API Key</strong> — from your <Link href="/dashboard/settings" className="text-[#7C3AED] hover:text-[#8B5CF6]">Settings page</Link></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-1">-</span>
                <span><strong className="text-[#FAFAFA]">Agent name</strong> — a name for this agent (e.g. &quot;MoltBot&quot;)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-1">-</span>
                <span><strong className="text-[#FAFAFA]">API endpoint</strong> — leave default unless self-hosting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-1">-</span>
                <span><strong className="text-[#FAFAFA]">Log path</strong> — where OpenClaw writes logs (default: <code className="text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">/tmp/openclaw/</code>)</span>
              </li>
            </ul>
            <p className="text-[#A1A1AA]">
              Or create the config file manually:
            </p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4 space-y-1">
              <code className="text-sm text-[#A1A1AA] block"># ~/.openclaw/agentpulse.yaml</code>
              <code className="text-sm text-[#FAFAFA] block">api_key: &quot;ap_your_key_here&quot;</code>
              <code className="text-sm text-[#FAFAFA] block">endpoint: &quot;https://agentpulses.com/api/events&quot;</code>
              <code className="text-sm text-[#FAFAFA] block">agent_name: &quot;MyBot&quot;</code>
              <code className="text-sm text-[#FAFAFA] block">framework: &quot;openclaw&quot;</code>
              <code className="text-sm text-[#FAFAFA] block">log_path: &quot;/tmp/openclaw/&quot;</code>
              <code className="text-sm text-[#FAFAFA] block">poll_interval: 5</code>
              <code className="text-sm text-[#FAFAFA] block">batch_interval: 30</code>
            </div>
          </div>
        </section>

        {/* Start */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center text-white text-sm font-bold">4</span>
            Start Monitoring
          </h2>
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 space-y-4">
            <p className="text-[#A1A1AA]">Start the AgentPulse daemon:</p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4">
              <code className="text-sm text-[#10B981]">agentpulse start</code>
            </div>
            <p className="text-[#A1A1AA]">Other useful commands:</p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4 space-y-1">
              <code className="text-sm text-[#A1A1AA] block">agentpulse status   # Check if running</code>
              <code className="text-sm text-[#A1A1AA] block">agentpulse stop     # Stop the daemon</code>
            </div>
          </div>
        </section>

        {/* Run as systemd service */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center text-white text-sm font-bold">5</span>
            Run as a Service (Optional)
          </h2>
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 space-y-4">
            <p className="text-[#A1A1AA]">
              For production, run AgentPulse as a systemd service so it starts automatically:
            </p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4 space-y-1">
              <code className="text-sm text-[#A1A1AA] block"># Create the service file</code>
              <code className="text-sm text-[#10B981] block">sudo nano /etc/systemd/system/agentpulse.service</code>
            </div>
            <p className="text-[#A1A1AA]">Paste this content:</p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4 space-y-1 text-sm">
              <code className="text-[#F59E0B] block">[Unit]</code>
              <code className="text-[#FAFAFA] block">Description=AgentPulse Monitoring Daemon</code>
              <code className="text-[#FAFAFA] block">After=network.target</code>
              <code className="text-[#FAFAFA] block">&nbsp;</code>
              <code className="text-[#F59E0B] block">[Service]</code>
              <code className="text-[#FAFAFA] block">Type=simple</code>
              <code className="text-[#FAFAFA] block">User=bot</code>
              <code className="text-[#FAFAFA] block">ExecStart=/usr/local/bin/agentpulse start</code>
              <code className="text-[#FAFAFA] block">Restart=always</code>
              <code className="text-[#FAFAFA] block">RestartSec=10</code>
              <code className="text-[#FAFAFA] block">&nbsp;</code>
              <code className="text-[#F59E0B] block">[Install]</code>
              <code className="text-[#FAFAFA] block">WantedBy=multi-user.target</code>
            </div>
            <p className="text-[#A1A1AA]">Then enable and start it:</p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4 space-y-1">
              <code className="text-sm text-[#10B981] block">sudo systemctl enable agentpulse</code>
              <code className="text-sm text-[#10B981] block">sudo systemctl start agentpulse</code>
              <code className="text-sm text-[#A1A1AA] block">sudo systemctl status agentpulse  # Verify it&apos;s running</code>
            </div>
          </div>
        </section>

        {/* Supported Frameworks */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6">Supported Frameworks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 bg-[#10B981] rounded-full" />
                <h3 className="text-[#FAFAFA] font-semibold">OpenClaw</h3>
              </div>
              <p className="text-sm text-[#A1A1AA]">Full support. Gateway log parsing with model detection, error tracking, and cost estimation.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                <h3 className="text-[#FAFAFA] font-semibold">CrewAI</h3>
              </div>
              <p className="text-sm text-[#A1A1AA]">Coming soon. Plugin support in development.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                <h3 className="text-[#FAFAFA] font-semibold">LangGraph</h3>
              </div>
              <p className="text-sm text-[#A1A1AA]">Coming soon. Plugin support in development.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                <h3 className="text-[#FAFAFA] font-semibold">AutoGen</h3>
              </div>
              <p className="text-sm text-[#A1A1AA]">Coming soon. Plugin support in development.</p>
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6">API Reference</h2>
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-[#FAFAFA] font-semibold mb-2">
                <span className="bg-[#10B981]/20 text-[#10B981] text-xs font-mono px-2 py-1 rounded mr-2">POST</span>
                /api/events
              </h3>
              <p className="text-sm text-[#A1A1AA] mb-3">Send events from your agent to AgentPulse.</p>
              <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-4">
                <pre className="text-sm text-[#FAFAFA] whitespace-pre-wrap">{`{
  "api_key": "ap_your_key_here",
  "agent_name": "MyBot",
  "framework": "openclaw",
  "events": [
    {
      "timestamp": "2026-02-16T07:07:04.797Z",
      "provider": "minimax",
      "model": "MiniMax-M2.5",
      "input_tokens": 12500,
      "output_tokens": 850,
      "cost_usd": 0.2895,
      "latency_ms": 3200,
      "status": "success",
      "tools_used": ["web_search"],
      "error_message": null
    }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Need help */}
        <section className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-[#FAFAFA] mb-2">Need Help?</h2>
          <p className="text-[#A1A1AA] mb-4">Open an issue on GitHub or reach out to us.</p>
          <a
            href="https://github.com/sru4ka/agentpulse/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
          >
            Open an Issue
          </a>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2D] px-6 py-8 mt-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-sm text-[#A1A1AA]">&copy; 2026 AgentPulse</span>
          <Link href="/" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition">Home</Link>
        </div>
      </footer>
    </div>
  );
}
