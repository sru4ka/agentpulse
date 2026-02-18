export interface ModelPricing {
  provider: string
  model: string
  inputPerMillion: number
  outputPerMillion: number
  cacheReadPerMillion?: number
  cacheWritePerMillion?: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'minimax/MiniMax-M2.5': {
    provider: 'minimax',
    model: 'MiniMax-M2.5',
    inputPerMillion: 0.30,
    outputPerMillion: 1.20,
    cacheReadPerMillion: 0.03,
    cacheWritePerMillion: 0.15,
  },
  'anthropic/claude-sonnet-4-5': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    inputPerMillion: 3,
    outputPerMillion: 15,
  },
  'anthropic/claude-haiku-3.5': {
    provider: 'anthropic',
    model: 'claude-haiku-3.5',
    inputPerMillion: 0.80,
    outputPerMillion: 4,
  },
  'openai/gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    inputPerMillion: 2.50,
    outputPerMillion: 10,
  },
  'openai/gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
  },
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0
  return (inputTokens / 1_000_000) * pricing.inputPerMillion + (outputTokens / 1_000_000) * pricing.outputPerMillion
}
