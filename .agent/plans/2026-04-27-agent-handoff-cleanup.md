# Plan - Agent 接力整理与测试模板

## Request

用户要求在保留并提交当前改动后继续下一步。当前下一步应先整理项目接力入口，让后续单 agent 或多 agent 可以直接按任务继续推进。

## Current Facts

- 当前提交：`c71a4b1 chore: record protocol status and skill setup`。
- BLE 主链路已跑通，写入方式固定 `write`。
- 普通业务命令默认不等待 BLE 回包。
- 用户已反馈 T-001/T-002 可行性测试通过：使用 vivo X300 Pro，连接、收发和 5 条 MVP 命令执行均无传输问题、无出错样本。
- 本次不填写正式 20 次采样表或 5 条命令逐次复测表。
- 当前优先任务仍是：
  - `T-001`：20 次真机扫描/连接性能采样。
  - `T-002`：5 条 MVP 命令各 10 次复测。
- 新增全局 skills 已安装：
  - `kb-retriever`
  - `web-design-engineer`
  - `gpt-image-2`
  - `requesting-code-review`
  - `receiving-code-review`
  - `security-best-practices`
- 当前 `.agent/tasks/active/` 已有 `T-001` 和 `T-002` task packet，但还缺：
  - 真机采样可直接填写的报告模板。
  - 命令复测可直接填写的报告模板。
  - `T-011` UI 收敛 task packet。
  - 新 skill 在本项目中的使用规则。

## Proposed Scope

本次只做文档和协作结构整理：

- 新增真机测试报告模板。
- 新增 UI 收敛任务包。
- 新增 skill 使用说明。
- 更新 `START_HERE.md` 和 `AI_CONTEXT.md`，让下一位 agent 更快进入状态。
- 更新 `todo.md`，把本整理任务从 Proposed 推进到 Done。
- 新增 session log。

## Out of Scope

- 不修改业务代码。
- 不修改 BLE 原生插件。
- 不修改协议解析或命令定义。
- 不修改 UI 页面。
- 不运行 Android Gradle 构建。
- 不提交或纳入 `项目文件/android-mvp-capacitor/android/.idea/`。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Reports | `.agent/reports/templates/T-001-ble-performance-sampling.md` | 新增 20 次扫描/连接性能采样表，包含 P50/P90 计算位置。 |
| Reports | `.agent/reports/templates/T-002-command-retest.md` | 新增 5 条命令复测记录表，包含 TX/RX/UI 更新/是否等待回包。 |
| Reports | `.agent/reports/2026-04-27-feasibility-smoke-test.md` | 新增可行性冒烟测试记录，不替代正式验收表。 |
| Task Packet | `.agent/tasks/active/T-011-ui-convergence.md` | 新增 UI Agent 任务包，限定只做两页 UI 收敛，不碰 BLE/协议。 |
| Skill Rules | `.agent/SKILL_USAGE.md` | 新增本项目使用 skill 的触发规则和边界。 |
| Entry | `.agent/START_HERE.md` | 补充下一步优先级和新增模板位置。 |
| Context | `.agent/AI_CONTEXT.md` | 补充接力模板和 skill 使用基线。 |
| TODO | `todo.md` | 新增/更新 `T-014 Agent 接力整理与测试模板`。 |
| Log | `.agent/logs/2026-04-27-session-11.md` | 记录本次整理结果。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-014 Agent 接力整理与测试模板 | P1 | Approved | T-001/T-002 模板可正式验收时填写；T-011 任务包明确写入范围；skill 使用说明可被下一位 agent 直接读取；不改业务代码；session log 完成。 |

## Risks

- 文档过多会增加读取负担，因此模板应短而可填，不写长教程。
- `todo.md` 需要继续保持看板性质，不把完整计划和历史堆进去。
- UI 收敛任务包必须避免让 UI Agent 直接解析 HEX 或修改 `deviceController.ts`。

## Verification

- 检查新增文件存在。
- 检查 `todo.md` 有 `T-014` 且验收标准明确。
- 检查 `START_HERE.md` 和 `AI_CONTEXT.md` 能指向正确模板。
- 运行 `git -c core.quotepath=false status --short`，确认没有误纳入 `android/.idea/`。
- 本次不改业务代码，不需要 `npm.cmd test` / `npm.cmd run build`。

## Rollback

- 删除本次新增模板、任务包、skill 使用说明和 session log。
- 回退 `START_HERE.md`、`AI_CONTEXT.md`、`todo.md` 中本次新增段落。

## Approval Gate

等待用户确认后再正式修改上述文档文件。
