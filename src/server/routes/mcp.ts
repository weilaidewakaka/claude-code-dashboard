import { Hono } from "hono";
import { getProjectPath } from "../lib/paths";
import { buildCatalog } from "../lib/catalog-builder";

const mcp = new Hono();

// GET /catalog — full MCP catalog with origin groups, health, and project status
mcp.get("/catalog", async (c) => {
  try {
    const projectPath = await getProjectPath(c);
    const catalog = await buildCatalog(projectPath ?? undefined);
    return c.json(catalog);
  } catch (err) {
    console.error("[GET /catalog]", err);
    if (err instanceof SyntaxError) return c.json({ error: "Invalid request body" }, 400);
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export { mcp };
