import { useState, useEffect, useCallback, useMemo } from "react";
import { buildScopedUrl, getProjectDisplayName } from "../../lib/api";
import { PageShell } from "../layout/PageShell";
import { ScopeBanner } from "../shared/ScopeBanner";
import { CategoryFilter, type CategoryItem } from "../plugins/CategoryFilter";
import { McpGrid } from "./McpGrid";
import { Input } from "~/client/components/ui/input";
import type {
  McpCatalogEntry,
  McpOrigin,
  CatalogResponse,
} from "../../../shared/types";

const fetchCatalog = async (
  projectPath: string | null
): Promise<CatalogResponse> => {
  const url = buildScopedUrl("/api/mcp/catalog", projectPath);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const SummaryBar = ({
  totalCount,
  connectedCount,
}: {
  totalCount: number;
  connectedCount: number;
}) => {
  return (
    <div className="rounded-xl bg-[var(--surface-raised)] ring-1 ring-[var(--border-hairline)] px-5 py-3.5">
      <p className="text-sm text-zinc-300">
        <span className="font-semibold text-zinc-100">{totalCount}</span>
        {" servers"}
        <span className="mx-2 text-zinc-500">|</span>
        <span className="font-semibold text-emerald-400">{connectedCount}</span>
        {" connected"}
      </p>
    </div>
  );
};

type McpHealthFilter = "all" | "connected" | "not-connected";

const HEALTH_OPTIONS: { value: McpHealthFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "not-connected", label: "Not Connected" },
];

const McpHealthFilter = ({ active, onChange }: { active: McpHealthFilter; onChange: (v: McpHealthFilter) => void }) => {
  return (
    <div className="flex h-9 rounded-lg ring-1 ring-[var(--border-accent)] bg-[var(--surface-raised)]">
      {HEALTH_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 text-xs font-medium transition-colors active:scale-[0.96] ${
            active === opt.value
              ? "bg-[var(--overlay-medium)] text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          } ${opt.value === "all" ? "rounded-l-lg" : ""} ${opt.value === "not-connected" ? "rounded-r-lg" : ""}`}
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
      <span className="text-sm">Loading MCP servers...</span>
    </div>
  );
};

const ErrorState = ({ message }: { message: string }) => {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
      <p className="text-sm text-red-400">Failed to load MCP servers: {message}</p>
    </div>
  );
};

const ORIGIN_LABELS: Record<McpOrigin, string> = {
  global: "Global",
  "global-disabled": "Global (Disabled)",
  plugin: "Plugin",
  project: "Project",
  personal: "Personal",
  cloud: "Cloud",
};

type McpPageProps = {
  projectPath?: string | null;
  onClearProject?: () => void;
};

export const McpPage = ({ projectPath = null, onClearProject }: McpPageProps) => {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [healthFilter, setHealthFilter] = useState<McpHealthFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const allEntries = useMemo<McpCatalogEntry[]>(() => {
    if (!catalog) return [];
    return catalog.groups.flatMap((g) => g.entries);
  }, [catalog]);

  const connectedCount = useMemo(
    () => allEntries.filter((e) => e.health === "connected").length,
    [allEntries]
  );

  const loadCatalog = useCallback(async () => {
    try {
      const data = await fetchCatalog(projectPath);
      setCatalog(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [projectPath]);

  useEffect(() => {
    setIsLoading(true);
    loadCatalog().finally(() => setIsLoading(false));
  }, [loadCatalog]);

  const categories = useMemo((): CategoryItem[] => {
    const seen = new Set<string>();
    const items: CategoryItem[] = [];
    for (const entry of allEntries) {
      if (!seen.has(entry.origin)) {
        seen.add(entry.origin);
        items.push({
          value: entry.origin,
          label: ORIGIN_LABELS[entry.origin],
          prefix: entry.origin === "plugin" ? "PLG" : undefined,
        });
      }
    }
    return items;
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    let result = allEntries;

    if (healthFilter === "connected") {
      result = result.filter((e) => e.health === "connected");
    } else if (healthFilter === "not-connected") {
      result = result.filter((e) => e.health !== "connected");
    }

    if (activeCategory !== "All") {
      result = result.filter((e) => e.origin === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.config.command ?? "").toLowerCase().includes(q) ||
          (e.config.url ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [allEntries, healthFilter, activeCategory, searchQuery]);

  const pageTitle = useMemo(() => {
    if (projectPath) {
      return `MCP Servers (${getProjectDisplayName(projectPath)})`;
    }
    return "MCP Servers";
  }, [projectPath]);

  return (
    <PageShell title={pageTitle}>
      <div className="flex flex-col gap-4">
        <ScopeBanner
          projectPath={projectPath}
          configType="mcp"
          onClear={onClearProject}
        />

        {isLoading && <LoadingState />}

        {error !== null && <ErrorState message={error} />}

        {!isLoading && error === null && catalog !== null && (
          <>
            <SummaryBar
              totalCount={allEntries.length}
              connectedCount={connectedCount}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search MCP servers..."
                className="flex-1"
              />
              <McpHealthFilter active={healthFilter} onChange={setHealthFilter} />
            </div>

            {categories.length > 1 && (
              <CategoryFilter
                categories={categories}
                active={activeCategory}
                onChange={setActiveCategory}
              />
            )}

            <McpGrid entries={filteredEntries} />
          </>
        )}
      </div>
    </PageShell>
  );
};
