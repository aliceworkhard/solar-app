# Handoff - Orchestrator Next Agent Project Snapshot

日期：2026-04-28
角色：Orchestrator / Docs Release

## Summary

当前项目已完成 Android BLE MVP 的通信跑通、两页 UI 多轮收敛、T-021/T-022 交互修正，并已推送到 GitHub `main`。

最新远端状态：

- 仓库：`https://github.com/aliceworkhard/solar-app.git`
- 分支：`main`
- 最新提交：`0dcee6a feat: refine bottom navigation profile UI`
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

2026-04-29 T-027 后补充：

- 已按 Android edge-to-edge 规范重做系统栏/insets：`MainActivity` 使用 `WindowCompat.enableEdgeToEdge(window)`，删除旧 `SYSTEM_UI_FLAG_*` 路径，不再靠 Activity 手动 system-bar color 作为主要适配。
- WebView 通过 `WindowInsetsCompat` 注入 `--system-top/right/bottom/left`；Web/CSS 改为 header、main、bottom TabBar 分区消费 inset，根 `.shell` 不再用整体 top/bottom padding 假装适配。
- T-027 验证通过：`npm.cmd test -- src/app.test.ts` 28 tests、`npm.cmd test` 5 files / 49 tests、`npm.cmd run build`、`npm.cmd run sync`、模拟 `top=32px/bottom=24px` Chrome layout check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`。
- 最新 APK：`交付物/solar-remote-t027-sideload.apk`；英文路径副本 `C:\solar-apk\solar-remote-t027-sideload.apk`；SHA256 `2AE9BD47820C954258277568CFB8EBD8DC4B37EE3F00CB4219E947AFE4242538`；manifest `NO_TEST_ONLY`，`apksigner verify` 通过。
- 仍需真机复验：Android 13/14 手势导航、Android 15 targetSdk 35+、三键导航。

2026-04-29 T-028 后补充：

- 已重设计控制面板按钮：`开/关` 为主控制，`降低亮度 / 增加亮度` 为对称调节组，`读状态 / 读参数` 降级为低层级 `系统读取` 预留入口。
- 5 个按钮 id/action 不变；BLE、协议 HEX、普通命令不等待回包策略、Android 原生文件和 `deviceController.ts` 均未修改。
- T-028 验证通过：`npm.cmd test -- src/app.test.ts` 29 tests、`npm.cmd test` 5 files / 50 tests、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP layout check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`。
- 最新 APK：`交付物/solar-remote-t028-sideload.apk`；英文路径副本 `C:\solar-apk\solar-remote-t028-sideload.apk`；SHA256 `BFA372E50425F0C5EA0B2054AB8D4A1FF521FD18C47F3F1994DA01A0740D95E7`；manifest 无 `testOnly`，`apksigner verify` 通过。

2026-04-29 T-029 后补充：

- 已基于 `docs/try.md` 进一步强化 vivo / Capacitor WebView edge-to-edge：native window/decor/content/WebView 非黑背景、top/bottom system-bar paint fallback、DecorView insets 分发且不消费、native px 转 CSS px、Capacitor `SystemBars` 配置和 Web `--edge-*` 变量。
- 没有修改 BLE、协议 HEX、普通命令不等待回包策略和 `deviceController.ts`。
- T-029 验证通过：`npm.cmd test -- src/app.test.ts` 30 tests、`npm.cmd test` 5 files / 51 tests、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP layout check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`。
- 最新 APK：`交付物/solar-remote-t029-sideload.apk`；英文路径副本 `C:\solar-apk\solar-remote-t029-sideload.apk`；SHA256 `B80987993290FCB80D267394E6F0DEF57B2DE72C0CAD79AB5E53AD2FFB69415C`；manifest 无 `testOnly`，`apksigner verify` 通过。

2026-04-29 T-030 后补充：

- 已补齐 T-029 后续要求：确认 Capacitor `@capacitor/core/android/cli@8.3.1` 支持 `SystemBars`；删除 WebView no-op insets listener，主监听保持 DecorView 且不消费；native top/bottom paint fallback 放到 content 背后系统栏区域；Debug-only 诊断色开关默认关闭。
- Web 侧改为接收 raw px、density、WebView width 并做 width-ratio fallback；CSS `--edge-*` 使用 max(native, system, safe-area, env)，bottom nav 保持 `bottom:0`。
- 用户反馈的左右内容压缩已处理：普通 side gesture inset 不再叠加到 `.shell` 左右 padding，主内容左右宽度恢复基础档位；只有真实横向 content-safe inset 会额外增加左右 padding。
- 没有修改 BLE、协议 HEX、普通命令不等待回包策略和 `deviceController.ts`。
- T-030 验证通过：`npm.cmd test -- src/app.test.ts` 33 tests、`npm.cmd test` 5 files / 54 tests、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP layout check、ratio fallback check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`。
- 最新 APK：`交付物/solar-remote-t030-sideload.apk`；英文路径副本 `C:\solar-apk\solar-remote-t030-sideload.apk`；SHA256 `1DAE6CF6146381F0348ED94660DE0D53E36EB330F9E6515F705554A33C75D0BC`；manifest 无 `testOnly`，`apksigner verify` 通过。

2026-04-29 T-031 后补充：

