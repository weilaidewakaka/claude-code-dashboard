# Plan: MCP 页面统一为 Card Grid 视图

## Context

MCP 页面当前使用 `McpOriginGroup` 折叠分组 + 单列 `CardList`，与 Skills/Commands 页面的两列卡片 grid + 搜索 + 过滤不一致。需要统一为相同视图模式。

## 当前 MCP 数据模型

API 返回 `CatalogResponse`，包含 `groups: McpCatalogGroup[]`，每个 group 有 `entries: McpCatalogEntry[]`。

每个 `McpCatalogEntry` 有：
- `name`, `origin` (global/global-disabled/plugin/project/personal/cloud)
- `health` (connected/needs_auth/failed/unknown)
- `config` (command/url/args/env/type)
- `isPinned`
- `pluginName`, `pluginNames`, `sourceProject`
- `projectStatus` (active/disabled/available, 仅项目视图)

## 改动方案

### 1. 重写 `McpPage.tsx`

仿照 SkillsPage/CommandsPage 模式：
- 将 `groups` 扁平化为 `entries` 数组
- **SummaryBar**: 显示 `{totalCount} servers | {connectedCount} connected`
- **搜索**: 按 name 过滤
- **StatusFilter**: 3 选项 — All / Connected / Not Connected（按 health 过滤）
- **CategoryFilter**: 按 origin 分组（Global / Plugin / Project / Personal / Cloud）
- **McpGrid**: 两列卡片 grid，使用改造后的 McpCatalogCard

### 2. 简化 `McpCatalogCard.tsx`

保留当前卡片的视觉元素（name、type badge、origin badge、health dot、command 显示），但调整 props 接口直接接收 `McpCatalogEntry`（与 SkillCard/CommandCard 接收整个对象一致）。

### 3. 删除 `McpOriginGroup.tsx`

不再需要折叠分组组件。

### 4. 删除 `McpPage.tsx` 中的 `CardList`、`GlobalGroupList`

这些是旧的分组渲染逻辑，由新的 grid + 过滤器替代。

## 不改动

- 服务端 API（`/api/mcp/catalog`）和数据结构不变
- `McpCatalogEntry` 类型不变
- `catalog-builder.ts` 不变

## Verification

1. `npm run typecheck` 通过
2. MCP 页面显示两列卡片 grid
3. 搜索和 StatusFilter、CategoryFilter 正常工作
4. 卡片显示 name、type、origin badge、health dot、command
