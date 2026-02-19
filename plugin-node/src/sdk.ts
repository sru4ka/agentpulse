/**
 * AgentPulse Node.js SDK — auto-instrument LLM calls for exact cost tracking.
 *
 * Usage:
 *   const agentpulse = require("agentpulse");
 *   agentpulse.init({ apiKey: "ap_...", agentName: "my-bot" });
 *   agentpulse.autoInstrument();
 *
 *   // All OpenAI / Anthropic calls are now tracked automatically.
 */

import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { loadConfig } from "./config";
import { estimateCost } from "./pricing";

// ── Types ──

interface InitOptions {
  apiKey?: string;
  agentName?: string;
  endpoint?: string;
  userId?: string;
}

interface LLMEvent {
  timestamp: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number | null;
  status: string;
  error_message: string | null;
  task_context: string | null;
  tools_used: string[];
  prompt_messages: Array<{ role: string; content: string }>;
  response_text: string | null;
  user_id: string | null;
}

// ── Global state ──

let _config = { apiKey: "", agentName: "default", endpoint: "https://agentpulses.com/api/events", framework: "node-sdk" };
let _buffer: LLMEvent[] = [];
let _flushTimer: ReturnType<typeof setInterval> | null = null;
let _initialized = false;
let _eventsSent = 0;
let _globalUserId: string | null = null;
let _globalTaskContext: string | null = null;
const _patched = new Set<string>();

// ── Init ──

export function init(options: InitOptions = {}): void {
  const fileConfig = loadConfig();

  _config = {
    apiKey: options.apiKey || fileConfig.api_key || "",
    agentName: options.agentName || fileConfig.agent_name || "default",
    endpoint: options.endpoint || fileConfig.endpoint || "https://agentpulses.com/api/events",
    framework: fileConfig.framework || "node-sdk",
  };

  _globalUserId = options.userId || null;

  if (!_config.apiKey) {
    console.warn(
      "AgentPulse: No API key set. " +
      "Pass apiKey to init() or run `npx agentpulse init` first. " +
      "Sign up at https://agentpulses.com/signup"
    );
    return;
  }

  _initialized = true;

  // Start background flush every 10 seconds
  if (_flushTimer) clearInterval(_flushTimer);
  _flushTimer = setInterval(flush, 10_000);
  // Allow the process to exit even if the timer is running
  if (_flushTimer.unref) _flushTimer.unref();
}

// ── Event buffer ──

function addEvent(event: LLMEvent): void {
  _buffer.push(event);
  if (_buffer.length >= 50) flush();
}

export function flush(): void {
  if (_buffer.length === 0) return;
  if (!_config.apiKey) return;

  const events = _buffer.splice(0);

  const payload = JSON.stringify({
    api_key: _config.apiKey,
    agent_name: _config.agentName,
    framework: _config.framework,
    events,
  });

  const url = new URL(_config.endpoint);
  const transport = url.protocol === "https:" ? https : http;

  const handleResponse = (res: http.IncomingMessage, isRedirect = false) => {
    let body = "";
    res.on("data", (chunk: Buffer) => { body += chunk; });
    res.on("end", () => {
      if (res.statusCode === 200) {
        _eventsSent += events.length;
      } else if (res.statusCode === 401) {
        console.error("AgentPulse: Invalid API key (401). Check your AGENTPULSE_API_KEY or run `npx agentpulse init`.");
      } else if (res.statusCode === 429) {
        console.warn("AgentPulse: Rate limited (429). Events will retry.");
        _buffer.push(...events);
      } else if (res.statusCode && res.statusCode >= 400) {
        console.error(`AgentPulse: API error (${res.statusCode}): ${body.slice(0, 200)}`);
      }
    });
  };

  const req = transport.request(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      timeout: 10_000,
    },
    (res) => {
      // Follow 307/308 redirects with body
      if ((res.statusCode === 307 || res.statusCode === 308) && res.headers.location) {
        const redirectUrl = new URL(res.headers.location);
        const rTransport = redirectUrl.protocol === "https:" ? https : http;
        const rReq = rTransport.request(
          {
            hostname: redirectUrl.hostname,
            port: redirectUrl.port,
            path: redirectUrl.pathname + redirectUrl.search,
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            timeout: 10_000,
          },
          (rRes) => handleResponse(rRes, true),
        );
        rReq.on("error", (e: Error) => {
          console.error(`AgentPulse: Network error on redirect: ${e.message}`);
          _buffer.push(...events);
        });
        rReq.end(payload);
        res.resume();
        return;
      }

      handleResponse(res);
    },
  );

  req.on("error", (e: Error) => {
    console.error(`AgentPulse: Network error: ${e.message}. ${events.length} events will retry.`);
    _buffer.push(...events);
  });

  req.end(payload);
}

