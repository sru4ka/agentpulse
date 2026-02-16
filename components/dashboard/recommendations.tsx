"use client";

import { MODEL_PRICING } from "@/lib/pricing";
import { formatCost, formatNumber } from "@/lib/utils";

interface Event {
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: string;
  task_context: string;
  latency_ms: number;
}

interface DailyStat {
  date: string;
  total_cost_usd: string | number;
  total_events: number;
  error_count: number;
  rate_limit_count: number;
  success_count: number;
}

interface Recommendation {
  type: "cost" | "reliability" | "performance" | "warning";
  title: string;
  description: string;
  impact: string;
  priority: "high" | "medium" | "low";
}

// Cheaper alternatives for each model tier
const CHEAPER_ALTERNATIVES: Record<string, { model: string; inputPerMillion: number; outputPerMillion: number }> = {
  "minimax/MiniMax-M2.5": {
    model: "anthropic/claude-haiku-3.5",
    inputPerMillion: 0.80,
    outputPerMillion: 4,
  },
  "anthropic/claude-sonnet-4-5": {
    model: "anthropic/claude-haiku-3.5",
    inputPerMillion: 0.80,
    outputPerMillion: 4,
  },
  "openai/gpt-4o": {
    model: "openai/gpt-4o-mini",
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
  },
};

