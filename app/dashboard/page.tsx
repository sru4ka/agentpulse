"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import StatCard from "@/components/dashboard/stat-card";
import EventLog from "@/components/dashboard/event-log";
import AgentCard from "@/components/dashboard/agent-card";
import CostChart from "@/components/charts/cost-chart";
import StatusChart from "@/components/charts/status-chart";
import Recommendations from "@/components/dashboard/recommendations";
import { formatCost, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setStats(data);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Dashboard</h1>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-28" />
          ))}
        </div>
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-80" />
      </div>
    );
  }

  // Prepare chart data from daily_stats
  const costChartData = (stats?.daily_stats || []).map((s: any) => ({
    date: s.date,
    cost: parseFloat(s.total_cost_usd || 0),
  }));

  const totalSuccess = (stats?.daily_stats || []).reduce((s: number, d: any) => s + (d.success_count || 0), 0);
  const totalErrors = (stats?.daily_stats || []).reduce((s: number, d: any) => s + (d.error_count || 0), 0);
  const totalRateLimits = (stats?.daily_stats || []).reduce((s: number, d: any) => s + (d.rate_limit_count || 0), 0);

  const statusData = [
    { name: "Success", value: totalSuccess || 1, color: "#10B981" },
    { name: "Errors", value: totalErrors, color: "#EF4444" },
    { name: "Rate Limited", value: totalRateLimits, color: "#F59E0B" },
  ].filter(d => d.value > 0);

  const errorRate = stats?.today?.events > 0
    ? ((stats.today.errors / stats.today.events) * 100).toFixed(1) + "%"
    : "0%";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Dashboard</h1>
        <p className="text-sm text-[#A1A1AA]">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Cost" value={formatCost(stats?.today?.cost || 0)} subtitle="USD spent today" />
        <StatCard title="Total Tokens" value={formatNumber(stats?.today?.tokens || 0)} subtitle="tokens used today" />
        <StatCard title="API Calls" value={formatNumber(stats?.today?.events || 0)} subtitle="calls today" />
        <StatCard title="Error Rate" value={errorRate} subtitle="of calls failed" />
      </div>

      {/* Cost chart */}
      <CostChart data={costChartData} />

      {/* Status chart + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <StatusChart data={statusData} />
        </div>
        <div className="lg:col-span-2">
          <EventLog events={stats?.recent_events || []} />
        </div>
      </div>

      {/* Recommendations */}
      <Recommendations events={stats?.recent_events || []} dailyStats={stats?.daily_stats || []} />

      {/* Agents */}
      {stats?.agents?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">Active Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.agents.map((agent: any) => (
              <AgentCard key={agent.id} agent={agent} todayCost={0} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!stats?.agents || stats.agents.length === 0) && (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📡</div>
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">No agents connected yet</h3>
          <p className="text-[#A1A1AA] mb-6">Install the AgentPulse plugin on your server to start tracking.</p>
          <code className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-4 py-2 text-sm text-[#7C3AED]">
            pip install agentpulse
          </code>
        </div>
      )}
    </div>
  );
}
