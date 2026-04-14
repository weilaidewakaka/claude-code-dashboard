import { useState, useEffect, useCallback, useMemo } from "react";
import type { CommandInfo, CommandsResponse } from "../../../shared/types";
import { buildScopedUrl, getProjectDisplayName } from "../../lib/api";
import { PageShell } from "../layout/PageShell";
import { ScopeBanner } from "../shared/ScopeBanner";
import { CategoryFilter, type CategoryItem } from "../plugins/CategoryFilter";
import { CommandGrid } from "./CommandGrid";
import { Input } from "~/client/components/ui/input";

const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}k`;
  }
  return String(tokens);
};

const SummaryBar = ({
  totalCount,
  totalEstimatedTokens,
}: {
  totalCount: number;
  totalEstimatedTokens: number;
}) => {
  return (
    <div className="rounded-xl bg-[var(--surface-raised)] ring-1 ring-[var(--border-hairline)] px-5 py-3.5">
        <p className="text-sm text-zinc-300">
          <span className="font-semibold text-zinc-100">{totalCount}</span>
          {" commands"}
          <span className="mx-2 text-zinc-500">|</span>
          <span className="text-zinc-400">
            ~{formatTokenCount(totalEstimatedTokens)} tokens/turn
          </span>
        </p>
    </div>
  );
};

type CommandStatusFilter = "all" | "active" | "plugin-disabled";

const STATUS_OPTIONS: { value: CommandStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "plugin-disabled", label: "Plugin Disabled" },
];

const CommandStatusFilter = ({ active, onChange }: { active: CommandStatusFilter; onChange: (v: CommandStatusFilter) => void }) => {
  return (
    <div className="flex h-9 rounded-lg ring-1 ring-[var(--border-accent)] bg-[var(--surface-raised)]">
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 text-xs font-medium transition-colors active:scale-[0.96] ${
            active === opt.value
              ? "bg-[var(--overlay-medium)] text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          } ${opt.value === "all" ? "rounded-l-lg" : ""} ${opt.value === "plugin-disabled" ? "rounded-r-lg" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="flex items-center gap-2 py-12 text-zinc-400">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
      <span className="text-sm">Loading commands...</span>
    </div>
  );
};

const ErrorState = ({ message }: { message: string }) => {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
      <p className="text-sm text-red-400">Failed to load commands: {message}</p>
    </div>
  );
};

const fetchCommands = async (
  projectPath: string | null
): Promise<CommandsResponse> => {
  const url = buildScopedUrl("/api/commands", projectPath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};

type CommandsPageProps = {
  projectPath?: string | null;
  onClearProject?: () => void;
};

export const CommandsPage = ({ projectPath = null, onClearProject }: CommandsPageProps) => {
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<CommandStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const totalEstimatedTokens = useMemo(
    () => commands.reduce((sum, c) => sum + c.estimatedTokens, 0),
    [commands]
  );

  const loadCommands = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await fetchCommands(projectPath);
      setCommands(data.commands);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadCommands(true);
  }, [loadCommands]);

  const categories = useMemo((): CategoryItem[] => {
    const items: CategoryItem[] = [];
    const seen = new Set<string>();
    for (const cmd of commands) {
      if (cmd.source === "plugin" && cmd.pluginId) {
        const atIndex = cmd.pluginId.indexOf("@");
        const marketplace = atIndex !== -1 ? cmd.pluginId.slice(atIndex + 1) : cmd.pluginId;
        const key = `marketplace:${marketplace}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ value: `PM: ${marketplace}`, label: marketplace, prefix: "PM" });
        }
      } else if (cmd.source === "user" && !seen.has("user")) {
        seen.add("user");
        items.push({ value: "User", label: "User", prefix: "USR" });
      } else if (cmd.source === "project" && !seen.has("project")) {
        seen.add("project");
        items.push({ value: "Project", label: "Project", prefix: "PRJ" });
      }
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [commands]);

  const filteredCommands = useMemo(() => {
    let result = commands;

    if (statusFilter === "active") {
      result = result.filter((c) => c.parentPluginEnabled);
    } else if (statusFilter === "plugin-disabled") {
      result = result.filter((c) => !c.parentPluginEnabled);
    }

    if (activeCategory !== "All") {
      result = result.filter((c) => {
        if (activeCategory === "User") return c.source === "user";
        if (activeCategory === "Project") return c.source === "project";
        if (activeCategory.startsWith("PM: ")) {
          const marketplace = activeCategory.slice(4);
          const atIndex = c.pluginId?.indexOf("@") ?? -1;
          const cMarketplace = atIndex !== -1 ? c.pluginId!.slice(atIndex + 1) : c.pluginId;
          return c.source === "plugin" && cMarketplace === marketplace;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [commands, statusFilter, activeCategory, searchQuery]);

  const pageTitle = projectPath
    ? `Commands (${getProjectDisplayName(projectPath)})`
    : "Commands";

  return (
    <PageShell title={pageTitle}>
      <div className="flex flex-col gap-4">
        <ScopeBanner projectPath={projectPath} configType="commands" onClear={onClearProject} />

        {isLoading && <LoadingState />}

        {error && <ErrorState message={error} />}

        {!isLoading && !error && (
          <>
            <SummaryBar
              totalCount={commands.length}
              totalEstimatedTokens={totalEstimatedTokens}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands..."
                className="flex-1"
              />
              <CommandStatusFilter active={statusFilter} onChange={setStatusFilter} />
            </div>

            {categories.length > 1 && (
              <CategoryFilter
                categories={categories}
                active={activeCategory}
                onChange={setActiveCategory}
              />
            )}

            <CommandGrid commands={filteredCommands} />
          </>
        )}
      </div>
    </PageShell>
  );
};
