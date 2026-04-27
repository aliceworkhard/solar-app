# AGENTS

本项目的 AI 协作规则以 `.agent/RULES.md` 为准。

每次开始任务时：

1. 读取 `.agent/START_HERE.md`。
2. 读取 `.agent/AI_CONTEXT.md`。
3. 读取根目录 `todo.md`。
4. 如果任务涉及修改、实现、优化、修复、协议、UI、构建、发布或文档结构调整，先读取 `.agent/PLAN_FIRST_WORKFLOW.md` 和 `.codex/skills/plan-first-development/SKILL.md`。
5. 如果是多 agent 任务，读取 `.agent/agents/ROLES.md` 和 `.agent/OWNERSHIP.md`。
6. 读取 `.agent/tasks/active/` 中与你任务相关的 task packet。
7. 需要历史背景时，先读取 `.agent/CHANGE_INDEX.md`。
8. 不要默认读取 `.agent/logs/` 全量内容。

先方案后修改：

1. 涉及非微小修改时，先写 `.agent/plans/YYYY-MM-DD-topic.md`。
2. 同步更新 `todo.md`，写任务、优先级、状态和验收标准。
3. 向用户展示方案并等待明确确认。
4. 未确认前不要改业务代码、协议、UI、Android 原生文件、构建配置或源协议文件。
5. 用户确认后，在 `.agent/approvals/` 写审批记录，再按批准范围实施。

多 agent 协作时：

1. 每个 agent 必须先确认自己的角色和写入范围。
2. 不允许两个 agent 同时修改同一文件。
3. `deviceController.ts` 是集成层，默认只允许一个指定 agent 修改。
4. 完成任务后写 `.agent/handoffs/YYYY-MM-DD-ROLE-task.md`。
5. Orchestrator 负责最终合并、验证和文档同步。

每次完成任务后：

1. 更新 `todo.md`。
2. 有实际修改时新增 `.agent/logs/YYYY-MM-DD-session-N.md`。
3. 当前项目状态变化时更新 `.agent/AI_CONTEXT.md`。
4. 阶段变化时更新 `.agent/CHANGE_INDEX.md`。
5. 如果任务跨 agent 交接，更新 `.agent/handoffs/`。
