# Change Index

本文件只做历史入口，不写完整过程。需要细节时再定向读取对应日志、归档或项目文档。

## M00 - 项目资料整理

日期：2026-04-22

摘要：整理 `readme.md`、系统文件结构、聊天记录总结与后续开发方案，形成第一阶段资料。

相关文件：

- `readme.md`
- `项目文件/系统文件整理.md`
- `项目文件/chat总结与后续开发方案.md`
- `项目文件/第一阶段执行任务清单.md`

## M01 - Android BLE 基础闭环

日期：2026-04-22 至 2026-04-23

摘要：实现 Android BLE 扫描、连接、服务发现、订阅 notify、写入和调试日志，确认 `FFF0/FFF1/FFF2` 主链路。

关键结论：

- `FFF1` 是发送通道。
- `FFF2` 是接收通道。
- 真机确认能发送和接收。

相关文件：

- `项目文件/android-mvp-capacitor/src/ble/bleBridge.ts`
- `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`
- `项目文件/通信参数确认表.md`

## M02 - BLE 提速与连接状态收敛

日期：2026-04-23 至 2026-04-24

摘要：加入快速扫描首包、后台补全、无前缀 fallback、连接/发现服务超时、快连入口和状态机可视化。

关键结论：

- 目标扫描体验从固定等待 5s 改为快速首包 + 后台补全。
- 控制页只允许 `ready` 状态发送业务命令。

相关文件：

- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.test.ts`
- `项目文件/推进工作.md`

## M03 - 命令定义与不等待回包策略

日期：2026-04-24

摘要：新增 `CommandDefinition`，固化 5 条 MVP 命令；根据真机行为，将普通命令调整为写入成功即返回，不等待 BLE 回包。

关键结论：

- 写入方式固定 `write`。
- 普通命令不等待 BLE 回包，避免假超时。
- 只有后续确认稳定有回传的特定命令才单独开启等待。

相关文件：

- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`
- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.test.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- `项目文件/最小命令集表.md`

## M04 - Agent 记忆框架

日期：2026-04-27

摘要：根据 `docs/improve.md` 建立分层记忆框架，区分当前上下文、当前任务、变更索引、session 日志、归档和决策记录。

相关日志：

- `.agent/logs/2026-04-27-session-01.md`

关键文件：

- `.agent/AI_CONTEXT.md`
- `todo.md`
- `.agent/CHANGE_INDEX.md`
- `.agent/RULES.md`
- `.agent/decisions/ADR-001-agent-memory-structure.md`

## M05 - 多 Agent 协作框架

日期：2026-04-27

摘要：在原有记忆框架上增加多 agent 启动入口、角色定义、文件所有权、工作流、验证指南、任务包模板和交接模板，方便后续不同 agent 无缝接手。

相关日志：

- `.agent/logs/2026-04-27-session-02.md`

关键文件：

- `.agent/START_HERE.md`
- `.agent/agents/ROLES.md`
- `.agent/OWNERSHIP.md`
- `.agent/WORKFLOWS.md`
- `.agent/VERIFICATION.md`
- `.agent/tasks/active/`
- `.agent/templates/`
- `.agent/handoffs/NEXT_AGENT_HANDOFF.md`
- `.agent/decisions/ADR-002-multi-agent-coordination.md`

## M06 - 正式 RF 协议帧切换

日期：2026-04-27

摘要：读取 `新遥控器数据下载与控制协议.xlsx` 后，废弃 `AA 55 + CRC16` 临时调试帧，切换为正式 `FF CE + LEN + DESC + CMD + SUB + DATA + 30 + SUM` RF 控制帧。读参数命令按用户提供整条命令 `FF CE 06 00 0D 00 00 30 10` 固化。

关键结论：

- RF 控制命令总是 9 字节。
- 最后 1 字节是前面所有字节的无进位累加和低 8 位。
- 5 条控制命令为 `0x0A/0x0B/0x0C/0x0D/0x0E`。
- 读参数和读状态协议上需要回传，但当前程序仍不阻塞等待 BLE 回包，只做被动解析。

相关日志：

- `.agent/logs/2026-04-27-session-03.md`

关键文件：

- `项目文件/android-mvp-capacitor/src/protocol/frameCodec.ts`
- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`
- `项目文件/android-mvp-capacitor/src/protocol/responseParser.ts`
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/最小命令集表.md`
- `项目文件/通信参数确认表.md`

## M07 - 先方案后修改工作流

日期：2026-04-27

摘要：建立项目级 `plan-first-development` skill 和 `.agent/PLAN_FIRST_WORKFLOW.md`，要求后续非微小修改先写方案、更新 `todo.md` 优先级和验收标准，等待用户确认后再实施。

关键结论：

- 未确认前，只允许读取、写方案、更新 TODO 和记录审批。
- 用户明确确认后，才允许修改业务代码、协议、UI、Android 原生文件、构建配置或源协议文件。
- 项目内 skill 位于 `.codex/skills/plan-first-development/SKILL.md`。

相关日志：

- `.agent/logs/2026-04-27-session-04.md`

关键文件：

- `.codex/skills/plan-first-development/SKILL.md`
- `.agent/PLAN_FIRST_WORKFLOW.md`
- `.agent/templates/change-plan.md`
- `.agent/templates/approval-record.md`
- `.agent/plans/2026-04-27-plan-first-workflow.md`
- `.agent/approvals/2026-04-27-plan-first-workflow.md`

## M08 - T-011 Two-page UI convergence

Date: 2026-04-27

Summary: Rebuilt the Android MVP home and control pages as real DOM UI based on the HTML/image references, using the transparent MPPT controller asset as the device visual anchor. Kept the BLE/protocol/controller chain unchanged and retained the five MVP command entries plus hidden debug console.

