"use client";

import { useState } from "react";
import { formatCost, formatNumber, formatLatency, timeAgo } from "@/lib/utils";
import { recalculateEventCost } from "@/lib/pricing";
import EventDetail from "./event-detail";

interface PromptMessage {
  role: string;
  content: string;
  tool?: string;
}

interface Event {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  status: string;
  latency_ms: number;
  task_context: string;
  tools_used: string[];
  error_message: string | null;
  metadata: Record<string, any> | null;
  prompt_messages: PromptMessage[] | null;
  response_text: string | null;
}

interface EventLogProps {
  events: Event[];
  title?: string;
  showFilters?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-[#10B981]/15 text-[#10B981]",
    error: "bg-[#EF4444]/15 text-[#EF4444]",
    rate_limit: "bg-[#F59E0B]/15 text-[#F59E0B]",
  };

  const badgeStyle = styles[status] || "bg-[#A1A1AA]/15 text-[#A1A1AA]";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyle}`}>
      {status}
    </span>
  );
}

function PromptIndicator({ hasPrompt }: { hasPrompt: boolean }) {
  if (!hasPrompt) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[#7C3AED] bg-[#7C3AED]/10 px-1.5 py-0.5 rounded" title="Prompt data available">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    </span>
  );
}

export default function EventLog({ events, title = "Recent Events", showFilters = false }: EventLogProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");

  const models = [...new Set(events.map((e) => e.model))];

  const filtered = events.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (modelFilter !== "all" && e.model !== modelFilter) return false;
    return true;
  });

  return (
    <>
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h3 className="text-sm font-medium text-[#FAFAFA]">{title}</h3>
          {showFilters && (
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-none bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="all">All statuses</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="rate_limit">Rate Limited</option>
              </select>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="flex-1 sm:flex-none bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="all">All models</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2D]">
                <th className="text-left py-3 px-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Time</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Model</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Tokens (in/out)</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Cost</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Latency</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event, index) => (
                <tr
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`border-b border-[#2A2A2D]/50 cursor-pointer transition-colors hover:bg-[#7C3AED]/5 ${
                    index % 2 === 0 ? "bg-[#141415]" : "bg-[#1A1A1C]"
                  }`}
                >
                  <td className="py-3 px-3 text-[#A1A1AA] whitespace-nowrap">
                    {timeAgo(event.timestamp)}
                  </td>
                  <td className="py-3 px-3 text-[#FAFAFA] whitespace-nowrap font-medium">
                    <span className="flex items-center gap-1.5">
                      {event.model}
                      <PromptIndicator hasPrompt={!!((event.prompt_messages && event.prompt_messages.length > 0) || (event.metadata?.prompt_messages && event.metadata.prompt_messages.length > 0))} />
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#A1A1AA] text-right whitespace-nowrap">
                    {formatNumber(event.input_tokens)} / {formatNumber(event.output_tokens)}
                  </td>
                  <td className="py-3 px-3 text-[#FAFAFA] text-right whitespace-nowrap">
                    {formatCost(recalculateEventCost(event))}
                  </td>
                  <td className="py-3 px-3 text-[#A1A1AA] text-right whitespace-nowrap">
                    {formatLatency(event.latency_ms)}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusBadge status={event.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#A1A1AA]">
                    {events.length === 0 ? "No events recorded yet." : "No events match the filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden space-y-2">
          {filtered.map((event) => (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3 cursor-pointer hover:border-[#7C3AED]/30 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#FAFAFA] font-medium flex items-center gap-1.5">
                  {event.model}
                  <PromptIndicator hasPrompt={!!((event.prompt_messages && event.prompt_messages.length > 0) || (event.metadata?.prompt_messages && event.metadata.prompt_messages.length > 0))} />
                </span>
                <StatusBadge status={event.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[#A1A1AA]">Cost</span>
                  <p className="text-[#FAFAFA] font-medium">{formatCost(recalculateEventCost(event))}</p>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Tokens</span>
                  <p className="text-[#FAFAFA] font-medium">{formatNumber(event.total_tokens || (event.input_tokens + event.output_tokens))}</p>
                </div>
                <div>
                  <span className="text-[#A1A1AA]">Time</span>
                  <p className="text-[#FAFAFA] font-medium">{timeAgo(event.timestamp)}</p>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-[#A1A1AA] text-sm">
              {events.length === 0 ? "No events recorded yet." : "No events match the filters."}
            </p>
          )}
        </div>

        {events.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#2A2A2D]/30">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#7C3AED] flex-shrink-0">
              <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-xs text-[#A1A1AA]">
              Click any row to deep dive into cost breakdown, prompt replay & response
            </p>
          </div>
        )}
      </div>

      {/* Event detail slide-out panel */}
      {selectedEvent && (
        <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}
