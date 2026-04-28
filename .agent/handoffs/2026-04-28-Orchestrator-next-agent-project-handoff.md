# Handoff - Orchestrator Next Agent Project Snapshot

日期：2026-04-28
角色：Orchestrator / Docs Release

## Summary

当前项目已完成 Android BLE MVP 的通信跑通、两页 UI 多轮收敛、T-021/T-022 交互修正，并已推送到 GitHub `main`。

最新远端状态：

- 仓库：`https://github.com/aliceworkhard/solar-app.git`
- 分支：`main`
- 最新提交：`84da1c5 docs: prepare next agent handoff`
- 代码提交：`3ede780 feat: refine BLE UI anchors and current display`

## Post-Handoff Clarification

2026-04-28 接手后用户补充：

- `T-001` / `T-002` 先不做，任务保留。
- 协议回传只有读状态和读参数；其他控制命令不用回传。
- 开/关按当前指令执行，是否能区分独立开机/关机仍待真机确认。
- 状态栏渐变真机未通过；如果后续要再改，需先走 Plan First 且只做明确批准的一版。
- 详情页锚点可能需要调整，但等待用户补充信息。
- 电流显示规则已通过。

2026-04-28 T-025 后补充：

- 已再做一版状态栏渐变：新增 native/window `status_bar_gradient` 背景兜底，仍需 vivo 真机复验。
- 已新增底部导航 `设备 / 场景 / 我的`。
- `场景` 为预留页；`我的` 为参考 `04_profile_settings_page.png` 的本地静态信息页。
- 已压缩详情页顶部 spacing；锚点滚动是否还要改等待真机反馈。
- T-025 验证通过：`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug`。

2026-04-28 T-026 后补充：

- 已按真机反馈再改 `我的` 页密度：`我的设备` 320/360/390px 保持 1 行 3 项，`我的场景` 保持 1 行 4 项。
- 新增内容字体、图标、卡片间距和底部导航均缩小；底栏使用 `--safe-bottom` / `--bottom-nav-space` 处理底部安全区。
- T-026 验证通过：`npm.cmd test -- src/app.test.ts` 27 tests、`npm.cmd test` 5 files / 48 tests、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome layout check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`。
- 最新 APK：`交付物/solar-remote-t026-sideload.apk`；英文路径副本 `C:\solar-apk\solar-remote-t026-sideload.apk`；SHA256 `901050A738DDF4C163439DEB550A8AEF7C799FBF6EA9483840F6F3E95B3EFDD0`；manifest `NO_TEST_ONLY`，`apksigner verify` 通过。

## What Works Now

- Android BLE 扫描/连接/写入/notify 收包已跑通。
- 目标设备锁定为 `AC632N_1`。
- 写入方式固定 `write`。
- App 启动后自动后台扫描。
- 已连接设备可以进入控制页，断开后保留为可连接项。
- 控制页连续展示 `设备状态` 与 `控制面板`。
- 业务命令默认写入成功即返回，不等待 BLE 回包。
- Notify 到达后解析 `E1` 状态并更新 UI。
- ready 后每 5 秒非阻塞发送读状态。
- Debug APK 最近构建通过；最新可侧载包为 T-026 非 `testOnly` APK。

## Key Protocol Facts

- Service UUID：`0000FFF0-0000-1000-8000-00805F9B34FB`
- Write UUID：`0000FFF1-0000-1000-8000-00805F9B34FB`
- Notify UUID：`0000FFF2-0000-1000-8000-00805F9B34FB`
- 读参数：`FF CE 06 00 0D 00 00 30 10`
- 读状态：`FF CE 06 00 0E 00 00 30 11`
- 开/关：`FF CE 06 00 0A 00 00 30 0D`
- 增加亮度：`FF CE 06 00 0B 00 00 30 0E`
- 降低亮度：`FF CE 06 00 0C 00 00 30 0F`

## Current Open Tasks

当前用户口径：`T-001` / `T-002` 先不做，任务保留。

保留任务：

1. `T-001` 真机性能采样
   - 目标：20 次扫描首包耗时、20 次连接到 `ready` 耗时、P50/P90、fallback、失败原因。
   - 任务包：`.agent/tasks/active/T-001-performance-sampling.md`

2. `T-002` 5 条 MVP 命令复测
   - 目标：每条 10 次，记录 TX/RX、notify、有无 UI 更新、是否需要等待回包。
   - 任务包：`.agent/tasks/active/T-002-command-retest.md`

之后再考虑：

3. `T-010` 持续发现策略优化
   - 必须基于真实采样数据，不要凭感觉调参数。

## Important Files

- Entry rules: `AGENTS.md`
- Fast start: `.agent/START_HERE.md`
- Full context: `.agent/AI_CONTEXT.md`
- Current tasks: `todo.md`
- Role rules: `.agent/agents/ROLES.md`
- File ownership: `.agent/OWNERSHIP.md`
- Main app: `项目文件/android-mvp-capacitor/src/app.ts`
- BLE bridge JS: `项目文件/android-mvp-capacitor/src/ble/bleBridge.ts`
- BLE native: `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`
- Controller: `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- Protocol: `项目文件/android-mvp-capacitor/src/protocol/`
- Upload log: `项目文件/上传日志.md`

## Verification Commands

在 `项目文件/android-mvp-capacitor` 下：

```powershell
npm.cmd test -- src/app.test.ts
npm.cmd test
npm.cmd run build
npm.cmd run sync
```

在 `项目文件/android-mvp-capacitor/android` 下：

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat :app:assembleDebug
```

## Warnings

- 不要改普通命令默认不等待回包的策略，除非 T-002 证明某条命令必须等待。
- 不要让 UI 直接处理原始 HEX。
- 不要覆盖用户保留的 Excel 协议文件。
- 不要纳入 `android/.idea/`。
- 修改任何非微小内容前必须走 Plan First。

## Suggested Next Agent Mode

如果只做 T-001/T-002，建议下一个 agent 以 QA Agent 身份接手，写入范围限制在测试记录、报告、确认表和 todo/log。不要直接改业务代码。
