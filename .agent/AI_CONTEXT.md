# AI Context

更新时间：2026-04-28

## Project Purpose

本项目是一个太阳能遥控器 Android MVP，当前目标是先把 BLE 通信和真实协议闭环跑稳，再收敛 2 页业务 UI。

## Current Scope

- 平台：Android 优先，iOS 暂不进入实施。
- 技术路线：Capacitor + TypeScript + Android 原生 BLE 插件。
- 主工程：`项目文件/android-mvp-capacitor`。
- 当前 UI 范围：设备首页 + 设备详情控制页，调试台保留但默认作为联调工具。

## Current BLE Facts

- 设备名前缀：`AC632N`。
- Service UUID：`0000FFF0-0000-1000-8000-00805F9B34FB`。
- Write UUID：`0000FFF1-0000-1000-8000-00805F9B34FB`。
- Notify UUID：`0000FFF2-0000-1000-8000-00805F9B34FB`。
- 写入方式：固定 `write`。
- 普通业务命令：只确认写入成功，不等待 BLE 回包。
- Notify：如果设备主动返回数据，则被动解析并更新 UI 状态。
- 正式 RF 控制帧：`FF CE + LEN + DESC + CMD + SUB + DATA + 30 + SUM`。
- 读参数命令：`FF CE 06 00 0D 00 00 30 10`。
- 读状态命令：`FF CE 06 00 0E 00 00 30 11`。

## Current Architecture

- `src/app.ts`：2 页 UI、调试台、设备列表、控制按钮、日志展示。
- `src/ble/bleBridge.ts`：Capacitor BLE JS 接口封装。
- `android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`：Android 原生扫描、连接、发现服务、订阅、写入。
- `src/device/deviceController.ts`：UI 唯一业务入口，负责扫描、连接、命令发送和状态更新。
- `src/protocol/commandBuilder.ts`：`CommandDefinition` 与 5 条 MVP 命令。
- `src/protocol/frameCodec.ts`：RF 协议编码、收包缓冲、切帧、累加和校验。
- `src/protocol/responseParser.ts`：notify 解析与状态字段提取。

## Current Verification State

- `npm.cmd test`：最近一次通过，5 个测试文件、48 个测试通过。
- T-003 响应等待策略：5 条 MVP 命令默认不等待回包；显式 `waitForResponse=true` 路径已补单测，写入失败会清理 pending 后重试。
- T-004 两页业务 UI：主页扫描/快连/连接反馈可见，控制页 5 个 RF 命令一一映射到 `DeviceController`，调试台隐藏保留。
- T-002 前置接入：App 面向方法已锁定 5 条最小命令集 HEX，并有 `CommandBuilder` 与 `DeviceController` 写入链路测试覆盖。
- T-009 持续发现：扫描按钮可开始/停止，默认每 5 秒补扫；列表按 MAC/deviceId 区分同名设备，新设备追加，已连接设备不清除。
- T-012 读状态可读化：`E1` 回传会解析工作时长、亮度、电池电压、电池电流、太阳能电压；电池 UI 单位为 `V`，电流为 `A`，太阳能电压为 `V`，短包不会更新业务状态。
- T-001/T-002 可行性冒烟测试：用户使用 vivo X300 Pro 测试，设备连接、发送、接收和 5 条 MVP 命令执行均未发现传输错误；该结论不是完整 20 次/P50/P90 或逐条 10 次验收。
- `npm.cmd run build`：最近一次通过。
- Gradle 终端构建：可用 Android Studio JBR 临时设置 `JAVA_HOME` 后执行 `:app:assembleDebug`；最近一次通过。
- Android 真机：BLE 已能发送和接收；正式量化采样和命令逐次复测记录仍需后补。
- 2026-04-28 接手后用户确认：T-001/T-002 先不做，任务保留；协议回传只有读状态和读参数，其他控制命令不用回传；开/关按当前指令执行，能否区分独立开机/关机仍待真机确认；状态栏渐变真机未通过，是否再改等用户后续决定；详情页锚点可能要改但等待用户信息；电流显示规则已通过。
- T-025 UI：底部导航 `设备/场景/我的` 已加入；`场景` 为预留页；`我的` 为静态信息页；详情页顶部更紧凑；Android 增加 native/window 渐变兜底；测试、build、sync、debug APK 构建通过，状态栏效果仍需 vivo 真机复验。
- T-026 UI：`我的设备` 与 `我的场景` 已改为窄屏单行并排、短标签和更小字号；底部导航更紧凑并使用 safe-area spacing；320/360/390px 本地浏览器检查通过；已导出非 `testOnly` APK。