Key conclusions:
- UI no longer relies on full-page screenshots as the main product surface.
- Control page command buttons still map only to existing `DeviceController` business methods.
- Chrome CDP mobile checks at 390px reported no horizontal overflow for both home and control visual states.

Related logs:
- `.agent/logs/2026-04-27-session-12.md`

Key files:
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `项目文件/android-mvp-capacitor/public/assets/ui/mppt_gray_black_controller_transparent.png`
- `.agent/handoffs/2026-04-27-UI-T-011.md`

## M09 - AC632N_1 target device flow fix

Date: 2026-04-27

Summary: Locked the current BLE UI flow to `AC632N_1`, added auto-connect after discovering the target, sent one non-blocking `readStatus` after successful connect, and fixed connected-card navigation so tapping the already connected device opens the control page instead of reconnecting.

Key conclusions:
- Current validation hardware path is single-target: `AC632N_1` only.
- Read-status is sent once after ready but still does not block waiting for BLE response.
- Connected-card click now routes to detail/control when the card is the active ready device.

Related logs:
- `.agent/logs/2026-04-27-session-13.md`

Key files:
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `.agent/plans/2026-04-27-ac632n1-autoconnect.md`

## M10 - T-016 UI reference realignment

Date: 2026-04-28

Summary: Reworked the Android MVP two-page UI to more closely match the provided reference images and HTML prototype while preserving the existing BLE/protocol/controller behavior.

Key conclusions:
- This was a UI-only pass. BLE, protocol, Android native, and `deviceController.ts` were not modified.
- The current hardware validation path remains single-target: `AC632N_1` only.
- The UI now uses reference-style light background, large Chinese page titles, rounded white cards, blue scan/connection states, green online states, and orange control emphasis.
- Chrome CDP mobile checks at 390px reported no horizontal overflow for both home and control states.

Related logs:
- `.agent/logs/2026-04-28-session-01.md`

Key files:
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `.agent/reports/screenshots/T-016-home-mobile-390x900-cdp.png`
- `.agent/reports/screenshots/T-016-control-mobile-390x900-cdp.png`

## M11 - T-017 UI navigation and compact layout polish

Date: 2026-04-28

Summary: Fixed the post-connection refresh/navigation bug and tightened the two-page MVP UI density after real-device feedback.

Key conclusions:
- Homepage `刷新` is now a list refresh only; it no longer re-enters the previous connected device detail page.
- Control-page entry now uses WebView history, so Android/system Back returns to the homepage before app exit.
- Mock phone status chrome, the control-page three-dot placeholder, and the default “等待操作” card were removed.
- Homepage device cards and control-page detail cards were compacted with smaller typography while preserving BLE/protocol behavior.

Related logs:
- `.agent/logs/2026-04-28-session-02.md`

Key files:
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `.agent/reports/screenshots/2026-04-28-t017-home.png`

## M12 - T-018 Android back dispatch and Live Status layout

Date: 2026-04-28

Summary: Added Android native back dispatch into the WebView and refined status presentation to match the user-provided Live Status reference.

Key conclusions:
- Web history alone was insufficient for vivo/Android right-edge system back; native `MainActivity` now delegates back events to `window.solarRemoteHandleNativeBack()`.
- Control-page native back returns to homepage; homepage native back exits.
- Control-page status card follows the `LIVE STATUS` structure from the screenshot/HTML reference.
- Nearby-device cards now include 2x2 metrics: current mode, battery voltage, solar voltage, and brightness.
- Missing protocol fields are shown as `-` instead of fabricated values.

Related logs:
- `.agent/logs/2026-04-28-session-03.md`

Key files:
- `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java`
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `.agent/reports/screenshots/2026-04-28-t018-home.png`

## M13 - T-019 UI card cleanup and status polling

Date: 2026-04-28

Summary: Removed the home current-device summary area, compacted nearby-device cards, added swipe-left disconnect, replaced unavailable Live Status fields with real read-status fields, moved mode buttons to the control panel top, and added 5s non-blocking read-status polling after ready.

Key conclusions:
- This was an App/UI-layer pass only. BLE native code, protocol command HEX, and `deviceController.ts` command semantics were not changed.
- The home page now centers the nearby-device list as the only device surface.
- The connected card can be swiped left to disconnect; normal tap still opens control when the card is not swiped open.
- Automatic status polling sends `readStatus` every 5 seconds only while the connection is ready and no poll is already in flight.

Related logs:
- `.agent/logs/2026-04-28-session-04.md`

Key files:
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `.agent/handoffs/2026-04-28-UI-T-019.md`

## M14 - T-020 home scan, swipe, and battery percent refinement

Date: 2026-04-28

Summary: Removed the home scan preparation card, changed manual refresh/search into a non-blocking background scan flow, refined connected-card swipe-to-disconnect motion, and replaced the lower Live Status refresh chip with battery percentage derived from battery voltage.

Key conclusions:
- This was an App/UI-layer pass only. BLE native code, protocol command HEX, Android native code, and `deviceController.ts` were not changed.
- The home page now starts at the nearby-device section without the large scan preparation card.
- Manual refresh/search no longer waits for the full scan window before returning UI control; progress updates the list and can still auto-connect the locked target.
- Connected-card idle state is fully opaque; the red disconnect action appears only during/after a left swipe.
- Battery percentage is a linear UI calculation from `batteryVoltage`: `2.5V=0%`, `3.4V=100%`, clamped to `0-100%`.

Related logs:
- `.agent/logs/2026-04-28-session-05.md`

Key files:
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `.agent/plans/2026-04-28-t020-home-scan-swipe-battery.md`
- `.agent/approvals/2026-04-28-t020-home-scan-swipe-battery.md`