- 已按用户给出的 `Final System Bars Probe + Visual Fallback` 方向执行 Probe 阶段，用明显颜色先证明 vivo 真机上的系统栏控制链路，避免继续猜测 CSS/inset。
- Probe build id 固定为 `T031-system-bars-final`，native 日志 tag 为 `EdgeT031`，Web 会写入 `window.__edgeBuildId` 和 `document.documentElement.dataset.edgeBuild`。
- Debug-only Probe 颜色：status bar 黄色、navigation bar 洋红、顶部 foreground strip 青色、底部 foreground strip 绿色、Web DOM 诊断覆盖浅蓝。
- T031 Probe 阶段临时将 Capacitor `SystemBars.insetsHandling` 设为 `disable`，由 native 集中控制系统栏；最终是否恢复要看 vivo A/B/C/D 结果。
- 没有修改 BLE、协议 HEX、普通命令不等待回包策略和 `deviceController.ts`。
- T-031 Probe 验证通过：`npm.cmd test -- src/app.test.ts` 36 tests、`npm.cmd test` 5 files / 57 tests、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP layout check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、`aapt` 无 `testOnly`、`apksigner verify` 通过。
- 最新诊断 APK：`交付物/solar-remote-t031-probe.apk`；英文路径副本 `C:\solar-apk\solar-remote-t031-probe.apk`；SHA256 `1B27F2DC25FB55AB0A3831EA7E77A002F6C28127E806C960FD531239DE37F6E2`。
- 下一步必须由 vivo 真机返回 Probe 分类：A=黄/洋红可见，B=青/绿 strip 可见，C=仍纯黑但 UI fallback 有变化，D=无 `EdgeT031`/build id。

2026-04-29 T-031 Final 后补充：

- vivo 真机 Probe 已出现顶部青色、底部绿色，证明 native strip / edge-to-edge 路径可见，不再走深色 fallback。
- 已固定最终策略为 `TRANSPARENT_EDGE_WITH_STRIPS`，关闭 `EDGE_PROBE_COLORS`，top/bottom native strip、window/decor/content/WebView fallback 与 Web/CSS 背景统一为正式浅色。
- Web 默认 edge mode 为 `edge-transparent`；DOM overlay 默认为 `transparent`；`SystemBars.insetsHandling = "disable"` 继续由 native 主控。
- 没有修改 BLE、协议 HEX、普通命令不等待回包策略和 `deviceController.ts`。
- T-031 Final 验证通过：`npm.cmd test -- src/app.test.ts` 38 tests、`npm.cmd test` 5 files / 59 tests、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP final layout check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、`aapt` 无 `testOnly`、`apksigner verify` 通过。
- 最新正式 APK：`交付物/solar-remote-t031-sideload.apk`；英文路径副本 `C:\solar-apk\solar-remote-t031-sideload.apk`；SHA256 `2CE79E87FDDCE625B537417A91927046C86E4E4863B61EAF0180C3DE90025F3E`。
- 下一步安装 T-031 Final APK，确认顶部不再青色、底部不再绿色，状态栏/手势栏背后为正式浅色背景。

2026-04-29 T-032 后补充：

- 已按用户真机反馈做最后一轮 UI 微调：关闭标题区 header 伪背景层，home 状态提示改为无卡片文字行，`场景` 预留页不再显示空矩形。
- `设备 / 场景 / 我的 / 具体设备` 标题整体上移；bottom TabBar 保持 `bottom:0` 并让内容更贴底。
- 详情页锚点默认选中并点亮 `设备状态`，点击 `控制面板` 会切换选中态；仍保持连续页面 + 锚点滚动，不改回隐藏 tab。
- 没有修改 BLE、协议 HEX、普通命令不等待回包策略、Android native edge-to-edge 和 `deviceController.ts`。
- T-032 验证通过：`npm.cmd test -- src/app.test.ts` 39 tests、`npm.cmd test` 5 files / 60 tests、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP layout check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、`aapt` 无 `testOnly`、`apksigner verify` 通过。
- 最新正式 APK：`交付物/solar-remote-t032-sideload.apk`；英文路径副本 `C:\solar-apk\solar-remote-t032-sideload.apk`；SHA256 `861A9E929C97F24E51A4D0B6F6ED93E60ABEFF7925290FA8135B8F1D060A82FA`。
- 下一步安装 T-032 APK，确认标题下方矩形感、标题位置、底部 TabBar 贴底和详情默认 `设备状态` 选中态。

2026-04-30 T-033 后补充：

- 已按用户反馈在 T032 基础上做轻微间距微调：顶部标题/内容再上移一点，bottom TabBar 内容再下移一点，左右边距稍微放宽。
- 模拟 top inset 32px 时标题 top 从 T032 的 34px 上移到 32px；bottom nav padding-bottom 从 20px 收到 18px；320/360px shell padding 从 10px 收到 8px，390px 从 12px 收到 10px。
- 没有修改 BLE、协议 HEX、普通命令不等待回包策略、Android native edge-to-edge 和 `deviceController.ts`。
- T-033 验证通过：`npm.cmd test -- src/app.test.ts` 39 tests、`npm.cmd test` 5 files / 60 tests、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP layout check、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、`aapt` 无 `testOnly`、`apksigner verify` 通过。
- 最新正式 APK：`交付物/solar-remote-t033-sideload.apk`；英文路径副本 `C:\solar-apk\solar-remote-t033-sideload.apk`；SHA256 `45AD1807CCD71BFFEFC964E7A77AF1E5FDA326AF439E1C17E51F303F6E621A4F`。
- 下一步安装 T-033 APK，确认顶部/底部/左右间距观感。

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
- Debug APK 最近构建通过；最新正式侧载包为 T-033 APK。

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

3. `T-033` UI final visual check
   - 目标：安装 T-033 APK，确认顶部内容更靠上、底部 TabBar 更贴底、左右边距更合适、详情页默认点亮 `设备状态`。
   - 当前：正式 APK 已交付，等待真机视觉复验。

4. `T-010` 持续发现策略优化
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
