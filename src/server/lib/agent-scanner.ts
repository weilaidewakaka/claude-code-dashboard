import { readdir, readFile, stat, realpath } from "fs/promises";
import { join, basename } from "path";
import { PATHS } from "./paths";
import { readJsonFile } from "./file-io";
import { estimateTokens, getTokenLevel } from "./cost-estimator";
import type { AgentInfo, AgentSource, EnableSource } from "../../shared/types";

type SettingsJson = {
  enabledPlugins?: Record<string, boolean>;
};

type InstalledPluginEntry = {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
};

type InstalledPluginsFile = {
  version: number;
  plugins: Record<string, InstalledPluginEntry[]>;
};

const parseDescription = (content: string): string => {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return "";
  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf("description:");
    if (colonIndex === -1) continue;
    const value = line.slice(colonIndex + "description:".length).trim();
    if (value === "|" || value === ">") return "";
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  }
  return "";
};

const dirEntries = async (dirPath: string): Promise<string[]> => {
  try {
    const entries = await readdir(dirPath);
    return entries.filter((e) => !e.startsWith("."));
  } catch {
    return [];
  }
};

const resolveEnabled = (
  id: string,
  globalMap: Record<string, boolean>,
  projectMap: Record<string, boolean> | null
): { enabled: boolean; source: EnableSource } => {
  if (projectMap && id in projectMap) {
    return { enabled: projectMap[id], source: "project" };
  }
  if (id in globalMap) {
    return { enabled: globalMap[id], source: "global" };
  }
  return { enabled: true, source: "default" };
};

type DiscoveredAgent = {
  id: string;
  mdPath: string;
  source: AgentSource;
  pluginId?: string;
  pluginName?: string;
  resolvedPath: string;
};

const discoverUserAgents = async (): Promise<DiscoveredAgent[]> => {
  const results: DiscoveredAgent[] = [];
  const entries = await dirEntries(PATHS.agentsDir);

  for (const entry of entries) {
    if (!entry.endsWith(".md") || entry.startsWith("_")) continue;
    const mdPath = join(PATHS.agentsDir, entry);

    let resolvedPath: string;
    try {
      resolvedPath = await realpath(mdPath);
    } catch {
      continue;
    }

    results.push({
      id: basename(entry, ".md"),
      mdPath,
      source: "user",
      resolvedPath,
    });
  }

  return results;
};

const discoverPluginAgents = async (): Promise<DiscoveredAgent[]> => {
  const file = await readJsonFile<InstalledPluginsFile>(PATHS.installedPlugins);
  if (!file?.plugins) return [];

  const results: DiscoveredAgent[] = [];

  for (const [pluginId, entries] of Object.entries(file.plugins)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const installPath = entries[0].installPath;
    const agentDir = join(installPath, "agents");
    const agentEntries = await dirEntries(agentDir);

    const atIndex = pluginId.indexOf("@");
    const pluginName = atIndex === -1 ? pluginId : pluginId.slice(0, atIndex);

    for (const entry of agentEntries) {
      if (!entry.endsWith(".md") || entry.startsWith("_")) continue;
      const mdPath = join(agentDir, entry);

      let resolvedPath: string;
      try {
        resolvedPath = await realpath(mdPath);
      } catch {
        continue;
      }

      results.push({
        id: `${pluginName}:${basename(entry, ".md")}`,
        mdPath,
        source: "plugin",
        pluginId,
        pluginName,
        resolvedPath,
      });
    }
  }

  return results;
};

export const scanAgents = async (
  projectSettingsPath?: string
): Promise<AgentInfo[]> => {
  const [userAgents, pluginAgents] = await Promise.all([
    discoverUserAgents(),
    discoverPluginAgents(),
  ]);

  const seen = new Set<string>();
  const allDiscovered: DiscoveredAgent[] = [];

  for (const agent of [...userAgents, ...pluginAgents]) {
    if (seen.has(agent.resolvedPath)) continue;
    seen.add(agent.resolvedPath);
    allDiscovered.push(agent);
  }

  const globalSettings = await readJsonFile<SettingsJson>(PATHS.globalSettings);
  const globalPluginMap = globalSettings?.enabledPlugins ?? {};

  let projectPluginMap: Record<string, boolean> | null = null;
  if (projectSettingsPath) {
    const projectSettings = await readJsonFile<SettingsJson>(projectSettingsPath);
    projectPluginMap = projectSettings?.enabledPlugins ?? null;
  }

  const results: AgentInfo[] = [];

  for (const discovered of allDiscovered) {
    try {
      const content = await readFile(discovered.mdPath, "utf-8");
      const description = parseDescription(content);
      const s = await stat(discovered.mdPath);
      const contentSizeBytes = s.size;
      const estimatedTokensVal = estimateTokens(contentSizeBytes);
      const tokenLevel = getTokenLevel(estimatedTokensVal);

      let parentPluginEnabled = true;
      if (discovered.source === "plugin" && discovered.pluginId) {
        const pluginEnabled = resolveEnabled(
          discovered.pluginId,
          globalPluginMap,
          projectPluginMap
        );
        parentPluginEnabled = pluginEnabled.enabled;
      }

      results.push({
        id: discovered.id,
        name: basename(discovered.mdPath, ".md"),
        description,
        source: discovered.source,
        pluginId: discovered.pluginId,
        pluginName: discovered.pluginName,
        parentPluginEnabled,
        installPath: discovered.mdPath,
        contentSizeBytes,
        estimatedTokens: estimatedTokensVal,
        tokenLevel,
      });
    } catch {
      // Skip agents we can't read
    }
  }

  return results;
};
