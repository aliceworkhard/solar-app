# Next Agent Handoff

更新时间：2026-04-30 10:20 +08:00

## Read First

下一位 agent 接手时按这个顺序读：

1. `AGENTS.md`
2. `.agent/START_HERE.md`
3. `.agent/AI_CONTEXT.md`
4. 本文件：`.agent/handoffs/NEXT_AGENT_HANDOFF.md`
5. 最新 GitHub 交接：`.agent/handoffs/2026-04-30-Orchestrator-t033-github-handoff.md`
6. `todo.md`
7. 如果要改任何代码/协议/UI/Android/文档结构，读 `.agent/PLAN_FIRST_WORKFLOW.md` 和 `.codex/skills/plan-first-development/SKILL.md`
8. 按任务角色读取 `.agent/tasks/active/` 中的 task packet

不要默认读取 `.agent/logs/` 全量内容；需要历史时先读 `.agent/CHANGE_INDEX.md`。

## Current Repository State

- 分支：`main`
- 远端：`https://github.com/aliceworkhard/solar-app.git`
- 最新已推送：`0dcee6a feat: refine bottom navigation profile UI`
- 最新提交：
  - `0dcee6a feat: refine bottom navigation profile UI`
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
- 用户已确认电流显示规则通过。
- 用户已确认协议回传只有读状态和读参数；其他控制命令不用回传。
- 开/关按当前指令执行，是否能区分独立开机/关机仍待真机确认。
- T-025 已新增底部导航 `设备/场景/我的`；`场景` 是预留页，`我的` 是本地静态信息页。
- T-025 已压缩详情页顶部 spacing。
- T-025 已再做一版 vivo 状态栏渐变 native/window 兜底；是否真正显示到系统顶部状态栏仍需真机复验。
- T-026 已修正 `我的` 页密度：`我的设备` 在 320/360/390px 保持 1 行 3 项，`我的场景` 保持 1 行 4 项；新增文字、图标和底部导航已缩小。
- 最新可侧载 APK：`交付物/solar-remote-t026-sideload.apk`；英文路径副本：`C:\solar-apk\solar-remote-t026-sideload.apk`；SHA256 `901050A738DDF4C163439DEB550A8AEF7C799FBF6EA9483840F6F3E95B3EFDD0`；manifest 已确认无 `testOnly`。
- T-027 已重做 Android edge-to-edge/insets：`MainActivity` 使用 `WindowCompat.enableEdgeToEdge(window)`，删除旧 `SYSTEM_UI_FLAG_*` 路径，通过 `WindowInsetsCompat` 注入 CSS 变量，Web/CSS 分区处理 header/main/bottom TabBar。
- T-028 已重设计控制面板按钮：`开/关` 是主控制，`降低亮度 / 增加亮度` 是对称调节组，`读状态 / 读参数` 降级为低层级 `系统读取` 预留入口；5 个按钮 id/action 不变。
- T-029 已进一步强化 vivo / Capacitor WebView edge-to-edge：native window/decor/content/WebView 非黑背景、top/bottom system-bar paint fallback、DecorView insets 分发且不消费、native px 转 CSS px、Capacitor `SystemBars` 配置和 Web `--edge-*` 变量。
- T-030 已补齐 T-029 的 edge-to-edge 约束：确认 Capacitor `@capacitor/core/android/cli@8.3.1` 支持 `SystemBars`；删除 WebView no-op insets listener；DecorView listener 不消费且不覆盖 SystemBars parent listener；native paint fallback 放到 content 背后系统栏区域；Web 侧使用 raw px + density + WebView width 做 width-ratio fallback；CSS `--edge-*` 使用 max(native, system, safe-area, env)；`.shell` 左右宽度恢复基础档位，不再被普通 side gesture inset 压缩。
- T-031 Probe 已在 vivo 真机出现顶部青色、底部绿色，证明 native strip / edge-to-edge 路径可见。
- T-031 Final 已固定 `TRANSPARENT_EDGE_WITH_STRIPS`，关闭 `EDGE_PROBE_COLORS`，native strip 与 Web/CSS 背景统一为正式浅色，Web 默认 `edge-transparent`，`SystemBars.insetsHandling = "disable"` 继续由 native 主控。
- 最新正式 APK：`交付物/solar-remote-t031-sideload.apk`；英文路径副本：`C:\solar-apk\solar-remote-t031-sideload.apk`；SHA256 `2CE79E87FDDCE625B537417A91927046C86E4E4863B61EAF0180C3DE90025F3E`；manifest 已确认无 `testOnly`；`apksigner verify` 通过。
- T-032 已完成 UI 紧凑微调：关闭 header 伪背景层，home 状态提示改为无卡片文字行，`场景` 预留页不再显示空矩形；`设备/场景/我的/具体设备` 标题整体上移；bottom TabBar 保持 `bottom:0` 且内容更贴底；详情页默认点亮 `设备状态`，点击 `控制面板` 会切换选中态。
- 最新正式 APK：`交付物/solar-remote-t032-sideload.apk`；英文路径副本：`C:\solar-apk\solar-remote-t032-sideload.apk`；SHA256 `861A9E929C97F24E51A4D0B6F6ED93E60ABEFF7925290FA8135B8F1D060A82FA`；manifest 已确认无 `testOnly`；`apksigner verify` 通过。
- T-033 已完成 T032 后的轻微间距调整：标题 top 从模拟结果 34px 上移到 32px，bottom nav padding-bottom 从 20px 收到 18px，320/360px 左右 padding 从 10px 收到 8px，390px 从 12px 收到 10px；bottom nav 仍 `bottom:0`，详情默认 `设备状态` 未回退。
- 最新正式 APK：`交付物/solar-remote-t033-sideload.apk`；英文路径副本：`C:\solar-apk\solar-remote-t033-sideload.apk`；SHA256 `45AD1807CCD71BFFEFC964E7A77AF1E5FDA326AF439E1C17E51F303F6E621A4F`；manifest 已确认无 `testOnly`；`apksigner verify` 通过。

