import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".openclaw");
export const CONFIG_PATH = path.join(CONFIG_DIR, "agentpulse.yaml");

export interface AgentPulseConfig {
  api_key: string;
  endpoint: string;
  agent_name: string;
  framework: string;
}

const DEFAULT_CONFIG: AgentPulseConfig = {
  api_key: "",
  endpoint: "https://agentpulses.com/api/events",
  agent_name: "default",
  framework: "node-sdk",
};

/**
 * Load config from ~/.openclaw/agentpulse.yaml.
 * Uses a simple key:value parser to avoid requiring a yaml dependency.
 */
export function loadConfig(): AgentPulseConfig {
  const config = { ...DEFAULT_CONFIG };

  if (!fs.existsSync(CONFIG_PATH)) return config;

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key in config) {
        (config as any)[key] = value;
      }
    }
  } catch {
    // Ignore parse errors, return defaults
  }

  return config;
}

/**
 * Save config to ~/.openclaw/agentpulse.yaml.
 */
export function saveConfig(config: AgentPulseConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const lines = Object.entries(config).map(([k, v]) => `${k}: ${v}`);
  fs.writeFileSync(CONFIG_PATH, lines.join("\n") + "\n", "utf-8");
}
