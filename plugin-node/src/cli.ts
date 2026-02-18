#!/usr/bin/env node

/**
 * AgentPulse CLI for Node.js
 *
 * Commands:
 *   agentpulse init  — interactive setup
 *   agentpulse test  — send a test event
 *   agentpulse run   — run a command with auto-instrumentation
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { loadConfig, saveConfig, CONFIG_PATH } from "./config";

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function cmdInit(): Promise<void> {
  console.log("AgentPulse Setup\n");

  const config = loadConfig();

  if (!config.api_key) {
    console.log("---------------------------------------------");
    console.log("  Welcome to AgentPulse!");
    console.log("  You need an API key to get started.");
    console.log("");
    console.log("  1. Sign up at: https://agentpulses.com/signup");
    console.log("  2. Go to Dashboard > Settings");
    console.log("  3. Copy your API key");
    console.log("---------------------------------------------\n");
  }

  const apiKey = await ask(`API Key [${config.api_key}]: `);
  if (apiKey) {
    config.api_key = apiKey;
  } else if (!config.api_key) {
    console.log("\nAPI key is required. Sign up at https://agentpulses.com/signup");
    process.exit(1);
  }

  const agentName = await ask(`Agent name [${config.agent_name}]: `);
  if (agentName) config.agent_name = agentName;

  saveConfig(config);
  console.log(`\nConfig saved to ${CONFIG_PATH}`);
  console.log(`  Agent: ${config.agent_name}`);
  console.log(`\nUsage in your code:`);
  console.log(`  const agentpulse = require("agentpulse");`);
  console.log(`  agentpulse.init();`);
  console.log(`  agentpulse.autoInstrument();`);
}

function cmdTest(): void {
  const config = loadConfig();
  if (!config.api_key) {
    console.log("No API key configured. Run 'npx agentpulse init' first.");
    process.exit(1);
  }

  console.log("Testing connection to AgentPulse...\n");
  console.log(`  Endpoint: ${config.endpoint}`);
  console.log(`  Agent: ${config.agent_name}`);
  console.log(`  API Key: ${config.api_key.slice(0, 10)}...\n`);

  const testEvent = {
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
    provider: "agentpulse",
    model: "connection-test",
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
    latency_ms: 1,
    status: "success",
    error_message: null,
    task_context: "AgentPulse connection test (Node.js)",
    tools_used: [],
  };

  const payload = JSON.stringify({
    api_key: config.api_key,
    agent_name: config.agent_name,
    framework: "node-sdk",
    events: [testEvent],
  });

  const url = new URL(config.endpoint);
  const transport = url.protocol === "https:" ? https : http;

  const req = transport.request(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      timeout: 15_000,
    },
    (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk; });
      res.on("end", () => {
        // Follow 307/308 redirects manually
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
              timeout: 15_000,
            },
            (rRes) => {
              let rBody = "";
              rRes.on("data", (chunk: Buffer) => { rBody += chunk; });
              rRes.on("end", () => handleTestResponse(rRes.statusCode || 0, rBody, config));
            },
          );
          rReq.on("error", (e: Error) => {
            console.log(`Connection failed (redirect): ${e.message}`);
          });
          rReq.end(payload);
          return;
        }
        handleTestResponse(res.statusCode || 0, body, config);
      });
    },
  );

  req.on("error", (e: Error) => {
    console.log(`Connection failed: ${e.message}`);
    console.log(`  Check that the endpoint is correct: ${config.endpoint}`);
  });

  req.end(payload);
}

function handleTestResponse(statusCode: number, body: string, config: { agent_name: string }): void {
  try {
    const result = JSON.parse(body);
    if (statusCode === 200 && result.success) {
      console.log("Connection successful!");
      console.log(`  Agent '${config.agent_name}' is now visible in your dashboard.`);
      console.log(`  Go to: https://agentpulses.com/dashboard/agents`);
    } else {
      console.log(`Unexpected response (${statusCode}): ${body}`);
    }
  } catch {
    if (statusCode === 401) {
      console.log("API error (401): Your API key may be invalid.");
    } else if (statusCode === 403) {
      console.log("API error (403): Agent limit reached on your plan.");
    } else {
      console.log(`API error (${statusCode}): ${body}`);
    }
  }
}

function cmdRun(cmdArgs: string[]): void {
  if (cmdArgs.length === 0) {
    console.log("No command provided.");
    console.log("  Usage: npx agentpulse run node my_bot.js");
    process.exit(1);
  }

  const config = loadConfig();
  if (!config.api_key) {
    console.log("No API key configured. Run 'npx agentpulse init' first.");
    process.exit(1);
  }

  // Create a bootstrap require script that auto-instruments
  const bootstrapCode = `
    try {
      const ap = require("agentpulse");
      ap.init();
      ap.autoInstrument();
      process.on("exit", () => ap.shutdown());
    } catch(e) {
      // agentpulse not available in child process
    }
  `;

  const { execFileSync } = require("child_process");

  console.log(`AgentPulse: monitoring LLM calls for '${config.agent_name}'`);
  console.log(`  Running: ${cmdArgs.join(" ")}\n`);

  try {
    execFileSync(cmdArgs[0], cmdArgs.slice(1), {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} -r agentpulse/dist/register`.trim(),
      },
    });
  } catch (e: any) {
    if (e.status != null) process.exit(e.status);
    throw e;
  }
}

// ── Main ──

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init":
    cmdInit().catch(console.error);
    break;
  case "test":
    cmdTest();
    break;
  case "run":
    cmdRun(args.slice(1));
    break;
  default:
    console.log("AgentPulse — AI Agent Observability\n");
    console.log("Usage:");
    console.log("  npx agentpulse init       Interactive setup");
    console.log("  npx agentpulse test       Send a test event");
    console.log("  npx agentpulse run <cmd>  Run with auto-instrumentation\n");
    console.log("Programmatic usage:");
    console.log('  const agentpulse = require("agentpulse");');
    console.log('  agentpulse.init({ apiKey: "ap_..." });');
    console.log("  agentpulse.autoInstrument();");
    break;
}
