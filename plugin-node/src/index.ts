/**
 * AgentPulse — AI Agent Observability for Node.js
 *
 * Usage:
 *   const agentpulse = require("agentpulse");
 *
 *   agentpulse.init({ apiKey: "ap_...", agentName: "my-bot" });
 *   agentpulse.autoInstrument();
 *
 *   // All OpenAI / Anthropic calls are now tracked automatically.
 *   // Or use agentpulse.track(response) for manual tracking.
 */

export { init, autoInstrument, track, flush, shutdown, setUser, setContext } from "./sdk";
export { estimateCost, lookupPricing, MODEL_PRICING } from "./pricing";
