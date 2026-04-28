# Plan - T-018 Android back dispatch and live status layout

## Request

用户对 T-017 真机结果反馈：

1. 连接后返回首页点 `刷新` 不跳详情页：已完成。
2. 控制页按系统右侧滑动返回仍会退出软件：未完成，需要继续修复。
3. 读状态反馈内容需要按用户截图和 `HTML参考/app.html` 的 Live Status 卡片排版。
4. `设备` 页的 `附近设备` 下方，每个设备卡增加 2x2 状态内容：当前模式、电池电压、太阳能电压、亮度；文字可以更小。

## Current Facts

- 当前 `package.json` 只有 `@capacitor/core`、`@capacitor/android`、`@capacitor/cli`，没有 `@capacitor/app`。
- T-017 的返回方案只依赖 `window.history.pushState` / `popstate`。
- 真机反馈证明：Android/Capacitor 系统侧滑返回没有被 Web history 正确拦截，直接退出 App。
- 当前 Android 入口是 `android/app/src/main/java/com/solar/remote/MainActivity.java`，继承 `BridgeActivity`，只注册了 `BleBridgePlugin`。
- Capacitor `BridgeActivity` 暴露 `getBridge()`，`Bridge` 暴露 `getWebView()`，因此可以在原生层用 `evaluateJavascript` 通知 WebView。
- 当前 `DeviceStatus` 已有可用于排版的真实字段：`mode`、`power`、`batteryVoltage`、`loadCurrentAmp`、`solarVoltage`、`workMinutes`、`battery?`、`fwVersion?`。
- `HTML参考/app.html` 的目标结构是 `live-status-card`：顶部 `Live Status` + 当前模式 + 电池类型，右侧电池/已开灯，两格时间信息，底部三枚指标 chip。

## Root Cause

- 系统返回未完成的根因不是 UI 内部状态判断，而是返回事件入口不对：网页 history 能处理浏览器 back，但 Android 右侧返回手势在当前 Capacitor 配置下直接走原生 Activity 退出。
- 需要把 Android 原生返回事件先交给 JS：如果当前是控制页，则 JS 切回首页并返回 `handled`；如果当前已在首页，则返回 `exit`，让 App 正常退出。

## Proposed Scope

### 1. Android 系统返回修复

- 修改 `MainActivity.java`，增加原生返回回调。
- 返回触发时执行 WebView JS：调用 `window.solarRemoteHandleNativeBack()`。
- JS 返回：
  - `handled`：原生层消费这次返回，不退出 App。
  - `exit` 或函数不存在：原生层执行退出。
- 不引入 `@capacitor/app` 依赖，避免额外安装包和版本变动。

### 2. JS 返回入口

- 在 `App.start()` / back 初始化中把 `window.solarRemoteHandleNativeBack` 绑定到当前 App 实例。
- 增加纯函数用于测试：例如 `resolveNativeBackAction(view)`，控制页返回 `handled/home`，首页返回 `exit`。
- App 内返回按钮、Web history、Android 原生回调统一走同一套 `goHome/handleBack` 逻辑，避免三套逻辑不一致。

### 3. Live Status 状态卡重排

- 把控制页顶部设备状态区域改成接近截图/HTML 的结构：
  - `LIVE STATUS`
  - 当前模式标题：建议详情页用中文模式名（`雷达/时控/平均`）以贴近 HTML。
  - 电池类型：磷酸铁锂（现阶段仍为固定 UI 文案，不新增协议字段）。
  - 电池剩余：优先 `status.battery`；若没有百分比字段，用 `-`，不把电压伪装成百分比。
  - 已开灯：`formatWorkMinutes(status)`。
  - 晨亮时间 / 关灯时间：当前协议未提供时显示 `-`，不伪造 `06:00/07:00`。
  - 底部 chip：亮度、电池电压、负载电流。
- 保留后面的五条 MVP 命令按钮，不改 BLE/协议/Controller。

### 4. 附近设备卡 2x2 状态内容

- `附近设备` 下的每个设备卡增加 2x2 mini metrics：
  - 当前模式：按用户要求显示 raw 值，例如 `radar`。
  - 电池电压：`formatBatteryVoltage(status)`。
  - 太阳能电压：`formatSolarVoltage(status)`。
  - 亮度：`${status.power}%`。