## Verification Baseline

最近一次 T-033 验证通过：

- `npm.cmd test -- src/app.test.ts`：39 tests passed
- `npm.cmd test`：5 files / 60 tests passed
- `npm.cmd run build`：passed
- `npm.cmd run sync`：passed
- 320/360/390px 本地 Chrome CDP 自动检查：T031 build id 出现在 DOM/window，header 伪背景层为 `display:none`，标题 top 为 32px，bottom nav 到底且 padding-bottom 为 18px，320/360px shell padding 为 8px，390px 为 10px，详情页默认 `设备状态` active
- `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`：BUILD SUCCESSFUL
- `aapt` manifest check：无 `testOnly`
- `apksigner verify --verbose`：Verifies

如果下一步只做文档，不需要重新跑 npm/Gradle。只要改代码、UI、BLE、协议或 Android，必须重新跑相关测试。

## Best Next Tasks

当前用户口径：`T-001` / `T-002` 先不做，任务保留。

保留任务：

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

- T-001 还没有正式 20 次 P50/P90 数据，目前只有用户真机可行性反馈；用户已要求先不做。
- T-002 还没有逐条 10 次命令复测记录，目前只知道 5 条 MVP 命令可行性良好；用户已要求先不做。
- 协议回传规则已确认：只有读状态和读参数回传；默认不要把普通命令改回等待回包。
- 开/关命令目前按 `0x0A` 指令执行，是否能区分独立开机/关机仍待真机确认。
- T-033 APK 等待 vivo 复验：顶部内容更靠上，底部 TabBar 更贴底，左右边距更合适，详情页默认点亮 `设备状态`。
- 详情页锚点滚动落点仍需真机确认；当前只增加默认/切换选中态，没有改变连续页面结构。

## Do Not Do

- 不要覆盖 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不要纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
- 不要把普通业务命令改成默认等待 BLE 回包。
- 不要把协议退回 `AA 55 + CRC16` 临时帧。
- 不要让 UI 直接解析原始 HEX；UI 只能通过 `DeviceController`。
- 不要让多个 agent 同时改 `deviceController.ts`。

## Suggested Prompt For Next Agent

请先读取 `AGENTS.md`、`.agent/START_HERE.md`、`.agent/AI_CONTEXT.md`、`.agent/handoffs/NEXT_AGENT_HANDOFF.md`、`todo.md`。然后选择 `.agent/tasks/active/` 中一个任务包执行。若要修改代码/协议/UI/Android/文档结构，必须先写 `.agent/plans/` 方案并等待用户确认。不要回滚用户改动，不要读取完整日志。
