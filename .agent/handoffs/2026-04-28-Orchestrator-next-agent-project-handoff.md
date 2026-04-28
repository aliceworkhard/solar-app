# Handoff - Orchestrator Next Agent Project Snapshot

日期：2026-04-28
角色：Orchestrator / Docs Release

## Summary

当前项目已完成 Android BLE MVP 的通信跑通、两页 UI 多轮收敛、T-021/T-022 交互修正，并已推送到 GitHub `main`。

最新远端状态：

- 仓库：`https://github.com/aliceworkhard/solar-app.git`
- 分支：`main`
- 最新提交：`b4d0333 docs: record github backup for t022`
- 代码提交：`3ede780 feat: refine BLE UI anchors and current display`

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
- Debug APK 最近构建通过。

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

优先做：

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
