import { Hono } from "hono";
import { getProjectPath, getSettingsPath } from "../lib/paths";
import { readJsonFile } from "../lib/file-io";
import { scanPlugins } from "../lib/plugin-scanner";
import type { PluginsResponse } from "../../shared/types";

type SettingsJson = {
  enabledPlugins?: Record<string, boolean>;
  [key: string]: unknown;
};

const plugins = new Hono();

// GET / — scan all plugins and return enriched list + summary
plugins.get("/", async (c) => {
  try {
    const projectPath = await getProjectPath(c);
    const settingsPath = getSettingsPath(projectPath);

    const pluginList = await scanPlugins(
      projectPath ? settingsPath : undefined
    );

    const activeCount = pluginList.filter((p) => p.enabled).length;
    const totalEstimatedTokens = pluginList
      .filter((p) => p.enabled)
      .reduce((sum, p) => sum + p.estimatedTokens, 0);

    // Count project-level overrides when in project scope
    let projectOverrides = 0;
    if (projectPath) {
      const projectSettings = await readJsonFile<SettingsJson>(settingsPath);
      projectOverrides = Object.keys(
        projectSettings?.enabledPlugins ?? {}
      ).length;
    }

    const response: PluginsResponse & {
      scope: "global" | "project";
      projectOverrides: number;
    } = {
      plugins: pluginList,
      activeCount,
      totalEstimatedTokens,
      scope: projectPath ? "project" : "global",
      projectOverrides,
    };

    return c.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export { plugins };
