"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function SetupPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<"sdk" | "daemon">("sdk");
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setProfile(data.profile);
      setLoading(false);
    };
    fetchData();
  }, []);

  const copyApiKey = () => {
    if (profile?.api_key) {
      navigator.clipboard.writeText(profile.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Setup & Troubleshoot</h1>
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Setup & Troubleshoot</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Get your agent reporting data in minutes.</p>
      </div>

      {/* Quick API Key Copy */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#A1A1AA] mb-1">Your API Key</p>
            <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] font-mono truncate">
              {profile?.api_key?.slice(0, 12)}{"••••••••••••"}
            </code>
          </div>
          <button
            onClick={copyApiKey}
            className="text-sm text-[#7C3AED] hover:text-[#8B5CF6] transition px-3 py-2 border border-[#2A2A2D] rounded-lg flex-shrink-0"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Integration Method Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMethod("sdk")}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition ${
            method === "sdk"
              ? "bg-[#7C3AED] text-white"
              : "bg-[#141415] border border-[#2A2A2D] text-[#A1A1AA] hover:text-[#FAFAFA]"
          }`}
        >
          Python SDK (Recommended)
        </button>
        <button
          onClick={() => setMethod("daemon")}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition ${
            method === "daemon"
              ? "bg-[#7C3AED] text-white"
              : "bg-[#141415] border border-[#2A2A2D] text-[#A1A1AA] hover:text-[#FAFAFA]"
          }`}
        >
          Daemon (OpenClaw)
        </button>
      </div>

      {/* ═══ SDK Integration ═══ */}
      {method === "sdk" && (
        <>
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] font-medium">Recommended</span>
              <span className="text-xs text-[#A1A1AA]">Works with any LLM provider</span>
            </div>

            <div className="space-y-5">
              {/* Step 1: Install */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">1</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Install the package</p>
                  <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono whitespace-pre-wrap break-all">
                    pip install &quot;git+https://github.com/sru4ka/agentpulse.git#subdirectory=plugin&quot;
                  </code>
                  <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg p-2.5 mt-2">
                    <p className="text-xs text-[#F59E0B]">
                      Do <strong>not</strong> use <span className="font-mono">pip install agentpulse</span> &mdash; that&apos;s an unrelated PyPI package.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Add to code */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">2</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Add 3 lines to your code</p>
                  <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2.5 text-sm text-[#A1A1AA] font-mono whitespace-pre leading-relaxed">
                    <span className="text-[#7C3AED]">import</span> agentpulse{"\n"}
                    agentpulse.init(<span className="text-[#10B981]">api_key</span>=<span className="text-[#F59E0B]">&quot;{profile?.api_key?.slice(0, 8)}...&quot;</span>){"\n"}
                    agentpulse.auto_instrument()
                  </code>
                  <p className="text-xs text-[#A1A1AA] mt-1.5">
                    Put these lines at the <strong className="text-[#FAFAFA]">top of your script</strong>, before any LLM calls. That&apos;s it &mdash; all calls are tracked automatically.
                  </p>
                </div>
              </div>

              {/* Step 3: Run */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">3</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Run your agent</p>
                  <p className="text-xs text-[#A1A1AA]">
                    Run your bot/agent as normal. Every LLM API call will appear in your dashboard with <strong className="text-[#FAFAFA]">exact token counts and costs</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supported providers */}
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#FAFAFA] mb-3">Supported Providers</h3>
            <p className="text-xs text-[#A1A1AA] mb-3">Auto-instruments the OpenAI and Anthropic SDKs. MiniMax, Together, Groq, and other OpenAI-compatible providers are covered automatically.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                "OpenAI", "Anthropic", "MiniMax", "Google Gemini",
                "Mistral", "DeepSeek", "Grok / xAI", "Cohere",
                "Llama (via any host)", "Together AI", "Groq", "Fireworks AI",
              ].map((p) => (
                <div key={p} className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-2.5 py-1.5 text-[#FAFAFA] text-center">
                  {p}
                </div>
              ))}
            </div>
          </div>

          {/* Example: MiniMax */}
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">Example: MiniMax</h3>
            <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-3 text-sm text-[#A1A1AA] font-mono whitespace-pre leading-relaxed">
              <span className="text-[#7C3AED]">import</span> agentpulse{"\n"}
              <span className="text-[#7C3AED]">from</span> openai <span className="text-[#7C3AED]">import</span> OpenAI{"\n"}
              {"\n"}
              agentpulse.init(<span className="text-[#10B981]">api_key</span>=<span className="text-[#F59E0B]">&quot;your-api-key&quot;</span>){"\n"}
              agentpulse.auto_instrument(){"\n"}
              {"\n"}
              <span className="text-[#71717A]"># MiniMax uses OpenAI-compatible SDK</span>{"\n"}
              client = OpenAI({"\n"}
              {"  "}<span className="text-[#10B981]">api_key</span>=<span className="text-[#F59E0B]">&quot;your-minimax-key&quot;</span>,{"\n"}
              {"  "}<span className="text-[#10B981]">base_url</span>=<span className="text-[#F59E0B]">&quot;https://api.minimaxi.chat/v1&quot;</span>,{"\n"}
              ){"\n"}
              {"\n"}
              <span className="text-[#71717A]"># This call is automatically tracked!</span>{"\n"}
              resp = client.chat.completions.create({"\n"}
              {"  "}<span className="text-[#10B981]">model</span>=<span className="text-[#F59E0B]">&quot;MiniMax-M2.5&quot;</span>,{"\n"}
              {"  "}<span className="text-[#10B981]">messages</span>=[&#123;<span className="text-[#F59E0B]">&quot;role&quot;</span>: <span className="text-[#F59E0B]">&quot;user&quot;</span>, <span className="text-[#F59E0B]">&quot;content&quot;</span>: <span className="text-[#F59E0B]">&quot;Hello!&quot;</span>&#125;],{"\n"}
              )
            </code>
          </div>

          {/* Manual tracking */}
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">Manual Tracking (optional)</h3>
            <p className="text-xs text-[#A1A1AA] mb-3">
              If you prefer not to use auto-instrumentation, you can manually track any response:
            </p>
            <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-3 text-sm text-[#A1A1AA] font-mono whitespace-pre leading-relaxed">
              resp = client.chat.completions.create(...){"\n"}
              agentpulse.track(resp)  <span className="text-[#71717A]"># sends exact tokens/cost</span>
            </code>
          </div>
        </>
      )}

      {/* ═══ Daemon Integration (OpenClaw) ═══ */}
      {method === "daemon" && (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#A1A1AA]/15 text-[#A1A1AA] font-medium">OpenClaw only</span>
            <span className="text-xs text-[#A1A1AA]">Tails gateway log files</span>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">1</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Install the plugin</p>
                <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono whitespace-pre-wrap break-all">
                  sudo apt install -y pipx &amp;&amp; pipx install &quot;git+https://github.com/sru4ka/agentpulse.git#subdirectory=plugin&quot; &amp;&amp; pipx ensurepath &amp;&amp; source ~/.bashrc
                </code>
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg p-2.5 mt-2">
                  <p className="text-xs text-[#F59E0B]">
                    Do <strong>not</strong> use <span className="font-mono">pip install agentpulse</span> or <span className="font-mono">pipx install agentpulse</span> &mdash; that installs an unrelated package from PyPI.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">2</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Configure with your API key</p>
                <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono">
                  agentpulse init
                </code>
                <p className="text-xs text-[#A1A1AA] mt-1.5">
                  Paste your API key from above. Config is saved to <span className="text-[#FAFAFA]">~/.openclaw/agentpulse.yaml</span>
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">3</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Start the daemon</p>
                <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono">
                  agentpulse start -d
                </code>
                <p className="text-xs text-[#A1A1AA] mt-1.5">
                  The <span className="text-[#FAFAFA]">-d</span> flag runs it in the background. Use <span className="text-[#FAFAFA]">agentpulse status</span> to check and <span className="text-[#FAFAFA]">agentpulse stop</span> to stop.
                  Run <span className="text-[#FAFAFA]">agentpulse test</span> first to verify the connection.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Troubleshooting */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Troubleshooting</h3>
        <div className="space-y-3">
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">Dashboard shows 0 events / only test events</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>If using <strong className="text-[#FAFAFA]">Python SDK</strong>: make sure <span className="text-[#7C3AED] font-mono">agentpulse.init()</span> and <span className="text-[#7C3AED] font-mono">agentpulse.auto_instrument()</span> are called <em>before</em> any LLM calls</li>
              <li>If using <strong className="text-[#FAFAFA]">Daemon</strong>: it only works with OpenClaw logs at <span className="text-[#FAFAFA]">/tmp/openclaw/</span>. For other frameworks, use the Python SDK method instead</li>
              <li>Run <span className="text-[#7C3AED] font-mono">agentpulse test</span> to confirm your API key and connection work</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">agentpulse: command not found</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>After installing via pipx, run <span className="text-[#7C3AED] font-mono">pipx ensurepath</span> then <span className="text-[#7C3AED] font-mono">source ~/.bashrc</span> (or open a new terminal)</li>
              <li>On Debian/Ubuntu, bare <span className="text-[#FAFAFA]">pip install</span> is blocked (PEP 668) &mdash; use the pipx one-liner</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">&ldquo;No apps associated with package&rdquo; / wrong package</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>The <span className="text-[#FAFAFA]">agentpulse</span> name on PyPI is an <em>unrelated</em> package</li>
              <li>If you ran <span className="text-[#7C3AED] font-mono">pipx install agentpulse</span> (no git URL), uninstall: <span className="text-[#7C3AED] font-mono">pipx uninstall agentpulse</span></li>
              <li>Then re-install using the git URL</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">API key invalid / 401 error</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>Copy a fresh key from the top of this page</li>
              <li>If you regenerated your key, update it everywhere</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Need Help — DM on X */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-1">Still stuck?</h3>
        <p className="text-sm text-[#A1A1AA] mb-4">DM us on X and we&apos;ll help you get set up.</p>
        <a
          href="https://x.com/agentpulses"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#0A0A0B] hover:bg-[#1A1A1D] border border-[#2A2A2D] text-[#FAFAFA] px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          DM @agentpulses
        </a>
      </div>
    </div>
  );
}
