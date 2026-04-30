# AI Context

更新时间：2026-04-30

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

- `npm.cmd test`：最近一次通过，6 个测试文件、80 个测试通过。
- T-003 响应等待策略：5 条 MVP 命令默认不等待回包；显式 `waitForResponse=true` 路径已补单测，写入失败会清理 pending 后重试。
- T-004 两页业务 UI：主页扫描/快连/连接反馈可见，控制页 5 个 RF 命令一一映射到 `DeviceController`，调试台隐藏保留。
- T-002 前置接入：App 面向方法已锁定 5 条最小命令集 HEX，并有 `CommandBuilder` 与 `DeviceController` 写入链路测试覆盖。
- T-009 持续发现：扫描按钮可开始/停止，默认每 5 秒补扫；列表按 MAC/deviceId 区分同名设备，新设备追加，已连接设备不清除。
- T-012 读状态可读化：`E1` 回传会解析工作时长、亮度、电池电压、电池电流、太阳能电压；电池 UI 单位为 `V`，电流为 `A`，太阳能电压为 `V`，短包不会更新业务状态。
- T-001/T-002 可行性冒烟测试：用户使用 vivo X300 Pro 测试，设备连接、发送、接收和 5 条 MVP 命令执行均未发现传输错误；该结论不是完整 20 次/P50/P90 或逐条 10 次验收。
- `npm.cmd run build`：最近一次通过。
- `npm.cmd run sync`：最近一次通过。
- Gradle 终端构建：可用 Android Studio JBR 临时设置 `JAVA_HOME` 后执行 `:app:assembleDebug`；最近一次通过。
- Android 真机：BLE 已能发送和接收；正式量化采样和命令逐次复测记录仍需后补。
- 2026-04-28 接手后用户确认：T-001/T-002 先不做，任务保留；协议回传只有读状态和读参数，其他控制命令不用回传；开/关按当前指令执行，能否区分独立开机/关机仍待真机确认；状态栏渐变真机未通过，是否再改等用户后续决定；详情页锚点可能要改但等待用户信息；电流显示规则已通过。
- T-025 UI：底部导航 `设备/场景/我的` 已加入；`场景` 为预留页；`我的` 为静态信息页；详情页顶部更紧凑；Android 增加 native/window 渐变兜底；测试、build、sync、debug APK 构建通过，状态栏效果仍需 vivo 真机复验。
- T-026 UI：`我的设备` 与 `我的场景` 已改为窄屏单行并排、短标签和更小字号；底部导航更紧凑并使用 safe-area spacing；320/360/390px 本地浏览器检查通过；已导出非 `testOnly` APK。
- T-027 Android edge-to-edge：原生入口改为 `WindowCompat.enableEdgeToEdge(window)` + `WindowInsetsCompat` 注入 CSS 变量，删除旧 `SYSTEM_UI_FLAG_*` 分支；Web/CSS 改为 header/main/bottom tab 分区消费 inset；本地模拟 inset 检查、build、APK 校验通过；真机手势/三键导航仍需复验。
- T-028 控制面板按钮：`开/关` 已成为主控制，`降低亮度 / 增加亮度` 为对称调节组，`读状态 / 读参数` 已降级为低层级系统读取预留入口；5 个按钮 id/action 不变，BLE、协议和 `deviceController.ts` 未改。
- T-029 vivo / Capacitor WebView edge-to-edge hardening：在 T-027 基础上增加 native 非黑背景兜底、top/bottom system-bar paint fallback、DecorView insets 分发、native px -> CSS px 注入、Capacitor `SystemBars` 配置和 Web `--edge-*` 变量；本地 Chrome 320/360/390px 检查、build、APK 校验通过；vivo 手势/三键导航仍需真机复验。
- T-030 edge-to-edge 补充加固：确认 Capacitor `@capacitor/core/android/cli@8.3.1` 支持 SystemBars 后保留配置；删除 WebView no-op insets listener，避免覆盖 Capacitor SystemBars parent listener；native paint fallback 改为 content 背后系统栏区域；raw px + density + WebView 宽度注入 Web，Web 侧增加 width-ratio fallback；CSS `--edge-*` 使用 max(native, system, safe-area, env)；`.shell` 左右间距恢复基础档位，不再被普通 side gesture inset 压缩；本地 Chrome 320/360/390px 检查、build、sync、APK 校验通过；最新 APK 为 `交付物/solar-remote-t030-sideload.apk` / `C:\solar-apk\solar-remote-t030-sideload.apk`，SHA256 `1DAE6CF6146381F0348ED94660DE0D53E36EB330F9E6515F705554A33C75D0BC`。
- T-031 Final：vivo 真机 Probe 已出现顶部青色、底部绿色，证明 native strip / edge-to-edge 路径可见；最终版固定 `TRANSPARENT_EDGE_WITH_STRIPS`，关闭 `EDGE_PROBE_COLORS`，native top/bottom strip 与 Web/CSS 背景统一为正式浅色，Web 默认 `edge-transparent`；Capacitor `SystemBars.insetsHandling` 继续为 `disable`，由 native 主控；最新正式 APK 为 `交付物/solar-remote-t031-sideload.apk` / `C:\solar-apk\solar-remote-t031-sideload.apk`，SHA256 `2CE79E87FDDCE625B537417A91927046C86E4E4863B61EAF0180C3DE90025F3E`。
- T-032 UI Header / TabBar Compact Polish：T031 Final 真机已确认系统栏有变化后，按用户反馈去掉标题下方矩形感；header 伪背景层关闭，home 状态提示改为无卡片文字行，`场景` 预留页不再显示空矩形；`设备/场景/我的/具体设备` 标题整体上移；bottom TabBar 继续 `bottom:0` 且内容更贴底；详情锚点默认选中并点亮 `设备状态`，点击 `控制面板` 会切换选中态。BLE、协议、Android native edge-to-edge 和 `deviceController.ts` 未改。最新正式 APK 为 `交付物/solar-remote-t032-sideload.apk` / `C:\solar-apk\solar-remote-t032-sideload.apk`，SHA256 `861A9E929C97F24E51A4D0B6F6ED93E60ABEFF7925290FA8135B8F1D060A82FA`。
- T-033 Edge Spacing Micro Adjust：在 T032 基础上做 1-2px 级别 UI 间距微调；模拟 top inset 32px 时标题 top 从 34px 上移到 32px；bottom nav padding-bottom 从 20px 收到 18px；320/360px shell 左右 padding 从 10px 放宽到 8px，390px 从 12px 放宽到 10px；仍保持 bottom nav `bottom:0`、无横向溢出、详情页默认点亮 `设备状态`。BLE、协议、Android native edge-to-edge 和 `deviceController.ts` 未改。最新正式 APK 为 `交付物/solar-remote-t033-sideload.apk` / `C:\solar-apk\solar-remote-t033-sideload.apk`，SHA256 `45AD1807CCD71BFFEFC964E7A77AF1E5FDA326AF439E1C17E51F303F6E621A4F`。
- T-034 Time Control Mode Write：已接入 `B1 MODE=01` 时控模式整包写入；新增 typed `TimeControlParams` 编码/解码，`LEN=1A`、29 字节总帧、5 个时段按累计半小时到达点编码；控制页新增时控编辑区，步进/滑块提交后发送整包，滑块拖动中不刷 BLE；`readParams` 仍不阻塞等待，但若 notify 返回 `B1 MODE=01` 会解析并同步到所有时控控件。现有 5 条 MVP 命令不变，普通命令和时控写入均不默认等待回包，UI 不直接解析 HEX。验证：TDD 红灯已观察，`npm.cmd test` 6 files / 67 tests、build、sync、Android Studio JBR `assembleDebug`、aapt 无 `testOnly`、apksigner、Chrome 320/360/390px layout smoke 均通过。未导出 T034 sideload APK，仍以 T033 APK 为最新交付包。
- T-035 Time Control Real-Frame Corrections：基于用户真机帧和供应商三条 `B1` 样例修正 `MODE=01` 时控字段；时长改为 5 分钟累计点，功率改为 0-255 缩放百分比，最大输出改为 16-bit raw，电池类型标签改为 `1=磷酸铁锂/2=锂电池/3=铅酸`。`MODE=01` 仍为 29 字节整包一次发送，不做应用层分包；Android native 新增 best-effort `requestMtu(64)` 和 write byte-length 日志；`MODE=02` 37 字节长帧分包留给后续任务。验证：TDD 红灯已观察，`npm.cmd test` 6 files / 71 tests、build、sync、Android Studio JBR `assembleDebug`、aapt 无 `testOnly`、apksigner、Chrome 320/360/390px time-control layout smoke 均通过。未导出 T035 sideload APK，仍以 T033 APK 为最新交付包。
- T-036 Time Control UI / Percent / Half-hour Corrections：按用户反馈修正 T035 UI 和模型；模式条移动到时控编辑器上方，删除 `参数整包写入` 文案；Live Status、附近设备卡片和模式条统一显示 `雷达模式/时控模式/平均模式`；最大输出改为高字节百分比显示，写入固定为 `[maxOutputByte, 00]`；时段 1~5 改为 1~15 档，每档 30 分钟，协议累计点按每档 6 写入。验证：TDD 红灯已观察，`npm.cmd test` 6 files / 72 tests、build、sync、Android Studio JBR `assembleDebug`、aapt 无 `testOnly`、apksigner、Chrome 320/360/390px T036 layout smoke 均通过。未导出 T036 sideload APK，仍以 T033 APK 为最新交付包。
- T-037 Time Control Interaction Visual Debounce：按用户反馈进一步限定当前控制面板只突出 `时控模式`，`雷达模式/平均模式` 显示为未开放只读；Live Status 和控制面板模式上下文显示 `当前是时控模式`；时段 tabs、当前时段时长和当前时段功率已放入强化联动卡片；时控步进按键与滑杆提交改为 400ms trailing debounce，连续操作只发送最终一次完整 `B1 MODE=01`。普通业务命令不等待回包策略不变，UI 不直接解析 HEX，`deviceController.ts` 未改。验证：TDD 红灯已观察，`npm.cmd test` 6 files / 73 tests、build、sync、Android Studio JBR `assembleDebug`、aapt 无 `testOnly`、apksigner、Chrome 320/360/390px T037 layout/debounce smoke 均通过。未导出 T037 sideload APK，仍以 T033 APK 为最新交付包。
- T-038 Time Control Label Density Polish：按用户反馈收短信控模式文案；Live Status 主标题改为 `时控模式`，Live Status 内“模式”小卡片改为 `时控`，控制面板内独立 `当前模式` 显示卡已移除；时段设置内档位/小时改为上下结构，例如 `1档` / `0.5h`，不再显示 `/`。协议、BLE、Android native、`deviceController.ts` 和普通命令不等待回包策略未改。验证：TDD 红灯已观察，`npm.cmd test` 6 files / 74 tests、build、sync、Android Studio JBR `assembleDebug`、aapt 无 `testOnly`、apksigner、Chrome 320/360/390px T038 layout smoke 均通过。未导出 T038 sideload APK，仍以 T033 APK 为最新交付包。
- T-039 Touch Guard / Discovery Sync：按用户反馈增加误触防护和连接/扫描稳定性；普通命令按钮、时控步进按钮、时段按钮、时控滑杆均在提交前判断 pointer 轨迹和最近滚动，纵向滚屏误触不会发送；支持设备名扩展为 `AC632N_1`、`AC632N-1`、`M3240-G`、`N3230-U`，App 使用无前缀扫描后按支持名单过滤；连接 ready 后自动顺序发送 `读状态` 和 `读参数`，仍走非阻塞写入并通过 notify 被动同步 UI；连接/进入控制页后保持低频后台发现，断开设备更久保留并排到下方。`B1 MODE=01` 协议、普通命令不等待回包策略、Android native 和协议 Excel 未改。验证：TDD 红灯已观察，`npm.cmd test` 6 files / 80 tests、build、sync、Android Studio JBR `assembleDebug`、aapt 无 `testOnly`、apksigner、Chrome CDP 320/360/390px smoke 均通过。未导出 T039 sideload APK，仍以 T033 APK 为最新交付包。
- T-041 Status Page Scroll Performance / Background Scan Cadence：按用户反馈优化设备状态页快速滑动卡顿风险和后台扫描节奏；状态回调改为 `requestAnimationFrame` 合并刷新，非 home 页不再重建隐藏设备列表，设备列表增加 render signature 去重，时控编辑器只在参数同步、draft、active segment 或 ready 状态变化时刷新，debug 日志隐藏时不刷 DOM；quiet background discovery 改为每轮完成后约 3000ms 调度，后台 scan window 缩短为 quick 800ms / full 1200ms。读状态 5 秒轮询、连接后 `读状态`/`读参数` 初始同步、普通命令不等待回包策略、协议帧、Android native、`deviceController.ts` 和协议 Excel 未改。验证：TDD 红灯已观察，`npm.cmd test` 6 files / 84 tests、build、sync、Android Studio JBR `assembleDebug`、aapt 无 `testOnly`、apksigner、Chrome CDP 320/360/390px control-page rapid-scroll smoke 均通过。未导出 T041 sideload APK，仍以 T033 APK 为最新交付包。

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
- T-009/T-039/T-041 持续发现仍需真机验证：连接后低频后台扫描、设备列表多轮保留、断开后保留排序，以及 T041 约 3 秒后台轻扫与状态页快速滑动观感在 vivo 真机上的表现仍需确认。
- 协议回传口径已由用户确认：只有读状态和读参数需要关注回传，其他控制命令不用回传；程序默认不等待，仅允许显式标记命令等待。
- 开/关命令按当前 `0x0A` 指令执行，是否能区分独立开机/关机仍待真机确认。
- T-033 APK 已生成；仍需安装 `solar-remote-t033-sideload.apk` 真机确认顶部内容更靠上、底部 TabBar 更贴底、左右边距更合适、详情页默认点亮 `设备状态`。
- T-038/T-039/T-041 需要真机确认短模式文案、时段上下结构、防误触阈值、连接后自动 `读状态`/`读参数` 同步，以及设备状态页快速滑动是否还卡顿；同时继续确认时控参数在 400ms 消抖后整包写入是否被设备稳定接受，并在主动点击“读参数”后确认 `B1 MODE=01` 回包仍按预期同步到全部按键和滑杆。
- T-028/T-039 已重设计控制面板按钮并增加误触防护；仍需真机确认 enabled 状态下的视觉观感与滚动误触风险。
- T-040 多设备并连与 2.4G 替代链路仅完成任务拆分，尚未评估/实施；当前 App 仍是单 active BLE 连接控制。
- 详情页锚点已在 T-032 增加默认/切换选中态；真机仍需确认滚动落点和视觉位置是否符合预期。
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

