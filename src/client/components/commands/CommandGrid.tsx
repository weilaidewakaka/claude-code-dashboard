import type { CommandInfo } from "../../../shared/types";
import { CommandCard } from "./CommandCard";

type CommandGridProps = {
  commands: CommandInfo[];
};

export const CommandGrid = ({ commands }: CommandGridProps) => {
  if (commands.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface-raised)] ring-1 ring-[var(--border-hairline)] p-8 text-center">
        <p className="text-sm text-zinc-400">No commands found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {commands.map((cmd) => (
        <CommandCard
          key={cmd.id}
          command={cmd}
        />
      ))}
    </div>
  );
};
