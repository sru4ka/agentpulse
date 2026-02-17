"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function SetupPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Setup</h1>
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Setup</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">3 commands. Works with any LLM provider.</p>
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

      {/* Installation Steps */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <div className="space-y-5">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">1</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Install</p>
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

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">2</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Configure</p>
              <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono">
                agentpulse init
              </code>
              <p className="text-xs text-[#A1A1AA] mt-1.5">
                Paste your API key from above when prompted.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">3</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Run your agent</p>
              <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono">
                agentpulse run python your_bot.py
              </code>
              <p className="text-xs text-[#A1A1AA] mt-1.5">
                That&apos;s it. All LLM calls are tracked automatically &mdash; <strong className="text-[#FAFAFA]">no code changes needed</strong>.
                Works with OpenAI, Anthropic, MiniMax, and any OpenAI-compatible provider.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Verify */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">Verify your setup</h3>
        <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono">
          agentpulse test
        </code>
        <p className="text-xs text-[#A1A1AA] mt-1.5">
          Sends a test event to confirm your API key and connection work. Check the dashboard to see it appear.
        </p>
      </div>

      {/* Supported providers */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">Supported Providers</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            "OpenAI", "Anthropic", "MiniMax", "Google Gemini",
            "DeepSeek", "Mistral", "Grok / xAI", "Together AI",
            "Groq", "Fireworks AI", "Cohere", "Any OpenAI-compatible",
          ].map((p) => (
            <div key={p} className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-2.5 py-1.5 text-[#FAFAFA] text-center">
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Troubleshooting</h3>
        <div className="space-y-3">
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">Dashboard shows 0 events / only test events</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>Make sure you&apos;re running your bot with <span className="text-[#7C3AED] font-mono">agentpulse run python your_bot.py</span> (not just <span className="font-mono">python your_bot.py</span>)</li>
              <li>Run <span className="text-[#7C3AED] font-mono">agentpulse test</span> to confirm your API key works</li>
              <li>Check that your bot is actually making LLM API calls</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">agentpulse: command not found</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>Make sure you installed with <span className="text-[#7C3AED] font-mono">pip install &quot;git+...&quot;</span></li>
              <li>Try running <span className="text-[#7C3AED] font-mono">python -m agentpulse.cli</span> instead</li>
              <li>On some systems you may need to add <span className="text-[#FAFAFA]">~/.local/bin</span> to your PATH</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">&ldquo;No apps associated with package&rdquo; / wrong package</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>The <span className="text-[#FAFAFA]">agentpulse</span> name on PyPI is an <em>unrelated</em> package &mdash; always install from the git URL</li>
              <li>Uninstall the wrong one: <span className="text-[#7C3AED] font-mono">pip uninstall agentpulse</span></li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">API key invalid / 401 error</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>Copy a fresh key from the top of this page</li>
              <li>Re-run <span className="text-[#7C3AED] font-mono">agentpulse init</span> and paste the new key</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">Useful commands</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div><span className="text-[#7C3AED] font-mono">agentpulse run ...</span></div>
              <div className="text-[#A1A1AA]">Run with monitoring</div>
              <div><span className="text-[#7C3AED] font-mono">agentpulse test</span></div>
              <div className="text-[#A1A1AA]">Send a test event</div>
              <div><span className="text-[#7C3AED] font-mono">agentpulse status</span></div>
              <div className="text-[#A1A1AA]">Check config &amp; status</div>
              <div><span className="text-[#7C3AED] font-mono">agentpulse init</span></div>
              <div className="text-[#A1A1AA]">Reconfigure settings</div>
            </div>
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
