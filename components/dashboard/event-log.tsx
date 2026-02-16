import { formatCost, formatNumber, formatLatency, timeAgo } from "@/lib/utils";

interface Event {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: string;
  latency_ms: number;
  task_context: string;
}

interface EventLogProps {
  events: Event[];
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

export default function EventLog({ events }: EventLogProps) {
  return (
    <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
      <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Recent Events</h3>
      <div className="overflow-x-auto">
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
            {events.map((event, index) => (
              <tr
                key={event.id}
                className={`border-b border-[#2A2A2D]/50 ${
                  index % 2 === 0 ? "bg-[#141415]" : "bg-[#1A1A1C]"
                }`}
              >
                <td className="py-3 px-3 text-[#A1A1AA] whitespace-nowrap">
                  {timeAgo(event.timestamp)}
                </td>
                <td className="py-3 px-3 text-[#FAFAFA] whitespace-nowrap font-medium">
                  {event.model}
                </td>
                <td className="py-3 px-3 text-[#A1A1AA] text-right whitespace-nowrap">
                  {formatNumber(event.input_tokens)} / {formatNumber(event.output_tokens)}
                </td>
                <td className="py-3 px-3 text-[#FAFAFA] text-right whitespace-nowrap">
                  {formatCost(event.cost_usd)}
                </td>
                <td className="py-3 px-3 text-[#A1A1AA] text-right whitespace-nowrap">
                  {formatLatency(event.latency_ms)}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <StatusBadge status={event.status} />
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#A1A1AA]">
                  No events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
