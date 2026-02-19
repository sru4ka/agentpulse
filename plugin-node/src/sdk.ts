/**
 * AgentPulse Node.js SDK — auto-instrument LLM calls for exact cost tracking.
 *
 * Intercepts ALL LLM provider calls via three layers:
 *   1. SDK-level patches (OpenAI, Anthropic) — cleanest prompt extraction
 *   2. HTTP-level patches (http/https.request) — catches any provider using Node HTTP
 *   3. fetch()-level patches — catches providers using native fetch (Node 18+)
 *
 * Usage:
 *   const agentpulse = require("agentpulse");
 *   agentpulse.init({ apiKey: "ap_...", agentName: "my-bot" });
 *   agentpulse.autoInstrument();
 */

import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { AsyncLocalStorage } from "async_hooks";
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

// ── Known LLM API endpoints (hostname → provider) ──

const LLM_API_HOSTS: Record<string, string> = {
  // OpenAI
  "api.openai.com": "openai",
  // Anthropic
  "api.anthropic.com": "anthropic",
  // MiniMax
  "api.minimax.chat": "minimax",
  "api.minimax.io": "minimax",
  // Google
  "generativelanguage.googleapis.com": "google",
  "aiplatform.googleapis.com": "google",
  // Mistral
  "api.mistral.ai": "mistral",
  // Cohere
  "api.cohere.ai": "cohere",
  "api.cohere.com": "cohere",
  // Groq
  "api.groq.com": "groq",
  // Together
  "api.together.xyz": "together",
  // Fireworks
  "api.fireworks.ai": "fireworks",
  // DeepSeek
  "api.deepseek.com": "deepseek",
  // xAI / Grok
  "api.x.ai": "xai",
  // Perplexity
  "api.perplexity.ai": "perplexity",
  // HuggingFace
  "api-inference.huggingface.co": "huggingface",
  // OpenRouter
  "openrouter.ai": "openrouter",
  // Replicate
  "api.replicate.com": "replicate",
  // Cerebras
  "api.cerebras.ai": "cerebras",
  // Amazon Bedrock (runtime endpoints)
  "bedrock-runtime.us-east-1.amazonaws.com": "aws-bedrock",
  "bedrock-runtime.us-west-2.amazonaws.com": "aws-bedrock",
  "bedrock-runtime.eu-west-1.amazonaws.com": "aws-bedrock",
  // Azure OpenAI (matched by subdomain pattern below)
};

