import { Hono } from "hono";
import { PATHS } from "../lib/paths";
import { readJsonFile } from "../lib/file-io";
import { detectContextWindowFromSessions, DEFAULT_CONTEXT_WINDOW } from "../lib/cost-estimator";
import { getAllSessions } from "../lib/session-scanner";
import type { PlanLimits, ContextWindowResponse } from "../../shared/types";

type DashboardConfig = {
  defaultProfile?: string;
  planLimits?: PlanLimits;
  contextWindowSize?: number | null;
  [key: string]: unknown;
};

const readConfig = async (): Promise<DashboardConfig> => {
  return (await readJsonFile<DashboardConfig>(PATHS.dashboardConfig)) ?? {};
};

const defaults = new Hono();

// GET / — read default settings
defaults.get("/", async (c) => {
  try {
    const config = await readConfig();
    return c.json({
      defaultProfile: config.defaultProfile ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /plan-limits — read configured plan limits
defaults.get("/plan-limits", async (c) => {
  try {
    const config = await readConfig();
    const limits = config.planLimits ?? {
      sessionMessageLimit: null,
      weeklyMessageLimit: null,
      sessionResetsAt: null,
      weeklyResetsAt: null,
    };
    return c.json(limits);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /context-window — detect or read context window setting
defaults.get("/context-window", async (c) => {
  try {
    const config = await readConfig();
    const override = config.contextWindowSize ?? null;

    let detected: number | null = null;
    try {
      const sessions = await getAllSessions();
      detected = detectContextWindowFromSessions(sessions);
    } catch {
      // Session scan failed
    }

    const effective = override ?? detected ?? DEFAULT_CONTEXT_WINDOW;
    const response: ContextWindowResponse = { detected, override, effective };
    return c.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export { defaults };
