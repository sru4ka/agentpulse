/**
 * Model pricing per million tokens (USD).
 * Kept in sync with the Python plugin's parser.py.
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // MiniMax
  "minimax/MiniMax-M2.5": { input: 0.30, output: 1.20 },
  "MiniMax-M2.5": { input: 0.30, output: 1.20 },
  "minimax-m1": { input: 5, output: 40 },
  "MiniMax-Text-02": { input: 1, output: 5 },
  "abab6.5s-chat": { input: 1, output: 5 },
  "abab6.5-chat": { input: 5, output: 25 },
  // Anthropic
  "claude-opus-4": { input: 15, output: 75 },
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-haiku-4": { input: 0.80, output: 4 },
  "claude-haiku-3.5": { input: 0.80, output: 4 },
  "claude-3.5-sonnet": { input: 3, output: 15 },
  "claude-3-opus": { input: 15, output: 75 },
  "claude-3-sonnet": { input: 3, output: 15 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  // OpenAI
  "gpt-4o": { input: 2.50, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-4": { input: 30, output: 60 },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  "o3": { input: 10, output: 40 },
  "o3-mini": { input: 1.10, output: 4.40 },
  "o1": { input: 15, output: 60 },
  "o1-mini": { input: 3, output: 12 },
  "o1-preview": { input: 15, output: 60 },
  // Google
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
  "gemini-2.0-pro": { input: 1.25, output: 10 },
  "gemini-1.5-pro": { input: 1.25, output: 5 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-1.0-pro": { input: 0.50, output: 1.50 },
  // Mistral
  "mistral-large-latest": { input: 2, output: 6 },
  "mistral-large": { input: 2, output: 6 },
  "mistral-medium": { input: 2.70, output: 8.10 },
  "mistral-small-latest": { input: 0.20, output: 0.60 },
  "mistral-small": { input: 0.20, output: 0.60 },
  "codestral-latest": { input: 0.30, output: 0.90 },
  "codestral": { input: 0.30, output: 0.90 },
  "open-mixtral-8x22b": { input: 2, output: 6 },
  "open-mixtral-8x7b": { input: 0.70, output: 0.70 },
  // Cohere
  "command-r-plus": { input: 2.50, output: 10 },
  "command-r": { input: 0.15, output: 0.60 },
  "command-r-plus-08-2024": { input: 2.50, output: 10 },
  // Meta / Llama
  "llama-3.3-70b": { input: 0.79, output: 0.79 },
  "llama-3.1-405b": { input: 3, output: 3 },
  "llama-3.1-70b": { input: 0.79, output: 0.79 },
  "llama-3.1-8b": { input: 0.05, output: 0.05 },
  "llama-3-70b": { input: 0.79, output: 0.79 },
  "llama-3-8b": { input: 0.05, output: 0.05 },
  // DeepSeek
  "deepseek-chat": { input: 0.14, output: 0.28 },
  "deepseek-coder": { input: 0.14, output: 0.28 },
  "deepseek-r1": { input: 0.55, output: 2.19 },
  "deepseek-v3": { input: 0.27, output: 1.10 },
  // xAI / Grok
  "grok-2": { input: 2, output: 10 },
  "grok-3": { input: 3, output: 15 },
  "grok-3-mini": { input: 0.30, output: 0.50 },
  // Amazon
  "amazon.nova-pro": { input: 0.80, output: 3.20 },
  "amazon.nova-lite": { input: 0.06, output: 0.24 },
  "amazon.nova-micro": { input: 0.035, output: 0.14 },
  // Perplexity
  "sonar-pro": { input: 3, output: 15 },
  "sonar": { input: 1, output: 1 },
};

const PROVIDER_PREFIXES = [
  "anthropic/", "openai/", "google/", "mistral/", "cohere/",
  "meta/", "deepseek/", "xai/", "minimax/", "amazon/",
  "together/", "groq/", "fireworks/", "perplexity/", "anyscale/",
];

export function lookupPricing(model: string): { input: number; output: number } | null {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];

  for (const prefix of PROVIDER_PREFIXES) {
    if (model.startsWith(prefix)) {
      const stripped = model.slice(prefix.length);
      if (MODEL_PRICING[stripped]) return MODEL_PRICING[stripped];
    }
  }

  const lower = model.toLowerCase();
  for (const [key, val] of Object.entries(MODEL_PRICING)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return val;
    }
  }

  return null;
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = lookupPricing(model);
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}
