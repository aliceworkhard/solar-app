# Workflows

## Single Agent Workflow

1. 读 `AGENTS.md`。
2. 读 `.agent/START_HERE.md`。
3. 读 `.agent/AI_CONTEXT.md` 和 `todo.md`。
4. 选择一个 TODO。
5. 读取对应 task packet。
6. 检查 Git 状态。
7. 实施修改。
8. 运行验证。
9. 更新 TODO、session log、必要上下文。

## Multi-Agent Workflow

1. Orchestrator 先拆任务。
2. 每个 agent 领取一个 `.agent/tasks/active/*.md`。
3. 每个 task packet 必须写明 write scope。
4. 不允许两个 agent 同时改同一文件。
5. Worker 完成后写 `.agent/handoffs/YYYY-MM-DD-ROLE-task.md`。
6. Orchestrator 合并前读取所有 handoff。
7. Orchestrator 负责最终验证和文档更新。

## Recommended Parallel Split

第一轮并行：

- BLE Agent：T-001 性能采样与连接速度证据。
- Protocol Agent：T-002/T-003 命令与回传规则固化。
- UI Agent：T-004 根据现有状态收敛界面，不扩大功能。
- QA Agent：准备 T-006 长稳测试表和回归 checklist。

第二轮集成：

- Orchestrator 汇总实测数据。
- 更新 `DeviceController` 和 UI 行为。
- 运行测试与构建。
- 更新文档和上传日志。

## Merge Rules

- 先合协议和类型变化，再合 UI。
- `deviceController.ts` 只由一个集成 agent 处理。
- 如果测试失败，先定位失败归属，不要批量回滚。
- 如果发现用户新增或修改了文件，停止并确认。

## Handoff Minimum Content

每个 handoff 必须包含：

- 任务 ID
- 角色
- 修改文件
- 关键决策
- 验证结果
- 未完成事项
- 对下一个 agent 的明确提示