// ── Public helpers ──

export function setUser(userId: string): void {
  _globalUserId = userId;
}

export function setContext(taskContext: string): void {
  _globalTaskContext = taskContext;
}

export function shutdown(): void {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
  flush();
}

// ── Manual tracking ──

export function track(response: any, options?: { provider?: string; latencyMs?: number; taskContext?: string }): void {
  if (!_initialized) {
    console.warn("AgentPulse: call agentpulse.init() before tracking");
    return;
  }

  const event = extractEventFromResponse(response, options?.provider, options?.latencyMs, options?.taskContext);
  if (event) addEvent(event);
}

// ── Response extraction ──

function extractEventFromResponse(
  response: any,
  provider?: string,
  latencyMs?: number,
  taskContext?: string,
): LLMEvent | null {
  let data: any;

  if (typeof response?.toJSON === "function") {
    data = response.toJSON();
  } else if (typeof response === "object" && response !== null) {
    data = response;
  } else {
    return null;
  }

  const model: string = data.model || "unknown";
  let inputTokens = 0;
  let outputTokens = 0;

  const usage = data.usage;
  if (usage && typeof usage === "object") {
    inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
    outputTokens = usage.completion_tokens || usage.output_tokens || 0;
    if (!inputTokens && !outputTokens && usage.total_tokens) {
      const total = usage.total_tokens;
      inputTokens = Math.floor(total * 0.7);
      outputTokens = total - inputTokens;
    }
  }

  if (!provider) provider = detectProviderFromModel(model);

  const cost = estimateCost(model, inputTokens, outputTokens);

  // Extract response text
  let responseText: string | null = null;

  // OpenAI format
  const choices = data.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const msg = choices[0]?.message;
    if (msg && typeof msg === "object") {
      responseText = msg.content || null;
    }
  }

  // Anthropic format
  const contentBlocks = data.content;
  if (Array.isArray(contentBlocks) && !responseText) {
    const parts: string[] = [];
    for (const block of contentBlocks) {
      if (typeof block === "object" && block?.type === "text") {
        parts.push(block.text || "");
      } else if (typeof block === "string") {
        parts.push(block);
      }
    }
    if (parts.length) responseText = parts.join("\n");
  }

  return {
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
    provider,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: Math.round(cost * 1e6) / 1e6,
    latency_ms: latencyMs ?? null,
    status: "success",
    error_message: null,
    task_context: taskContext || _globalTaskContext,
    tools_used: [],
    prompt_messages: [],
    response_text: responseText,
    user_id: _globalUserId,
  };
}

function detectProviderFromModel(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("claude")) return "anthropic";
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3")) return "openai";
  if (m.includes("minimax") || m.includes("abab")) return "minimax";
  if (m.includes("gemini")) return "google";
  if (m.includes("mistral") || m.includes("mixtral")) return "mistral";
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("grok")) return "xai";
  if (m.includes("llama")) return "meta";
  if (m.includes("command")) return "cohere";
  return "unknown";
}

function detectProviderFromBaseUrl(baseUrl: string): string | null {
  const u = baseUrl.toLowerCase();
  if (u.includes("minimax")) return "minimax";
  if (u.includes("together")) return "together";
  if (u.includes("groq")) return "groq";
  if (u.includes("fireworks")) return "fireworks";
  if (u.includes("deepseek")) return "deepseek";
  if (u.includes("perplexity")) return "perplexity";
  if (u.includes("openai")) return "openai";
  return null;
}

