"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import StatCard from "@/components/dashboard/stat-card";
import CostChart from "@/components/charts/cost-chart";
import TokenChart from "@/components/charts/token-chart";
import { formatCost, formatNumber } from "@/lib/utils";

export default function CostsPage() {
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
      setStats(await res.json());
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Cost Analysis</h1>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  const dailyStats = stats?.daily_stats || [];
  const totalCost30d = dailyStats.reduce((s: number, d: any) => s + parseFloat(d.total_cost_usd || 0), 0);
  const daysWithData = dailyStats.length || 1;
  const dailyAvg = totalCost30d / daysWithData;
  const projectedMonthly = dailyAvg * 30;

  const costChartData = dailyStats.map((s: any) => ({
    date: s.date,
    cost: parseFloat(s.total_cost_usd || 0),
  }));

  // Build model breakdown from recent events
  const modelCosts: Record<string, { tokens: number; cost: number }> = {};
  (stats?.recent_events || []).forEach((e: any) => {
    const model = e.model || "unknown";
    if (!modelCosts[model]) modelCosts[model] = { tokens: 0, cost: 0 };
    modelCosts[model].tokens += e.total_tokens || 0;
    modelCosts[model].cost += parseFloat(e.cost_usd || 0);
  });

  const modelBreakdown = Object.entries(modelCosts)
    .map(([model, data]) => ({ model, ...data, pct: totalCost30d > 0 ? (data.cost / totalCost30d * 100) : 0 }))
    .sort((a, b) => b.cost - a.cost);

  const tokenChartData = modelBreakdown.map(m => ({ model: m.model, tokens: m.tokens }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#FAFAFA]">Cost Analysis</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total (30 days)" value={formatCost(totalCost30d)} subtitle="last 30 days" />
        <StatCard title="Daily Average" value={formatCost(dailyAvg)} subtitle="per day" />
        <StatCard title="Projected Monthly" value={formatCost(projectedMonthly)} subtitle="at current rate" />
      </div>

      <CostChart data={costChartData} />
      <TokenChart data={tokenChartData} />

      {/* Model breakdown table */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Cost by Model</h3>
        {modelBreakdown.length === 0 ? (
          <p className="text-[#A1A1AA] text-sm">No data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#A1A1AA] border-b border-[#2A2A2D]">
                <th className="text-left pb-3">Model</th>
                <th className="text-right pb-3">Tokens</th>
                <th className="text-right pb-3">Cost</th>
                <th className="text-right pb-3">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {modelBreakdown.map((m) => (
                <tr key={m.model} className="border-b border-[#2A2A2D]/50">
                  <td className="py-3 text-[#FAFAFA]">{m.model}</td>
                  <td className="py-3 text-right text-[#A1A1AA]">{formatNumber(m.tokens)}</td>
                  <td className="py-3 text-right text-[#FAFAFA]">{formatCost(m.cost)}</td>
                  <td className="py-3 text-right text-[#A1A1AA]">{m.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
