"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useEventStream } from "@/lib/use-event-stream";
import { recalculateEventCost } from "@/lib/pricing";
import StatCard from "@/components/dashboard/stat-card";
import EventLog from "@/components/dashboard/event-log";
import AgentCard from "@/components/dashboard/agent-card";
import CostChart from "@/components/charts/cost-chart";
import StatusChart from "@/components/charts/status-chart";
import Recommendations from "@/components/dashboard/recommendations";
import DateRangeSelector, { DateRange, DateRangeResult, getDateRange } from "@/components/dashboard/date-range-selector";
import { formatCost, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeResult>(getDateRange("today"));
  const supabase = createBrowserSupabaseClient();

  // Initial load — get agents + session
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setAccessToken(session.access_token);

      const { data: agentsData } = await supabase
        .from("agents")
        .select("*")
        .order("last_seen", { ascending: false });

      setAgents(agentsData || []);
    };
    init();
  }, []);

  // Fetch events + daily_stats when date range changes
  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      setLoading(true);
      const agentIds = agents.map((a) => a.id);

      if (agentIds.length === 0) {
        setEvents([]);
        setDailyStats([]);
        setLoading(false);
        return;
      }

      const fromTs = dateRange.from + "T00:00:00";
      const toTs = dateRange.to + "T23:59:59";

      const [eventsRes, statsRes] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .in("agent_id", agentIds)
          .gte("timestamp", fromTs)
          .lte("timestamp", toTs)
          .order("timestamp", { ascending: false })
          .limit(200),
        supabase
          .from("daily_stats")
          .select("*")
          .in("agent_id", agentIds)
          .gte("date", dateRange.from)
          .lte("date", dateRange.to)
          .order("date", { ascending: true }),
      ]);

      setEvents(eventsRes.data || []);
      setDailyStats(statsRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [accessToken, agents, dateRange]);

  // Real-time updates via SSE
  const onEvents = useCallback((newEvents: any[]) => {
    setEvents((prev) => {
      const existingIds = new Set(prev.map((e: any) => e.id));
      const fresh = newEvents.filter((e) => !existingIds.has(e.id));
      return [...fresh, ...prev].slice(0, 200);
    });
  }, []);

  const onStats = useCallback(() => {}, []);

  useEventStream(accessToken, {
    onEvents,
    onStats,
    onConnect: () => setLiveConnected(true),
    onDisconnect: () => setLiveConnected(false),
  });

  // Calculate stats from events using correct pricing
  const totalCost = events.reduce((s, e) => s + recalculateEventCost(e), 0);
  const totalTokens = events.reduce((s, e) => s + (e.total_tokens || e.input_tokens || 0) + (e.output_tokens || 0), 0);
  const totalEvents = events.length;
  const totalErrors = events.filter((e) => e.status === "error" || e.status === "rate_limit").length;

  const errorRate = totalEvents > 0 ? ((totalErrors / totalEvents) * 100).toFixed(1) + "%" : "0%";

  // Chart data from daily_stats (for trend)
  const costChartData = dailyStats.map((s: any) => ({
    date: s.date,
    cost: parseFloat(s.total_cost_usd || 0),
  }));

  const totalSuccess = dailyStats.reduce((s: number, d: any) => s + (d.success_count || 0), 0);
  const totalDailyErrors = dailyStats.reduce((s: number, d: any) => s + (d.error_count || 0), 0);
  const totalRateLimits = dailyStats.reduce((s: number, d: any) => s + (d.rate_limit_count || 0), 0);
  const statusData = [
    { name: "Success", value: totalSuccess || 1, color: "#10B981" },
    { name: "Errors", value: totalDailyErrors, color: "#EF4444" },
    { name: "Rate Limited", value: totalRateLimits, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  // Per-agent costs from events (accurate)
  const agentCosts: Record<string, number> = {};
  events.forEach((e) => {
    agentCosts[e.agent_id] = (agentCosts[e.agent_id] || 0) + recalculateEventCost(e);
  });

  if (loading && agents.length === 0) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Dashboard</h1>
          {liveConnected && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Live
            </span>
          )}
        </div>
        <DateRangeSelector value={dateRange.range} onChange={setDateRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cost" value={formatCost(totalCost)} subtitle={dateRange.label} />
        <StatCard title="Tokens" value={formatNumber(totalTokens)} subtitle={dateRange.label} />
        <StatCard title="API Calls" value={formatNumber(totalEvents)} subtitle={dateRange.label} />
        <StatCard title="Error Rate" value={errorRate} subtitle={`${totalErrors} errors`} />
      </div>

      {/* Cost chart */}
      <CostChart data={costChartData} />

      {/* Status chart + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <StatusChart data={statusData} />
        </div>
        <div className="lg:col-span-2">
          <EventLog events={events.slice(0, 20)} />
        </div>
      </div>

      {/* Recommendations */}
      <Recommendations events={events} dailyStats={dailyStats} />

      {/* Agents */}
      {agents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">Active Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent: any) => (
              <AgentCard key={agent.id} agent={agent} todayCost={agentCosts[agent.id] || 0} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {agents.length === 0 && (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📡</div>
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">No agents connected yet</h3>
          <p className="text-[#A1A1AA] mb-6">Install the AgentPulse plugin on your server to start tracking.</p>
          <code className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-4 py-2 text-sm text-[#7C3AED]">
            agentpulse init
          </code>
        </div>
      )}
    </div>
  );
}
