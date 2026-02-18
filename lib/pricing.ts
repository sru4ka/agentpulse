export interface ModelPricing {
  provider: string
  model: string
  inputPerMillion: number
  outputPerMillion: number
  cacheReadPerMillion?: number
  cacheWritePerMillion?: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ── MiniMax ──
  'minimax/MiniMax-M2.5': { provider: 'minimax', model: 'MiniMax-M2.5', inputPerMillion: 0.30, outputPerMillion: 1.20, cacheReadPerMillion: 0.03, cacheWritePerMillion: 0.15 },
  'MiniMax-M2.5': { provider: 'minimax', model: 'MiniMax-M2.5', inputPerMillion: 0.30, outputPerMillion: 1.20 },
  'minimax-m1': { provider: 'minimax', model: 'minimax-m1', inputPerMillion: 5, outputPerMillion: 40 },
  'MiniMax-Text-02': { provider: 'minimax', model: 'MiniMax-Text-02', inputPerMillion: 1, outputPerMillion: 5 },
  'abab6.5s-chat': { provider: 'minimax', model: 'abab6.5s-chat', inputPerMillion: 1, outputPerMillion: 5 },
  'abab6.5-chat': { provider: 'minimax', model: 'abab6.5-chat', inputPerMillion: 5, outputPerMillion: 25 },
  // ── Anthropic ──
  'anthropic/claude-opus-4': { provider: 'anthropic', model: 'claude-opus-4', inputPerMillion: 15, outputPerMillion: 75 },
  'claude-opus-4': { provider: 'anthropic', model: 'claude-opus-4', inputPerMillion: 15, outputPerMillion: 75 },
  'anthropic/claude-opus-4-6': { provider: 'anthropic', model: 'claude-opus-4-6', inputPerMillion: 15, outputPerMillion: 75 },
  'claude-opus-4-6': { provider: 'anthropic', model: 'claude-opus-4-6', inputPerMillion: 15, outputPerMillion: 75 },
  'anthropic/claude-sonnet-4-5': { provider: 'anthropic', model: 'claude-sonnet-4-5', inputPerMillion: 3, outputPerMillion: 15 },
  'claude-sonnet-4-5': { provider: 'anthropic', model: 'claude-sonnet-4-5', inputPerMillion: 3, outputPerMillion: 15 },
  'anthropic/claude-sonnet-4': { provider: 'anthropic', model: 'claude-sonnet-4', inputPerMillion: 3, outputPerMillion: 15 },
  'claude-sonnet-4': { provider: 'anthropic', model: 'claude-sonnet-4', inputPerMillion: 3, outputPerMillion: 15 },
  'anthropic/claude-haiku-4': { provider: 'anthropic', model: 'claude-haiku-4', inputPerMillion: 0.80, outputPerMillion: 4 },
  'claude-haiku-4': { provider: 'anthropic', model: 'claude-haiku-4', inputPerMillion: 0.80, outputPerMillion: 4 },
  'anthropic/claude-haiku-3.5': { provider: 'anthropic', model: 'claude-haiku-3.5', inputPerMillion: 0.80, outputPerMillion: 4 },
  'claude-haiku-3.5': { provider: 'anthropic', model: 'claude-haiku-3.5', inputPerMillion: 0.80, outputPerMillion: 4 },
  'claude-3.5-sonnet': { provider: 'anthropic', model: 'claude-3.5-sonnet', inputPerMillion: 3, outputPerMillion: 15 },
  'claude-3-opus': { provider: 'anthropic', model: 'claude-3-opus', inputPerMillion: 15, outputPerMillion: 75 },
  'claude-3-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet', inputPerMillion: 3, outputPerMillion: 15 },
  'claude-3-haiku': { provider: 'anthropic', model: 'claude-3-haiku', inputPerMillion: 0.25, outputPerMillion: 1.25 },
  // ── OpenAI ──
  'openai/gpt-4o': { provider: 'openai', model: 'gpt-4o', inputPerMillion: 2.50, outputPerMillion: 10 },
  'gpt-4o': { provider: 'openai', model: 'gpt-4o', inputPerMillion: 2.50, outputPerMillion: 10 },
  'openai/gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gpt-4-turbo': { provider: 'openai', model: 'gpt-4-turbo', inputPerMillion: 10, outputPerMillion: 30 },
  'gpt-4': { provider: 'openai', model: 'gpt-4', inputPerMillion: 30, outputPerMillion: 60 },
  'gpt-3.5-turbo': { provider: 'openai', model: 'gpt-3.5-turbo', inputPerMillion: 0.50, outputPerMillion: 1.50 },
  'o3': { provider: 'openai', model: 'o3', inputPerMillion: 10, outputPerMillion: 40 },
  'o3-mini': { provider: 'openai', model: 'o3-mini', inputPerMillion: 1.10, outputPerMillion: 4.40 },
  'o1': { provider: 'openai', model: 'o1', inputPerMillion: 15, outputPerMillion: 60 },
  'o1-mini': { provider: 'openai', model: 'o1-mini', inputPerMillion: 3, outputPerMillion: 12 },
  // ── Google ──
  'gemini-2.0-flash': { provider: 'google', model: 'gemini-2.0-flash', inputPerMillion: 0.10, outputPerMillion: 0.40 },
  'gemini-2.0-pro': { provider: 'google', model: 'gemini-2.0-pro', inputPerMillion: 1.25, outputPerMillion: 10 },
  'gemini-1.5-pro': { provider: 'google', model: 'gemini-1.5-pro', inputPerMillion: 1.25, outputPerMillion: 5 },
  'gemini-1.5-flash': { provider: 'google', model: 'gemini-1.5-flash', inputPerMillion: 0.075, outputPerMillion: 0.30 },
  // ── Mistral ──
  'mistral-large': { provider: 'mistral', model: 'mistral-large', inputPerMillion: 2, outputPerMillion: 6 },
  'mistral-small': { provider: 'mistral', model: 'mistral-small', inputPerMillion: 0.20, outputPerMillion: 0.60 },
  'codestral': { provider: 'mistral', model: 'codestral', inputPerMillion: 0.30, outputPerMillion: 0.90 },
  // ── Cohere ──
  'command-r-plus': { provider: 'cohere', model: 'command-r-plus', inputPerMillion: 2.50, outputPerMillion: 10 },
  'command-r': { provider: 'cohere', model: 'command-r', inputPerMillion: 0.15, outputPerMillion: 0.60 },
  // ── Meta / Llama ──
  'llama-3.3-70b': { provider: 'meta', model: 'llama-3.3-70b', inputPerMillion: 0.79, outputPerMillion: 0.79 },
  'llama-3.1-405b': { provider: 'meta', model: 'llama-3.1-405b', inputPerMillion: 3, outputPerMillion: 3 },
  'llama-3.1-70b': { provider: 'meta', model: 'llama-3.1-70b', inputPerMillion: 0.79, outputPerMillion: 0.79 },
  'llama-3.1-8b': { provider: 'meta', model: 'llama-3.1-8b', inputPerMillion: 0.05, outputPerMillion: 0.05 },
  // ── DeepSeek ──
  'deepseek-chat': { provider: 'deepseek', model: 'deepseek-chat', inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'deepseek-r1': { provider: 'deepseek', model: 'deepseek-r1', inputPerMillion: 0.55, outputPerMillion: 2.19 },
  'deepseek-v3': { provider: 'deepseek', model: 'deepseek-v3', inputPerMillion: 0.27, outputPerMillion: 1.10 },
  // ── xAI / Grok ──
  'grok-2': { provider: 'xai', model: 'grok-2', inputPerMillion: 2, outputPerMillion: 10 },
  'grok-3': { provider: 'xai', model: 'grok-3', inputPerMillion: 3, outputPerMillion: 15 },
  'grok-3-mini': { provider: 'xai', model: 'grok-3-mini', inputPerMillion: 0.30, outputPerMillion: 0.50 },
  // ── Amazon ──
  'amazon.nova-pro': { provider: 'amazon', model: 'amazon.nova-pro', inputPerMillion: 0.80, outputPerMillion: 3.20 },
  'amazon.nova-lite': { provider: 'amazon', model: 'amazon.nova-lite', inputPerMillion: 0.06, outputPerMillion: 0.24 },
  'amazon.nova-micro': { provider: 'amazon', model: 'amazon.nova-micro', inputPerMillion: 0.035, outputPerMillion: 0.14 },
  // ── Perplexity ──
  'sonar-pro': { provider: 'perplexity', model: 'sonar-pro', inputPerMillion: 3, outputPerMillion: 15 },
  'sonar': { provider: 'perplexity', model: 'sonar', inputPerMillion: 1, outputPerMillion: 1 },
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0
  return (inputTokens / 1_000_000) * pricing.inputPerMillion + (outputTokens / 1_000_000) * pricing.outputPerMillion
}

/**
 * Recalculate cost for an event using current correct pricing.
 * Falls back to stored cost_usd if model not in pricing table.
 */
export function recalculateEventCost(event: {
  model?: string
  provider?: string
  input_tokens?: number
  output_tokens?: number
  cost_usd?: number | string
}): number {
  const inputTokens = event.input_tokens || 0
  const outputTokens = event.output_tokens || 0

  if (inputTokens > 0 || outputTokens > 0) {
    // Try provider/model key first
    if (event.provider && event.model) {
      const cost = calculateCost(`${event.provider}/${event.model}`, inputTokens, outputTokens)
      if (cost > 0) return cost
    }
    // Try just model name
    if (event.model) {
      const cost = calculateCost(event.model, inputTokens, outputTokens)
      if (cost > 0) return cost
    }
  }

  return parseFloat(String(event.cost_usd || 0))
}
