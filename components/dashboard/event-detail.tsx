"use client";

import { formatCost, formatNumber, formatLatency, timeAgo } from "@/lib/utils";
import { MODEL_PRICING } from "@/lib/pricing";

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
}

interface EventDetailProps {
  event: Event;
  onClose: () => void;
}

function CostBreakdownRow({ label, tokens, rate, cost }: { label: string; tokens: number; rate: number; cost: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#2A2A2D]/50">
      <div>
        <span className="text-[#FAFAFA] text-sm">{label}</span>
        <span className="text-[#A1A1AA] text-xs ml-2">
          {formatNumber(tokens)} tokens × ${rate}/M
        </span>
      </div>
      <span className="text-[#FAFAFA] text-sm font-medium">{formatCost(cost)}</span>
    </div>
  );
}

export default function EventDetail({ event, onClose }: EventDetailProps) {
  const modelKey = `${event.provider}/${event.model}`;
  const pricing = MODEL_PRICING[modelKey] || MODEL_PRICING[event.model];

  const inputCost = pricing
    ? (event.input_tokens / 1_000_000) * pricing.inputPerMillion
    : 0;
  const outputCost = pricing
    ? (event.output_tokens / 1_000_000) * pricing.outputPerMillion
    : 0;
  const calculatedTotal = inputCost + outputCost;
  const reportedTotal = parseFloat(String(event.cost_usd)) || 0;

  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    success: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", label: "Success" },
    error: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", label: "Error" },
    rate_limit: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", label: "Rate Limited" },
  };
  const statusStyle = statusStyles[event.status] || statusStyles.success;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[#0A0A0B] border-l border-[#2A2A2D] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0B] border-b border-[#2A2A2D] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Event Detail</h2>
          <button
            onClick={onClose}
            className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status + Timestamp */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
            <div className="text-right">
              <p className="text-sm text-[#FAFAFA]">{new Date(event.timestamp).toLocaleString()}</p>
              <p className="text-xs text-[#A1A1AA]">{timeAgo(event.timestamp)}</p>
            </div>
          </div>

          {/* Model + Provider */}
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-1">Model</p>
                <p className="text-sm text-[#FAFAFA] font-medium">{event.model}</p>
              </div>
              <div>
                <p className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-1">Provider</p>
                <p className="text-sm text-[#FAFAFA] font-medium">{event.provider}</p>
              </div>
              <div>
                <p className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-1">Latency</p>
                <p className="text-sm text-[#FAFAFA] font-medium">{formatLatency(event.latency_ms || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-1">Task</p>
                <p className="text-sm text-[#FAFAFA] font-medium">{event.task_context || "—"}</p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4">
            <h3 className="text-sm font-medium text-[#FAFAFA] mb-3">Cost Breakdown</h3>

            {pricing ? (
              <div>
                <CostBreakdownRow
                  label="Input tokens"
                  tokens={event.input_tokens}
                  rate={pricing.inputPerMillion}
                  cost={inputCost}
                />
                <CostBreakdownRow
                  label="Output tokens"
                  tokens={event.output_tokens}
                  rate={pricing.outputPerMillion}
                  cost={outputCost}
                />
                <div className="flex items-center justify-between pt-3 mt-1">
                  <span className="text-[#FAFAFA] text-sm font-semibold">Total Cost</span>
                  <span className="text-[#7C3AED] text-lg font-bold">{formatCost(reportedTotal || calculatedTotal)}</span>
                </div>
                {reportedTotal > 0 && Math.abs(reportedTotal - calculatedTotal) > 0.0001 && (
                  <p className="text-xs text-[#A1A1AA] mt-2">
                    Calculated: {formatCost(calculatedTotal)} | Reported: {formatCost(reportedTotal)}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between py-2 border-b border-[#2A2A2D]/50">
                  <span className="text-[#A1A1AA] text-sm">Input tokens</span>
                  <span className="text-[#FAFAFA] text-sm">{formatNumber(event.input_tokens)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#2A2A2D]/50">
                  <span className="text-[#A1A1AA] text-sm">Output tokens</span>
                  <span className="text-[#FAFAFA] text-sm">{formatNumber(event.output_tokens)}</span>
                </div>
                <div className="flex items-center justify-between pt-3 mt-1">
                  <span className="text-[#FAFAFA] text-sm font-semibold">Total Cost</span>
                  <span className="text-[#7C3AED] text-lg font-bold">{formatCost(reportedTotal)}</span>
                </div>
                <p className="text-xs text-[#F59E0B] mt-2">
                  Pricing not available for {modelKey} — showing reported cost
                </p>
              </div>
            )}
          </div>

          {/* Token Summary */}
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4">
            <h3 className="text-sm font-medium text-[#FAFAFA] mb-3">Token Usage</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#A1A1AA]">Input</span>
                  <span className="text-[#FAFAFA]">{formatNumber(event.input_tokens)}</span>
                </div>
                <div className="w-full bg-[#2A2A2D] rounded-full h-2">
                  <div
                    className="bg-[#7C3AED] h-2 rounded-full"
                    style={{
                      width: `${event.total_tokens > 0 ? (event.input_tokens / event.total_tokens) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#A1A1AA]">Output</span>
                  <span className="text-[#FAFAFA]">{formatNumber(event.output_tokens)}</span>
                </div>
                <div className="w-full bg-[#2A2A2D] rounded-full h-2">
                  <div
                    className="bg-[#10B981] h-2 rounded-full"
                    style={{
                      width: `${event.total_tokens > 0 ? (event.output_tokens / event.total_tokens) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-[#2A2A2D]/50">
                <span className="text-[#A1A1AA]">Total</span>
                <span className="text-[#FAFAFA] font-medium">{formatNumber(event.total_tokens || (event.input_tokens + event.output_tokens))}</span>
              </div>
            </div>
          </div>

          {/* Tools Used */}
          {event.tools_used && event.tools_used.length > 0 && (
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#FAFAFA] mb-3">Tools Used</h3>
              <div className="flex flex-wrap gap-2">
                {event.tools_used.map((tool, i) => (
                  <span
                    key={i}
                    className="bg-[#7C3AED]/10 text-[#7C3AED] px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {event.error_message && (
            <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#EF4444] mb-2">Error</h3>
              <p className="text-sm text-[#FAFAFA] font-mono whitespace-pre-wrap">{event.error_message}</p>
            </div>
          )}

          {/* Metadata */}
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#FAFAFA] mb-3">Metadata</h3>
              <pre className="text-xs text-[#A1A1AA] font-mono overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
