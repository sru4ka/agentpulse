"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [regenError, setRegenError] = useState("");
  const router = useRouter();
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
      setAgents(data.agents || []);
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

  const regenerateKey = async () => {
    setRegenerating(true);
    setRegenError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setRegenError("Session expired. Please refresh the page.");
        setRegenerating(false);
        return;
      }
      const res = await fetch("/api/key/regenerate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setRegenError(data.error || "Failed to regenerate key");
        setRegenerating(false);
        return;
      }
      if (data.api_key) {
        setProfile({ ...profile, api_key: data.api_key });
        setShowKey(true);
      }
    } catch (err: any) {
      setRegenError("Network error. Please try again.");
    }
    setRegenerating(false);
    setShowConfirm(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const planColor: Record<string, string> = {
    free: "#A1A1AA",
    pro: "#7C3AED",
    team: "#F59E0B",
    enterprise: "#10B981",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Settings</h1>
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-40" />
      </div>
    );
  }

  const currentPlan = profile?.plan || "free";
  const currentPlanColor = planColor[currentPlan] || planColor.free;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#FAFAFA]">Settings</h1>

      {/* API Key */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-1">API Key</h3>
        <p className="text-sm text-[#A1A1AA] mb-4">Use this key in your AgentPulse plugin configuration.</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-4 py-2.5 text-sm text-[#FAFAFA] font-mono truncate">
            {showKey ? profile?.api_key : profile?.api_key?.replace(/./g, "\u2022").slice(0, 20) + "..."}
          </code>
          <button
            onClick={() => setShowKey(!showKey)}
            className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition px-3 py-2 border border-[#2A2A2D] rounded-lg"
          >
            {showKey ? "Hide" : "Reveal"}
          </button>
          <button
            onClick={copyApiKey}
            className="text-sm text-[#7C3AED] hover:text-[#8B5CF6] transition px-3 py-2 border border-[#2A2A2D] rounded-lg"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-[#2A2A2D]">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm text-[#EF4444] hover:text-[#F87171] transition"
            >
              Revoke &amp; Regenerate API Key
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg p-3">
                <p className="text-sm text-[#F59E0B]">
                  This will permanently revoke your current key. Any connected plugins will stop working until you reconfigure them with the new key.
                </p>
              </div>
              {regenError && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-3">
                  <p className="text-sm text-[#EF4444]">{regenError}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={regenerateKey}
                  disabled={regenerating}
                  className="text-sm bg-[#EF4444] hover:bg-[#DC2626] text-white px-4 py-2 rounded-lg font-medium transition whitespace-nowrap disabled:opacity-50"
                >
                  {regenerating ? "Regenerating..." : "Yes, Revoke & Regenerate"}
                </button>
                <button
                  onClick={() => { setShowConfirm(false); setRegenError(""); }}
                  className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Account</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#A1A1AA]">Email</span>
            <span className="text-sm text-[#FAFAFA]">{profile?.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#A1A1AA]">Plan</span>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full uppercase font-semibold"
              style={{ backgroundColor: currentPlanColor + "20", color: currentPlanColor }}
            >
              {currentPlan}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#A1A1AA]">Billing</span>
            <Link href="/dashboard/billing" className="text-sm text-[#7C3AED] hover:text-[#8B5CF6] transition">
              Manage billing &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Connected Agents */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Connected Agents</h3>
        {agents.length === 0 ? (
          <p className="text-sm text-[#A1A1AA]">No agents connected yet.</p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent: any) => (
              <div key={agent.id} className="flex justify-between items-center py-2 border-b border-[#2A2A2D]/50 last:border-0">
                <div>
                  <span className="text-sm text-[#FAFAFA]">{agent.name}</span>
                  <span className="text-xs text-[#A1A1AA] ml-2">{agent.framework}</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-[#10B981]" : "bg-[#A1A1AA]"}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup & Troubleshoot */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-[#FAFAFA]">Setup &amp; Troubleshoot</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] font-medium">Guide</span>
        </div>
        <p className="text-sm text-[#A1A1AA] mb-5">Get your agent reporting data in 3 steps.</p>

        {/* Step 1 */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center text-xs font-bold">1</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#FAFAFA] mb-1.5">Install the plugin</p>
              <code className="block bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#A1A1AA] font-mono">
                pip install agentpulse
              </code>
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
                agentpulse start
              </code>
              <p className="text-xs text-[#A1A1AA] mt-1.5">
                Runs in the foreground. Use <span className="text-[#FAFAFA]">agentpulse test</span> to verify the connection first.
              </p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="mt-6 pt-5 border-t border-[#2A2A2D]">
          <h4 className="text-sm font-semibold text-[#FAFAFA] mb-3">Troubleshooting</h4>
          <div className="space-y-3">
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
                <li>Copy a fresh key from the &ldquo;API Key&rdquo; section above</li>
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
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="text-sm text-[#EF4444] hover:text-[#F87171] transition px-4 py-2 border border-[#2A2A2D] rounded-lg"
      >
        Sign Out
      </button>
    </div>
  );
}
