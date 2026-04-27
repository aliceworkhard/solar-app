# ADR-001 - Agent Memory Structure

日期：2026-04-27

## Status

Accepted

## Context

项目已有多个 Markdown 文件承担当前状态、历史记录、任务管理、决策说明和调试记录。随着 BLE 调试和 UI 开发推进，单个文档会越来越长，AI 每次读取完整历史会降低效率，也容易把过期信息当成当前事实。

## Decision

采用分层记忆结构：

- `.agent/AI_CONTEXT.md`：当前项目状态、架构、规则和未决问题。
- `todo.md`：当前仍有行动价值的任务。
- `.agent/CHANGE_INDEX.md`：历史索引。
- `.agent/logs/`：每次修改的短 session log。
- `.agent/archive/`：旧 TODO、阶段总结和过期记录。
- `.agent/decisions/`：长期技术决策。

## Consequences

- AI 默认只需要读取 `.agent/AI_CONTEXT.md` 和 `todo.md`。
- 历史不会删除，而是通过索引定向读取。
- 每次开发结束必须维护 TODO 和必要日志，否则上下文会逐渐失真。

## Rollback

如果该结构维护成本过高，可保留 `.agent/AI_CONTEXT.md`、`todo.md`、`.agent/CHANGE_INDEX.md` 三个核心文件，暂时停止细分日志和 ADR。
