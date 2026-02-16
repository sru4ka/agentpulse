"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [alertType, setAlertType] = useState("daily_cost_limit");
  const [threshold, setThreshold] = useState("");
  const supabase = createBrowserSupabaseClient();

  const fetchAlerts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/alerts", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setAlerts(data.alerts || []);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleCreate = async () => {
    if (!threshold) return;
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ type: alertType, threshold: parseFloat(threshold) }),
    });
    setThreshold("");
    setCreating(false);
    fetchAlerts();
  };

  const alertTypeLabels: Record<string, string> = {
    daily_cost_limit: "Daily Cost Limit",
    consecutive_failures: "Consecutive Failures",
    rate_limit_threshold: "Rate Limit Threshold",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#FAFAFA]">Alerts</h1>

      {/* Create alert form */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Create Alert</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-[#A1A1AA] mb-1">Alert Type</label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
              className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="daily_cost_limit">Daily Cost Limit ($)</option>
              <option value="consecutive_failures">Consecutive Failures (count)</option>
              <option value="rate_limit_threshold">Rate Limits per Hour (count)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#A1A1AA] mb-1">Threshold</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 10"
              className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#7C3AED] w-32"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !threshold}
            className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {creating ? "Creating..." : "Create Alert"}
          </button>
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-12 text-center">
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">No alerts configured</h3>
          <p className="text-[#A1A1AA]">Create your first alert to get notified about cost spikes or failures.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => (
            <div key={alert.id} className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[#FAFAFA] font-medium">{alertTypeLabels[alert.type] || alert.type}</p>
                <p className="text-sm text-[#A1A1AA]">
                  Threshold: {alert.threshold} &middot; Notify via: {alert.notify_via}
                  {alert.last_triggered && ` · Last triggered: ${new Date(alert.last_triggered).toLocaleDateString()}`}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${alert.enabled ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#A1A1AA]/20 text-[#A1A1AA]"}`}>
                {alert.enabled ? "Active" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
