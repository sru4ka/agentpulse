"use client";
import { useEffect, useState, useRef } from "react";
import { useDashboardCache } from "@/lib/dashboard-cache";
import { recalculateEventCost } from "@/lib/pricing";
import { formatCost, formatNumber, formatLatency } from "@/lib/utils";

export default function ShareReportPage() {
  const { agents, agentsLoaded, supabase } = useDashboardCache();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Current month range
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

  useEffect(() => {
    if (!agentsLoaded || !agents || agents.length === 0) {
      if (agentsLoaded) setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      const agentIds = agents.map((a: any) => a.id);
      const { data } = await supabase
        .from("events")
        .select("*")
        .in("agent_id", agentIds)
        .gte("timestamp", `${monthStart}T00:00:00`)
        .lte("timestamp", `${monthEnd}T23:59:59`)
        .order("timestamp", { ascending: false })
        .limit(5000);

      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, [agentsLoaded]);

  // Filter by selected agent
  const filteredEvents = selectedAgent === "all"
    ? events
    : events.filter((e) => e.agent_id === selectedAgent);

  // Stats
  const totalCost = filteredEvents.reduce((s, e) => s + recalculateEventCost(e), 0);
  const totalCalls = filteredEvents.length;
  const avgLatency = totalCalls > 0
    ? Math.round(filteredEvents.reduce((s, e) => s + (e.latency_ms || 0), 0) / totalCalls)
    : 0;

  // Task breakdown for cheapest/most expensive
  const taskCosts: Record<string, { cost: number; calls: number }> = {};
  filteredEvents.forEach((e) => {
    const task = e.task_context || e.model || "general";
    if (!taskCosts[task]) taskCosts[task] = { cost: 0, calls: 0 };
    taskCosts[task].cost += recalculateEventCost(e);
    taskCosts[task].calls++;
  });
  const tasks = Object.entries(taskCosts)
    .map(([task, data]) => ({ task, avgCost: data.calls > 0 ? data.cost / data.calls : 0, ...data }))
    .sort((a, b) => a.avgCost - b.avgCost);
  const cheapestTask = tasks.length > 0 ? tasks[0] : null;
  const expensiveTask = tasks.length > 1 ? tasks[tasks.length - 1] : null;

  // Agent display name
  const agentName = selectedAgent === "all"
    ? (agents?.length === 1 ? agents[0].name : "All Agents")
    : agents?.find((a: any) => a.id === selectedAgent)?.name || "Agent";

  // Generate share text
  const shareText = [
    `My AI Agent: ${agentName}`,
    `${monthName}`,
    `Total spend: ${formatCost(totalCost)}`,
    `${formatNumber(totalCalls)} API calls`,
    `Avg latency: ${formatLatency(avgLatency)}`,
    cheapestTask ? `Cheapest task: ${cheapestTask.task} (${formatCost(cheapestTask.avgCost)}/call)` : "",
    expensiveTask ? `Most expensive: ${expensiveTask.task} (${formatCost(expensiveTask.avgCost)}/call)` : "",
    "",
    "Track yours free at agentpulses.com",
  ].filter(Boolean).join("\n");

  const shareOnX = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Share Report</h1>
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Share Cost Report</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Generate a shareable report card for your AI agent stats.</p>
      </div>

      {/* Agent selector */}
      {agents && agents.length > 1 && (
        <div>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#7C3AED] outline-none"
          >
            <option value="all">All Agents</option>
            {agents.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* The shareable card */}
      <div
        ref={cardRef}
        className="bg-gradient-to-br from-[#141415] to-[#1A1A2E] border border-[#2A2A2D] rounded-2xl p-8 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#7C3AED]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#10B981]/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#7C3AED]/15 rounded-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="8" fill="#7C3AED" />
                <circle cx="14" cy="14" r="12" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#FAFAFA]">{agentName}</h2>
              <p className="text-xs text-[#A1A1AA]">{monthName}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2D] to-transparent mb-6" />

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#0A0A0B]/50 rounded-xl p-4">
              <p className="text-xs text-[#A1A1AA] mb-1">Total Spend</p>
              <p className="text-2xl font-bold text-[#FAFAFA]">{formatCost(totalCost)}</p>
            </div>
            <div className="bg-[#0A0A0B]/50 rounded-xl p-4">
              <p className="text-xs text-[#A1A1AA] mb-1">API Calls</p>
              <p className="text-2xl font-bold text-[#FAFAFA]">{formatNumber(totalCalls)}</p>
            </div>
            <div className="bg-[#0A0A0B]/50 rounded-xl p-4">
              <p className="text-xs text-[#A1A1AA] mb-1">Avg Latency</p>
              <p className="text-2xl font-bold text-[#FAFAFA]">{formatLatency(avgLatency)}</p>
            </div>
            <div className="bg-[#0A0A0B]/50 rounded-xl p-4">
              <p className="text-xs text-[#A1A1AA] mb-1">Tasks Tracked</p>
              <p className="text-2xl font-bold text-[#FAFAFA]">{tasks.length}</p>
            </div>
          </div>

          {/* Cheapest / Most expensive */}
          {(cheapestTask || expensiveTask) && (
            <div className="space-y-2 mb-6">
              {cheapestTask && (
                <div className="flex items-center justify-between bg-[#10B981]/5 border border-[#10B981]/15 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">&#127942;</span>
                    <span className="text-sm text-[#A1A1AA]">Cheapest task</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-[#FAFAFA]">{cheapestTask.task}</span>
                    <span className="text-xs text-[#10B981] ml-2">{formatCost(cheapestTask.avgCost)}/call</span>
                  </div>
                </div>
              )}
              {expensiveTask && (
                <div className="flex items-center justify-between bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">&#128184;</span>
                    <span className="text-sm text-[#A1A1AA]">Most expensive</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-[#FAFAFA]">{expensiveTask.task}</span>
                    <span className="text-xs text-[#EF4444] ml-2">{formatCost(expensiveTask.avgCost)}/call</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2D] to-transparent mb-4" />

          {/* Branding footer */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#A1A1AA]">
            <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="8" fill="#7C3AED" />
            </svg>
            <span>Track yours free at <span className="text-[#7C3AED] font-medium">agentpulses.com</span></span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={shareOnX}
          className="flex-1 flex items-center justify-center gap-2 bg-[#0A0A0B] hover:bg-[#141415] border border-[#2A2A2D] hover:border-[#3A3A3D] text-[#FAFAFA] px-4 py-3 rounded-xl text-sm font-medium transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>
        <button
          onClick={copyToClipboard}
          className="flex-1 flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-4 py-3 rounded-xl text-sm font-medium transition"
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy Text
            </>
          )}
        </button>
      </div>

      {/* Tip */}
      <div className="bg-[#7C3AED]/5 border border-[#7C3AED]/15 rounded-xl p-4">
        <p className="text-xs text-[#A1A1AA]">
          <span className="text-[#7C3AED] font-medium">Tip:</span> Take a screenshot of the card above to share as an image, or use the buttons to share as text.
        </p>
      </div>
    </div>
  );
}
