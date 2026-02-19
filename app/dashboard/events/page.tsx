"use client";
import { useEffect, useState, useRef } from "react";
import { useDashboardCache } from "@/lib/dashboard-cache";
import { recalculateEventCost } from "@/lib/pricing";
import StatCard from "@/components/dashboard/stat-card";
import EventLog from "@/components/dashboard/event-log";
import DateRangeSelector, { DateRangeResult, getDateRange } from "@/components/dashboard/date-range-selector";
import { formatCost, formatNumber } from "@/lib/utils";

function toLocalISORange(dateStr: string, end: boolean): string {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const m = String(Math.abs(offset) % 60).padStart(2, "0");
  const tz = `${sign}${h}:${m}`;
  return end ? `${dateStr}T23:59:59${tz}` : `${dateStr}T00:00:00${tz}`;
}

const CACHE_KEY = "events";

export default function EventsPage() {
  const { agents, agentsLoaded, supabase, get, set } = useDashboardCache();

  const cached = get(CACHE_KEY);
  const [selectedAgent, setSelectedAgent] = useState<string>(cached?.selectedAgent || "all");
  const [events, setEvents] = useState<any[]>(cached?.events || []);
  const [loading, setLoading] = useState(!cached && !agentsLoaded);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? true);
  const [page, setPage] = useState(cached?.page || 0);
  const [dateRange, setDateRange] = useState<DateRangeResult>(cached?.dateRange || getDateRange("today"));
  const initialFetchDone = useRef(!!cached);

  const PAGE_SIZE = 100;

  // Auto-select single agent once agents load
  useEffect(() => {
    if (!agentsLoaded || !agents) return;
    if (!cached && agents.length === 1) {
      setSelectedAgent(agents[0].id);
    }
    if (!cached) setLoading(false);
  }, [agentsLoaded]);

  // Fetch events when filters change
  const prevFilters = useRef({ agent: selectedAgent, range: dateRange });
  useEffect(() => {
    if (!agentsLoaded || !agents || agents.length === 0) return;

    // Skip if this is initial mount with cached data and filters haven't changed
    if (initialFetchDone.current &&
        prevFilters.current.agent === selectedAgent &&
        prevFilters.current.range === dateRange) {
      return;
    }
    initialFetchDone.current = true;
    prevFilters.current = { agent: selectedAgent, range: dateRange };

    const fetchEvents = async () => {
      setPage(0);
      setHasMore(true);

      const targetAgentIds = selectedAgent === "all"
        ? agents.map((a) => a.id)
        : [selectedAgent];

      const fromTs = toLocalISORange(dateRange.from, false);
      const toTs = toLocalISORange(dateRange.to, true);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .in("agent_id", targetAgentIds)
        .gte("timestamp", fromTs)
        .lte("timestamp", toTs)
        .order("timestamp", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      const newEvents = eventsData || [];
      const newHasMore = newEvents.length >= PAGE_SIZE;
      setEvents(newEvents);
      setHasMore(newHasMore);
      set(CACHE_KEY, { events: newEvents, hasMore: newHasMore, page: 0, selectedAgent, dateRange });
    };
    fetchEvents();
  }, [selectedAgent, agentsLoaded, dateRange]);

  const loadMore = async () => {
    if (!agents || agents.length === 0) return;
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const targetAgentIds = selectedAgent === "all"
      ? agents.map((a) => a.id)
      : [selectedAgent];

    const fromTs = toLocalISORange(dateRange.from, false);
    const toTs = toLocalISORange(dateRange.to, true);

    const { data: moreEvents } = await supabase
      .from("events")
      .select("*")
      .in("agent_id", targetAgentIds)
      .gte("timestamp", fromTs)
      .lte("timestamp", toTs)
      .order("timestamp", { ascending: false })
      .range(from, to);

    if (moreEvents && moreEvents.length > 0) {
      const updated = [...events, ...moreEvents];
      const newHasMore = moreEvents.length >= PAGE_SIZE;
      setEvents(updated);
      setPage(nextPage);
      setHasMore(newHasMore);
      set(CACHE_KEY, { events: updated, hasMore: newHasMore, page: nextPage, selectedAgent, dateRange });
    } else {
      setHasMore(false);
    }
  };

  const agentList = agents || [];
  const totalCost = events.reduce((s, e) => s + recalculateEventCost(e), 0);
  const totalTokens = events.reduce((s, e) => s + (e.total_tokens || 0), 0);
  const errorCount = events.filter((e) => e.status === "error" || e.status === "rate_limit").length;
  const errorRate = events.length > 0 ? ((errorCount / events.length) * 100).toFixed(1) : "0";

  // Model breakdown with recalculated costs
  const modelStats: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }> = {};
  events.forEach((e) => {
    const key = e.model || "unknown";
    if (!modelStats[key]) modelStats[key] = { calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
    modelStats[key].calls++;
    modelStats[key].cost += recalculateEventCost(e);
    modelStats[key].inputTokens += e.input_tokens || 0;
    modelStats[key].outputTokens += e.output_tokens || 0;
  });
  const modelBreakdown = Object.entries(modelStats)
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.cost - a.cost);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Events</h1>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Events</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeSelector value={dateRange.range} onChange={setDateRange} />
          {agentList.length > 1 && (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-4 py-2 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#7C3AED] appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23A1A1AA' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="all">All Agents</option>
              {agentList.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={formatNumber(events.length)} subtitle={dateRange.label} />
        <StatCard title="Total Cost" value={formatCost(totalCost)} subtitle={dateRange.label} />
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
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">No events in this period</h3>
          <p className="text-[#A1A1AA]">Try selecting a different date range.</p>
        </div>
      )}
    </div>
  );
}
