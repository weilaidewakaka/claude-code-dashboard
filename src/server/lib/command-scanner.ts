import { readdir, readFile, stat, realpath } from "fs/promises";
import { join, basename } from "path";
import { PATHS } from "./paths";
import { readJsonFile } from "./file-io";
import { estimateTokens, getTokenLevel } from "./cost-estimator";
import type { CommandInfo, CommandSource, EnableSource } from "../../shared/types";

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
    // Strip surrounding quotes
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

type DiscoveredCommand = {
  id: string;
  mdPath: string;
  source: CommandSource;
  pluginId?: string;
  pluginName?: string;
  resolvedPath: string;
};

const discoverUserCommands = async (): Promise<DiscoveredCommand[]> => {
  const results: DiscoveredCommand[] = [];
  const entries = await dirEntries(PATHS.commandsDir);

  for (const entry of entries) {
    if (!entry.endsWith(".md") || entry.startsWith("_")) continue;
    const mdPath = join(PATHS.commandsDir, entry);

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

const discoverProjectCommands = async (
  projectPath: string
): Promise<DiscoveredCommand[]> => {
  const cmdDir = join(projectPath, ".claude", "commands");
  const entries = await dirEntries(cmdDir);
  const results: DiscoveredCommand[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md") || entry.startsWith("_")) continue;
    const mdPath = join(cmdDir, entry);

    let resolvedPath: string;
    try {
      resolvedPath = await realpath(mdPath);
    } catch {
      continue;
    }

    results.push({
      id: `project:${basename(entry, ".md")}`,
      mdPath,
      source: "project",
      resolvedPath,
    });
  }

  return results;
};

const discoverPluginCommands = async (): Promise<DiscoveredCommand[]> => {
  const file = await readJsonFile<InstalledPluginsFile>(PATHS.installedPlugins);
  if (!file?.plugins) return [];

  const results: DiscoveredCommand[] = [];

  for (const [pluginId, entries] of Object.entries(file.plugins)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const installPath = entries[0].installPath;
    const cmdDir = join(installPath, "commands");
    const cmdEntries = await dirEntries(cmdDir);

    const atIndex = pluginId.indexOf("@");
    const pluginName = atIndex === -1 ? pluginId : pluginId.slice(0, atIndex);

    for (const entry of cmdEntries) {
      if (!entry.endsWith(".md") || entry.startsWith("_")) continue;
      const mdPath = join(cmdDir, entry);

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

export const scanCommands = async (
  projectSettingsPath?: string,
  projectPath?: string
): Promise<CommandInfo[]> => {
  const [userCommands, pluginCommands, projectCommands] = await Promise.all([
    discoverUserCommands(),
    discoverPluginCommands(),
    projectPath ? discoverProjectCommands(projectPath) : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const allDiscovered: DiscoveredCommand[] = [];

  for (const cmd of [...userCommands, ...projectCommands, ...pluginCommands]) {
    if (seen.has(cmd.resolvedPath)) continue;
    seen.add(cmd.resolvedPath);
    allDiscovered.push(cmd);
  }

  const globalSettings = await readJsonFile<SettingsJson>(PATHS.globalSettings);
  const globalPluginMap = globalSettings?.enabledPlugins ?? {};

  let projectPluginMap: Record<string, boolean> | null = null;
  if (projectSettingsPath) {
    const projectSettings = await readJsonFile<SettingsJson>(projectSettingsPath);
    projectPluginMap = projectSettings?.enabledPlugins ?? null;
  }

  const results: CommandInfo[] = [];

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
      // Skip commands we can't read
    }
  }

  return results;
};
