import { useState, useEffect, useCallback, useMemo } from "react";
import type { PluginInfo, PluginsResponse } from "../../../shared/types";
import { buildScopedUrl, getProjectDisplayName } from "../../lib/api";
import { PageShell } from "../layout/PageShell";
import { ScopeBanner } from "../shared/ScopeBanner";
import { CategoryFilter } from "./CategoryFilter";
import { PluginGrid } from "./PluginGrid";
import { Input } from "~/client/components/ui/input";

const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}k`;
  }
  return String(tokens);
};

const SummaryBar = ({
  enabledCount,
  totalCount,
  totalEstimatedTokens,
}: {
  enabledCount: number;
  totalCount: number;
  totalEstimatedTokens: number;
}) => {
  return (
    <div className="rounded-xl bg-[var(--surface-raised)] ring-1 ring-[var(--border-hairline)] px-5 py-3.5">
        <p className="text-sm text-zinc-300">
          <span className="font-semibold tabular-nums text-zinc-100">{enabledCount}</span>
          {" of "}
          <span className="font-semibold tabular-nums text-zinc-100">{totalCount}</span>
          {" plugins enabled"}
          <span className="mx-2 text-zinc-500">|</span>
          <span className="text-zinc-400">
            ~{formatTokenCount(totalEstimatedTokens)} tokens/turn
          </span>
        </p>
    </div>
  );
};

type StatusFilterOption = "all" | "enabled" | "disabled";

type StatusFilterProps = {
  active: StatusFilterOption;
  onChange: (value: StatusFilterOption) => void;
};

const STATUS_OPTIONS: { value: StatusFilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

const StatusFilter = ({ active, onChange }: StatusFilterProps) => {
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
          } ${opt.value === "all" ? "rounded-l-lg" : ""} ${opt.value === "disabled" ? "rounded-r-lg" : ""}`}
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
      <span className="text-sm">Loading plugins...</span>
    </div>
  );
};

const ErrorState = ({ message }: { message: string }) => {
  return (
    <div className="rounded-lg bg-red-500/10 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]">
      <p className="text-sm text-red-400">Failed to load plugins: {message}</p>
    </div>
  );
};

const fetchPlugins = async (
  projectPath: string | null
): Promise<PluginsResponse> => {
  const url = buildScopedUrl("/api/plugins", projectPath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};

type PluginsPageProps = {
  projectPath?: string | null;
  onClearProject?: () => void;
};

export const PluginsPage = ({ projectPath = null, onClearProject }: PluginsPageProps) => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const enabledCount = useMemo(() => plugins.filter((p) => p.enabled).length, [plugins]);
  const totalEstimatedTokens = useMemo(
    () => plugins.filter((p) => p.enabled).reduce((sum, p) => sum + p.estimatedTokens, 0),
    [plugins]
  );

  const loadPlugins = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await fetchPlugins(projectPath);
      setPlugins(data.plugins);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadPlugins(true);
  }, [loadPlugins]);

  const categories = useMemo(() => {
    const marketplaces = new Set(plugins.map((p) => p.marketplace));
    return Array.from(marketplaces).sort().map((m) => ({ value: m, label: m }));
  }, [plugins]);

  const filteredPlugins = useMemo(() => {
    let result = plugins;

    if (activeCategory !== "All") {
      result = result.filter((p) => p.marketplace === activeCategory);
    }

    if (statusFilter === "enabled") {
      result = result.filter((p) => p.enabled);
    } else if (statusFilter === "disabled") {
      result = result.filter((p) => !p.enabled);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [plugins, activeCategory, statusFilter, searchQuery]);

  const pageTitle = projectPath
    ? `Plugins (${getProjectDisplayName(projectPath)})`
    : "Plugins";

  return (
    <PageShell title={pageTitle}>
      <div className="flex flex-col gap-4">
        <ScopeBanner projectPath={projectPath} configType="plugins" onClear={onClearProject} />

        {isLoading && <LoadingState />}

        {error && <ErrorState message={error} />}

        {!isLoading && !error && (
          <>
            <SummaryBar
              enabledCount={enabledCount}
              totalCount={plugins.length}
              totalEstimatedTokens={totalEstimatedTokens}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plugins..."
                className="flex-1"
              />
              <StatusFilter active={statusFilter} onChange={setStatusFilter} />
            </div>

            {categories.length > 1 && (
              <CategoryFilter
                categories={categories}
                active={activeCategory}
                onChange={setActiveCategory}
              />
            )}

            <PluginGrid plugins={filteredPlugins} />
          </>
        )}
      </div>
    </PageShell>
  );
};
