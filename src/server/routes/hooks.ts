import { Hono } from "hono";
import { getProjectPath, getSettingsPath } from "../lib/paths";
import { readJsonFile } from "../lib/file-io";
import type { HooksMap } from "../../shared/types";

const HOOK_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "Notification",
  "Stop",
  "SubagentStop",
  "PreCompact",
  "PostCompact",
  "PermissionRequest",
  "ConfigChange",
  "InstructionsLoaded",
  "StopFailure",
  "SubagentStart",
] as const;

type SettingsJson = {
  hooks?: HooksMap;
  [key: string]: unknown;
};

const readHooks = async (settingsPath?: string): Promise<{
  settings: SettingsJson;
  hooks: HooksMap;
  path: string;
}> => {
  const path = settingsPath ?? getSettingsPath();
  const settings =
    (await readJsonFile<SettingsJson>(path)) ?? {};
  const hooks = settings.hooks ?? {};
  return { settings, hooks, path };
};

const countTotalHooks = (hooks: HooksMap): number => {
  let total = 0;
  for (const entries of Object.values(hooks)) {
    for (const entry of entries) {
      total += entry.hooks.length;
    }
  }
  return total;
};

const hooks = new Hono();

// GET / — read all hooks from settings.json
hooks.get("/", async (c) => {
  try {
    const projectPath = await getProjectPath(c);
    const settingsPath = getSettingsPath(projectPath);
    const { hooks: hooksMap } = await readHooks(settingsPath);

    const activeEventCount = Object.keys(hooksMap).length;
    const totalHookCount = countTotalHooks(hooksMap);

    return c.json({
      hooks: hooksMap,
      availableEvents: HOOK_EVENTS,
      activeEventCount,
      totalHookCount,
      scope: projectPath ? "project" : "global",
    });
  } catch (err) {
    console.error("GET /hooks error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export { hooks };
