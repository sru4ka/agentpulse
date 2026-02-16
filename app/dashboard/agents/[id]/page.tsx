"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import StatCard from "@/components/dashboard/stat-card";
import CostChart from "@/components/charts/cost-chart";
import TokenChart from "@/components/charts/token-chart";
import EventLog from "@/components/dashboard/event-log";
import { formatCost, formatNumber, formatLatency } from "@/lib/utils";

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch agent details
      const { data: agentData } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      // Fetch events for this agent
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("agent_id", agentId)
        .order("timestamp", { ascending: false })
        .limit(50);

      // Fetch daily stats
      const { data: statsData } = await supabase
        .from("daily_stats")
        .select("*")
        .eq("agent_id", agentId)
        .order("date", { ascending: true })
        .limit(30);

      setAgent(agentData);
      setEvents(eventsData || []);
      setDailyStats(statsData || []);
      setLoading(false);
    };
    fetchData();
  }, [agentId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-20" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!agent) {
    return <div className="text-[#A1A1AA]">Agent not found.</div>;
  }

  // Calculate aggregate stats
  const totalCost = dailyStats.reduce((s, d) => s + parseFloat(d.total_cost_usd || 0), 0);
  const totalEvents = dailyStats.reduce((s, d) => s + (d.total_events || 0), 0);
  const totalSuccess = dailyStats.reduce((s, d) => s + (d.success_count || 0), 0);
  const successRate = totalEvents > 0 ? ((totalSuccess / totalEvents) * 100).toFixed(1) : "0";
  const avgLatency = events.length > 0
    ? Math.round(events.reduce((s, e) => s + (e.latency_ms || 0), 0) / events.length)
    : 0;

  const costChartData = dailyStats.map(s => ({ date: s.date, cost: parseFloat(s.total_cost_usd || 0) }));

  // Build token by model from events
  const tokensByModel: Record<string, number> = {};
  events.forEach(e => {
    const model = e.model || "unknown";
    tokensByModel[model] = (tokensByModel[model] || 0) + (e.total_tokens || 0);
  });
  const tokenChartData = Object.entries(tokensByModel).map(([model, tokens]) => ({ model, tokens }));

  return (
    <div className="space-y-6">
      {/* Agent header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">{agent.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs bg-[#7C3AED20] text-[#7C3AED] px-2 py-0.5 rounded-full">{agent.framework}</span>
            <span className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
              <span className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-[#10B981]" : "bg-[#A1A1AA]"}`} />
              {agent.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Cost" value={formatCost(totalCost)} subtitle="all time" />
        <StatCard title="Total Events" value={formatNumber(totalEvents)} subtitle="API calls" />
        <StatCard title="Success Rate" value={`${successRate}%`} subtitle="of calls succeeded" />
        <StatCard title="Avg Latency" value={formatLatency(avgLatency)} subtitle="per call" />
      </div>

      {/* Charts */}
      <CostChart data={costChartData} />
      <TokenChart data={tokenChartData} />

      {/* Event log */}
      <EventLog events={events} />
    </div>
  );
}
