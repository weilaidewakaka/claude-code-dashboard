import type { AgentInfo } from "../../../shared/types";
import { AgentCard } from "./AgentCard";

type AgentGridProps = {
  agents: AgentInfo[];
};

export const AgentGrid = ({ agents }: AgentGridProps) => {
  if (agents.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface-raised)] ring-1 ring-[var(--border-hairline)] p-8 text-center">
        <p className="text-sm text-zinc-400">No agents found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
        />
      ))}
    </div>
  );
};