function generateRecommendations(events: Event[], dailyStats: DailyStat[]): Recommendation[] {
  const recs: Recommendation[] = [];
  if (events.length === 0) return recs;

  // 1. Model cost optimization — find expensive models that could be downgraded
  const modelUsage: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }> = {};
  events.forEach((e) => {
    const key = `${e.provider}/${e.model}`;
    if (!modelUsage[key]) modelUsage[key] = { calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
    modelUsage[key].calls++;
    modelUsage[key].cost += parseFloat(String(e.cost_usd)) || 0;
    modelUsage[key].inputTokens += e.input_tokens || 0;
    modelUsage[key].outputTokens += e.output_tokens || 0;
  });

  for (const [model, usage] of Object.entries(modelUsage)) {
    const alt = CHEAPER_ALTERNATIVES[model];
    if (!alt || usage.calls < 3) continue;

    const currentPricing = MODEL_PRICING[model];
    if (!currentPricing) continue;

    const altCost =
      (usage.inputTokens / 1_000_000) * alt.inputPerMillion +
      (usage.outputTokens / 1_000_000) * alt.outputPerMillion;

    const savings = usage.cost - altCost;
    if (savings <= 0) continue;

    const savingsPct = ((savings / usage.cost) * 100).toFixed(0);
    const weeklySavings = (savings / events.length) * events.length * 7; // rough weekly projection

    recs.push({
      type: "cost",
      title: `Switch simple tasks from ${currentPricing.model} to ${alt.model.split("/").pop()}`,
      description: `${usage.calls} calls used ${currentPricing.model}. For simpler tasks (short responses, lookups), ${alt.model.split("/").pop()} could handle them at a fraction of the cost.`,
      impact: `Save ~${formatCost(savings)} (${savingsPct}% less) on recent usage — ~${formatCost(weeklySavings)}/week`,
      priority: savings > 1 ? "high" : savings > 0.1 ? "medium" : "low",
    });
  }

  // 2. Error rate analysis
  const totalEvents = events.length;
  const errorEvents = events.filter((e) => e.status === "error").length;
  const errorRate = (errorEvents / totalEvents) * 100;

  if (errorRate > 10) {
    const errorModels: Record<string, number> = {};
    events.filter((e) => e.status === "error").forEach((e) => {
      errorModels[e.model] = (errorModels[e.model] || 0) + 1;
    });
    const worstModel = Object.entries(errorModels).sort((a, b) => b[1] - a[1])[0];

    recs.push({
      type: "reliability",
      title: `High error rate: ${errorRate.toFixed(1)}% of calls are failing`,
      description: worstModel
        ? `Most errors come from ${worstModel[0]} (${worstModel[1]} failures). Check API key validity, rate limits, or consider adding a fallback model.`
        : `${errorEvents} of ${totalEvents} recent calls failed. Review error messages for common patterns.`,
      impact: `${errorEvents} wasted API calls — costing tokens with no useful output`,
      priority: errorRate > 25 ? "high" : "medium",
    });
  }

  // 3. Rate limit analysis
  const rateLimitEvents = events.filter((e) => e.status === "rate_limit").length;
  const rateLimitRate = (rateLimitEvents / totalEvents) * 100;

  if (rateLimitRate > 5) {
    recs.push({
      type: "reliability",
      title: `Frequent rate limiting: ${rateLimitRate.toFixed(1)}% of calls are throttled`,
      description: "Your agent is hitting API rate limits. Consider adding request throttling, batching operations, or upgrading your API tier.",
      impact: `${rateLimitEvents} calls throttled — adds latency and may cause task failures`,
      priority: rateLimitRate > 20 ? "high" : "medium",
    });
  }

  // 4. High latency warnings
  const avgLatency = events.reduce((s, e) => s + (e.latency_ms || 0), 0) / events.length;
  const slowCalls = events.filter((e) => (e.latency_ms || 0) > 10000).length;

  if (slowCalls > events.length * 0.2) {
    recs.push({
      type: "performance",
      title: `${((slowCalls / events.length) * 100).toFixed(0)}% of calls take longer than 10s`,
      description: `Average latency is ${(avgLatency / 1000).toFixed(1)}s. Long response times could indicate large context windows or complex prompts. Consider trimming context or splitting tasks.`,
      impact: "Faster responses improve agent task completion time",
      priority: avgLatency > 15000 ? "high" : "medium",
    });
  }

  // 5. Cost trend warning
  if (dailyStats.length >= 7) {
    const recent7 = dailyStats.slice(-7);
    const older7 = dailyStats.slice(-14, -7);

    if (older7.length >= 5) {
      const recentAvg = recent7.reduce((s, d) => s + parseFloat(String(d.total_cost_usd || 0)), 0) / recent7.length;
      const olderAvg = older7.reduce((s, d) => s + parseFloat(String(d.total_cost_usd || 0)), 0) / older7.length;

      if (olderAvg > 0 && recentAvg > olderAvg * 1.5) {
        const increase = ((recentAvg - olderAvg) / olderAvg * 100).toFixed(0);
        recs.push({
          type: "warning",
          title: `Daily costs up ${increase}% vs. prior week`,
          description: `Average daily cost jumped from ${formatCost(olderAvg)} to ${formatCost(recentAvg)}. Check for increased agent activity, more expensive model usage, or larger context windows.`,
          impact: `Projected additional ${formatCost((recentAvg - olderAvg) * 30)}/month at this rate`,
          priority: "high",
        });
      }
    }
  }

  // 6. Token efficiency — high input/output ratio
  const totalInput = events.reduce((s, e) => s + (e.input_tokens || 0), 0);
  const totalOutput = events.reduce((s, e) => s + (e.output_tokens || 0), 0);

  if (totalOutput > 0 && totalInput / totalOutput > 20) {
    recs.push({
      type: "cost",
      title: "Very high input-to-output token ratio",
      description: `Your agent sends ${formatNumber(totalInput)} input tokens for ${formatNumber(totalOutput)} output tokens (${(totalInput / totalOutput).toFixed(0)}:1 ratio). This suggests large context being sent for short responses. Consider trimming system prompts or conversation history.`,
      impact: "Reducing input tokens directly reduces cost on every call",
      priority: "medium",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs;
}

const typeIcons: Record<string, { icon: string; color: string; bg: string }> = {
  cost: { icon: "$", color: "text-[#10B981]", bg: "bg-[#10B981]/10" },
  reliability: { icon: "!", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
  performance: { icon: "~", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  warning: { icon: "^", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
};

const priorityBadge: Record<string, string> = {
  high: "bg-[#EF4444]/15 text-[#EF4444]",
  medium: "bg-[#F59E0B]/15 text-[#F59E0B]",
  low: "bg-[#A1A1AA]/15 text-[#A1A1AA]",
};

interface RecommendationsProps {
  events: Event[];
  dailyStats: DailyStat[];
}

export default function Recommendations({ events, dailyStats }: RecommendationsProps) {
  const recommendations = generateRecommendations(events, dailyStats);

  if (recommendations.length === 0) {
    return (
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Recommendations</h3>
        <div className="text-center py-6">
          <div className="text-2xl mb-2">&#10003;</div>
          <p className="text-[#10B981] font-medium">Looking good!</p>
          <p className="text-[#A1A1AA] text-sm mt-1">No optimization recommendations at this time. Keep monitoring as usage grows.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#FAFAFA]">Recommendations</h3>
        <span className="text-xs text-[#A1A1AA]">
          {recommendations.length} suggestion{recommendations.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-4">
        {recommendations.map((rec, i) => {
          const style = typeIcons[rec.type] || typeIcons.cost;
          return (
            <div key={i} className="border border-[#2A2A2D] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-sm font-bold ${style.color}`}>{style.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-[#FAFAFA]">{rec.title}</h4>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityBadge[rec.priority]}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">{rec.description}</p>
                  <p className="text-xs text-[#7C3AED] mt-2 font-medium">{rec.impact}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