## T-027 Android Edge-To-Edge Insets Baseline

- Date: 2026-04-29.
- Scope: Android system-bar and Web/CSS inset handling only; BLE native plugin behavior, protocol HEX, normal-command response waiting, and `deviceController.ts` were not changed.
- Native edge-to-edge: `MainActivity.java` now calls `WindowCompat.enableEdgeToEdge(window)`, uses `WindowInsetsControllerCompat` for light system-bar icons, disables Android Q+ contrast enforcement, and removes the old `SYSTEM_UI_FLAG_*` layout flags.
- Insets bridge: WebView receives `WindowInsetsCompat.Type.systemBars()` plus display cutout insets and injects CSS variables `--system-top/right/bottom/left`; listener returns original insets, not `CONSUMED`.
- Web layout: root `.shell` no longer uses global top/bottom inset padding; `.app-header` consumes top inset, `.bottom-nav` consumes bottom inset while its background remains fixed to the viewport bottom, and `main` receives bottom content spacing.
- Verification: TDD red check failed first as expected; `npm.cmd test -- src/app.test.ts` passed 28 tests; `npm.cmd test` passed 5 files / 49 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; local Chrome simulated `top=32px/bottom=24px` layout check passed at 320/360/390px; JBR `:app:assembleDebug --project-prop android.injected.testOnly=false` exited 0.
- Delivery: `交付物/solar-remote-t027-sideload.apk` and `C:\solar-apk\solar-remote-t027-sideload.apk`; SHA256 `2AE9BD47820C954258277568CFB8EBD8DC4B37EE3F00CB4219E947AFE4242538`; manifest check reports `NO_TEST_ONLY`; `apksigner verify --verbose` verifies.
- Pending real-phone check: Android 13/14 gesture navigation, Android 15 targetSdk 35+ behavior, and three-button navigation visual validation.