## Working Rules

1. 每次开始任务时先读 `AGENTS.md` 和 `.agent/START_HERE.md`。
2. 再读本文件和根目录 `todo.md`。
3. 多 agent 任务还要读 `.agent/agents/ROLES.md`、`.agent/OWNERSHIP.md` 和对应 task packet。
4. 不要默认读取完整日志；需要历史时先读 `.agent/CHANGE_INDEX.md`。
5. 完成一次有价值的修改后，新增 `.agent/logs/YYYY-MM-DD-session-N.md`。
6. TODO 只保留当前行动项；已完成或废弃内容归档到 `.agent/archive/`。
7. 重大技术取舍写入 `.agent/decisions/`。
8. 跨 agent 交接写入 `.agent/handoffs/`。
9. 不要把 Git diff、完整日志或长流水账塞回 `todo.md`。
10. 不要把 `项目文件/android-mvp-capacitor/android/.idea/` 纳入 Git 备份，除非用户明确要求。

## Multi-Agent Coordination

- Orchestrator：拆任务、分配写入边界、合并结果、维护上下文。
- BLE Agent：负责 Android BLE 桥接、扫描连接性能、权限与异常。
- Protocol Agent：负责命令、CRC、帧解析、回包规则和协议文档。
- UI Agent：负责 2 页 UI 和交互反馈，不直接解析 HEX。
- QA Agent：负责测试、真机验收、性能数据和回归报告。
- Docs Release Agent：负责文档、日志、上传记录和交付说明。

并行开发时必须遵守 `.agent/OWNERSHIP.md`，特别是 `deviceController.ts` 不能多人并行修改。

## T-011 UI Convergence Baseline

- Date: 2026-04-27.
- Scope: UI-only convergence for the two-page MVP; BLE, protocol, and `deviceController.ts` were not modified.
- Result: device home page and control page are now real DOM UI, not full-page screenshot backgrounds.
- Asset: `public/assets/ui/mppt_gray_black_controller_transparent.png` inside the Android MVP Capacitor project.
- Commands retained: read status, read params, power toggle, brightness up, brightness down.
- Debug console remains hidden and is still available through the existing hidden tap flow.
- Verification: `npm.cmd test` passed 5 files / 28 tests; `npm.cmd run build` passed; Chrome CDP 390px checks showed `scrollWidth=390` for both home and control visual states.

## T-015 Target Device Flow Baseline

- Date: 2026-04-27.
- Target BLE name locked to `AC632N_1`; other scanned devices are filtered before display/connect.
- Scan flow can auto-connect the target device after discovery.
- After successful connect, the app sends one `readStatus` command through the existing non-blocking command path.
- Returning to the nearby-device page and tapping the already connected target opens the control page instead of reconnecting.
- Verification: `npm.cmd test` passed 5 files / 31 tests; `npm.cmd run build` passed.


## T-016 UI Reference Realignment Baseline

- Date: 2026-04-28.
- Scope: UI-only second pass to better match `01_device_home_page.png`, `02_device_detail_control_page.png`, and `HTML参考/app.html`.
- Result: home page now follows the reference-style title/search/device-card/status overview structure; control page now follows the reference-style top bar, segmented tabs, device detail card, telemetry grid, mode selector, and control panel.
- Preserved behavior: only `AC632N_1` is displayed/connectable; auto-connect, connect-success read-status send, connected-card navigation, hidden debug console, and five MVP command calls remain unchanged.
- Verification: TDD red check failed before implementation; `npm.cmd test -- src/app.test.ts` passed 11 tests; `npm.cmd test` passed 5 files / 32 tests; `npm.cmd run build` passed; Chrome CDP 390px checks reported `scrollWidth=390` for both home and control states.
- Screenshots: `.agent/reports/screenshots/T-016-home-mobile-390x900-cdp.png`, `.agent/reports/screenshots/T-016-control-mobile-390x900-cdp.png`.

## T-017 UI Navigation And Compact Layout Baseline

