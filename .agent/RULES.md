# Agent Memory Rules

## Read Order

1. 先读 `AGENTS.md`。
2. 再读 `.agent/START_HERE.md`。
3. 再读 `.agent/AI_CONTEXT.md`。
4. 再读根目录 `todo.md`。
5. 涉及修改时读取 `.agent/PLAN_FIRST_WORKFLOW.md`。
6. 多 agent 任务读取 `.agent/agents/ROLES.md`、`.agent/OWNERSHIP.md` 和对应 task packet。
7. 如需历史背景，先读 `.agent/CHANGE_INDEX.md`。
8. 只有 `CHANGE_INDEX.md` 指向具体日志时，才读取 `.agent/logs/`、`.agent/archive/` 或 `.agent/decisions/`。

## Update Rules

1. 每次完成任务后更新 `todo.md`。
2. 有实际修改时新增一份 `.agent/logs/YYYY-MM-DD-session-N.md`。
3. 如果项目当前状态变化，更新 `.agent/AI_CONTEXT.md`。
4. 如果形成阶段性变化，更新 `.agent/CHANGE_INDEX.md`。
5. 如果是长期技术决策，写入 `.agent/decisions/ADR-NNN-*.md`。
6. 已完成、废弃或过期任务移入 `.agent/archive/`，不要长期留在 `todo.md`。
7. 多 agent 交接必须写入 `.agent/handoffs/`。

## Plan First Rules

- 非微小修改必须先写方案。
- 方案文件放在 `.agent/plans/`。
- 方案必须同步更新 `todo.md` 的任务、优先级、状态、验收标准。
- 未获用户明确确认前，不要改业务代码、协议、UI、Android 原生文件、构建配置或源协议文件。
- 用户确认后，在 `.agent/approvals/` 写审批记录。
- 只实施审批范围内的内容。

## Size Rules

- `.agent/AI_CONTEXT.md` 建议不超过 200 行。
- `todo.md` 建议不超过 150 行。
- 单个 session log 只写目标、变化、文件、决策、后续任务、风险，不写完整 diff。

## Project-Specific Rules

- Android 优先，iOS 暂不实施。
- BLE 默认 profile 是 `FFF0/FFF1/FFF2`。
- 写入方式固定 `write`。
- 普通命令不等待 BLE 回包。
- `android/.idea/` 不纳入 Git。

## Multi-Agent Rules

- 每个 agent 必须有明确 Owner Role。
- 每个 agent 必须有明确 Write Scope。
- 不允许两个 agent 同时修改同一文件。
- `deviceController.ts` 是集成层，默认只允许 Orchestrator 或指定集成 agent 修改。
- UI agent 不直接解析 HEX。
- Protocol agent 不直接改 UI。
- BLE agent 不直接改协议命令含义。
- QA agent 不主动重写业务逻辑。
