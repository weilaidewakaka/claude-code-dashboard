import { Hono } from "hono";
import { getProjectPath, getSettingsPath } from "../lib/paths";
import { scanAgents } from "../lib/agent-scanner";
import type { AgentsResponse } from "../../shared/types";

const agents = new Hono();

agents.get("/", async (c) => {
  try {
    const projectPath = await getProjectPath(c);
    const settingsPath = getSettingsPath(projectPath);

    const agentList = await scanAgents(
      projectPath ? settingsPath : undefined
    );

    const activeCount = agentList.filter((a) => a.parentPluginEnabled).length;
    const totalEstimatedTokens = agentList
      .filter((a) => a.parentPluginEnabled)
      .reduce((sum, a) => sum + a.estimatedTokens, 0);

    const response: AgentsResponse = {
      agents: agentList,
      activeCount,
      totalEstimatedTokens,
    };

    return c.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export { agents };