- Date: 2026-04-28.
- Scope: UI/navigation-only bugfix after T-016 real-device feedback.
- Behavior changed: homepage `刷新` now only refreshes the nearby-device list and never opens the previous connected device detail page by itself.
- Back behavior: entering the control page pushes WebView history; Android/system Back returns to the homepage before allowing app exit.
- Removed placeholders: in-app mock phone status bar, control-page three-dot menu placeholder, and default “等待操作” feedback card.
- Visual density: homepage device cards and control-page device status cards are more compact; the global typography scale is reduced.
- Preserved behavior: `AC632N_1` whitelist, scan auto-connect path, connect-success `readStatus` send, connected-card detail navigation, hidden debug console, and five MVP command calls remain unchanged.
- Verification: TDD red check failed before implementation; `npm.cmd test -- src/app.test.ts` passed 14 tests; `npm.cmd test` passed 5 files / 35 tests; `npm.cmd run build` passed; Chrome 430px homepage screenshot was captured.
- Screenshot: `.agent/reports/screenshots/2026-04-28-t017-home.png`.

## T-018 Android Back Dispatch And Live Status Baseline

- Date: 2026-04-28.
- Scope: Android native back bridge plus UI status-card refinement.
- Native back: `MainActivity.java` now intercepts Android back via `OnBackPressedCallback`, calls `window.solarRemoteHandleNativeBack()` in the WebView, consumes the event when JS returns `handled`, and exits when JS returns `exit`.
- JS back: control-page native back returns to homepage; homepage native back allows app exit.
- Control page: read-status area now uses a Live Status card pattern based on the user screenshot and `HTML参考/app.html`.
- Data honesty: unavailable protocol fields such as battery percentage, morning time, and lights-off time display `-`; they are not fabricated as `100%`, `06:00`, or `07:00`.
- Nearby device cards: each card now has 2x2 metrics for current mode, battery voltage, solar voltage, and brightness; only the active connected target shows real status values.
- Verification: TDD red check failed before implementation; `npm.cmd test -- src/app.test.ts` passed 17 tests; `npm.cmd test` passed 5 files / 38 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; temporary Android Studio JBR Gradle `:app:compileDebugJavaWithJavac` and `:app:assembleDebug` passed.
- Screenshot: `.agent/reports/screenshots/2026-04-28-t018-home.png`.
- Pending real-phone check: confirm vivo right-edge/system back gesture now returns from control page to homepage.

## Current Open Problems

- T-001 20 次扫描/连接性能采样未补齐；当前只有可行性通过结论；用户已要求先不做、任务保留。
- T-002 5 条 MVP 命令逐次复测数据未补齐；当前只有可行性通过结论；用户已要求先不做、任务保留。
- T-009 持续发现仍需真机验证补扫间隔、过期时间和进入控制页后的低频保活策略。
- 协议回传口径已由用户确认：只有读状态和读参数需要关注回传，其他控制命令不用回传；程序默认不等待，仅允许显式标记命令等待。
- 开/关命令按当前 `0x0A` 指令执行，是否能区分独立开机/关机仍待真机确认。
- vivo/Android 状态栏渐变已在 T-025 再试一版 native/window 背景兜底；是否真正进入系统顶部状态栏区域仍需真机复验。
- T-026 已针对底部导航和 profile 页面密度再改一版；仍需 vivo 真机视觉确认底栏是否避开系统导航区域、顶部是否无重叠。
- 详情页顶部间距已在 T-025 压缩；锚点滚动是否还需改等待真机反馈。
- Debug APK 可通过临时设置 Android Studio JBR `JAVA_HOME` 验证；如需全局常规命令仍可后续配置环境变量。
- 多 agent 框架已建立，但还未经过一次真实多人协作演练。

## Skill Baseline

- 2026-04-27 installed additional global skills: `kb-retriever`, `web-design-engineer`, `gpt-image-2`, `requesting-code-review`, `receiving-code-review`, `security-best-practices`.
- `gpt-image-2` is the preferred image prompt/workflow skill for this project, but system `.system/imagegen` remains installed as the host image tool entry.

## Feasibility Smoke Test Baseline