function extractPromptMessages(args: any[]): Array<{ role: string; content: string }> {
  // OpenAI: create({ messages, model, ... })
  const opts = args[0];
  if (!opts || typeof opts !== "object") return [];
  const messages = opts.messages || opts.body?.messages;
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m: any) => m && typeof m === "object")
    .map((m: any) => ({ role: m.role || "user", content: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }));
}

function extractAnthropicMessages(args: any[]): Array<{ role: string; content: string }> {
  const opts = args[0];
  if (!opts || typeof opts !== "object") return [];
  const result: Array<{ role: string; content: string }> = [];

  if (opts.system) {
    result.push({ role: "system", content: typeof opts.system === "string" ? opts.system : JSON.stringify(opts.system) });
  }

  const messages = opts.messages;
  if (!Array.isArray(messages)) return result;

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    let content = msg.content;
    if (Array.isArray(content)) {
      content = content
        .filter((b: any) => typeof b === "object" && b?.type === "text")
        .map((b: any) => b.text || "")
        .join("\n");
    }
    result.push({ role: msg.role || "user", content: typeof content === "string" ? content : JSON.stringify(content) });
  }

  return result;
}

// ── Auto-instrumentation ──

/**
 * Auto-instrument OpenAI and Anthropic SDKs using require().
 * Works with CommonJS (require) imports. For ESM (import), use instrument() instead.
 */
export function autoInstrument(): void {
  if (!_initialized) {
    console.warn("AgentPulse: call init() before autoInstrument()");
    return;
  }
  patchOpenAI();
  patchAnthropic();
}

/**
 * Instrument a specific OpenAI or Anthropic client instance.
 * Works with both ESM and CommonJS imports.
 *
 * Usage:
 *   import OpenAI from "openai";
 *   import agentpulse from "@agentpulse/agentpulse";
 *
 *   agentpulse.init({ apiKey: "ap_..." });
 *   const client = new OpenAI();
 *   agentpulse.instrument(client);
 */
export function instrument(client: any): void {
  if (!_initialized) {
    console.warn("AgentPulse: call init() before instrument()");
    return;
  }

  // Detect OpenAI client (has chat.completions.create)
  if (client?.chat?.completions?.create) {
    patchOpenAIInstance(client);
    return;
  }

  // Detect Anthropic client (has messages.create)
  if (client?.messages?.create) {
    patchAnthropicInstance(client);
    return;
  }

  console.warn("AgentPulse: Unknown client type. Pass an OpenAI or Anthropic client instance.");
}

function patchOpenAIInstance(client: any): void {
  if (!client?.chat?.completions?.create) return;
  if (client.__agentpulse_patched) return;

  const origCreate = client.chat.completions.create.bind(client.chat.completions);

  client.chat.completions.create = async function (...args: any[]) {
    const start = Date.now();
    const opts = args[0] || {};

    try {
      const response = await origCreate(...args);

      // Don't track streaming responses
      if (opts.stream) return response;

      const latency = Date.now() - start;
      const baseUrl = client?.baseURL || client?._options?.baseURL || "";
      const provider = detectProviderFromBaseUrl(String(baseUrl)) || detectProviderFromModel(opts.model || "");

      const event = extractEventFromResponse(response, provider, latency);
      if (event) {
        event.prompt_messages = extractPromptMessages(args);
        addEvent(event);
      }

      return response;
    } catch (e: any) {
      const latency = Date.now() - start;
      const errStr = String(e);
      const status = errStr.toLowerCase().includes("rate") && errStr.toLowerCase().includes("limit") ? "rate_limit" : "error";
      const baseUrl = client?.baseURL || client?._options?.baseURL || "";
      const provider = detectProviderFromBaseUrl(String(baseUrl)) || detectProviderFromModel(opts.model || "");

      addEvent({
        timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
        provider,
        model: opts.model || "unknown",
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        latency_ms: latency,
        status,
        error_message: errStr,
        task_context: _globalTaskContext,
        tools_used: [],
        prompt_messages: extractPromptMessages(args),
        response_text: null,
        user_id: _globalUserId,
      });
      throw e;
    }
  };

  client.__agentpulse_patched = true;
}

