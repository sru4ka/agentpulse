"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import StatCard from "@/components/dashboard/stat-card";
import EventLog from "@/components/dashboard/event-log";
import { formatCost, formatNumber } from "@/lib/utils";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const supabase = createBrowserSupabaseClient();

  const PAGE_SIZE = 100;

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch agents for this user
      const { data: agentsData } = await supabase
        .from("agents")
        .select("id, name")
        .order("name");

      setAgents(agentsData || []);

      // Fetch events across all agents
      let query = supabase
        .from("events")
        .select("*, agents!inner(name, user_id)")
        .order("timestamp", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      const { data: eventsData } = await query;

      // Filter to only this user's events (agents join ensures user_id match via RLS)
      setEvents(eventsData || []);
      setHasMore((eventsData || []).length >= PAGE_SIZE);
      setLoading(false);
    };
    fetchData();
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("events")
      .select("*, agents!inner(name, user_id)")
      .order("timestamp", { ascending: false })
      .range(from, to);

    if (agentFilter !== "all") {
      query = query.eq("agent_id", agentFilter);
    }

    const { data: moreEvents } = await query;

    if (moreEvents && moreEvents.length > 0) {
      setEvents((prev) => [...prev, ...moreEvents]);
      setPage(nextPage);
      setHasMore(moreEvents.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  };

  const handleAgentFilterChange = async (newFilter: string) => {
    setAgentFilter(newFilter);
    setLoading(true);
    setPage(0);

    let query = supabase
      .from("events")
      .select("*, agents!inner(name, user_id)")
      .order("timestamp", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (newFilter !== "all") {
      query = query.eq("agent_id", newFilter);
    }

    const { data: eventsData } = await query;
    setEvents(eventsData || []);
    setHasMore((eventsData || []).length >= PAGE_SIZE);
    setLoading(false);
  };

  // Compute summary stats from loaded events
  const totalCost = events.reduce((s, e) => s + parseFloat(e.cost_usd || 0), 0);
  const totalTokens = events.reduce((s, e) => s + (e.total_tokens || 0), 0);
  const errorCount = events.filter((e) => e.status === "error" || e.status === "rate_limit").length;
  const errorRate = events.length > 0 ? ((errorCount / events.length) * 100).toFixed(1) : "0";

  // Model breakdown from loaded events
  const modelStats: Record<string, { calls: number; cost: number; tokens: number }> = {};
  events.forEach((e) => {
    const key = e.model || "unknown";
    if (!modelStats[key]) modelStats[key] = { calls: 0, cost: 0, tokens: 0 };
    modelStats[key].calls++;
    modelStats[key].cost += parseFloat(e.cost_usd || 0);
    modelStats[key].tokens += e.total_tokens || 0;
  });
  const modelBreakdown = Object.entries(modelStats)
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.cost - a.cost);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Events</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Events</h1>

        {/* Agent filter */}
        {agents.length > 1 && (
          <select
            value={agentFilter}
            onChange={(e) => handleAgentFilterChange(e.target.value)}
            className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
          >
            <option value="all">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={formatNumber(events.length)} subtitle="loaded" />
        <StatCard title="Total Cost" value={formatCost(totalCost)} subtitle="from loaded events" />
        <StatCard title="Total Tokens" value={formatNumber(totalTokens)} subtitle="in + out" />
        <StatCard title="Error Rate" value={`${errorRate}%`} subtitle={`${errorCount} errors`} />
      </div>

      {/* Model breakdown */}
      {modelBreakdown.length > 0 && (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Cost by Model</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#A1A1AA] border-b border-[#2A2A2D]">
                  <th className="text-left pb-3">Model</th>
                  <th className="text-right pb-3">Calls</th>
                  <th className="text-right pb-3">Tokens</th>
                  <th className="text-right pb-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelBreakdown.map((m) => (
                  <tr key={m.model} className="border-b border-[#2A2A2D]/50">
                    <td className="py-3 text-[#FAFAFA] font-medium">{m.model}</td>
                    <td className="py-3 text-right text-[#A1A1AA]">{formatNumber(m.calls)}</td>
                    <td className="py-3 text-right text-[#A1A1AA]">{formatNumber(m.tokens)}</td>
                    <td className="py-3 text-right text-[#FAFAFA]">{formatCost(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full event log with filters */}
      <EventLog events={events} title={`All Events (${events.length})`} showFilters={true} />

      {/* Load more */}
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

      {/* Empty state */}
      {events.length === 0 && (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">No events yet</h3>
          <p className="text-[#A1A1AA] mb-4">Events will appear here once your agents start making API calls.</p>
        </div>
      )}
    </div>
  );
}
