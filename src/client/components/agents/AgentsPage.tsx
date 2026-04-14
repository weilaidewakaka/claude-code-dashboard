import { useState, useEffect, useCallback, useMemo } from "react";
import type { AgentInfo, AgentsResponse } from "../../../shared/types";
import { buildScopedUrl, getProjectDisplayName } from "../../lib/api";
import { PageShell } from "../layout/PageShell";
import { ScopeBanner } from "../shared/ScopeBanner";
import { CategoryFilter, type CategoryItem } from "../plugins/CategoryFilter";
import { AgentGrid } from "./AgentGrid";
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
          {" agents"}
          <span className="mx-2 text-zinc-500">|</span>
          <span className="text-zinc-400">
            ~{formatTokenCount(totalEstimatedTokens)} tokens/turn
          </span>
        </p>
    </div>
  );
};

type AgentStatusFilter = "all" | "active" | "plugin-disabled";

const STATUS_OPTIONS: { value: AgentStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "plugin-disabled", label: "Plugin Disabled" },
];

const AgentStatusFilter = ({ active, onChange }: { active: AgentStatusFilter; onChange: (v: AgentStatusFilter) => void }) => {
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
      <span className="text-sm">Loading agents...</span>
    </div>
  );
};

const ErrorState = ({ message }: { message: string }) => {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
      <p className="text-sm text-red-400">Failed to load agents: {message}</p>
    </div>
  );
};

const fetchAgents = async (
  projectPath: string | null
): Promise<AgentsResponse> => {
  const url = buildScopedUrl("/api/agents", projectPath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};

type AgentsPageProps = {
  projectPath?: string | null;
  onClearProject?: () => void;
};

export const AgentsPage = ({ projectPath = null, onClearProject }: AgentsPageProps) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<AgentStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const totalEstimatedTokens = useMemo(
    () => agents.reduce((sum, a) => sum + a.estimatedTokens, 0),
    [agents]
  );

  const loadAgents = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await fetchAgents(projectPath);
      setAgents(data.agents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadAgents(true);
  }, [loadAgents]);

  const categories = useMemo((): CategoryItem[] => {
    const items: CategoryItem[] = [];
    const seen = new Set<string>();
    for (const agent of agents) {
      if (agent.source === "plugin" && agent.pluginId) {
        const atIndex = agent.pluginId.indexOf("@");
        const marketplace = atIndex !== -1 ? agent.pluginId.slice(atIndex + 1) : agent.pluginId;
        const key = `marketplace:${marketplace}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ value: `PM: ${marketplace}`, label: marketplace, prefix: "PM" });
        }
      } else if (agent.source === "user" && !seen.has("user")) {
        seen.add("user");
        items.push({ value: "User", label: "User", prefix: "USR" });
      }
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [agents]);

  const filteredAgents = useMemo(() => {
    let result = agents;

    if (statusFilter === "active") {
      result = result.filter((a) => a.parentPluginEnabled);
    } else if (statusFilter === "plugin-disabled") {
      result = result.filter((a) => !a.parentPluginEnabled);
    }

    if (activeCategory !== "All") {
      result = result.filter((a) => {
        if (activeCategory === "User") return a.source === "user";
        if (activeCategory.startsWith("PM: ")) {
          const marketplace = activeCategory.slice(4);
          const atIndex = a.pluginId?.indexOf("@") ?? -1;
          const aMarketplace = atIndex !== -1 ? a.pluginId!.slice(atIndex + 1) : a.pluginId;
          return a.source === "plugin" && aMarketplace === marketplace;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [agents, statusFilter, activeCategory, searchQuery]);

  const pageTitle = projectPath
    ? `Agents (${getProjectDisplayName(projectPath)})`
    : "Agents";

  return (
    <PageShell title={pageTitle}>
      <div className="flex flex-col gap-4">
        <ScopeBanner projectPath={projectPath} configType="agents" onClear={onClearProject} />

        {isLoading && <LoadingState />}

        {error && <ErrorState message={error} />}

        {!isLoading && !error && (
          <>
            <SummaryBar
              totalCount={agents.length}
              totalEstimatedTokens={totalEstimatedTokens}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="flex-1"
              />
              <AgentStatusFilter active={statusFilter} onChange={setStatusFilter} />
            </div>

            {categories.length > 1 && (
              <CategoryFilter
                categories={categories}
                active={activeCategory}
                onChange={setActiveCategory}
              />
            )}

            <AgentGrid agents={filteredAgents} />
          </>
        )}
      </div>
    </PageShell>
  );
};
