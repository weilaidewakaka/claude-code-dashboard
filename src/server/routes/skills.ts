import { Hono } from "hono";
import { getProjectPath, getSettingsPath } from "../lib/paths";
import { scanSkills } from "../lib/skill-scanner";
import type { SkillsResponse } from "../../shared/types";

const skills = new Hono();

skills.get("/", async (c) => {
  try {
    const projectPath = await getProjectPath(c);
    const settingsPath = getSettingsPath(projectPath);

    const skillList = await scanSkills(
      projectPath ? settingsPath : undefined,
      projectPath
    );

    const activeCount = skillList.filter((s) => s.enabled).length;
    const totalEstimatedTokens = skillList
      .filter((s) => s.enabled)
      .reduce((sum, s) => sum + s.estimatedTokens, 0);

    const response: SkillsResponse = {
      skills: skillList,
      activeCount,
      totalEstimatedTokens,
    };

    return c.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export { skills };