- 测试日期：2026-04-27。
- 测试手机：vivo X300 Pro。
- 型号：V2502A。
- Android：16。
- 硬件版本：MP_0.1。
- 软件版本：PD2502B_A_16.0.25.5.W10.V000L1。
- 结论：T-001/T-002 可行性良好，连接、收发和 5 条 MVP 命令执行没有一次出错。
- 记录文件：`.agent/reports/2026-04-27-feasibility-smoke-test.md`。
- 正式补测模板：`.agent/reports/templates/`。

## T-019 UI Card Cleanup And Status Polling Baseline

- Date: 2026-04-28.
- Scope: UI/App-layer refinement only; BLE native, protocol HEX, and `deviceController.ts` command semantics were not changed.
- Home page: removed the full current-device summary card; nearby device card is now the primary device surface.
- Nearby device cards: RSSI is shown on the right; mode, battery voltage, solar voltage, and brightness are shown as compact inline label/value metrics without boxed 2x2 cards.
- Connected card action: left swipe opens a `取消连接` action; tapping a non-swiped connected card still opens the control page.
- Control page: Live Status now displays battery voltage instead of battery remaining, mode instead of morning time, solar voltage instead of lights-off time, and no longer shows firmware.
- Mode buttons: radar/time/average buttons moved to the top of the control panel.
- Status polling: after ready, App sends non-blocking `readStatus` every 5 seconds; polling skips while a poll is already in flight or connection is not ready.
- Verification: TDD red check failed first as expected; `npm.cmd test -- src/app.test.ts` passed 19 tests; `npm.cmd test` passed 5 files / 40 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; temporary Android Studio JBR `:app:assembleDebug` passed.
- Pending real-phone check: confirm swipe-left disconnect behavior and confirm logs show one read-status TX every 5 seconds after ready.

## T-020 Home Scan, Swipe, Battery Percent Baseline

- Date: 2026-04-28.
- Scope: UI/App-layer refinement only; BLE native, protocol HEX, Android native, and `deviceController.ts` were not changed.
- Home page: removed the whole “准备搜索附近设备” scan preparation card.
- Manual refresh/search: changed to a non-blocking background scan flow at the App layer; UI returns immediately, scan progress updates the device list, and target discovery can still auto-connect.
- Connected nearby card: static state is fully opaque white so the hidden disconnect action is not visible until the card is swiped.
- Swipe disconnect: red action now has four rounded corners, smoother easing, and pointer-drag feedback before release.
- Live Status: lower third chip now shows battery percentage instead of refresh time; percentage is calculated from `batteryVoltage` by `2.5V=0%`, `3.4V=100%`, clamped to `0-100%`.
- Verification: TDD red check failed first as expected; `npm.cmd test -- src/app.test.ts` passed 21 tests; `npm.cmd test` passed 5 files / 42 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; temporary Android Studio JBR `:app:assembleDebug` passed.
- Pending real-phone check: verify no scan preparation card, connected card does not show the red action until swiped, swipe animation feels acceptable, battery percentage matches the displayed voltage, and refresh does not visibly block the page.

## T-021 Auto Scan, Nonblocking BLE UI, Edge Status Bar, Control Tabs Baseline

- Date: 2026-04-28.
- Scope: App/UI-layer refinement plus Android status bar presentation; BLE native plugin, protocol HEX, and `deviceController.ts` command semantics were not changed.
- Startup discovery: `App.start()` now schedules a non-blocking initial background scan for `AC632N_1` after first render.
- Nonblocking discovery: continuous discovery `+` starts without awaiting the first scan round; scan/connect operation tokens ignore stale callbacks after disconnect or newer operations.
- Disconnect behavior: a manually disconnected device remains visible as connectable and is demoted below other connectable scan results; auto-connect skips the recently disconnected device until the user taps it or a new connect path clears the marker.
- Detail entry: tapping the active device during `connecting/discovering/subscribing/ready` opens the detail page instead of triggering duplicate connect; the initial read-status send after ready is fire-and-forget and does not block page entry.
- Detail page: `设备状态 / 控制面板` are real tabs; default tab is `设备状态`; `控制面板` shows command buttons above the read-only mode strip.
- Android status bar: `MainActivity.java` enables transparent status bar / edge-to-edge so the app gradient extends behind system time/signal/battery; CSS keeps a conservative top safe area.
- Verification: TDD red check failed first as expected; `npm.cmd test -- src/app.test.ts` passed 23 tests; `npm.cmd test` passed 5 files / 44 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; temporary Android Studio JBR `:app:assembleDebug` passed.
- Pending real-phone check: confirm cold-start auto-scan, `+`/refresh/disconnect-search no visible freeze, disconnected device remains at bottom as connectable, tabs switch correctly, and the vivo status bar uses the app gradient without overlapping the title.