function patchOpenAI(): void {
  if (_patched.has("openai")) return;

  let openai: any;
  try {
    openai = require("openai");
  } catch {
    return;
  }

  const OpenAI = openai.default || openai.OpenAI || openai;
  if (!OpenAI?.prototype) return;

  // Monkey-patch the OpenAI constructor to auto-instrument new instances
  const origConstructor = OpenAI;
  const handler: ProxyHandler<any> = {
    construct(target: any, argArray: any[], newTarget: any): object {
      const instance = Reflect.construct(target, argArray, newTarget);
      patchOpenAIInstance(instance);
      return instance as object;
    },
  };

  try {
    const proxied = new Proxy(origConstructor, handler);

    // Replace in module cache so future require("openai") returns the proxied constructor
    const mod = require.cache[require.resolve("openai")];
    if (mod) {
      // If module.exports IS the constructor (common pattern), replace it entirely
      if (typeof mod.exports === "function") {
        // Copy all named exports from the original to the proxied constructor
        for (const key of Object.keys(mod.exports)) {
          if (key !== "default" && key !== "OpenAI") {
            (proxied as any)[key] = mod.exports[key];
          }
        }
        mod.exports = proxied;
      }
      if (mod.exports.default) mod.exports.default = proxied;
      if (mod.exports.OpenAI) mod.exports.OpenAI = proxied;
    }
  } catch {
    // Proxy not available, patch existing instances via prototype
  }

  _patched.add("openai");
}

function patchAnthropicInstance(client: any): void {
  if (!client?.messages?.create) return;
  if (client.__agentpulse_patched) return;

  const origCreate = client.messages.create.bind(client.messages);

  client.messages.create = async function (...args: any[]) {
    const start = Date.now();
    const opts = args[0] || {};

    try {
      const response = await origCreate(...args);

      if (opts.stream) return response;

      const latency = Date.now() - start;
      const event = extractEventFromResponse(response, "anthropic", latency);
      if (event) {
        event.prompt_messages = extractAnthropicMessages(args);
        addEvent(event);
      }

      return response;
    } catch (e: any) {
      const latency = Date.now() - start;
      const errStr = String(e);
      const status = errStr.toLowerCase().includes("rate") && errStr.toLowerCase().includes("limit") ? "rate_limit" : "error";

      addEvent({
        timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
        provider: "anthropic",
        model: opts.model || "unknown",
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        latency_ms: latency,
        status,
        error_message: errStr,
        task_context: _globalTaskContext,
        tools_used: [],
        prompt_messages: extractAnthropicMessages(args),
        response_text: null,
        user_id: _globalUserId,
      });
      throw e;
    }
  };

  client.__agentpulse_patched = true;
}

function patchAnthropic(): void {
  if (_patched.has("anthropic")) return;

  let anthropic: any;
  try {
    anthropic = require("@anthropic-ai/sdk");
  } catch {
    return;
  }

  const Anthropic = anthropic.default || anthropic.Anthropic || anthropic;
  if (!Anthropic?.prototype) return;

  const handler: ProxyHandler<any> = {
    construct(target: any, argArray: any[], newTarget: any): object {
      const instance = Reflect.construct(target, argArray, newTarget);
      patchAnthropicInstance(instance);
      return instance as object;
    },
  };

  try {
    const proxied = new Proxy(Anthropic, handler);

    // Replace in module cache so future require("@anthropic-ai/sdk") returns the proxied constructor
    const mod = require.cache[require.resolve("@anthropic-ai/sdk")];
    if (mod) {
      // If module.exports IS the constructor (common pattern), replace it entirely
      if (typeof mod.exports === "function") {
        for (const key of Object.keys(mod.exports)) {
          if (key !== "default" && key !== "Anthropic") {
            (proxied as any)[key] = mod.exports[key];
          }
        }
        mod.exports = proxied;
      }
      if (mod.exports.default) mod.exports.default = proxied;
      if (mod.exports.Anthropic) mod.exports.Anthropic = proxied;
    }
  } catch {
    // Proxy not available
  }

  _patched.add("anthropic");
}
