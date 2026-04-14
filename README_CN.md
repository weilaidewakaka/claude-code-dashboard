# Claude Code Dashboard

Claude Code 配置只读看板，用于查看 Plugin、Skill、Command、Agent、MCP Server、Hook 的配置状态。

## 背景

使用 Claude Code 管理多个项目时，配置管理存在以下痛点：

- **配置分散** — Plugin、Skill、Agent、Command、MCP 分散在全局和各项目配置中，难以快速了解哪些在用、哪些已关闭
- **Command 太多** — Command 分布在插件和用户目录中，容易忘记有哪些可用
- **Plugin 内容不透明** — 一个 Plugin 可能包含 Agent、Skill、Command、Hook、MCP，但在配置文件中无法直观看出

## 特性

- **只看不改** — 无法增删改，纯粹的查看工具，轻量安全
- **项目/全局切换** — 在全局视图和项目视图间切换，清晰了解每个层级的配置状态
- **Plugin 内容分类** — 自动识别每个 Plugin 提供的能力（Agent、Skill、Command、Hook、MCP）
- **统一卡片视图** — Skill、Command、Agent 使用一致的卡片网格，支持搜索和筛选
- **启用状态溯源** — 显示每个 Plugin 的启用来源：项目覆盖 > 全局配置 > 默认启用

## 页面

| 页面 | 说明 |
|------|------|
| Overview | 健康概览、Token 开销估算、Session 历史 |
| Plugins | 所有已安装 Plugin 的启用状态和内容类型标签 |
| Skills | 来自用户、项目、Plugin 的 Skill |
| Commands | 来自用户、项目、Plugin 的 Command |
| Agents | 来自用户、Plugin 的 Agent |
| MCP Servers | MCP 目录，含健康状态和来源分类 |
| Hooks | Hook 事件配置 |

## 相对原项目的主要改动

相比[原项目](https://github.com/nphardorworse/claude-dashboard)，本版本做了大幅简化：

- **删除了所有消耗金额的统计逻辑** — 不再追踪花费、按项目统计费用、按 Session 分析成本
- **删除了所有管理 action 功能** — 无启用/禁用开关、无增删表单、所有服务端路由均为 GET 只读
- **新增 Commands & Agents 视图** — 新增 Command 和 Agent 的查看页面，使用统一的卡片网格
- **重构了 MCP 视图** — 将折叠分组视图替换为统一卡片网格，修复了 `claude mcp list` 中 `plugin:` 前缀导致的 cloud MCP 重复问题
- **统一了 Skill、Command、Agent 模块** — 一致的标签逻辑（Plugin 名称 + Marketplace）、状态筛选（Active / Plugin Disabled）、分类筛选（按来源/Marketplace）

**改动原因：** 插件市场的安装和管理比较复杂，更适合通过 Claude Code 自身的配置文件手动管理。Dashboard 仅作为可视化工具，提供对配置状态的只读视图。

## 快速开始

```bash
npm install
npm run dev
```

Dashboard 运行在 `http://localhost:5175`。

## 使用建议：快速启动命令

在全局 Command 中添加一个快速打开 Dashboard 的命令：

创建 `~/.claude/commands/dashboard-open.md`：

```markdown
---
description: "Open the Claude Code Dashboard in the browser"
---

Open http://localhost:5175/#/ in the user's default browser using the `open` command (macOS).

Steps:
1. Run `open http://localhost:5175/#/`
2. Confirm to the user that the dashboard has been opened.
```

之后在任意 Claude Code 会话中使用 `/dashboard-open` 即可快速打开 Dashboard。

## 已知限制

本项目**不处理** `settings.local.json`。如果你使用了 local 配置（全局或项目级）来覆盖 Plugin 启用状态，Dashboard 显示的结果可能不准确。如需支持，需自行二次开发。

## 致谢

项目框架来源于 [nphardorworse/claude-dashboard](https://github.com/nphardorworse/claude-dashboard)。由于对原项目进行了大量删改，因此单独维护。
