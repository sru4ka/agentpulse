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
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Setup & Troubleshoot</h1>
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Setup & Troubleshoot</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Get your agent reporting data in 3 steps.</p>
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
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] font-medium">Guide</span>
        </div>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">1</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Install the plugin</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#A1A1AA] mb-1">One-liner (installs pipx if needed, then installs AgentPulse):</p>
                  <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono whitespace-pre-wrap break-all">
                    sudo apt install -y pipx &amp;&amp; pipx install &quot;git+https://github.com/sru4ka/agentpulse.git#subdirectory=plugin&quot; &amp;&amp; pipx ensurepath &amp;&amp; source ~/.bashrc
                  </code>
                </div>
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg p-2.5">
                  <p className="text-xs text-[#F59E0B]">
                    Do <strong>not</strong> use <span className="font-mono">pip install agentpulse</span> or <span className="font-mono">pipx install agentpulse</span> &mdash; that installs an unrelated package from PyPI. Always install from the git URL shown above.
                  </p>
                </div>
                <details className="group">
                  <summary className="text-xs text-[#A1A1AA] cursor-pointer hover:text-[#FAFAFA] transition">
                    Alternative: manual venv (if pipx is unavailable)
                  </summary>
                  <div className="mt-2">
                    <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono whitespace-pre-wrap break-all">
                      python3 -m venv ~/.agentpulse-venv &amp;&amp; ~/.agentpulse-venv/bin/pip install &quot;git+https://github.com/sru4ka/agentpulse.git#subdirectory=plugin&quot; &amp;&amp; mkdir -p ~/.local/bin &amp;&amp; ln -sf ~/.agentpulse-venv/bin/agentpulse ~/.local/bin/agentpulse
                    </code>
                    <p className="text-xs text-[#A1A1AA] mt-1">Creates a symlink so <span className="text-[#FAFAFA]">agentpulse</span> works from anywhere.</p>
                  </div>
                </details>
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
                The <span className="text-[#FAFAFA]">-d</span> flag runs it in the background &mdash; no need to keep a terminal open.
                Use <span className="text-[#FAFAFA]">agentpulse status</span> to check and <span className="text-[#FAFAFA]">agentpulse stop</span> to stop.
                Run <span className="text-[#FAFAFA]">agentpulse test</span> first to verify the connection.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Troubleshooting</h3>
        <div className="space-y-3">
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">agentpulse: command not found</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>After installing via pipx, run <span className="text-[#7C3AED] font-mono">pipx ensurepath</span> then <span className="text-[#7C3AED] font-mono">source ~/.bashrc</span> (or open a new terminal)</li>
              <li>On Debian/Ubuntu, bare <span className="text-[#FAFAFA]">pip install</span> is blocked (PEP 668) &mdash; use the pipx one-liner from Step 1 above</li>
              <li>If using a manual venv, ensure you symlinked: <span className="text-[#7C3AED] font-mono">ln -sf ~/.agentpulse-venv/bin/agentpulse ~/.local/bin/agentpulse</span></li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">&ldquo;No apps associated with package&rdquo; / wrong package installed</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>There is an <em>unrelated</em> package called &ldquo;agentpulse&rdquo; on PyPI &mdash; that is <strong>not</strong> this tool</li>
              <li>If you ran <span className="text-[#7C3AED] font-mono">pipx install agentpulse</span> (without git URL), uninstall it: <span className="text-[#7C3AED] font-mono">pipx uninstall agentpulse</span></li>
              <li>Then re-install using the git URL from Step 1 above</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">Dashboard shows 0 events</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>Run <span className="text-[#7C3AED] font-mono">agentpulse test</span> to confirm your API key and connection work</li>
              <li>Check the daemon is running: <span className="text-[#7C3AED] font-mono">agentpulse status</span></li>
              <li>Verify the log path matches where OpenClaw writes logs (default: <span className="text-[#FAFAFA]">/tmp/openclaw/</span>)</li>
              <li>Make sure the daemon was started <em>before</em> or <em>while</em> your agent is running</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">API key invalid / 401 error</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>Copy a fresh key from the top of this page</li>
              <li>Re-run <span className="text-[#7C3AED] font-mono">agentpulse init</span> and paste the new key</li>
              <li>If you regenerated your key, all existing plugins need to be reconfigured</li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">Agent limit reached / 403 error</p>
            <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
              <li>Free plan allows 1 agent, Pro allows 5, Team allows 25</li>
              <li>Upgrade your plan on the <a href="/dashboard/billing" className="text-[#7C3AED] hover:underline">Billing page</a></li>
            </ul>
          </div>
          <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3">
            <p className="text-sm text-[#FAFAFA] font-medium mb-1">Useful commands</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div><span className="text-[#7C3AED] font-mono">agentpulse status</span></div>
              <div className="text-[#A1A1AA]">Check if daemon is running</div>
              <div><span className="text-[#7C3AED] font-mono">agentpulse test</span></div>
              <div className="text-[#A1A1AA]">Send a test event</div>
              <div><span className="text-[#7C3AED] font-mono">agentpulse stop</span></div>
              <div className="text-[#A1A1AA]">Stop the daemon</div>
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
