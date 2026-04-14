import type { CommandInfo, TokenLevel } from "../../../shared/types";
import { Badge } from "../shared/Badge";
import { Card, CardContent } from "~/client/components/ui/card";

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

const SOURCE_BADGE_VARIANT: Record<string, string> = {
  user: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  plugin: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
  project: "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20",
};

type CommandCardProps = {
  command: CommandInfo;
};

export const CommandCard = ({ command }: CommandCardProps) => {
  return (
    <Card
      className={`group hover:ring-[var(--border-accent)] ${
        command.parentPluginEnabled ? "" : "opacity-50"
      }`}
    >
      <CardContent className="p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate text-[13px] font-semibold text-zinc-100">
              {command.name}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide ring-inset ${
                SOURCE_BADGE_VARIANT[command.source]
              }`}
            >
              {command.source === "plugin" ? command.pluginName ?? "plugin" : command.source}
            </span>
            {command.source === "plugin" && command.pluginId && (
              <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400 ring-1 ring-sky-500/20">
                {command.pluginId.includes("@") ? command.pluginId.slice(command.pluginId.indexOf("@") + 1) : command.pluginId}
              </span>
            )}
          </div>

          {command.description && (
            <p className="mt-1.5 line-clamp-2 text-[11px] text-zinc-400">
              {command.description}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge
              label={`${TOKEN_LABELS[command.tokenLevel]} (${formatTokens(command.estimatedTokens)})`}
              variant={command.tokenLevel}
            />
            {!command.parentPluginEnabled && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                Plugin disabled
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
