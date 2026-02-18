"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import StatCard from "@/components/dashboard/stat-card";
import CostChart from "@/components/charts/cost-chart";
import TokenChart from "@/components/charts/token-chart";
import StatusChart from "@/components/charts/status-chart";
import Recommendations from "@/components/dashboard/recommendations";
import { formatCost, formatNumber } from "@/lib/utils";

export default function CostsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [events, setEvents] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: agentsData } = await supabase
        .from("agents")
        .select("id, name, framework, status")
        .order("name");

      const agentList = agentsData || [];
      setAgents(agentList);

      if (agentList.length === 1) {
        setSelectedAgent(agentList[0].id);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loading && agents.length === 0) return;

    const fetchAgentData = async () => {
      if (agents.length === 0) {
        setEvents([]);
        setDailyStats([]);
        return;
      }

      const targetAgentIds = selectedAgent === "all"
        ? agents.map((a) => a.id)
        : [selectedAgent];

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .in("agent_id", targetAgentIds)
        .order("timestamp", { ascending: false })
        .range(0, 199);

      const { data: statsData } = await supabase
        .from("daily_stats")
        .select("*")
        .in("agent_id", targetAgentIds)
        .order("date", { ascending: true })
        .limit(90);

      setEvents(eventsData || []);
      setDailyStats(statsData || []);
    };
    fetchAgentData();
  }, [selectedAgent, agents]);

  const totalCost30d = dailyStats.reduce((s: number, d: any) => s + parseFloat(d.total_cost_usd || 0), 0);
  const daysWithData = dailyStats.length || 1;
  const dailyAvg = totalCost30d / daysWithData;
  const projectedMonthly = dailyAvg * 30;

  const costChartData = dailyStats.map((s: any) => ({
    date: s.date,
    cost: parseFloat(s.total_cost_usd || 0),
  }));

  const totalSuccess = dailyStats.reduce((s: number, d: any) => s + (d.success_count || 0), 0);
  const totalErrors = dailyStats.reduce((s: number, d: any) => s + (d.error_count || 0), 0);
  const totalRateLimits = dailyStats.reduce((s: number, d: any) => s + (d.rate_limit_count || 0), 0);
  const statusData = [
    { name: "Success", value: totalSuccess || 0, color: "#10B981" },
    { name: "Errors", value: totalErrors, color: "#EF4444" },
    { name: "Rate Limited", value: totalRateLimits, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  const modelStats: Record<string, { calls: number; cost: number; tokens: number; inputTokens: number; outputTokens: number }> = {};
  events.forEach((e) => {
    const key = e.model || "unknown";
    if (!modelStats[key]) modelStats[key] = { calls: 0, cost: 0, tokens: 0, inputTokens: 0, outputTokens: 0 };
    modelStats[key].calls++;
    modelStats[key].cost += parseFloat(e.cost_usd || 0);
    modelStats[key].tokens += e.total_tokens || 0;
    modelStats[key].inputTokens += e.input_tokens || 0;
    modelStats[key].outputTokens += e.output_tokens || 0;
  });
  const modelBreakdown = Object.entries(modelStats)
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.cost - a.cost);
  const tokenChartData = modelBreakdown.map((m) => ({ model: m.model, tokens: m.tokens }));

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Cost Analysis</h1>
        {agents.length > 1 && (
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-4 py-2 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#7C3AED] appearance-none pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23A1A1AA' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total (30 days)" value={formatCost(totalCost30d)} subtitle="last 30 days" />
        <StatCard title="Daily Average" value={formatCost(dailyAvg)} subtitle="per day" />
        <StatCard title="Projected Monthly" value={formatCost(projectedMonthly)} subtitle="at current rate" />
      </div>

      <Recommendations events={events} dailyStats={dailyStats} />

      <CostChart data={costChartData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TokenChart data={tokenChartData} />
        </div>
        <div className="lg:col-span-1">
          <StatusChart data={statusData.length > 0 ? statusData : [{ name: "No data", value: 1, color: "#2A2A2D" }]} />
        </div>
      </div>

      {modelBreakdown.length > 0 && (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Cost by Model</h3>
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
                  <td className="py-3 text-right text-[#A1A1AA]">
                    {totalCost30d > 0 ? ((m.cost / totalCost30d) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
