import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Navigation */}
      <nav className="border-b border-[#2A2A2D] px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[#FAFAFA] font-bold text-xl">AgentPulse</span>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Link href="/signup" className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-4 py-2 rounded-lg transition text-sm font-medium">
              Get Started
            </Link>
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
      <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED] text-sm px-4 py-1.5 rounded-full mb-6 sm:mb-8">
            <span className="w-2 h-2 bg-[#7C3AED] rounded-full animate-pulse" />
            Now tracking OpenClaw agents
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-[#FAFAFA] leading-tight mb-4 sm:mb-6">
            See everything your
            <br />
            <span className="text-[#7C3AED]">AI agent</span> does
          </h1>
          <p className="text-lg sm:text-xl text-[#A1A1AA] max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
            Stop burning money blind. Track every LLM call, monitor costs in real-time,
            and optimize your AI agents with actionable insights.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/signup" className="w-full sm:w-auto bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-8 py-3.5 rounded-xl text-lg font-medium transition shadow-lg shadow-[#7C3AED]/25 text-center">
              Get Started Free
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto border border-[#2A2A2D] hover:border-[#3A3A3D] text-[#FAFAFA] px-8 py-3.5 rounded-xl text-lg font-medium transition text-center">
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-[#2A2A2D] px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
          <div>
            <div className="text-xl sm:text-3xl font-bold text-[#FAFAFA]">180,000+</div>
            <div className="text-xs sm:text-sm text-[#A1A1AA] mt-1">OpenClaw users</div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-bold text-[#FAFAFA]">10x</div>
            <div className="text-xs sm:text-sm text-[#A1A1AA] mt-1">Cost visibility</div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-bold text-[#FAFAFA]">$0</div>
            <div className="text-xs sm:text-sm text-[#A1A1AA] mt-1">To get started</div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] text-center mb-4">Your Command Center</h2>
          <p className="text-[#A1A1AA] text-center mb-8 sm:mb-12 max-w-xl mx-auto text-sm sm:text-base">See every LLM call, every dollar spent, every error — all in one dashboard.</p>

          {/* Dashboard Mockup */}
          <div className="bg-[#0E0E10] border border-[#2A2A2D] rounded-2xl overflow-hidden shadow-2xl shadow-[#7C3AED]/5">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A2D] bg-[#0A0A0B]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                <div className="w-3 h-3 rounded-full bg-[#10B981]/60" />
              </div>
              <span className="text-xs text-[#A1A1AA] ml-2 font-mono hidden sm:inline">agentpulses.com/dashboard</span>
            </div>

            <div className="flex">
              {/* Mini sidebar */}
              <div className="w-48 border-r border-[#2A2A2D] bg-[#0A0A0B] py-4 px-3 hidden md:block">
                <div className="flex items-center gap-2 px-3 mb-6">
                  <div className="w-5 h-5 bg-[#7C3AED] rounded-md" />
                  <span className="text-xs text-[#FAFAFA] font-bold">AgentPulse</span>
                </div>
                <div className="space-y-1">
                  <div className="bg-[#7C3AED]/15 text-[#7C3AED] text-xs px-3 py-2 rounded-md font-medium">Dashboard</div>
                  <div className="text-[#A1A1AA] text-xs px-3 py-2">Agents</div>
                  <div className="text-[#A1A1AA] text-xs px-3 py-2">Costs</div>
                  <div className="text-[#A1A1AA] text-xs px-3 py-2">Alerts</div>
                  <div className="text-[#A1A1AA] text-xs px-3 py-2">Billing</div>
                  <div className="text-[#A1A1AA] text-xs px-3 py-2">Settings</div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="flex-1 p-3 sm:p-5 space-y-3 sm:space-y-5">
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-[#141415] border border-[#2A2A2D] rounded-lg p-2 sm:p-3">
                    <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] uppercase tracking-wider">Today&apos;s Cost</div>
                    <div className="text-base sm:text-lg font-bold text-[#FAFAFA] mt-1">$4.82</div>
                    <div className="text-[9px] sm:text-[10px] text-[#10B981] mt-0.5">-12% vs yesterday</div>
                  </div>
                  <div className="bg-[#141415] border border-[#2A2A2D] rounded-lg p-2 sm:p-3">
                    <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] uppercase tracking-wider">Total Tokens</div>
                    <div className="text-base sm:text-lg font-bold text-[#FAFAFA] mt-1">847K</div>
                    <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] mt-0.5">124 API calls</div>
                  </div>
                  <div className="bg-[#141415] border border-[#2A2A2D] rounded-lg p-2 sm:p-3">
                    <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] uppercase tracking-wider">API Calls</div>
                    <div className="text-base sm:text-lg font-bold text-[#FAFAFA] mt-1">124</div>
                    <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] mt-0.5">3 models used</div>
                  </div>
                  <div className="bg-[#141415] border border-[#2A2A2D] rounded-lg p-2 sm:p-3">
                    <div className="text-[9px] sm:text-[10px] text-[#A1A1AA] uppercase tracking-wider">Error Rate</div>
                    <div className="text-base sm:text-lg font-bold text-[#10B981] mt-1">0.8%</div>
                    <div className="text-[9px] sm:text-[10px] text-[#10B981] mt-0.5">1 error today</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                  {/* Cost chart mockup */}
                  <div className="md:col-span-2 bg-[#141415] border border-[#2A2A2D] rounded-lg p-3 sm:p-4">
                    <div className="text-xs text-[#A1A1AA] mb-3 font-medium">Cost Over Time (30 days)</div>
                    <div className="h-24 sm:h-32 flex items-end gap-[2px] sm:gap-[3px]">
                      {[28, 35, 22, 40, 32, 45, 38, 50, 42, 55, 48, 60, 52, 65, 58, 45, 62, 70, 55, 72, 65, 75, 68, 80, 72, 85, 78, 62, 70, 55].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t transition-all"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i === 29 ? '#7C3AED' : i > 26 ? '#7C3AED80' : '#7C3AED40',
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[8px] sm:text-[9px] text-[#A1A1AA]">
                      <span>Jan 17</span>
                      <span>Jan 24</span>
                      <span>Jan 31</span>
                      <span>Feb 7</span>
                      <span>Feb 16</span>
                    </div>
                  </div>

                  {/* Status donut mockup */}
                  <div className="bg-[#141415] border border-[#2A2A2D] rounded-lg p-3 sm:p-4">
                    <div className="text-xs text-[#A1A1AA] mb-3 font-medium">Status Breakdown</div>
                    <div className="flex justify-center">
                      <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#2A2A2D" strokeWidth="12" />
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="12"
                          strokeDasharray="228.3" strokeDashoffset="11.4" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#EF4444" strokeWidth="12"
                          strokeDasharray="228.3" strokeDashoffset="222" transform="rotate(-90 50 50)" />
                        <text x="50" y="48" textAnchor="middle" className="text-xl font-bold" fill="#FAFAFA" fontSize="16">95%</text>
                        <text x="50" y="62" textAnchor="middle" fill="#A1A1AA" fontSize="8">success</text>
                      </svg>
                    </div>
                    <div className="flex justify-center gap-4 mt-2 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]" />Success</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]" />Error</span>
                    </div>
                  </div>
                </div>

                {/* Event log mockup */}
                <div className="bg-[#141415] border border-[#2A2A2D] rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-[#A1A1AA] mb-3 font-medium">Recent Events</div>
                  <div className="space-y-0 hidden sm:block">
                    <div className="grid grid-cols-6 text-[9px] text-[#A1A1AA] uppercase tracking-wider px-2 pb-2 border-b border-[#2A2A2D]/50">
                      <span>Time</span><span>Model</span><span>Tokens</span><span>Cost</span><span>Latency</span><span>Status</span>
                    </div>
                    {[
                      { time: "14:32:01", model: "Claude Sonnet 4.5", tokens: "12.5K", cost: "$0.048", latency: "2.1s", status: "success" },
                      { time: "14:31:45", model: "MiniMax-M2.5", tokens: "8.2K", cost: "$0.123", latency: "3.4s", status: "success" },
                      { time: "14:31:12", model: "GPT-4o", tokens: "6.8K", cost: "$0.034", latency: "1.8s", status: "success" },
                      { time: "14:30:58", model: "Claude Sonnet 4.5", tokens: "15.1K", cost: "$0.058", latency: "2.9s", status: "success" },
                      { time: "14:30:22", model: "MiniMax-M2.5", tokens: "0", cost: "$0.000", latency: "-", status: "rate_limit" },
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-6 text-[10px] px-2 py-1.5 border-b border-[#2A2A2D]/30 last:border-0">
                        <span className="text-[#A1A1AA] font-mono">{row.time}</span>
                        <span className="text-[#FAFAFA]">{row.model}</span>
                        <span className="text-[#A1A1AA]">{row.tokens}</span>
                        <span className="text-[#FAFAFA]">{row.cost}</span>
                        <span className="text-[#A1A1AA]">{row.latency}</span>
                        <span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            row.status === "success" ? "bg-[#10B981]/10 text-[#10B981]" :
                            "bg-[#F59E0B]/10 text-[#F59E0B]"
                          }`}>{row.status}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Mobile event list */}
                  <div className="sm:hidden space-y-2">
                    {[
                      { model: "Claude Sonnet 4.5", cost: "$0.048", status: "success" },
                      { model: "MiniMax-M2.5", cost: "$0.123", status: "success" },
                      { model: "GPT-4o", cost: "$0.034", status: "success" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1.5 border-b border-[#2A2A2D]/30">
                        <span className="text-[#FAFAFA]">{row.model}</span>
                        <span className="text-[#FAFAFA]">{row.cost}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981]`}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] text-center mb-4">How It Works</h2>
          <p className="text-[#A1A1AA] text-center mb-10 sm:mb-16 max-w-xl mx-auto text-sm sm:text-base">Three steps to full observability. No code changes to your agent required.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8 text-center">
              <div className="text-3xl sm:text-4xl mb-4">1</div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Install Plugin</h3>
              <p className="text-sm text-[#A1A1AA] mb-4">One command to install on your server</p>
              <code className="text-sm text-[#7C3AED] bg-[#0A0A0B] px-3 py-1.5 rounded-lg break-all">pip install agentpulse</code>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8 text-center">
              <div className="text-3xl sm:text-4xl mb-4">2</div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Connect Agent</h3>
              <p className="text-sm text-[#A1A1AA] mb-4">One config file with your API key</p>
              <code className="text-sm text-[#7C3AED] bg-[#0A0A0B] px-3 py-1.5 rounded-lg">agentpulse init</code>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8 text-center">
              <div className="text-3xl sm:text-4xl mb-4">3</div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">See Everything</h3>
              <p className="text-sm text-[#A1A1AA] mb-4">Real-time dashboard with full visibility</p>
              <code className="text-sm text-[#7C3AED] bg-[#0A0A0B] px-3 py-1.5 rounded-lg">agentpulses.com</code>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 sm:px-6 py-16 sm:py-24 border-t border-[#2A2A2D]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] text-center mb-4">Everything You Need</h2>
          <p className="text-[#A1A1AA] text-center mb-10 sm:mb-16 max-w-xl mx-auto text-sm sm:text-base">Complete observability for your AI agents, from cost tracking to error monitoring.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8 hover:border-[#3A3A3D] transition">
              <div className="w-12 h-12 bg-[#7C3AED]/10 rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Real-time Cost Tracking</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">Know exactly how much every LLM call costs. Track spending by model, task, and time period. Never be surprised by your AI bill again.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8 hover:border-[#3A3A3D] transition">
              <div className="w-12 h-12 bg-[#EF4444]/10 rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Error Monitoring</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">Catch rate limits, API failures, and auth errors instantly. Know why your agent stopped responding before your users notice.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8 hover:border-[#3A3A3D] transition">
              <div className="w-12 h-12 bg-[#10B981]/10 rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Prompt Replay</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">See exactly what your agent sent to the LLM and what it got back. Full conversation replay with system prompts, tool calls, and responses.</p>
            </div>
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8 hover:border-[#3A3A3D] transition">
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
      <section id="pricing" className="px-4 sm:px-6 py-16 sm:py-24 border-t border-[#2A2A2D]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] text-center mb-4">Simple Pricing</h2>
          <p className="text-[#A1A1AA] text-center mb-10 sm:mb-16">Start free. Scale when you need to.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Free */}
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8">
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
            <div className="bg-[#141415] border-2 border-[#7C3AED] rounded-xl p-6 sm:p-8 relative">
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
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> Prompt replay</li>
                <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span> Recommendations</li>
              </ul>
              <Link href="/dashboard/billing" className="block w-full text-center bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
                Get Pro Access
              </Link>
            </div>
            {/* Team */}
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 sm:p-8">
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
              <Link href="/dashboard/billing" className="block w-full text-center border border-[#2A2A2D] hover:border-[#3A3A3D] text-[#FAFAFA] px-4 py-2.5 rounded-lg text-sm font-medium transition">
                Get Team Access
              </Link>
            </div>
          </div>

          {/* Crypto + Stripe option */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#141415] border border-[#7C3AED]/30 rounded-xl p-5 sm:p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <h3 className="text-[#FAFAFA] font-semibold">Pay with Credit Card</h3>
              </div>
              <p className="text-sm text-[#A1A1AA] mb-3">
                Monthly subscription via Stripe. Cancel anytime.
              </p>
              <Link href="/dashboard/billing" className="inline-block bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30 px-5 py-2 rounded-lg text-sm font-medium transition">
                Subscribe Now
              </Link>
            </div>
            <div className="bg-[#141415] border border-[#F59E0B]/30 rounded-xl p-5 sm:p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <h3 className="text-[#FAFAFA] font-semibold">Pay with Crypto</h3>
              </div>
              <p className="text-sm text-[#A1A1AA] mb-3">
                One-time ETH payment for lifetime access.
              </p>
              <Link href="/pay/crypto" className="inline-block bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 px-5 py-2 rounded-lg text-sm font-medium transition">
                Pay with ETH
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 border-t border-[#2A2A2D]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-4">Ready to stop flying blind?</h2>
          <p className="text-[#A1A1AA] mb-8">Set up in 2 minutes. No credit card required.</p>
          <Link href="/signup" className="inline-block bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-8 py-3.5 rounded-xl text-lg font-medium transition shadow-lg shadow-[#7C3AED]/25">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2D] px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#7C3AED] rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[#FAFAFA] font-semibold">AgentPulse</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#A1A1AA]">
            <Link href="/docs" className="hover:text-[#FAFAFA] transition">Docs</Link>
            <a href="https://github.com/sru4ka/agentpulse" target="_blank" rel="noopener noreferrer" className="hover:text-[#FAFAFA] transition">GitHub</a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#FAFAFA] transition">X/Twitter</a>
          </div>
          <p className="text-sm text-[#A1A1AA]">&copy; 2026 AgentPulse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
