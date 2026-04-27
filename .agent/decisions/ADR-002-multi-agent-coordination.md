# ADR-002 - Multi-Agent Coordination

日期：2026-04-27

## Status

Accepted

## Context

项目后续会同时涉及 Android BLE、协议解析、2 页 UI、真机测试、文档交付。如果所有 agent 都直接读取完整历史并随意改文件，容易出现上下文过大、职责混乱、文件冲突和重复决策。

## Decision

采用多 agent 分工机制：

- `AGENTS.md` 和 `.agent/START_HERE.md` 作为统一入口。
- `.agent/agents/ROLES.md` 定义角色。
- `.agent/OWNERSHIP.md` 定义文件写入边界。
- `.agent/tasks/active/` 定义可领取任务包。
- `.agent/handoffs/` 保存跨 agent 交接。
- `.agent/VERIFICATION.md` 定义验证证据。

## Consequences

- 下一位 agent 可以按入口文件快速接手。
- 多 agent 可并行处理 BLE、协议、UI、QA、文档，但不能同时写同一文件。
- `deviceController.ts` 被视为集成层，默认只由 Orchestrator 或指定集成 agent 修改。
- 协作成本增加，但能减少冲突和错误上下文。

## Rollback

如果只有单 agent 开发，可只读取 `AGENTS.md`、`.agent/START_HERE.md`、`.agent/AI_CONTEXT.md` 和 `todo.md`，暂时不使用 task packet 与 handoff。