function matchLLMHost(hostname: string): string | null {
  if (!hostname) return null;
  const h = hostname.toLowerCase();
  // Direct match
  if (LLM_API_HOSTS[h]) return LLM_API_HOSTS[h];
  // Subdomain match
  for (const [host, provider] of Object.entries(LLM_API_HOSTS)) {
    if (h.endsWith("." + host)) return provider;
  }
  // Azure OpenAI pattern: *.openai.azure.com
  if (h.endsWith(".openai.azure.com")) return "azure-openai";
  // AWS Bedrock pattern: bedrock-runtime.*.amazonaws.com
  if (h.startsWith("bedrock-runtime.") && h.endsWith(".amazonaws.com")) return "aws-bedrock";
  return null;
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

// AsyncLocalStorage to prevent double-counting: when an SDK-level patch is active,
// the HTTP-level patch skips the request.
const _sdkCallActive = new AsyncLocalStorage<boolean>();

// Track our own flush requests so the HTTP patch doesn't intercept them
let _flushingToHost: string | null = null;

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

  // Record our own endpoint host so HTTP patch can skip it
  try {
    _flushingToHost = new URL(_config.endpoint).hostname.toLowerCase();
  } catch {}

  // Start background flush every 10 seconds
  if (_flushTimer) clearInterval(_flushTimer);
  _flushTimer = setInterval(flush, 10_000);
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

  // Use the original (unpatched) transports for our own flush requests
  const transport = url.protocol === "https:" ? _origHttps : _origHttp;

  const handleResponse = (res: http.IncomingMessage) => {
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
      if ((res.statusCode === 307 || res.statusCode === 308) && res.headers.location) {
        const redirectUrl = new URL(res.headers.location);
        const rTransport = redirectUrl.protocol === "https:" ? _origHttps : _origHttp;
        const rReq = rTransport.request(
          {
            hostname: redirectUrl.hostname,
            port: redirectUrl.port,
            path: redirectUrl.pathname + redirectUrl.search,
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            timeout: 10_000,
          },
          (rRes) => handleResponse(rRes),
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
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3") || m.includes("o4")) return "openai";
  if (m.includes("minimax") || m.includes("abab")) return "minimax";
  if (m.includes("gemini")) return "google";
  if (m.includes("mistral") || m.includes("mixtral")) return "mistral";
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("grok")) return "xai";
  if (m.includes("llama")) return "meta";
  if (m.includes("command")) return "cohere";
  if (m.includes("qwen")) return "alibaba";
  if (m.includes("phi")) return "microsoft";
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
  if (u.includes("openai.azure.com")) return "azure-openai";
  if (u.includes("openai")) return "openai";
  if (u.includes("anthropic")) return "anthropic";
  if (u.includes("openrouter")) return "openrouter";
  if (u.includes("cerebras")) return "cerebras";
  return null;
}

function extractPromptMessages(args: any[]): Array<{ role: string; content: string }> {
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
 * Auto-instrument ALL LLM calls via three layers:
 *   1. SDK patches (OpenAI, Anthropic constructors)
 *   2. HTTP-level patches (http/https.request) — catches every provider
 *   3. fetch() patches — catches native fetch in Node 18+
 */
export function autoInstrument(): void {
  if (!_initialized) {
    console.warn("AgentPulse: call init() before autoInstrument()");
    return;
  }
  patchOpenAI();
  patchAnthropic();
  patchHTTP();
  patchFetch();
}

/**
 * Instrument a specific OpenAI or Anthropic client instance.
 */
export function instrument(client: any): void {
  if (!_initialized) {
    console.warn("AgentPulse: call init() before instrument()");
    return;
  }

  if (client?.chat?.completions?.create) {
    patchOpenAIInstance(client);
    return;
  }

  if (client?.messages?.create) {
    patchAnthropicInstance(client);
    return;
  }

  console.warn("AgentPulse: Unknown client type. Pass an OpenAI or Anthropic client instance.");
}

// ── SDK-level patches (OpenAI + Anthropic) ──

function patchOpenAIInstance(client: any): void {
  if (!client?.chat?.completions?.create) return;
  if (client.__agentpulse_patched) return;

  const origCreate = client.chat.completions.create.bind(client.chat.completions);

  client.chat.completions.create = async function (...args: any[]) {
    // Mark this call so the HTTP patch skips it
    return _sdkCallActive.run(true, async () => {
      const start = Date.now();
      const opts = args[0] || {};

      try {
        const response = await origCreate(...args);

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
    });
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

    const mod = require.cache[require.resolve("openai")];
    if (mod) {
      if (typeof mod.exports === "function") {
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
    // Proxy not available
  }

  _patched.add("openai");
}

function patchAnthropicInstance(client: any): void {
  if (!client?.messages?.create) return;
  if (client.__agentpulse_patched) return;

  const origCreate = client.messages.create.bind(client.messages);

  client.messages.create = async function (...args: any[]) {
    return _sdkCallActive.run(true, async () => {
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
    });
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

    const mod = require.cache[require.resolve("@anthropic-ai/sdk")];
    if (mod) {
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

// ── HTTP-level patching (universal catch-all) ──

// Save references to the original http/https modules BEFORE patching
const _origHttp = { request: http.request.bind(http), get: http.get.bind(http) };
const _origHttps = { request: https.request.bind(https), get: https.get.bind(https) };

function extractHostFromArgs(args: any[]): string | null {
  for (const arg of args) {
    if (typeof arg === "string") {
      try { return new URL(arg).hostname; } catch { continue; }
    }
    if (arg instanceof URL) {
      return arg.hostname;
    }
    if (arg && typeof arg === "object" && !Array.isArray(arg) && typeof arg !== "function") {
      if (arg.hostname) return String(arg.hostname);
      if (arg.host) return String(arg.host).split(":")[0];
      if (arg.href) {
        try { return new URL(String(arg.href)).hostname; } catch {}
      }
    }
  }
  return null;
}

function isLLMApiPath(path: string | undefined): boolean {
  if (!path) return true; // if we matched the host, assume it's an LLM call
  const p = path.toLowerCase();
  return (
    p.includes("/chat/completions") ||
    p.includes("/messages") ||
    p.includes("/v1/") ||
    p.includes("/v2/") ||
    p.includes("/completions") ||
    p.includes("/generate") ||
    p.includes("/predict") ||
    p.includes("/invoke") ||
    p.includes("/api/")
  );
}

function extractPathFromArgs(args: any[]): string | undefined {
  for (const arg of args) {
    if (typeof arg === "string") {
      try { return new URL(arg).pathname; } catch { continue; }
    }
    if (arg instanceof URL) return arg.pathname;
    if (arg && typeof arg === "object" && !Array.isArray(arg) && typeof arg !== "function") {
      if (arg.path) return String(arg.path);
      if (arg.pathname) return String(arg.pathname);
    }
  }
  return undefined;
}

function patchTransport(transport: typeof http | typeof https, origTransport: { request: typeof http.request; get: typeof http.get }, name: string): void {
  const origRequest = origTransport.request;

  (transport as any).request = function patchedRequest(this: any, ...args: any[]): http.ClientRequest {
    const hostname = extractHostFromArgs(args);
    const provider = matchLLMHost(hostname || "");

    // Skip if: not an LLM endpoint, already tracked by SDK patch, or it's our own flush request
    if (!provider || _sdkCallActive.getStore() || (hostname && hostname.toLowerCase() === _flushingToHost)) {
      return origRequest.apply(this, args as any);
    }

    const reqPath = extractPathFromArgs(args);
    if (!isLLMApiPath(reqPath)) {
      return origRequest.apply(this, args as any);
    }

    const startTime = Date.now();
    const requestChunks: Buffer[] = [];

    const req: http.ClientRequest = origRequest.apply(this, args as any);

    // Capture request body by wrapping write() and end()
    const origWrite = req.write;
    const origEnd = req.end;

    req.write = function (this: http.ClientRequest, ...writeArgs: any[]): boolean {
      const chunk = writeArgs[0];
      if (chunk && typeof chunk !== "function") {
        try {
          requestChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        } catch {}
      }
      return origWrite.apply(this, writeArgs as any);
    };

    req.end = function (this: http.ClientRequest, ...endArgs: any[]): http.ClientRequest {
      const chunk = endArgs[0];
      if (chunk && typeof chunk !== "function") {
        try {
          requestChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        } catch {}
      }
      return origEnd.apply(this, endArgs as any);
    };

    // Capture response
    req.on("response", (res: http.IncomingMessage) => {
      // Skip non-OK or streaming responses
      const contentType = res.headers["content-type"] || "";
      if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
        return; // Streaming SSE — skip
      }

      const responseChunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        try {
          responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        } catch {}
      });
      res.on("end", () => {
        try {
          const latency = Date.now() - startTime;
          const responseBody = Buffer.concat(responseChunks).toString("utf-8");

          // Skip empty or non-JSON responses
          if (!responseBody || responseBody[0] !== "{") return;

          const resJson = JSON.parse(responseBody);

          // Must look like an LLM response (has usage, choices, or content)
          if (!resJson.usage && !resJson.choices && !resJson.content && !resJson.output) return;

          const event = extractEventFromResponse(resJson, provider, latency);
          if (event) {
            // Extract prompt messages from request body
            try {
              const requestBody = Buffer.concat(requestChunks).toString("utf-8");
              if (requestBody && requestBody[0] === "{") {
                const reqJson = JSON.parse(requestBody);
                if (provider === "anthropic") {
                  event.prompt_messages = extractAnthropicMessages([reqJson]);
                } else {
                  event.prompt_messages = extractPromptMessages([reqJson]);
                }
              }
            } catch {}

            addEvent(event);
          }
        } catch {
          // JSON parse failed or other error — ignore silently
        }
      });
    });

    return req;
  };
}

function patchHTTP(): void {
  if (_patched.has("http")) return;

  patchTransport(https, _origHttps, "https");
  patchTransport(http, _origHttp, "http");

  _patched.add("http");
}

// ── fetch() patching (Node 18+ native fetch uses undici, bypasses http module) ──

function patchFetch(): void {
  if (_patched.has("fetch")) return;
  if (typeof globalThis.fetch !== "function") return;

  const origFetch = globalThis.fetch;

  globalThis.fetch = async function patchedFetch(input: any, init?: any): Promise<any> {
    // Extract URL string
    let urlStr: string;
    if (typeof input === "string") {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (input instanceof Request) {
      urlStr = input.url;
    } else {
      return origFetch(input, init);
    }

    let hostname: string;
    try {
      hostname = new URL(urlStr).hostname;
    } catch {
      return origFetch(input, init);
    }

    const provider = matchLLMHost(hostname);
    if (!provider || _sdkCallActive.getStore() || hostname.toLowerCase() === _flushingToHost) {
      return origFetch(input, init);
    }

    const startTime = Date.now();

    try {
      const response = await origFetch(input, init);
      const latency = Date.now() - startTime;

      // Skip streaming responses
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        return response;
      }

      // Clone so we can read body without consuming the original
      const cloned = response.clone();

      // Process asynchronously to not block the caller
      cloned.text().then((text) => {
        try {
          if (!text || text[0] !== "{") return;
          const resJson = JSON.parse(text);
          if (!resJson.usage && !resJson.choices && !resJson.content && !resJson.output) return;

          const event = extractEventFromResponse(resJson, provider, latency);
          if (event) {
            // Extract prompt from request body
            try {
              const body = init?.body;
              if (typeof body === "string" && body[0] === "{") {
                const reqJson = JSON.parse(body);
                if (provider === "anthropic") {
                  event.prompt_messages = extractAnthropicMessages([reqJson]);
                } else {
                  event.prompt_messages = extractPromptMessages([reqJson]);
                }
              }
            } catch {}

            addEvent(event);
          }
        } catch {}
      }).catch(() => {});

      return response;
    } catch (e) {
      // Let the original error propagate
      throw e;
    }
  } as typeof fetch;

  _patched.add("fetch");
}
