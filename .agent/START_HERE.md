# Start Here For Next Agent

更新时间：2026-04-27

## Mission

你接手的是一个 Android BLE 太阳能遥控器 MVP。当前重点不是重做架构，而是把已经跑通的 BLE 与 2 页 UI 继续收敛成可验收版本。

## Required Read Order

1. `AGENTS.md`
2. `.agent/START_HERE.md`
3. `.agent/AI_CONTEXT.md`
4. `todo.md`
5. 如果任务涉及修改，读 `.agent/PLAN_FIRST_WORKFLOW.md`
6. `.agent/tasks/active/` 中与你任务相关的 task packet
7. 如需历史，再读 `.agent/CHANGE_INDEX.md`

## Current Critical Facts

- Android 优先，iOS 暂不做。
- 主工程是 `项目文件/android-mvp-capacitor`。
- BLE 已能收发，UUID 默认 `FFF0/FFF1/FFF2`。
- 写入方式固定 `write`。
- 普通业务命令不等待 BLE 回包。
- Notify 数据只要到达就被动解析更新 UI。
- 当前还有用户保留的 Excel 修改：`底层协议/新遥控器数据下载与控制协议.xlsx`，不要覆盖。
- `android/.idea/` 不纳入 Git。

## Current Best Next Step

当前可以进入 `T-011` 两页 UI 收敛准备，但不要扩大协议或 BLE 范围。

已知前提：

- `T-001` / `T-002` 已有可行性冒烟测试结论：使用 vivo X300 Pro 测试，连接、收发、5 条 MVP 命令均未发现传输错误。
- 正式量化验收仍需后补：`T-001` 的 20 次扫描/连接 P50/P90，以及 `T-002` 的 5 条命令各 10 次逐条记录。
- 可行性记录：`.agent/reports/2026-04-27-feasibility-smoke-test.md`。
- 正式补测模板：`.agent/reports/templates/`。
- UI 接力任务包：`.agent/tasks/active/T-011-ui-convergence.md`。

## Plan First Gate

后续只要涉及修改、开发、优化、修复、协议、UI、构建、发布或文档结构调整，必须先：

1. 写 `.agent/plans/YYYY-MM-DD-topic.md`。
2. 更新 `todo.md` 的任务、优先级、状态和验收标准。
3. 向用户展示方案。
4. 等用户明确确认后再实施。

项目级 skill 位于 `.codex/skills/plan-first-development/SKILL.md`。

## Multi-Agent Rule

如果启用多个 agent，先拆任务，不要多人同时改同一文件。每个 agent 必须有明确写入范围，并在完成时写 handoff。

推荐并行方向：

- BLE agent：只负责 Android BLE 桥接、扫描连接性能、权限/异常。
- Protocol agent：只负责命令定义、帧解析、协议文档。
- UI agent：只负责 2 页界面和交互状态，不直接解析原始 HEX。
- QA agent：只负责测试、真机验收记录和回归清单。
- Docs/Release agent：只负责文档、日志、上传记录和交付说明。

## Before Editing

1. 运行 `git -c core.quotepath=false status --short`。
2. 确认是否存在非你产生的改动。
3. 如果要改已有未提交文件，先读完整文件并理解当前改动。
4. 不要回滚用户改动。
5. 确认本次是否已通过 Plan First Gate。

## After Editing

1. 更新 `todo.md`。
2. 新增 session log。
3. 如果是交接任务，写入 `.agent/handoffs/`。
4. 如果改变当前事实，更新 `.agent/AI_CONTEXT.md`。
5. 运行适合本次修改的验证命令，并记录不能运行的原因。

## Current Best Next Step - After T-011

T-011 is complete. The next agent should not redo the two-page UI convergence unless the user asks for visual revisions.

Recommended next step:
- Run the rebuilt Android app on a real phone and visually validate the new home/control pages with the BLE device connected.
- If the visual pass is acceptable, proceed to T-001/T-002 formal sampling or T-010 continuous discovery tuning.

Task packet moved:
- `.agent/tasks/done/T-011-ui-convergence.md`

Handoff:
- `.agent/handoffs/2026-04-27-UI-T-011.md`

## Current Best Next Step - After T-015

T-015 is complete. The app is now intentionally locked to `AC632N_1` for the current hardware validation path.

Recommended next step:
- Rebuild/sync Android and run on the phone.
- Confirm only `AC632N_1` appears, auto-connect runs, one `readStatus` is sent after ready, and tapping the connected card from the nearby-device page opens the detail page.

## Current Best Next Step - After T-016

T-016 is complete. The two-page MVP UI has been realigned toward the provided reference images.

Recommended next step:
- Rebuild/sync Android and visually validate on the phone with the real BLE device connected.
- If visual direction is accepted, continue with formal T-001/T-002 sampling or targeted UI copy/spacing tweaks from real-device feedback.

## Current Best Next Step - After T-017

T-017 is complete. The latest UI pass fixed refresh/back navigation and reduced card/typography density.

Recommended next step:
- Rebuild/sync Android and verify on the phone that homepage `刷新` only refreshes, Android system Back returns from control page to homepage, and the compact cards are readable with a real connected `AC632N_1`.
- If this visual/interaction pass is accepted, continue with T-001/T-002 formal sampling or T-010 continuous discovery tuning.

## Current Best Next Step - After T-018

T-018 is complete. Android native back dispatch has been added, and the control-page status area now follows the Live Status reference layout.

Recommended next step:
- Install/run the freshly synced debug build on the vivo phone.
- Verify right-edge/system back on the control page returns to the device homepage instead of exiting.
- Verify read-status values update the Live Status card and the nearby-device 2x2 metrics.
- If accepted, continue with T-001/T-002 formal sampling or T-010 continuous discovery tuning.

## Current Best Next Step - After T-019

T-019 is complete. The next real-phone check should focus on two behaviors:
- Swipe the connected `AC632N_1` card left on the home page and verify `取消连接` disconnects the device.
- Keep the device connected and ready, then verify the debug log shows one non-blocking `readStatus` TX every 5 seconds.

If both pass, continue with formal T-001/T-002 sampling or longer BLE stability testing.
