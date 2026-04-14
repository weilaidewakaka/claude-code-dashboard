import { Card, CardContent } from "~/client/components/ui/card";
import type { HookCommand, HookEntry } from "../../../shared/types";

type HookEventCardProps = {
  event: string;
  hookEntries: HookEntry[];
};

const HookCommandRow = ({
  matcher,
  hook,
}: {
  matcher: string;
  hook: HookCommand;
}) => {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-[var(--border-hairline)] bg-[var(--overlay-subtle)] px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded bg-[var(--overlay-medium)] px-1.5 py-0.5 font-mono text-xs text-zinc-300">
            {matcher}
          </span>
          {hook.timeout != null && (
            <span className="text-xs text-zinc-500">
              {hook.timeout}ms timeout
            </span>
          )}
        </div>
        <p className="mt-1 truncate font-mono text-xs text-zinc-400">
          {hook.command}
        </p>
      </div>
    </div>
  );
};

export const HookEventCard = ({
  event,
  hookEntries,
}: HookEventCardProps) => {
  const allHooks: Array<{
    matcher: string;
    hook: HookCommand;
  }> = [];

  hookEntries.forEach((entry) => {
    entry.hooks.forEach((hook) => {
      allHooks.push({ matcher: entry.matcher, hook });
    });
  });

  const hasHooks = allHooks.length > 0;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-zinc-100">{event}</h3>

        <div className="mt-3 flex flex-col gap-2">
          {hasHooks ? (
            allHooks.map((item, idx) => (
              <HookCommandRow
                key={`${idx}-${item.matcher}`}
                matcher={item.matcher}
                hook={item.hook}
              />
            ))
          ) : (
            <p className="py-2 text-xs text-zinc-500">No hooks configured</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
