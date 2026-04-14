import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { config } from "./routes/config";
import { health } from "./routes/health";
import { plugins } from "./routes/plugins";
import { skills } from "./routes/skills";
import { commands } from "./routes/commands";
import { agents } from "./routes/agents";
import { hooks } from "./routes/hooks";
import { mcp } from "./routes/mcp";
import { projects } from "./routes/projects";
import { sessions } from "./routes/sessions";
import { defaults } from "./routes/defaults";
import { analytics } from "./routes/analytics";
import { usage } from "./routes/usage";

const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:5175" }));

app.get("/api/ping", (c) => c.json({ ok: true }));

app.route("/api/config", config);
app.route("/api/health", health);
app.route("/api/plugins", plugins);
app.route("/api/skills", skills);
app.route("/api/commands", commands);
app.route("/api/agents", agents);
app.route("/api/hooks", hooks);
app.route("/api/mcp", mcp);
app.route("/api/projects", projects);
app.route("/api/sessions", sessions);
app.route("/api/defaults", defaults);
app.route("/api/analytics", analytics);
app.route("/api/usage", usage);

const PORT = 3847;

serve({ fetch: app.fetch, port: PORT, hostname: "127.0.0.1" }, () => {
  console.info(
    `Claude Code Dashboard server running on http://localhost:${PORT}`,
  );
});
