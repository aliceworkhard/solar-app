# Next Agent Handoff

更新时间：2026-04-28 18:25 +08:00

## Read First

下一位 agent 接手时按这个顺序读：

1. `AGENTS.md`
2. `.agent/START_HERE.md`
3. `.agent/AI_CONTEXT.md`
4. 本文件：`.agent/handoffs/NEXT_AGENT_HANDOFF.md`
5. `todo.md`
6. 如果要改任何代码/协议/UI/Android/文档结构，读 `.agent/PLAN_FIRST_WORKFLOW.md` 和 `.codex/skills/plan-first-development/SKILL.md`
7. 按任务角色读取 `.agent/tasks/active/` 中的 task packet

不要默认读取 `.agent/logs/` 全量内容；需要历史时先读 `.agent/CHANGE_INDEX.md`。

## Current Repository State

- 分支：`main`
- 远端：`https://github.com/aliceworkhard/solar-app.git`
- 最新已推送：`80c1208..b4d0333 main -> main`
- 最新提交：
  - `3ede780 feat: refine BLE UI anchors and current display`
  - `b4d0333 docs: record github backup for t022`
- 当前主工程：`项目文件/android-mvp-capacitor`
- Android debug APK 最近构建通过：`项目文件/android-mvp-capacitor/android/app/build/outputs/apk/debug/app-debug.apk`

## Current Product State

项目是 Android BLE 太阳能遥控器 MVP。

已完成的关键能力：

- BLE 已跑通：可扫描、连接、订阅 notify、写入、接收。
- 设备限定：当前 UI 只显示和连接 `AC632N_1`。
- UUID 默认：
  - Service：`0000FFF0-0000-1000-8000-00805F9B34FB`
  - Write：`0000FFF1-0000-1000-8000-00805F9B34FB`
  - Notify：`0000FFF2-0000-1000-8000-00805F9B34FB`
- 写入方式固定为 `write`。
- 普通业务命令不等待 BLE 回包；notify 到达后被动解析并更新 UI。
- 正式帧格式：`FF CE + LEN + DESC + CMD + SUB + DATA + 30 + SUM`。
- 读参数命令：`FF CE 06 00 0D 00 00 30 10`。
- 读状态命令：`FF CE 06 00 0E 00 00 30 11`。
- App 打开后会后台扫描 `AC632N_1`。
- `+ / X` 持续发现按钮已修复：点 `X` 会恢复 `+` 并忽略旧扫描回调。
- 断开连接后设备保留在列表下方，可重新连接。
- 控制页为连续布局：`设备状态` 在上，`控制面板` 在下，顶部按钮为锚点定位。
- ready 后每 5 秒非阻塞发送一次读状态。
- Live Status 电量按电池电压换算：`2.5V=0%`、`3.4V=100%`。
- Live Status 电流规则：亮度为 `0%` 时用回传 `loadCurrentAmp`；亮度非 0 时用 `power / 100 * 9.7272A`。

## Verification Baseline

最近一次 T-022 验证通过：

- `npm.cmd test -- src/app.test.ts`：25 tests passed
- `npm.cmd test`：5 files / 46 tests passed
- `npm.cmd run build`：passed
- `npm.cmd run sync`：passed
- `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug`：BUILD SUCCESSFUL

如果下一步只做文档，不需要重新跑 npm/Gradle。只要改代码、UI、BLE、协议或 Android，必须重新跑相关测试。

## Best Next Tasks

优先级建议：

1. `T-001`：补齐 20 次真机扫描/连接性能采样。
   - 任务包：`.agent/tasks/active/T-001-performance-sampling.md`
   - 写入范围：`项目文件/通信参数确认表.md`、`.agent/reports/`、`todo.md`、`.agent/logs/`
   - 不改 UI、协议和 Android 原生代码。

2. `T-002`：复测 5 条 MVP 命令。
   - 任务包：`.agent/tasks/active/T-002-command-retest.md`
   - 写入范围：`项目文件/最小命令集表.md`、`项目文件/通信参数确认表.md`、`.agent/reports/`、`todo.md`、`.agent/logs/`
   - 不改 UI、BLE 原生插件和 `deviceController.ts`，除非 Orchestrator 明确分配。

3. `T-010`：基于真机结果优化持续发现策略。
   - 只能在 T-001/T-009 有真实数据后做。
   - 涉及 `src/app.ts` / `deviceController.ts` 时必须先写方案并等待确认。

## Open Risks

- T-001 还没有正式 20 次 P50/P90 数据，目前只有用户真机可行性反馈。
- T-002 还没有逐条 10 次命令复测记录，目前只知道 5 条 MVP 命令可行性良好。
- 哪些特定指令稳定 notify 仍需真机日志确认；默认不要把普通命令改回等待回包。
- 开/关命令目前是单一 `0x0A` 控制命令，是否能区分独立开机/关机仍待真机确认。
- vivo/Android 状态栏渐变效果需要真机视觉确认，代码已尽量做透明 status bar / WebView。

## Do Not Do

- 不要覆盖 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不要纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
- 不要把普通业务命令改成默认等待 BLE 回包。
- 不要把协议退回 `AA 55 + CRC16` 临时帧。
- 不要让 UI 直接解析原始 HEX；UI 只能通过 `DeviceController`。
- 不要让多个 agent 同时改 `deviceController.ts`。

## Suggested Prompt For Next Agent

请先读取 `AGENTS.md`、`.agent/START_HERE.md`、`.agent/AI_CONTEXT.md`、`.agent/handoffs/NEXT_AGENT_HANDOFF.md`、`todo.md`。然后选择 `.agent/tasks/active/` 中一个任务包执行。若要修改代码/协议/UI/Android/文档结构，必须先写 `.agent/plans/` 方案并等待用户确认。不要回滚用户改动，不要读取完整日志。
