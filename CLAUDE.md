# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start both server (tsx watch) + client (Vite HMR) via concurrently
npm run typecheck    # Type-check client + server (two separate tsconfig files)
npm run build        # Production build (vite build + tsc -p tsconfig.server.json)
npm run lint         # ESLint check
npm run lint:fix     # ESLint autofix
```

Ports: client `5175`, server `3847` (localhost only). Vite proxies `/api` to the server.

## Architecture

**Read-only dashboard** for viewing Claude Code's plugins, skills, commands, agents, MCP servers, and hooks. No mutation endpoints — all server routes are GET-only. No cost/USD displays — only token-level metrics.

Full-stack TypeScript: **Hono** API server + **React 19** SPA client, sharing types via `src/shared/`.

### Pages (Sidebar Order)

Overview, Plugins, Skills, Commands, Agents, MCP Servers, Hooks

Each page (except Overview) follows the same pattern: SummaryBar + search + StatusFilter + CategoryFilter + two-column Card grid.

### Dual TypeScript Configs

- `tsconfig.json` — client code (`src/client/**`), includes DOM libs, `~/*` path alias
- `tsconfig.server.json` — server code (`src/server/**`), Node types only, no emit

Both run with `strict: true`. Run `npm run typecheck` to check both.

### Server (`src/server/`)

Hono app in `index.ts` mounts domain route modules at `/api/{domain}`. All routes are **GET-only** (read-only).

Key libs in `src/server/lib/`:
- `paths.ts` — all Claude config file paths, project discovery, scope helpers (base64-encoded `?project=` param)
- `file-io.ts` — `readJsonFile()` with malformed JSON recovery
- `plugin-scanner.ts` — scan installed plugins, resolve enabled state (project > global > default)
- `skill-scanner.ts` — scan skills from user/project/plugin sources
- `command-scanner.ts` — scan commands from user/project/plugin `.md` files
- `agent-scanner.ts` — scan agents from user/plugin `.md` files
- `catalog-builder.ts` — build MCP catalog with origin groups and health status
- `mcp-health.ts` — call `claude mcp list` to check MCP server health

### Client (`src/client/`)

- Hash-based routing via `useRoute()` hook (no router library)
- `App.tsx` uses `PageRouter` with conditional rendering based on hash
- Each feature domain has its own directory in `components/` with page + card + grid sub-components
- `hooks/` for state management (custom hooks per domain, no external state lib)
- `lib/api.ts` — `buildScopedUrl()` for scope-aware URLs (UTF-8 base64 + encodeURIComponent for project paths)

### Shared (`src/shared/types.ts`)

Single source of truth for API contracts. Both client and server import from here.

## Scope System

Every page is scope-aware via project selector:
- **Global** — reads `~/.claude/settings.json` and `~/.claude.json`
- **Project** — reads `<project>/.claude/settings.json` and `<project>/.mcp.json`

Project path is passed as base64-encoded `?project=` query param (UTF-8 safe via `TextEncoder` + `btoa` + `encodeURIComponent`). Server validates against known project list.

### Known Limitation: `settings.local.json` Not Supported

Claude Code supports a `settings.local.json` layer (both global `~/.claude/settings.local.json` and project `<project>/.claude/settings.local.json`) that merges with `settings.json` and takes higher priority. This project does **not** process `settings.local.json` — all enable/disable resolution only reads from `settings.json`. If your team uses `settings.local.json` to override plugin enable states, the dashboard may show inaccurate results. This would require implementing a multi-layer merge strategy; contributions welcome.

## Plugin Enable Resolution

For plugins, skills, commands, agents — enabled state resolves as:
1. Project `settings.json` → `enabledPlugins[id]` (highest priority)
2. Global `settings.json` → `enabledPlugins[id]`
3. Default: enabled

Skills/commands/agents from a disabled plugin show a "Plugin disabled" badge.

## MCP Cloud Dedup

`claude mcp list` reports plugin MCPs with `plugin:{name}:{name}` prefix. The catalog builder normalizes these names to match against config keys for health lookup and cloud detection.

## Import Alias

Client code uses `~/` mapped to `./src/` (configured in both `vite.config.ts` and `tsconfig.json` paths).

## ESLint Rules

- No classes — functional components and plain objects/functions only
- No `axios` — use built-in `fetch`
- Named exports preferred over default exports
- Unused vars/args prefixed with `_` are allowed
- React: no unstable nested components, `jsx-boolean-value` enforced, self-closing tags
- Accessibility rules enforced on client code (`jsx-a11y` plugin)
- Promises must use `.catch()` or `catch-or-return`
