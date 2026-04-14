import { useState, useEffect, useCallback, useMemo } from "react";
import { buildScopedUrl, getProjectDisplayName } from "../../lib/api";
import { PageShell } from "../layout/PageShell";
import { ScopeBanner } from "../shared/ScopeBanner";
import { HookEventCard } from "./HookEventCard";
import type { HookEntry } from "../../../shared/types";

type HooksResponse = {
  hooks: Record<string, HookEntry[]>;
  availableEvents: string[];
  activeEventCount: number;
  totalHookCount: number;
  error?: string;
};

const fetchHooks = async (
  projectPath: string | null
): Promise<HooksResponse> => {
  const url = buildScopedUrl("/api/hooks", projectPath);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const SummaryBar = ({
  activeEventCount,
  totalHookCount,
}: {
  activeEventCount: number;
  totalHookCount: number;
}) => {
  return (
    <div className="rounded-xl bg-[var(--surface-raised)] ring-1 ring-[var(--border-hairline)] px-5 py-3.5">
        <p className="text-sm text-zinc-300">
          <span className="font-semibold text-zinc-100">{activeEventCount}</span>
          {" events active"}
          <span className="mx-2 text-zinc-500">|</span>
          <span className="font-semibold text-zinc-100">{totalHookCount}</span>
          {" total hooks"}
        </p>
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="flex items-center gap-2 py-12 text-zinc-400">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
      <span className="text-sm">Loading hooks...</span>
    </div>
  );
};

const ErrorState = ({ message }: { message: string }) => {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
      <p className="text-sm text-red-400">Failed to load hooks: {message}</p>
    </div>
  );
};

const InactiveEventsSection = ({
  events,
  isExpanded,
  onToggle,
}: {
  events: string[];
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  if (events.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--overlay-faint)]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-medium text-zinc-500">
          {events.length} available events without hooks
        </span>
        <span className="text-xs text-zinc-500">
          {isExpanded ? "Hide" : "Show"}
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--border-hairline)] px-4 py-3">
          {events.map((event) => (
            <span
              key={event}
              className="rounded bg-[var(--overlay-subtle)] px-2 py-1 text-xs text-zinc-500"
            >
              {event}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

type HooksPageProps = {
  projectPath?: string | null;
  onClearProject?: () => void;
};

export const HooksPage = ({ projectPath = null, onClearProject }: HooksPageProps) => {
  const [hooksData, setHooksData] = useState<HooksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInactiveExpanded, setIsInactiveExpanded] = useState(false);

  const loadHooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchHooks(projectPath);
      setHooksData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadHooks();
  }, [loadHooks]);

  const handleToggleInactive = useCallback(() => {
    setIsInactiveExpanded((prev) => !prev);
  }, []);

  const activeEvents = useMemo(() => {
    if (!hooksData) return [];
    return Object.keys(hooksData.hooks).sort();
  }, [hooksData]);

  const inactiveEvents = useMemo(() => {
    if (!hooksData) return [];
    const activeSet = new Set(Object.keys(hooksData.hooks));
    return hooksData.availableEvents.filter((e) => !activeSet.has(e));
  }, [hooksData]);

  const pageTitle = projectPath
    ? `Hooks (${getProjectDisplayName(projectPath)})`
    : "Hooks";

  return (
    <PageShell title={pageTitle}>
      <div className="flex flex-col gap-4">
        <ScopeBanner projectPath={projectPath} configType="hooks" onClear={onClearProject} />

        {isLoading && <LoadingState />}

        {error && <ErrorState message={error} />}

        {!isLoading && !error && hooksData && (
          <>
            <SummaryBar
              activeEventCount={hooksData.activeEventCount}
              totalHookCount={hooksData.totalHookCount}
            />

            <div className="flex flex-col gap-3">
              {activeEvents.map((event) => (
                <HookEventCard
                  key={event}
                  event={event}
                  hookEntries={hooksData.hooks[event]}
                />
              ))}
            </div>

            {activeEvents.length === 0 && (
              <div className="rounded-xl bg-[var(--surface-raised)] ring-1 ring-[var(--border-hairline)] px-5 py-8 text-center">
                <p className="text-sm text-zinc-500">
                  No hooks configured.
                </p>
              </div>
            )}

            <InactiveEventsSection
              events={inactiveEvents}
              isExpanded={isInactiveExpanded}
              onToggle={handleToggleInactive}
            />
          </>
        )}
      </div>
    </PageShell>
  );
};
