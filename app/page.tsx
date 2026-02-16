import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Navigation */}
      <nav className="border-b border-[#2A2A2D] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[#FAFAFA] font-bold text-xl">AgentPulse</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#A1A1AA]">
            <a href="#features" className="hover:text-[#FAFAFA] transition">Features</a>
            <a href="#pricing" className="hover:text-[#FAFAFA] transition">Pricing</a>
            <a href="#how-it-works" className="hover:text-[#FAFAFA] transition">How It Works</a>
            <Link href="/docs" className="hover:text-[#FAFAFA] transition">Docs</Link>
            <Link href="/login" className="hover:text-[#FAFAFA] transition">Login</Link>
            <Link href="/signup" className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-4 py-2 rounded-lg transition font-medium">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-24 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED] text-sm px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-[#7C3AED] rounded-full animate-pulse" />
            Now tracking OpenClaw agents
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-[#FAFAFA] leading-tight mb-6">
            See everything your
            <br />
            <span className="text-[#7C3AED]">AI agent</span> does
          </h1>
          <p className="text-xl text-[#A1A1AA] max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop burning money blind. Track every LLM call, monitor costs in real-time,
            and optimize your AI agents with actionable insights.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-8 py-3.5 rounded-xl text-lg font-medium transition shadow-lg shadow-[#7C3AED]/25">
              Get Started Free
            </Link>
            <Link href="/dashboard" className="border border-[#2A2A2D] hover:border-[#3A3A3D] text-[#FAFAFA] px-8 py-3.5 rounded-xl text-lg font-medium transition">
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-[#2A2A2D] px-6 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-[#FAFAFA]">180,000+</div>
            <div className="text-sm text-[#A1A1AA] mt-1">OpenClaw users</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#FAFAFA]">10x</div>
            <div className="text-sm text-[#A1A1AA] mt-1">Cost visibility</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#FAFAFA]">$0</div>
            <div className="text-sm text-[#A1A1AA] mt-1">To get started</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[#FAFAFA] text-center mb-4">How It Works</h2>
          <p className="text-[#A1A1AA] text-center mb-16 max-w-xl mx-auto">Three steps to full observability. No code changes to your agent required.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">1. Install Plugin</h3>
              <p className="text-sm text-[#A1A1AA] mb-4">One command to install on your server</p>
              <code className="text-sm text-[#7C3AED] bg-[#0A0A0B] px-3 py-1.5 rounded-lg">pip install agentpulse</code>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">2. Connect Agent</h3>
              <p className="text-sm text-[#A1A1AA] mb-4">One config file with your API key</p>
              <code className="text-sm text-[#7C3AED] bg-[#0A0A0B] px-3 py-1.5 rounded-lg">agentpulse init</code>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">3. See Everything</h3>
              <p className="text-sm text-[#A1A1AA] mb-4">Real-time dashboard with full visibility</p>
              <code className="text-sm text-[#7C3AED] bg-[#0A0A0B] px-3 py-1.5 rounded-lg">agentpulse.dev</code>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 border-t border-[#2A2A2D]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[#FAFAFA] text-center mb-4">Everything You Need</h2>
          <p className="text-[#A1A1AA] text-center mb-16 max-w-xl mx-auto">Complete observability for your AI agents, from cost tracking to error monitoring.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8 hover:border-[#3A3A3D] transition">
              <div className="w-12 h-12 bg-[#7C3AED]/10 rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Real-time Cost Tracking</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">Know exactly how much every LLM call costs. Track spending by model, task, and time period. Never be surprised by your AI bill again.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8 hover:border-[#3A3A3D] transition">
              <div className="w-12 h-12 bg-[#EF4444]/10 rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Error Monitoring</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">Catch rate limits, API failures, and auth errors instantly. Know why your agent stopped responding before your users notice.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8 hover:border-[#3A3A3D] transition">
              <div className="w-12 h-12 bg-[#10B981]/10 rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Model Analytics</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">See which models handle which tasks. Compare token usage, latency, and costs across providers to optimize your agent stack.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8 hover:border-[#3A3A3D] transition">
              <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Smart Alerts</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">Get notified when costs spike, errors accumulate, or rate limits hit. Set thresholds that matter to you and stay in control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24 border-t border-[#2A2A2D]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[#FAFAFA] text-center mb-4">Simple Pricing</h2>
          <p className="text-[#A1A1AA] text-center mb-16">Start free. Scale when you need to.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8">
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Free</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold text-[#FAFAFA]">$0</span>
                <span className="text-[#A1A1AA]">/month</span>
              </div>
              <ul className="space-y-3 text-sm text-[#A1A1AA] mb-8">
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> 1 agent</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> 7 days history</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> Basic cost tracking</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> Daily email summary</li>
              </ul>
              <Link href="/signup" className="block w-full text-center border border-[#2A2A2D] hover:border-[#3A3A3D] text-[#FAFAFA] px-4 py-2.5 rounded-lg text-sm font-medium transition">
                Get Started
              </Link>
            </div>
            {/* Pro */}
            <div className="bg-[#141415] border-2 border-[#7C3AED] rounded-xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7C3AED] text-white text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Pro</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold text-[#FAFAFA]">$29</span>
                <span className="text-[#A1A1AA]">/month</span>
              </div>
              <ul className="space-y-3 text-sm text-[#A1A1AA] mb-8">
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> 5 agents</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> 90 days history</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> Smart alerts</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> Recommendations</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> CSV export</li>
              </ul>
              <Link href="/pay/crypto" className="block w-full text-center bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
                Get Pro Access
              </Link>
            </div>
            {/* Team */}
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-8">
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Team</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold text-[#FAFAFA]">$99</span>
                <span className="text-[#A1A1AA]">/month</span>
              </div>
              <ul className="space-y-3 text-sm text-[#A1A1AA] mb-8">
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> 25 agents</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> 1 year history</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> Team dashboard</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> API access</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> Webhooks</li>
              </ul>
              <Link href="/pay/crypto" className="block w-full text-center border border-[#2A2A2D] hover:border-[#3A3A3D] text-[#FAFAFA] px-4 py-2.5 rounded-lg text-sm font-medium transition">
                Get Team Access
              </Link>
            </div>
          </div>

          {/* Crypto option */}
          <div className="mt-8 bg-[#141415] border border-[#F59E0B]/30 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <h3 className="text-[#FAFAFA] font-semibold">Pay with Crypto</h3>
            </div>
            <p className="text-sm text-[#A1A1AA] mb-3">
              Prefer a one-time payment? Get lifetime access with ETH — <strong className="text-[#FAFAFA]">$199 Pro</strong> or <strong className="text-[#FAFAFA]">$499 Team</strong>.
            </p>
            <Link href="/pay/crypto" className="inline-block bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 px-5 py-2 rounded-lg text-sm font-medium transition">
              Pay with ETH
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-[#2A2A2D]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#FAFAFA] mb-4">Ready to stop flying blind?</h2>
          <p className="text-[#A1A1AA] mb-8">Set up in 2 minutes. No credit card required.</p>
          <Link href="/signup" className="inline-block bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-8 py-3.5 rounded-xl text-lg font-medium transition shadow-lg shadow-[#7C3AED]/25">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2D] px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#7C3AED] rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[#FAFAFA] font-semibold">AgentPulse</span>
          </div>
          <p className="text-sm text-[#A1A1AA]">&copy; 2026 AgentPulse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