## T-028 Control Panel Command Button Baseline

- Date: 2026-04-29.
- Scope: App/UI-layer control-panel redesign only; BLE native behavior, protocol HEX, normal-command response waiting, Android native files, and `deviceController.ts` were not changed.
- Result: `开/关` is the primary command button; `降低亮度 / 增加亮度` render as a paired brightness adjustment row; `读状态 / 读参数` remain available by id/action but are visually demoted into a low-priority `系统读取` reserved area.
- Rationale: read status/read params should eventually become system-triggered once the app flow is complete, but keeping the entry points avoids blocking later T-002/manual validation.
- Verification: TDD red check failed first as expected; `npm.cmd test -- src/app.test.ts` passed 29 tests; `npm.cmd test` passed 5 files / 50 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; Chrome CDP layout check passed at 320/360/390px with no horizontal overflow and command order `powerToggleBtn > brightnessDownBtn > brightnessUpBtn > readStatusBtn > readParamsBtn`; JBR `:app:assembleDebug --project-prop android.injected.testOnly=false` exited 0.
- Reports: `.agent/reports/2026-04-29-t028-command-panel-layout-check.cjs`, `.agent/reports/2026-04-29-t028-command-panel-layout-results.json`, `.agent/reports/screenshots/2026-04-29-t028-command-panel-390x900.png`.
- Delivery: `交付物/solar-remote-t028-sideload.apk` and `C:\solar-apk\solar-remote-t028-sideload.apk`; SHA256 `BFA372E50425F0C5EA0B2054AB8D4A1FF521FD18C47F3F1994DA01A0740D95E7`; manifest check has no `testOnly`; `apksigner verify --verbose` verifies.
- Pending real-phone check: confirm enabled-state visual contrast and control spacing on vivo/Android device.

