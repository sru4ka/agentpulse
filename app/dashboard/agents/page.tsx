"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { recalculateEventCost } from "@/lib/pricing";
import AgentCard from "@/components/dashboard/agent-card";

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalISORange(dateStr: string, end: boolean): string {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const m = String(Math.abs(offset) % 60).padStart(2, "0");
  const tz = `${sign}${h}:${m}`;
  return end ? `${dateStr}T23:59:59${tz}` : `${dateStr}T00:00:00${tz}`;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [agentCosts, setAgentCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchAgents = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: agentsData } = await supabase
        .from("agents")
        .select("*")
        .order("last_seen", { ascending: false });

      const agentList = agentsData || [];
      setAgents(agentList);

      // Fetch today's events to calculate per-agent costs
      if (agentList.length > 0) {
        const today = toLocalDateString(new Date());
        const { data: todayEvents } = await supabase
          .from("events")
          .select("agent_id, model, provider, input_tokens, output_tokens, cost_usd")
          .in("agent_id", agentList.map((a: any) => a.id))
          .gte("timestamp", toLocalISORange(today, false))
          .lte("timestamp", toLocalISORange(today, true));

        const costs: Record<string, number> = {};
        (todayEvents || []).forEach((e: any) => {
          costs[e.agent_id] = (costs[e.agent_id] || 0) + recalculateEventCost(e);
        });
        setAgentCosts(costs);
      }

      setLoading(false);
    };
    fetchAgents();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#FAFAFA]">Agents</h1>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-36" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-12 text-center">
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">No agents yet</h3>
          <p className="text-[#A1A1AA]">Connect your first agent to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: any) => (
            <AgentCard key={agent.id} agent={agent} todayCost={agentCosts[agent.id] || 0} />
          ))}
        </div>
      )}
    </div>
  );
}
