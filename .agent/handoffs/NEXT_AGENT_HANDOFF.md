# Next Agent Handoff

更新时间：2026-04-30 20:20 +08:00

## Read First

下一位 agent 接手时按这个顺序读：

1. `AGENTS.md`
2. `.agent/START_HERE.md`
3. `.agent/AI_CONTEXT.md`
4. `todo.md`
5. 本文件：`.agent/handoffs/NEXT_AGENT_HANDOFF.md`
6. 最新 GitHub 交接：`.agent/handoffs/2026-04-30-Orchestrator-t041-github-handoff.md`
7. 如果要改任何代码、协议、UI、Android 原生、构建、发布或文档结构，读 `.agent/PLAN_FIRST_WORKFLOW.md` 和 `.codex/skills/plan-first-development/SKILL.md`
8. 按任务角色读取 `.agent/tasks/active/` 中的 task packet

不要默认读取 `.agent/logs/` 全量内容；需要历史时先读 `.agent/CHANGE_INDEX.md`。

## Current Repository State

- 分支：`main`
- 远端：`https://github.com/aliceworkhard/solar-app.git`
- 最新本地提交在本交接生成后应已推送到 GitHub。
- 主工程：`项目文件/android-mvp-capacitor`
- 最新正式交付 APK 仍为 T033：
  - `交付物/solar-remote-t033-sideload.apk`
  - `C:\solar-apk\solar-remote-t033-sideload.apk`
  - SHA256 `45AD1807CCD71BFFEFC964E7A77AF1E5FDA326AF439E1C17E51F303F6E621A4F`
- T034-T041 未导出新的 sideload APK；只验证 debug APK。

## Current Product State

项目是 Android BLE 太阳能遥控器 MVP。当前重点是保留已跑通的 BLE/协议链路，围绕真机反馈继续做小步收敛。

关键事实：

- BLE 已跑通：扫描、连接、发现服务、订阅 notify、写入、接收均可用。
- UUID 默认：
  - Service：`0000FFF0-0000-1000-8000-00805F9B34FB`
  - Write：`0000FFF1-0000-1000-8000-00805F9B34FB`
  - Notify：`0000FFF2-0000-1000-8000-00805F9B34FB`
- 写入方式固定为 `write`。
- 普通业务命令不等待 BLE 回包；只有 `读状态` / `读参数` 的 notify 需要解析并被动同步 UI。
- 正式帧格式：`FF CE + LEN + DESC + CMD + SUB + DATA + 30 + SUM`。
- 不允许退回 `AA55` 临时帧。
- UI 不直接解析 HEX，只能消费 typed 状态/参数模型。
- 支持设备名：`AC632N_1`、`AC632N-1`、`M3240-G`、`N3230-U`；当前都按同一设备控制路径处理。
- 当前仍是单 active BLE 连接；多设备并连和 2.4G 替代链路只作为 T040 评估项，不要直接实现。

## Recent Completed Work

- T034：接入 `B1 MODE=01` 时控模式整包写入与读参数同步。
- T035：按用户真机帧和供应商样例修正时控真实字段，`MODE=01` 29 字节整包一次发送。
- T036：模式条上移、删除 `参数整包写入` 文案、最大输出改百分比、时段改 1-15 档且每档 30 分钟。
- T037：时控模式 UI 强化，时段/时长/功率联动卡片，时控写入 400ms trailing debounce。
- T038：短文案收敛，Live Status 显示 `时控模式` / `时控`，时段档位和小时上下结构。
- T039：防误触、扩展支持设备名、连接后 `读状态` + `读参数` 初始同步、后台发现与设备列表保留。
- T041：设备状态页快速滑动性能优化；状态刷新合并到 `requestAnimationFrame`，非 home 页不重建隐藏设备列表，设备列表 render signature 去重，时控编辑器刷新条件收窄；quiet background discovery 改为约 3 秒调度一轮，scan window 为 quick 800ms / full 1200ms。

## Latest Verification

T041 最近验证通过：

- TDD red observed：`npm.cmd test -- src/app.test.ts` 4 expected failures。
- `npm.cmd test -- src/app.test.ts`：51 passed。
- `npm.cmd test`：6 files / 84 passed。
- `npm.cmd run build`：passed。
- `npm.cmd run sync`：passed。
- Android Studio JBR `gradlew.bat assembleDebug --project-prop android.injected.testOnly=false`：BUILD SUCCESSFUL。
- `aapt dump badging app/build/outputs/apk/debug/app-debug.apk`：package output present，no `testOnly`。
- `apksigner verify --verbose app/build/outputs/apk/debug/app-debug.apk`：Verifies，v2 true，1 signer。
- Chrome CDP 320/360/390px control-page rapid-scroll smoke：passed，无横向溢出，无 runtime exception / console error。

## Current Open Problems

- T001/T002 用户明确要求先不做，任务保留。
- T010 只有拿到真机数据后再优化持续发现策略。
- T040 多设备并连与 2.4G 替代链路只完成任务拆分，尚未评估/实施。
- 详情页锚点滚动落点可能后续要调，等待用户真机信息。
- 开/关是否能区分独立开机/关机仍待真机确认。
- T041 后仍需 vivo 真机确认：设备状态页快速上下滑动是否还卡顿；后台约 3 秒轻扫是否稳定；读参数回包是否仍同步到全部时控控件。
- 本地仍可能有用户保留的协议 Excel 修改和旧 APK 文件，不要误提交。

## Do Not Do

- 不要覆盖 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不要纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
- 不要把普通业务命令改成默认等待 BLE 回包。
- 不要把协议退回 `AA55` 临时帧。
- 不要让 UI 直接解析原始 HEX。
- 不要多人同时改 `deviceController.ts`。
- 不要凭感觉继续调 UI / BLE 参数；先拿真机反馈或写方案。

## Suggested Prompt For Next Agent

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

- T034-T041 已完成源码/文档更新并推送到 GitHub。
- 当前时控模式使用 `B1 MODE=01` 29 字节整包一次发送；读参数回包同步到 typed 控件。
- 普通控制命令仍不等待回包。
- 支持设备名：`AC632N_1`、`AC632N-1`、`M3240-G`、`N3230-U`。
- 连接 ready 后会非阻塞发送一次 `读状态` 和 `读参数`。
- 设备状态页已做 T041 性能优化：后台扫描约 3 秒轻扫一轮，隐藏设备列表不重建，状态刷新合并。
- 最新正式 APK 仍是 T033，不是 T041。

建议下一步：

- 如果用户要验证体验，优先让用户真机安装现有 debug 构建或请求导出新 sideload APK。
- 真机重点看 T041：设备状态页快速滑动是否还卡顿、后台扫描是否稳定、连接后自动 `读状态/读参数` 是否同步。
- 如果用户要继续开发，先写方案，尤其是 T040 多设备/2.4G、T010 持续发现策略或详情页锚点调整。