## T-022 UI Scan Stop, Status Bar, Anchor Sections, Current Rule Baseline

- Date: 2026-04-28.
- Scope: App/UI refinement plus Android status-bar theme hardening; BLE native plugin, protocol HEX, and `deviceController.ts` command semantics were not changed.
- Continuous discovery: `+ / X` control state is now resolved through a helper; pressing `X` immediately clears App-layer continuous discovery, invalidates stale scan callbacks, and restores `+`.
- Detail page: `设备状态` and `控制面板` are no longer hidden tabs; both sections render continuously, and the top buttons scroll to the target section.
- Current display: when `power` is `0`, Live Status uses returned `loadCurrentAmp`; when `power` is nonzero, it displays `(power / 100) * 9.7272A`, rounded to 2 decimals.
- Android status bar: `MainActivity.java` now sets runtime no-actionbar theme, transparent decor/WebView/status/navigation bars, and theme XML includes transparent system-bar settings.
- Verification: TDD red check failed first as expected; `npm.cmd test -- src/app.test.ts` passed 25 tests; `npm.cmd test` passed 5 files / 46 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; temporary Android Studio JBR `:app:assembleDebug` passed.
- Pending real-phone check: confirm `+` then `X` stops visual continuous discovery, status bar shows gradient on vivo, anchor buttons scroll to the right section, and current display matches brightness.

## T-025 Bottom Navigation And Status Bar Retry Baseline

- Date: 2026-04-28.
- Scope: App/UI refinement plus Android status-bar background fallback; BLE native plugin behavior, protocol HEX, and `deviceController.ts` command semantics were not changed.
- UI: added bottom navigation with `设备 / 场景 / 我的`; `场景` is a reserved blank page; `我的` is a static profile/settings page based on `04_profile_settings_page.png`.
- Detail page: reduced top padding/header/tab spacing so the device name and status cards sit higher.
- Android: added `status_bar_gradient.xml` and applies it to the native window/decor background while preserving transparent system bars and WebView transparency.
- Verification: `npm.cmd test -- src/app.test.ts` passed 26 tests; `npm.cmd test` passed 5 files / 47 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; JBR `:app:assembleDebug` passed; 390px local browser check reported no horizontal overflow for device/profile/scene.
- Pending real-phone check: confirm vivo status bar gradient, compact detail spacing, and bottom navigation usability.

## T-026 Profile Density And Safe Bottom Navigation Baseline

- Date: 2026-04-28.
- Scope: App/UI density and safe-area refinement only; BLE native behavior, protocol HEX, normal-command response waiting, and `deviceController.ts` were not changed.
- Profile page: `我的设备` now uses compact labels `在线 / 可连 / 离线` and stays as one row with three items on 320/360/390px widths.
- Profile page: `我的场景` now uses compact labels `夜间 / 日常 / 节能 / 高亮` and stays as one row with four items on 320/360/390px widths.
- Bottom navigation: reduced icon/text/item sizes and uses dedicated `--safe-bottom` / `--bottom-nav-space` CSS variables; local browser check reports nav height about 57px when safe-area bottom is 0.
- Verification: TDD red check failed first as expected; `npm.cmd test -- src/app.test.ts` passed 27 tests; `npm.cmd test` passed 5 files / 48 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; local Chrome layout check passed at 320/360/390px with no horizontal overflow; JBR `:app:assembleDebug --project-prop android.injected.testOnly=false` passed.
- Delivery: `交付物/solar-remote-t026-sideload.apk` and `C:\solar-apk\solar-remote-t026-sideload.apk`; SHA256 `901050A738DDF4C163439DEB550A8AEF7C799FBF6EA9483840F6F3E95B3EFDD0`; manifest check reports `NO_TEST_ONLY`; `apksigner verify --verbose` verifies.
- Pending real-phone check: confirm the compact bottom tab bar avoids vivo system navigation interference and the top area has no status-bar overlap.
