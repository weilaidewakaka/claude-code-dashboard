import type { McpOrigin, McpCatalogEntry } from "../../../shared/types";
import { Card, CardContent } from "~/client/components/ui/card";

type HealthStatus = McpCatalogEntry["health"];

const STATUS_DOT_CLASSES: Record<HealthStatus, string> = {
  connected: "bg-emerald-400 shadow-[0_0_6px_var(--glow-emerald)]",
  needs_auth: "bg-amber-400 shadow-[0_0_6px_var(--glow-amber)]",
  failed: "bg-red-400 shadow-[0_0_6px_var(--glow-red)]",
  unknown: "bg-zinc-600",
};

const STATUS_LABELS: Record<HealthStatus, string> = {
  connected: "Connected",
  needs_auth: "Needs auth",
  failed: "Failed",
  unknown: "Unknown",
};

const ORIGIN_BADGE_CLASSES: Record<McpOrigin, string> = {
  global: "bg-blue-500/10 text-blue-400/80 ring-blue-500/20",
  "global-disabled": "bg-red-500/10 text-red-400/80 ring-red-500/20",
  plugin: "bg-purple-500/10 text-purple-400/80 ring-purple-500/20",
  project: "bg-emerald-500/10 text-emerald-400/80 ring-emerald-500/20",
  personal: "bg-zinc-500/10 text-zinc-400/80 ring-zinc-500/20",
  cloud: "bg-orange-500/10 text-orange-400/80 ring-orange-500/20",
};

const StatusDot = ({ health }: { health: HealthStatus }) => {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[health]}`}
      />
      <span className="text-[11px] text-zinc-500">{STATUS_LABELS[health]}</span>
    </div>
  );
};

const OriginBadge = ({
  origin,
  pluginName,
  pluginNames,
}: {
  origin: McpOrigin;
  pluginName?: string;
  pluginNames?: string[];
}) => {
  const resolvedPluginLabel =
    pluginNames && pluginNames.length > 1
      ? pluginNames.join(", ")
      : pluginName;
  const label =
    origin === "plugin" && resolvedPluginLabel
      ? resolvedPluginLabel
      : origin.replace("-", " ");

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${ORIGIN_BADGE_CLASSES[origin]}`}
    >
      {label}
    </span>
  );
};

type McpCatalogCardProps = {
  entry: McpCatalogEntry;
};

const McpCatalogCard = ({ entry }: McpCatalogCardProps) => {
  const command = entry.config.command ?? entry.config.url ?? "—";
  const type = entry.config.type ?? "stdio";

  return (
    <Card className="group hover:ring-[var(--border-accent)]">
      <CardContent className="p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="truncate text-[13px] font-semibold text-zinc-100">
              {entry.name}
            </h3>
            <span className="rounded-full bg-[var(--overlay-subtle)] px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-[var(--border-hairline)]">
              {type}
            </span>
            <OriginBadge origin={entry.origin} pluginName={entry.pluginName} pluginNames={entry.pluginNames} />
            <StatusDot health={entry.health} />
          </div>
          <p className="mt-1 truncate font-mono text-xs text-zinc-500" title={command}>
            {command}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export { McpCatalogCard };
