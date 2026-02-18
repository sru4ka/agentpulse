/**
 * Auto-registration module for `agentpulse run`.
 *
 * Used via: node -r agentpulse/dist/register app.js
 * Automatically calls init() and autoInstrument() so the user's
 * code doesn't need any changes.
 */

import { init, autoInstrument, shutdown } from "./sdk";

init();
autoInstrument();

process.on("exit", () => shutdown());
process.on("SIGINT", () => { shutdown(); process.exit(130); });
process.on("SIGTERM", () => { shutdown(); process.exit(143); });
