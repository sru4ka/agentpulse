"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { recalculateEventCost } from "@/lib/pricing";
import StatCard from "@/components/dashboard/stat-card";
import CostChart from "@/components/charts/cost-chart";
import TokenChart from "@/components/charts/token-chart";
import StatusChart from "@/components/charts/status-chart";
import EventLog from "@/components/dashboard/event-log";
import Recommendations from "@/components/dashboard/recommendations";
import DateRangeSelector, { DateRangeResult, getDateRange } from "@/components/dashboard/date-range-selector";
import { formatCost, formatNumber, formatLatency } from "@/lib/utils";

function toLocalISORange(dateStr: string, end: boolean): string {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const m = String(Math.abs(offset) % 60).padStart(2, "0");
  const tz = `${sign}${h}:${m}`;
  return end ? `${dateStr}T23:59:59${tz}` : `${dateStr}T00:00:00${tz}`;
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [eventsPage, setEventsPage] = useState(0);
  const [dateRange, setDateRange] = useState<DateRangeResult>(getDateRange("today"));
  const supabase = createBrowserSupabaseClient();

  const PAGE_SIZE = 100;

  useEffect(() => {
    const fetchAgent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: agentData } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      setAgent(agentData);
      setLoading(false);
    };
    fetchAgent();
  }, [agentId]);

  // Fetch events + daily_stats when date range changes
  useEffect(() => {
    if (!agent) return;

    const fetchData = async () => {
      const fromTs = dateRange.from + "T00:00:00";
      const toTs = dateRange.to + "T23:59:59";

      const [eventsRes, statsRes] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .eq("agent_id", agentId)
          .gte("timestamp", fromTs)
          .lte("timestamp", toTs)
          .order("timestamp", { ascending: false })
          .range(0, PAGE_SIZE - 1),
        supabase
          .from("daily_stats")
          .select("*")
          .eq("agent_id", agentId)
          .gte("date", dateRange.from)
          .lte("date", dateRange.to)
          .order("date", { ascending: true }),
      ]);

      setEvents(eventsRes.data || []);
      setDailyStats(statsRes.data || []);
      setHasMore((eventsRes.data || []).length >= PAGE_SIZE);
      setEventsPage(0);
    };
    fetchData();
  }, [agent, agentId, dateRange]);

  const loadMoreEvents = async () => {
    const nextPage = eventsPage + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const fromTs = toLocalISORange(dateRange.from, false);
    const toTs = toLocalISORange(dateRange.to, true);

    const { data: moreEvents } = await supabase
      .from("events")
      .select("*")
      .eq("agent_id", agentId)
      .gte("timestamp", fromTs)
      .lte("timestamp", toTs)
      .order("timestamp", { ascending: false })
      .range(from, to);

    if (moreEvents && moreEvents.length > 0) {
      setEvents((prev) => [...prev, ...moreEvents]);
      setEventsPage(nextPage);
      setHasMore(moreEvents.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  };

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

  // --- Aggregate stats from events with recalculated costs ---
  const totalCost = events.reduce((s, e) => s + recalculateEventCost(e), 0);
  const totalEvents = events.length;
  const totalSuccess = events.filter((e) => e.status === "success").length;
  const totalErrors = events.filter((e) => e.status === "error").length;
  const successRate = totalEvents > 0 ? ((totalSuccess / totalEvents) * 100).toFixed(1) : "0";
  const avgLatency = events.length > 0
    ? Math.round(events.reduce((s, e) => s + (e.latency_ms || 0), 0) / events.length)
    : 0;

  // --- Chart data ---
  const costChartData = dailyStats.map((s) => ({ date: s.date, cost: parseFloat(s.total_cost_usd || 0) }));

  const statusData = [
    { name: "Success", value: totalSuccess || 0, color: "#10B981" },
    { name: "Errors", value: totalErrors, color: "#EF4444" },
    { name: "Rate Limited", value: events.filter((e) => e.status === "rate_limit").length, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  // --- Model breakdown with recalculated costs ---
  const modelStats: Record<string, { calls: number; tokens: number; cost: number; inputTokens: number; outputTokens: number }> = {};
  events.forEach((e) => {
    const key = `${e.provider}/${e.model}`;
    if (!modelStats[key]) modelStats[key] = { calls: 0, tokens: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
    modelStats[key].calls++;
    modelStats[key].tokens += (e.total_tokens || 0);
    modelStats[key].cost += recalculateEventCost(e);
    modelStats[key].inputTokens += (e.input_tokens || 0);
    modelStats[key].outputTokens += (e.output_tokens || 0);
  });
  const modelBreakdown = Object.entries(modelStats)
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.cost - a.cost);
  const tokenChartData = modelBreakdown.map((m) => ({ model: m.model, tokens: m.tokens }));

  // --- Task breakdown ---
  const taskStats: Record<string, { calls: number; cost: number; errors: number }> = {};
  events.forEach((e) => {
    const task = e.task_context || "unknown";
    if (!taskStats[task]) taskStats[task] = { calls: 0, cost: 0, errors: 0 };
    taskStats[task].calls++;
    taskStats[task].cost += recalculateEventCost(e);
    if (e.status === "error" || e.status === "rate_limit") taskStats[task].errors++;
  });
  const taskBreakdown = Object.entries(taskStats)
    .map(([task, data]) => ({ task, ...data }))
    .sort((a, b) => b.cost - a.cost);

  // --- Error events ---
  const errorEvents = events.filter((e) => e.status !== "success");

  return (
    <div className="space-y-6">
      {/* Agent header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">{agent.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs bg-[#7C3AED20] text-[#7C3AED] px-2 py-0.5 rounded-full">{agent.framework}</span>
            <span className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
              <span className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-[#10B981]" : "bg-[#A1A1AA]"}`} />
              {agent.status}
            </span>
            {agent.last_seen && (
              <span className="text-xs text-[#A1A1AA]">
                Last seen: {new Date(agent.last_seen).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <DateRangeSelector value={dateRange.range} onChange={setDateRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Cost" value={formatCost(totalCost)} subtitle={dateRange.label} />
        <StatCard title="Total Events" value={formatNumber(totalEvents)} subtitle={dateRange.label} />
        <StatCard title="Success Rate" value={`${successRate}%`} subtitle="of calls succeeded" />
        <StatCard title="Avg Latency" value={formatLatency(avgLatency)} subtitle="per call" />
      </div>

      {/* Recommendations */}
      <Recommendations events={events} dailyStats={dailyStats} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CostChart data={costChartData} />
        </div>
        <div className="lg:col-span-1">
          <StatusChart data={statusData.length > 0 ? statusData : [{ name: "No data", value: 1, color: "#2A2A2D" }]} />
        </div>
      </div>

      {/* Token usage by model */}
      <TokenChart data={tokenChartData} />

      {/* Model cost breakdown table */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Cost by Model</h3>
        {modelBreakdown.length === 0 ? (
          <p className="text-[#A1A1AA] text-sm">No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#A1A1AA] border-b border-[#2A2A2D]">
                  <th className="text-left pb-3">Model</th>
                  <th className="text-right pb-3">Calls</th>
                  <th className="text-right pb-3">Input Tokens</th>
                  <th className="text-right pb-3">Output Tokens</th>
                  <th className="text-right pb-3">Cost</th>
                  <th className="text-right pb-3">$/call avg</th>
                </tr>
              </thead>
              <tbody>
                {modelBreakdown.map((m) => (
                  <tr key={m.model} className="border-b border-[#2A2A2D]/50">
                    <td className="py-3 text-[#FAFAFA] font-medium">{m.model}</td>
                    <td className="py-3 text-right text-[#A1A1AA]">{formatNumber(m.calls)}</td>
                    <td className="py-3 text-right text-[#A1A1AA]">{formatNumber(m.inputTokens)}</td>
                    <td className="py-3 text-right text-[#A1A1AA]">{formatNumber(m.outputTokens)}</td>
                    <td className="py-3 text-right text-[#FAFAFA]">{formatCost(m.cost)}</td>
                    <td className="py-3 text-right text-[#A1A1AA]">{formatCost(m.calls > 0 ? m.cost / m.calls : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task breakdown table */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Cost by Task Type</h3>
        {taskBreakdown.length === 0 ? (
          <p className="text-[#A1A1AA] text-sm">No task context data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#A1A1AA] border-b border-[#2A2A2D]">
                  <th className="text-left pb-3">Task</th>
                  <th className="text-right pb-3">Calls</th>
                  <th className="text-right pb-3">Cost</th>
                  <th className="text-right pb-3">Errors</th>
                  <th className="text-right pb-3">Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {taskBreakdown.map((t) => {
                  const errRate = t.calls > 0 ? ((t.errors / t.calls) * 100).toFixed(1) : "0";
                  return (
                    <tr key={t.task} className="border-b border-[#2A2A2D]/50">
                      <td className="py-3 text-[#FAFAFA] font-medium">{t.task}</td>
                      <td className="py-3 text-right text-[#A1A1AA]">{formatNumber(t.calls)}</td>
                      <td className="py-3 text-right text-[#FAFAFA]">{formatCost(t.cost)}</td>
                      <td className="py-3 text-right text-[#A1A1AA]">{t.errors}</td>
                      <td className="py-3 text-right">
                        <span className={parseFloat(errRate) > 10 ? "text-[#EF4444]" : "text-[#A1A1AA]"}>
                          {errRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error log */}
      {errorEvents.length > 0 && (
        <EventLog
          events={errorEvents}
          title={`Errors & Rate Limits (${errorEvents.length})`}
          showFilters={true}
        />
      )}

      {/* Full event log */}
      <EventLog events={events} title={`All Events (${events.length})`} showFilters={true} />

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={loadMoreEvents}
            className="bg-[#141415] border border-[#2A2A2D] text-[#FAFAFA] px-6 py-2 rounded-lg text-sm hover:border-[#7C3AED] transition-colors"
          >
            Load more events
          </button>
        </div>
      )}
    </div>
  );
}
