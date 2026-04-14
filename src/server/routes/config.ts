import { Hono } from "hono";
import { PATHS } from "../lib/paths";
import { readJsonFile } from "../lib/file-io";

const config = new Hono();

// GET /global-settings — ~/.claude/settings.json
config.get("/global-settings", async (c) => {
  try {
    const data = await readJsonFile(PATHS.globalSettings);
    return c.json(data ?? {});
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /global-local — ~/.claude/settings.local.json
config.get("/global-local", async (c) => {
  try {
    const data = await readJsonFile(PATHS.globalLocalSettings);
    return c.json(data ?? {});
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /claude-json — only mcpServers from ~/.claude.json
config.get("/claude-json", async (c) => {
  try {
    const data = await readJsonFile<Record<string, unknown>>(PATHS.claudeJson);
    const mcpServers =
      data && typeof data === "object" ? (data.mcpServers ?? {}) : {};
    return c.json({ mcpServers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export { config };