## T-029 Vivo Capacitor Edge-To-Edge Hardening Baseline

- Date: 2026-04-29.
- Scope: Android system-bar/WebView/CSS inset hardening only; BLE native behavior, protocol HEX, normal-command response waiting, and `deviceController.ts` were not changed.
- Native fallback: `MainActivity.java` keeps `WindowCompat.enableEdgeToEdge(window)`, disables Android Q+ system-bar contrast enforcement, sets light system-bar icons, applies non-black drawable backgrounds to window/decor/content, keeps the WebView transparent, and adds top/bottom native paint fallback views.
- Insets bridge: DecorView listens for `systemBars/displayCutout/systemGestures/tappableElement`, returns original insets, updates native paint heights, converts physical px to CSS px, and injects both `--native-inset-*` and legacy `--system-*`.
- Capacitor/Web: `capacitor.config.ts` adds bundled `SystemBars` CSS handling; `src/app.ts` accepts string or numeric insets and replays `window.__nativeSystemInsets`; CSS combines native and safe-area values into `--edge-*` and uses those for header, bottom nav, scroll margin, and content spacing.
- Verification: TDD red check failed first as expected; `npm.cmd test -- src/app.test.ts` passed 30 tests; `npm.cmd test` passed 5 files / 51 tests; `npm.cmd run build` passed; `npm.cmd run sync` passed; Chrome CDP T-029 layout check passed at 320/360/390px with no horizontal overflow and non-transparent html/body/#app/.shell/bottom-nav backgrounds; JBR `:app:assembleDebug --project-prop android.injected.testOnly=false` exited 0.
- Reports: `.agent/reports/2026-04-29-t029-edge-hardening-layout-check.cjs`, `.agent/reports/2026-04-29-t029-edge-hardening-layout-results.json`, `.agent/reports/screenshots/2026-04-29-t029-edge-hardening-390x900.png`.
- Delivery: `交付物/solar-remote-t029-sideload.apk` and `C:\solar-apk\solar-remote-t029-sideload.apk`; SHA256 `B80987993290FCB80D267394E6F0DEF57B2DE72C0CAD79AB5E53AD2FFB69415C`; manifest check has no `testOnly`; `apksigner verify --verbose` verifies.
- Pending real-phone check: vivo / Android 16 gesture navigation and three-button navigation, plus Android 13/14 gesture navigation and Android 15/16 targetSdk behavior.
