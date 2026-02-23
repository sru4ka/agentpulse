"use client";
import { useState } from "react";
import Link from "next/link";
import { timeAgo, formatCost } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  framework: string;
  status: string;
  last_seen: string;
}

interface AgentCardProps {
  agent: Agent;
  todayCost: number;
  onDelete?: (id: string) => void;
}

export default function AgentCard({ agent, todayCost, onDelete }: AgentCardProps) {
  const isActive = agent.status === "active";
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-5 transition-all duration-200 hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/[0.03] hover:shadow-[0_0_20px_rgba(124,58,237,0.08)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#FAFAFA] font-bold text-base truncate">{agent.name}</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? "bg-[#10B981]" : "bg-[#A1A1AA]"
              }`}
            />
            <span className={`text-xs ${isActive ? "text-[#10B981]" : "text-[#A1A1AA]"}`}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {onDelete && (
            confirming ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { onDelete(agent.id); setConfirming(false); }}
                  className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-2 py-0.5 rounded text-xs font-medium bg-[#2A2A2D] text-[#A1A1AA] hover:text-[#FAFAFA] transition"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="p-1 rounded text-[#A1A1AA] hover:text-red-400 hover:bg-red-500/10 transition"
                title="Delete agent"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#7C3AED]/15 text-[#7C3AED] text-xs font-medium">
          {agent.framework}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
        <span>Last seen {timeAgo(agent.last_seen)}</span>
        <span className="text-[#FAFAFA] font-medium">{formatCost(todayCost)} today</span>
      </div>

      <Link href={`/dashboard/agents/${agent.id}`} className="group block">
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2A2A2D]/50">
          <span className="text-xs text-[#A1A1AA] group-hover:text-[#7C3AED] transition-colors">
            View events, costs & traces
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-[#A1A1AA] group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all duration-200"
          >
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>
    </div>
  );
}
