"use client";

import { useState } from "react";
import { formatCost, formatNumber, formatLatency, timeAgo } from "@/lib/utils";
import { MODEL_PRICING } from "@/lib/pricing";

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

function MessageBubble({ message }: { message: PromptMessage }) {
  const roleStyles: Record<string, { bg: string; border: string; label: string; labelColor: string }> = {
    user: { bg: "bg-[#7C3AED]/5", border: "border-[#7C3AED]/20", label: "User", labelColor: "text-[#7C3AED]" },
    system: { bg: "bg-[#F59E0B]/5", border: "border-[#F59E0B]/20", label: "System", labelColor: "text-[#F59E0B]" },
    assistant: { bg: "bg-[#10B981]/5", border: "border-[#10B981]/20", label: "Assistant", labelColor: "text-[#10B981]" },
    tool: { bg: "bg-[#3B82F6]/5", border: "border-[#3B82F6]/20", label: message.tool ? `Tool: ${message.tool}` : "Tool", labelColor: "text-[#3B82F6]" },
  };

  const style = roleStyles[message.role] || roleStyles.user;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.labelColor}`}>
          {style.label}
        </span>
      </div>
      <p className="text-sm text-[#FAFAFA] font-mono whitespace-pre-wrap break-words leading-relaxed">
        {message.content}
      </p>
    </div>
  );
}

export default function EventDetail({ event, onClose }: EventDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "prompt" | "response">("overview");
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

  // Read prompt data from top-level fields OR from metadata JSONB
  const promptMessages: PromptMessage[] | null =
    event.prompt_messages && event.prompt_messages.length > 0
      ? event.prompt_messages
      : event.metadata?.prompt_messages || null;
  const responseText: string | null =
    event.response_text || event.metadata?.response_text || null;

  const hasPromptData = promptMessages && promptMessages.length > 0;
  const hasResponseData = !!responseText;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[#0A0A0B] border-l border-[#2A2A2D] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0B] border-b border-[#2A2A2D] px-6 py-4">
          <div className="flex items-center justify-between mb-3">
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

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#141415] rounded-lg p-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === "overview" ? "bg-[#7C3AED] text-white" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("prompt")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-1 ${
                activeTab === "prompt" ? "bg-[#7C3AED] text-white" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              Prompt
              {hasPromptData && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("response")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-1 ${
                activeTab === "response" ? "bg-[#7C3AED] text-white" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              Response
              {hasResponseData && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              )}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
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

              {/* Metadata (hide prompt_messages/response_text since shown in dedicated tabs) */}
              {event.metadata && Object.keys(event.metadata).filter(k => k !== 'prompt_messages' && k !== 'response_text').length > 0 && (
                <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-4">
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-3">Metadata</h3>
                  <pre className="text-xs text-[#A1A1AA] font-mono overflow-x-auto">
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(event.metadata).filter(([k]) => k !== 'prompt_messages' && k !== 'response_text')
                      ),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </>
          )}

          {/* Prompt Tab */}
          {activeTab === "prompt" && (
            <>
              {hasPromptData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#FAFAFA]">
                      Conversation ({promptMessages!.length} messages)
                    </h3>
                    <span className="text-xs text-[#A1A1AA]">{event.model}</span>
                  </div>
                  {promptMessages!.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#141415] rounded-xl flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-1">No prompt data captured</h3>
                  <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto leading-relaxed">
                    Enable the LLM proxy to capture prompts. Run this on your agent server and restart:
                  </p>
                  <code className="inline-block mt-3 text-xs text-[#7C3AED] bg-[#7C3AED]/5 px-3 py-1.5 rounded-lg font-mono">
                    agentpulse enable-proxy
                  </code>
                </div>
              )}
            </>
          )}

          {/* Response Tab */}
          {activeTab === "response" && (
            <>
              {hasResponseData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#FAFAFA]">Model Response</h3>
                    <span className="text-xs text-[#A1A1AA]">{formatNumber(event.output_tokens)} tokens</span>
                  </div>
                  <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-lg p-4">
                    <p className="text-sm text-[#FAFAFA] font-mono whitespace-pre-wrap break-words leading-relaxed">
                      {responseText}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#141415] rounded-xl flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-1">No response data captured</h3>
                  <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto leading-relaxed">
                    Enable the LLM proxy to capture responses. Run this on your agent server and restart:
                  </p>
                  <code className="inline-block mt-3 text-xs text-[#7C3AED] bg-[#7C3AED]/5 px-3 py-1.5 rounded-lg font-mono">
                    agentpulse enable-proxy
                  </code>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
