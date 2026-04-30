# Orchestrator Handoff - T041 GitHub Sync

日期：2026-04-30

## Summary

T034-T041 已完成并准备推送到 GitHub。当前交接重点是 T041：设备状态页快速滑动性能优化和后台扫描 3 秒低负担节奏。

## Repository

- Repository：`https://github.com/aliceworkhard/solar-app.git`
- Branch：`main`
- Commit：推送完成后查看 `git log -1 --oneline`
- 主工程：`项目文件/android-mvp-capacitor`

## Important Scope

这次 GitHub 同步应包含：

- 时控模式 T034-T038 相关源码、测试、方案、审批、日志、报告。
- T039 防误触 / 支持设备名 / 连接后初始同步 / 后台发现相关源码、测试、方案、审批、日志、报告。
- T041 状态页性能和后台扫描节奏相关源码、测试、方案、审批、日志、报告。
- `.agent/AI_CONTEXT.md`、`.agent/CHANGE_INDEX.md`、`todo.md`、本 handoff 和 `NEXT_AGENT_HANDOFF.md`。

明确不要包含：

- `底层协议/新遥控器数据下载与控制协议.xlsx`
- `项目文件/android-mvp-capacitor/android/.idea/`
- 旧 APK 交付物中未明确要求新增提交的文件

## T041 Facts

- `BACKGROUND_DISCOVERY_INTERVAL_MS = 3000`
- quiet background scan windows：quick 800ms / full 1200ms
- foreground continuous discovery interval 仍为 5000ms
- `readStatus` polling 仍为 5000ms
- status callbacks 通过 `requestAnimationFrame` 合并 UI 刷新
- 非 home view 不重建隐藏 device list
- device list 有 render signature，未变化时跳过 `innerHTML` 重建和事件重绑
- time-control editor 只在参数同步、draft、active segment 或 ready 状态变化时刷新
- debug log 隐藏时不刷 DOM

## Verification

最近一次验证：

- `npm.cmd test -- src/app.test.ts`：51 passed
- `npm.cmd test`：6 files / 84 passed
- `npm.cmd run build`：passed
- `npm.cmd run sync`：passed
- Android Studio JBR `gradlew.bat assembleDebug --project-prop android.injected.testOnly=false`：BUILD SUCCESSFUL
- `aapt dump badging app/build/outputs/apk/debug/app-debug.apk`：no `testOnly`
- `apksigner verify --verbose app/build/outputs/apk/debug/app-debug.apk`：Verifies，v2 true，1 signer
- Chrome CDP 320/360/390px control-page rapid-scroll smoke：passed

## Latest APK

没有导出 T041 sideload APK。最新正式交付包仍是：

- `交付物/solar-remote-t033-sideload.apk`
- `C:\solar-apk\solar-remote-t033-sideload.apk`
- SHA256 `45AD1807CCD71BFFEFC964E7A77AF1E5FDA326AF439E1C17E51F303F6E621A4F`

## Suggested Next-Agent Prompt

请接手 Android BLE 太阳能遥控器 MVP 项目。

项目路径：`C:\Users\SJGK8\Desktop\PROJECT\太阳能遥控器app`

主工程：`项目文件/android-mvp-capacitor`

开始前必须读取：

1. `AGENTS.md`
2. `.agent/START_HERE.md`
3. `.agent/AI_CONTEXT.md`
4. `todo.md`
5. `.agent/handoffs/NEXT_AGENT_HANDOFF.md`
6. `.agent/handoffs/2026-04-30-Orchestrator-t041-github-handoff.md`

重要规则：

- 修改代码、UI、Android 原生、协议、构建、发布或文档结构前，必须先写 `.agent/plans/` 方案，更新 `todo.md`，等待用户确认。
- 不要覆盖 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不要纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
- 不要把普通业务命令改成默认等待 BLE 回包。
- 不要把协议退回 AA55 临时帧。
- 不要让 UI 直接解析 HEX。
- 不要多人同时改 `deviceController.ts`。

当前状态：

- T041 已完成：设备状态页快速滑动性能优化、隐藏列表不重建、后台扫描约 3 秒轻扫一轮。
- T039 已完成：防误触、支持 `AC632N_1` / `AC632N-1` / `M3240-G` / `N3230-U`、连接后自动 `读状态` + `读参数`。
- T034-T038 已完成：时控模式 `B1 MODE=01` 29 字节整包写入和读参数同步，UI 文案/布局/消抖已按用户反馈迭代。
- 最新正式 APK 仍是 T033；T041 只有 debug build 验证，没有导出 sideload 包。

建议下一步：

- 先等用户在 vivo 真机确认 T041 滑动卡顿是否改善。
- 如果需要交付安装包，先写发布/导出方案，再导出 T041 sideload APK。
- 不要直接做 T040 多设备并连或 2.4G；那需要单独架构/可行性方案。
- T001/T002 用户要求先保留不做，除非用户重新要求正式采样/复测。
