"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import AgentCard from "@/components/dashboard/agent-card";

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchAgents = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/agents", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setAgents(data.agents || []);
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
            <AgentCard key={agent.id} agent={agent} todayCost={0} />
          ))}
        </div>
      )}
    </div>
  );
}