- 只有已连接的当前设备显示真实状态；未连接/非当前设备显示 `-`。
- 字体做小，卡片保持紧凑，但触控主区域不小于约 44px。

## Out Of Scope

- 不改 BLE 扫描/连接逻辑。
- 不改协议命令、解析公式、帧格式。
- 不改 `src/device/deviceController.ts`。
- 不新增 `@capacitor/app` 包，除非原生方案编译失败再另行确认。
- 不新增晨亮/关灯协议字段；没有真实数据时显示 `-`。
- 不改 Excel 源协议文件。
- 不处理正式 T-001/T-002 量化表格。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Approval | `.agent/approvals/2026-04-28-t018-back-live-status.md` | 用户确认后记录审批。 |
| Plan | `.agent/plans/2026-04-28-t018-back-live-status.md` | 本方案。 |
| TODO | `todo.md` | 新增 T-018 Proposed。 |
| Native back | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java` | 增加 Android 原生返回回调，通过 WebView 调 JS 决定返回首页或退出。 |
| UI behavior | `项目文件/android-mvp-capacitor/src/app.ts` | 注册 `window.solarRemoteHandleNativeBack`；统一返回逻辑；新增/调整状态卡和设备卡渲染 helper。 |
| UI tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 先写失败测试：native back 在 control 应消费返回、home 应允许退出；Live Status 字段模型；附近设备 2x2 metrics。 |
| UI style | `项目文件/android-mvp-capacitor/src/styles.css` | 增加 `live-status-card`、mini/chip、device 2x2 metrics 样式，按截图密度调整。 |
| Docs | `.agent/logs/`, `.agent/handoffs/`, `.agent/AI_CONTEXT.md`, `.agent/CHANGE_INDEX.md` | 实施后记录结果。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-018 Android 返回拦截 + Live Status 状态卡 + 附近设备 2x2 指标 | P0 | Proposed | 控制页 Android 系统右侧返回先回首页不退出；首页系统返回仍可退出；控制页读状态区域按截图/HTML 的 Live Status 卡片排版；附近设备卡展示 2x2 当前模式/电池电压/太阳能电压/亮度；无协议数据不伪造值；保留 T-017 已完成的刷新行为；`npm.cmd test`、`npm.cmd run build` 通过；Android Java 编译/Android Studio 构建通过或记录阻塞原因；真机复测通过。 |

## Risks

- `MainActivity.java` 的原生返回桥接需要 Android 编译验证；当前终端历史上缺 `JAVA_HOME`，可能需要 Android Studio 侧确认构建。
- `evaluateJavascript` 是异步的，原生退出逻辑要避免重复触发或返回时卡住。
- Android 16/预测返回手势可能对 `OnBackPressedDispatcher` 行为更严格；真机是最终验收依据。
- 设备列表加 2x2 信息会增加卡片高度，需要控制字体/间距，避免回到 T-016 的过大问题。

## Verification

- TDD：
  - 先补 `app.test.ts` 行为/字段测试并确认失败。
  - 实现后确认测试转绿。
- 自动验证：
  - `npm.cmd test -- src/app.test.ts`
  - `npm.cmd test`
  - `npm.cmd run build`
- Android 验证：
  - 优先运行 Gradle Java 编译或 `:app:assembleDebug`；若终端 `JAVA_HOME` 仍阻塞，记录原因并要求 Android Studio 构建复验。
- 浏览器布局验证：
  - Chrome 430px 首页截图，确认设备卡 2x2 不溢出。
  - 生成控制页 mock 状态截图，确认 Live Status 卡片结构接近参考图。
- 真机验收：
  - 控制页右侧系统返回手势回首页。
  - 首页右侧系统返回手势才退出。
  - 连接后点 `刷新` 仍不跳详情页。
  - 读状态后 Live Status 与附近设备卡字段更新。

## Rollback

- 回退 `MainActivity.java` 的返回回调。
- 回退 `app.ts`、`styles.css`、`app.test.ts` 的 T-018 改动。
- 回退本次文档更新。
- 不使用 destructive Git 命令，不回滚用户已有 T-011/T-015/T-016/T-017 修改。

## Approval Gate

等待用户确认后再修改 Android 原生文件、UI 源码、样式和测试。
