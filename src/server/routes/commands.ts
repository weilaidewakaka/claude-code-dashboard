import { Hono } from "hono";
import { getProjectPath, getSettingsPath } from "../lib/paths";
import { scanCommands } from "../lib/command-scanner";
import type { CommandsResponse } from "../../shared/types";

const commands = new Hono();

commands.get("/", async (c) => {
  try {
    const projectPath = await getProjectPath(c);
    const settingsPath = getSettingsPath(projectPath);

    const commandList = await scanCommands(
      projectPath ? settingsPath : undefined,
      projectPath
    );

    const activeCount = commandList.filter((cmd) => cmd.parentPluginEnabled).length;
    const totalEstimatedTokens = commandList
      .filter((cmd) => cmd.parentPluginEnabled)
      .reduce((sum, cmd) => sum + cmd.estimatedTokens, 0);

    const response: CommandsResponse = {
      commands: commandList,
      activeCount,
      totalEstimatedTokens,
    };

    return c.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export { commands };
