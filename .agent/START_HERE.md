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

T-022 后项目已由下一位 agent 接手。用户最新确认：T-001/T-002 先不做，任务保留；不要继续凭感觉改 UI 或 BLE 参数。

接手入口：

- 最新交接总览：`.agent/handoffs/NEXT_AGENT_HANDOFF.md`
- 正式交接快照：`.agent/handoffs/2026-04-28-Orchestrator-next-agent-project-handoff.md`

保留任务：

1. `T-001`：补齐 20 次真机扫描/连接性能采样，任务包 `.agent/tasks/active/T-001-performance-sampling.md`。
2. `T-002`：复测 5 条 MVP 命令，任务包 `.agent/tasks/active/T-002-command-retest.md`。
3. `T-010`：必须等 T-001/T-009 有真实数据后，再考虑优化持续发现策略。

当前等待：

- T-026 已按用户反馈再压缩 `我的` 页和底部导航：`我的设备` 在窄屏保持 1 行 3 项，`我的场景` 保持 1 行 4 项，新增文字/图标/底栏均更小。
- 最新可侧载 APK：`交付物/solar-remote-t026-sideload.apk`，英文路径副本 `C:\solar-apk\solar-remote-t026-sideload.apk`，manifest 已确认不含 `testOnly`。
- T-025/T-026 的状态栏/底栏效果仍需 vivo 真机复验：顶部是否真正铺到系统状态栏、底栏是否避开系统导航区域。
- 详情页顶部间距已压缩；锚点滚动是否还需改等待真机反馈。
- 电流显示规则已通过。

已知前提：

- `T-001` / `T-002` 目前只有可行性冒烟测试结论：使用 vivo X300 Pro 测试，连接、收发、5 条 MVP 命令均未发现传输错误。
- 正式量化验收仍需后补：`T-001` 的 20 次扫描/连接 P50/P90，以及 `T-002` 的 5 条命令各 10 次逐条记录。
- 协议回传口径：只有读状态和读参数需要关注回传；其他控制命令不用回传。
- 开/关按当前指令执行，能否区分独立开机/关机仍待真机确认。
- 可行性记录：`.agent/reports/2026-04-27-feasibility-smoke-test.md`。
- 正式补测模板：`.agent/reports/templates/`。

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

## Current Best Next Step - After T-020

T-020 is complete. The next real-phone check should focus on the latest UI/interaction pass:
- Home page should no longer show the “准备搜索附近设备” preparation card.
- Connected `AC632N_1` card should be opaque when idle; the red `取消连接` action should appear only after left swipe.
- Swipe-left interaction should feel smoother and the red action should have four rounded corners.
- Control-page Live Status lower chip should show battery percentage from `batteryVoltage` using `2.5V=0%` and `3.4V=100%`.
- Tapping refresh/search should not visibly block the page while background scanning runs.

If accepted on phone, continue with formal T-001/T-002 sampling or longer BLE stability testing.

## Current Best Next Step - After T-021

T-021 is complete. The next real-phone check should focus on UI responsiveness and status-bar presentation:
- Cold start should automatically begin scanning for `AC632N_1` without tapping refresh.
- The `+` button, refresh, and searching after disconnect should not freeze the page.
- A manually disconnected device should remain visible as connectable and appear below other connectable results.
- Quickly entering the detail page while connection/status sync is still settling should not trigger duplicate connect or block the page.
- The top Android status bar should show the app gradient behind time/signal/battery, without overlapping the page title.
- The detail tabs should switch between `设备状态` and `控制面板`; command buttons should sit above the mode strip in the control tab.

If accepted on phone, continue with formal T-001/T-002 sampling or longer BLE stability testing.

## Current Best Next Step - After T-022

T-022 is complete. The next real-phone check should focus on the corrected interaction details:
- On the home page, tap `+`, then tap `X`; the button should immediately return to `+` and the UI should not appear stuck in continuous discovery.
- The top Android system status bar should show the app gradient behind time/signal/battery as much as vivo WebView allows.
- On the detail page, `设备状态` and `控制面板` should both be visible in one vertical page; tapping the two top buttons should scroll to the matching section.
- In Live Status, when brightness is `0%`, current should use the returned current value; when brightness is nonzero, current should use `brightness / 100 * 9.7272A`.

If accepted on phone, continue with formal T-001/T-002 sampling or longer BLE stability testing.
