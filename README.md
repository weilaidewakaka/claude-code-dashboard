# Claude Code Dashboard

A read-only dashboard for viewing Claude Code's plugin, skill, command, agent, MCP server, and hook configurations.

## Background

When working across multiple projects with Claude Code, configuration management becomes challenging:

- **Scattered configs** — Plugins, skills, agents, commands, and MCP servers are configured across global and per-project settings, making it hard to know what's active and what's disabled
- **Too many commands** — With commands spread across plugins and user directories, it's easy to forget what's available
- **Opaque plugins** — Plugins bundle agents, skills, commands, hooks, and MCP servers together, but this composition isn't visible at a glance

## Features

- **Read-only** — No create/update/delete operations. Purely a viewer, lightweight and safe
- **Project & global scope** — Switch between global and per-project views to see exactly which configs are active at each level
- **Plugin content classification** — Automatically detects and labels what each plugin provides (Agent, Skill, Command, Hook, MCP)
- **Unified card grid** — Consistent view across Skills, Commands, Agents with search and filtering
- **Plugin enable resolution** — Shows whether each plugin is enabled via project override, global config, or default

## Pages

| Page | Description |
|------|-------------|
| Overview | Health summary, token cost estimator, session history |
| Plugins | All installed plugins with enable/disable state and content type badges |
| Skills | Skills from user, project, and plugin sources |
| Commands | Slash commands from user, project, and plugin sources |
| Agents | Agents from user and plugin sources |
| MCP Servers | MCP catalog with health status and origin classification |
| Hooks | Hook event configuration |

## Major Changes from Original Project

Compared to [the original](https://github.com/nphardorworse/claude-dashboard), this version made significant simplifications:

- **Removed all cost/USD statistics** — No spending tracking, no cost by project, no per-session cost analytics
- **Removed all management actions** — No toggle enable/disable, no add/delete forms, no mutation API endpoints (all server routes are GET-only)
- **Added Commands & Agents pages** — New views for slash commands and agents, with the same unified card grid pattern
- **Redesigned MCP page** — Replaced the grouped collapsible view with a unified card grid, fixed cloud MCP dedup issue with `plugin:` prefixed names from `claude mcp list`
- **Unified Skills, Commands, Agents** — Consistent badge logic (plugin name + marketplace), status filter (Active / Plugin Disabled), category filter (by source/marketplace)

**Why:** Plugin marketplace installation and management is complex and error-prone to automate. It's better handled manually via Claude Code's own config files. This dashboard serves purely as a visualization tool — a read-only lens into your configuration state.

## Quick Start

```bash
npm install
npm run dev
```

Dashboard runs at `http://localhost:5175`.

## Tip: Quick Open Command

Add a global command to quickly launch the dashboard from Claude Code:

Create `~/.claude/commands/dashboard-open.md`:

```markdown
---
description: "Open the Claude Code Dashboard in the browser"
---

Open http://localhost:5175/#/ in the user's default browser using the `open` command (macOS).

Steps:
1. Run `open http://localhost:5175/#/`
2. Confirm to the user that the dashboard has been opened.
```

Then use `/dashboard-open` in any Claude Code session to open the dashboard.

## Known Limitation

This project does **not** process `settings.local.json`. If you use local settings overrides (global or per-project) to control plugin enable states, the dashboard may show inaccurate results.

## Acknowledgements

Project framework based on [nphardorworse/claude-dashboard](https://github.com/nphardorworse/claude-dashboard). Due to extensive modifications and logic changes, this is maintained as a separate repository.
