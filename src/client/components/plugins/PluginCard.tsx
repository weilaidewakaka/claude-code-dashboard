import type { PluginInfo, PluginEnableSource, TokenLevel } from "../../../shared/types";
import { Badge } from "../shared/Badge";
import { Card, CardContent } from "~/client/components/ui/card";

const SOURCE_LABELS: Record<PluginEnableSource, string> = {
  global: "global config",
  project: "project config",
  default: "default (enabled)",
};

const SOURCE_BADGE_CLASSES: Record<PluginEnableSource, string> = {
  global: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
  project: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  default: "text-zinc-500",
};

const TOKEN_LABELS: Record<TokenLevel, string> = {
  low: "Low cost",
  medium: "Medium cost",
  high: "High cost",
};

const formatTokens = (tokens: number): string => {
  if (tokens >= 1000) {
    return `~${Math.round(tokens / 1000)}k`;
  }
  return `~${tokens}`;
};

const PluginTypeBadges = ({
  hasAgents,
  hasSkills,
  hasMcp,
  hasCommands,
  hasHooks,
}: Pick<PluginInfo, "hasAgents" | "hasSkills" | "hasMcp" | "hasCommands" | "hasHooks">) => {
  return (
    <>
      {hasAgents && <Badge label="Agent" variant="info" />}
      {hasSkills && <Badge label="Skill" variant="info" />}
      {hasMcp && <Badge label="MCP" variant="info" />}
      {hasCommands && <Badge label="Command" variant="info" />}
      {hasHooks && <Badge label="Hook" variant="info" />}
    </>
  );
};

type PluginCardProps = {
  plugin: PluginInfo;
};

export const PluginCard = ({ plugin }: PluginCardProps) => {
  return (
    <Card
      className={`group hover:ring-[var(--border-accent)] ${
        !plugin.enabled ? "opacity-60" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h3 className="truncate text-[13px] font-semibold text-zinc-100">
                {plugin.name}
              </h3>
              <Badge label={plugin.marketplace} variant="info" />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                plugin.enabled
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
              }`}>
                {plugin.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {plugin.description && (
              <p className="mt-1.5 line-clamp-2 text-[11px] text-zinc-400">
                {plugin.description}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge
                label={`${TOKEN_LABELS[plugin.tokenLevel]} (${formatTokens(plugin.activeEstimatedTokens)})`}
                variant={plugin.tokenLevel}
              />
              <PluginTypeBadges
                hasAgents={plugin.hasAgents}
                hasSkills={plugin.hasSkills}
                hasMcp={plugin.hasMcp}
                hasCommands={plugin.hasCommands}
                hasHooks={plugin.hasHooks}
              />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_BADGE_CLASSES[plugin.enableSource]}`}>
                {SOURCE_LABELS[plugin.enableSource]}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
