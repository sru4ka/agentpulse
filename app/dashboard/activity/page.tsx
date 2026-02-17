"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import StatCard from "@/components/dashboard/stat-card";
import EventLog from "@/components/dashboard/event-log";
import CostChart from "@/components/charts/cost-chart";
import TokenChart from "@/components/charts/token-chart";
import StatusChart from "@/components/charts/status-chart";
import Recommendations from "@/components/dashboard/recommendations";
import { formatCost, formatNumber, formatLatency } from "@/lib/utils";

type Tab = "events" | "costs" | "traces";

export default function ActivityPage() {
  const searchParams = useSearchParams();
  const agentParam = searchParams.get("agent");

  const [tab, setTab] = useState<Tab>("events");
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>(agentParam || "all");
  const [events, setEvents] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const supabase = createBrowserSupabaseClient();

  const PAGE_SIZE = 100;

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch agents
      const { data: agentsData } = await supabase
        .from("agents")
        .select("id, name, framework, status, last_seen")
        .order("name");

      const agentList = agentsData || [];
      setAgents(agentList);

      // If URL has ?agent=, use that. If only 1 agent, auto-select it.
      if (agentParam && agentList.some((a) => a.id === agentParam)) {
        setSelectedAgent(agentParam);
      } else if (agentList.length === 1) {
        setSelectedAgent(agentList[0].id);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  // Fetch events + stats when agent selection changes
  useEffect(() => {
    if (loading && agents.length === 0) return;

    const fetchAgentData = async () => {
      setPage(0);
      setHasMore(true);

      if (agents.length === 0) {
        setEvents([]);
        setDailyStats([]);
        return;
      }

      const targetAgentIds = selectedAgent === "all"
        ? agents.map((a) => a.id)
        : [selectedAgent];

      // Fetch events
      let query = supabase
        .from("events")
        .select("*")
        .in("agent_id", targetAgentIds)
        .order("timestamp", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      const { data: eventsData } = await query;
      setEvents(eventsData || []);
      setHasMore((eventsData || []).length >= PAGE_SIZE);

      // Fetch daily stats
      const { data: statsData } = await supabase
        .from("daily_stats")
        .select("*")
        .in("agent_id", targetAgentIds)
        .order("date", { ascending: true })
        .limit(90);

      setDailyStats(statsData || []);
    };
    fetchAgentData();
  }, [selectedAgent, agents]);

  const loadMore = async () => {
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const targetAgentIds = selectedAgent === "all"
      ? agents.map((a) => a.id)
      : [selectedAgent];

    const { data: moreEvents } = await supabase
      .from("events")
      .select("*")
      .in("agent_id", targetAgentIds)
      .order("timestamp", { ascending: false })
      .range(from, to);

    if (moreEvents && moreEvents.length > 0) {
      setEvents((prev) => [...prev, ...moreEvents]);
      setPage(nextPage);
      setHasMore(moreEvents.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  };

  // --- Computed stats ---
  const totalCost = events.reduce((s, e) => s + parseFloat(e.cost_usd || 0), 0);
  const totalTokens = events.reduce((s, e) => s + (e.total_tokens || 0), 0);
  const errorCount = events.filter((e) => e.status === "error" || e.status === "rate_limit").length;
  const errorRate = events.length > 0 ? ((errorCount / events.length) * 100).toFixed(1) : "0";
  const avgLatency = events.length > 0
    ? Math.round(events.reduce((s, e) => s + (e.latency_ms || 0), 0) / events.length)
    : 0;

  // Cost chart data
  const costChartData = dailyStats.map((s) => ({
    date: s.date,
    cost: parseFloat(s.total_cost_usd || 0),
  }));

  // Cost analysis
  const totalCost30d = dailyStats.reduce((s: number, d: any) => s + parseFloat(d.total_cost_usd || 0), 0);
  const daysWithData = dailyStats.length || 1;
  const dailyAvg = totalCost30d / daysWithData;
  const projectedMonthly = dailyAvg * 30;

  // Status breakdown
  const totalSuccess = dailyStats.reduce((s: number, d: any) => s + (d.success_count || 0), 0);
  const totalErrors = dailyStats.reduce((s: number, d: any) => s + (d.error_count || 0), 0);
  const totalRateLimits = dailyStats.reduce((s: number, d: any) => s + (d.rate_limit_count || 0), 0);
  const statusData = [
    { name: "Success", value: totalSuccess || 0, color: "#10B981" },
    { name: "Errors", value: totalErrors, color: "#EF4444" },
    { name: "Rate Limited", value: totalRateLimits, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  // Model breakdown
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

  // Trace/task breakdown
  const taskStats: Record<string, { calls: number; cost: number; errors: number }> = {};
  events.forEach((e) => {
    const task = e.task_context || "default";
    if (!taskStats[task]) taskStats[task] = { calls: 0, cost: 0, errors: 0 };
    taskStats[task].calls++;
    taskStats[task].cost += parseFloat(e.cost_usd || 0);
    if (e.status === "error" || e.status === "rate_limit") taskStats[task].errors++;
  });
  const taskBreakdown = Object.entries(taskStats)
    .map(([task, data]) => ({ task, ...data }))
    .sort((a, b) => b.cost - a.cost);

  const errorEvents = events.filter((e) => e.status !== "success");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-14" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-28" />
          ))}
        </div>
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-80" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "events", label: "Events" },
    { id: "costs", label: "Costs" },
    { id: "traces", label: "Traces" },
  ];

  const selectedAgentName = selectedAgent === "all"
    ? "All Agents"
    : agents.find((a) => a.id === selectedAgent)?.name || "Agent";

  return (
    <div className="space-y-6">
      {/* Header: Agent selector + Tab switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* Agent selector */}
          {agents.length > 1 ? (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-4 py-2 text-[#FAFAFA] text-sm font-semibold focus:outline-none focus:border-[#7C3AED] appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23A1A1AA' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="all">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          ) : agents.length === 1 ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <h1 className="text-lg font-bold text-[#FAFAFA]">{agents[0].name}</h1>
              <span className="text-xs bg-[#7C3AED]/15 text-[#7C3AED] px-2 py-0.5 rounded-md">{agents[0].framework}</span>
            </div>
          ) : (
            <h1 className="text-lg font-bold text-[#FAFAFA]">Activity</h1>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === t.id
                  ? "bg-[#7C3AED] text-white"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Events Tab ═══ */}
      {tab === "events" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Events" value={formatNumber(events.length)} subtitle="loaded" />
            <StatCard title="Total Cost" value={formatCost(totalCost)} subtitle="from loaded events" />
            <StatCard title="Total Tokens" value={formatNumber(totalTokens)} subtitle="in + out" />
            <StatCard title="Error Rate" value={`${errorRate}%`} subtitle={`${errorCount} errors`} />
          </div>

          {/* Model cost breakdown */}
          {modelBreakdown.length > 0 && (
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
              <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Cost by Model</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#A1A1AA] border-b border-[#2A2A2D]">
                      <th className="text-left pb-3">Model</th>
                      <th className="text-right pb-3">Calls</th>
                      <th className="text-right pb-3">Input</th>
                      <th className="text-right pb-3">Output</th>
                      <th className="text-right pb-3">Cost</th>
                      <th className="text-right pb-3">$/call</th>
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
            </div>
          )}

          <EventLog events={events} title={`All Events (${events.length})`} showFilters={true} />

          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                className="bg-[#141415] border border-[#2A2A2D] text-[#FAFAFA] px-6 py-2 rounded-lg text-sm hover:border-[#7C3AED] transition-colors"
              >
                Load more events
              </button>
            </div>
          )}

          {events.length === 0 && (
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">No events yet</h3>
              <p className="text-[#A1A1AA]">Events will appear here once {selectedAgentName} starts making API calls.</p>
            </div>
          )}
        </>
      )}

      {/* ═══ Costs Tab ═══ */}
      {tab === "costs" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total (30 days)" value={formatCost(totalCost30d)} subtitle="last 30 days" />
            <StatCard title="Daily Average" value={formatCost(dailyAvg)} subtitle="per day" />
            <StatCard title="Projected Monthly" value={formatCost(projectedMonthly)} subtitle="at current rate" />
          </div>

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

          <Recommendations events={events} dailyStats={dailyStats} />
        </>
      )}

      {/* ═══ Traces Tab ═══ */}
      {tab === "traces" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Calls" value={formatNumber(events.length)} subtitle="API calls tracked" />
            <StatCard title="Avg Latency" value={formatLatency(avgLatency)} subtitle="per call" />
            <StatCard title="Error Rate" value={`${errorRate}%`} subtitle={`${errorCount} failures`} />
            <StatCard title="Total Cost" value={formatCost(totalCost)} subtitle="from traces" />
          </div>

          {/* Task breakdown */}
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
            <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Traces by Task</h3>
            {taskBreakdown.length === 0 ? (
              <p className="text-[#A1A1AA] text-sm">No task context data yet. Use <code className="text-[#7C3AED]">agentpulse.set_context(&quot;task-name&quot;)</code> or the proxy to add context.</p>
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

          {/* Error events */}
          {errorEvents.length > 0 && (
            <EventLog
              events={errorEvents}
              title={`Errors & Rate Limits (${errorEvents.length})`}
              showFilters={true}
            />
          )}

          {/* Full trace log */}
          <EventLog events={events} title={`All Traces (${events.length})`} showFilters={true} />

          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                className="bg-[#141415] border border-[#2A2A2D] text-[#FAFAFA] px-6 py-2 rounded-lg text-sm hover:border-[#7C3AED] transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
