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
}

export default function AgentCard({ agent, todayCost }: AgentCardProps) {
  const isActive = agent.status === "active";

  return (
    <Link href={`/dashboard/agents/${agent.id}`} className="group block">
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-5 transition-all duration-200 cursor-pointer group-hover:border-[#7C3AED]/50 group-hover:bg-[#7C3AED]/[0.03] group-hover:shadow-[0_0_20px_rgba(124,58,237,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#FAFAFA] font-bold text-base truncate">{agent.name}</h3>
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

        {/* View details CTA */}
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
      </div>
    </Link>
  );
}
