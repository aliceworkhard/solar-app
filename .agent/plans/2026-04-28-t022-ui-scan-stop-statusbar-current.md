# Plan - T-022 UI Scan Stop, Status Bar, Anchors, Current Rule

## Request

用户反馈 T-021 真机验证后的 4 个问题：

- 设备页点击 `+` 后一直显示 `X`，按 `X` 无反应。
- Android 顶部系统状态栏没有显示 App 渐变背景。
- 详情页不应继续用隐藏式 tab；`设备状态` 与 `控制面板` 应上下连续显示，顶部按钮用于快速定位到对应区域。
- `电流` 显示规则需要按亮度区分：亮度为 `0` 时沿用当前回传电流；亮度非 `0` 时按亮度百分比计算。

## Current Facts

- 当前工作区有 T-021 未提交改动，本次不回滚、不覆盖，只在其基础上继续。
- `src/app.ts` 当前用 `discoveryActive` / `discoveryScanInFlight` 控制 `+ / X`，停止持续发现只在 App 层失效旧 scan token；原生 BLE scan 没有显式取消接口。
- `src/app.ts` 当前详情页使用 `controlTab` 和 `.tab-pane.active`，会隐藏非当前页签内容。
- `formatLoadCurrent()` 当前始终显示 `status.loadCurrentAmp`，单位为 `A`。
- `MainActivity.java` 已设置透明 status bar 和 `setDecorFitsSystemWindows(false)`，但 Activity 仍使用 `AppTheme.NoActionBarLaunch`，WebView/主题背景可能没有真正透明到系统栏下方。

## Goal

- `+` 开始持续发现后，点 `X` 必须立即停止 UI 持续发现状态，按钮恢复为 `+`，旧扫描回调不能再把 UI 改回 `X` 或覆盖当前状态。
- Android 状态栏区域尽量显示 App 背景渐变，并避免标题被系统时间/信号/电池覆盖。
- 详情页恢复为“设备状态在上，控制面板在下”的连续阅读结构；顶部两个按钮只做锚点定位。
- `电流` 在亮度非 0 时按 `power / 100 * 9.7272` 计算并继续以 `A` 展示，例如 `30% -> 2.92A`；亮度为 0 时继续显示 `loadCurrentAmp`。

## Proposed Scope

- 修复 App 层持续发现按钮状态机，不改 BLE UUID、协议、命令语义。
- 调整详情页 DOM/CSS：移除隐藏式 tab，改为锚点导航和连续布局。
- 调整 Live Status 电流格式化逻辑和单元测试。
- 补强 Android 状态栏 edge-to-edge theme/WebView 透明处理。

## Non-Scope

- 不新增原生 BLE scan cancel 接口；本次先保证 UI 停止、旧回调失效、不卡顿。
- 不改 `deviceController.ts`。
- 不改 BLE 协议、最小命令集、Excel 源协议。
- 不做 20 次正式采样和 30 分钟长稳测试。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| TDD | `项目文件/android-mvp-capacitor/src/app.test.ts` | 先补失败用例：扫描按钮停止态、详情锚点布局、电流亮度计算。 |
| App state | `项目文件/android-mvp-capacitor/src/app.ts` | 增加/抽取持续发现按钮状态 helper；停止时立即清理 `discoveryActive`、`discoveryScanInFlight`、timer 和旧 token，并忽略旧 scan 回调。 |
| Detail UI | `项目文件/android-mvp-capacitor/src/app.ts` | 去掉隐藏式 `controlTab` 渲染，给 `设备状态` 和 `控制面板` 区块加 anchor id，顶部按钮点击 `scrollIntoView`。 |
| Detail style | `项目文件/android-mvp-capacitor/src/styles.css` | 移除 `.tab-pane { display:none }` 逻辑，改为 sticky/segmented 锚点导航和连续 section 间距。 |
| Current display | `项目文件/android-mvp-capacitor/src/app.ts` | `formatLoadCurrent()`：`power === 0` 用 `loadCurrentAmp`；`power > 0` 用 `(power / 100) * 9.7272`，保留 2 位小数，单位 `A`。 |
| Android edge-to-edge | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java` | 在 Activity 初始化和 WebView 初始化后设置透明 decor/WebView 背景、透明 status/navigation bar，必要时切换 runtime theme。 |
| Android theme | `项目文件/android-mvp-capacitor/android/app/src/main/res/values/styles.xml` | 给 `AppTheme.NoActionBar` / launch theme 补透明 status bar、light status bar、无标题等配置。 |
| Android manifest | `项目文件/android-mvp-capacitor/android/app/src/main/AndroidManifest.xml` | 如 theme 切换需要，调整 Activity 运行时 theme 配置；否则不改。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-022 UI 扫描停止、状态栏渐变、详情锚点与电流规则修正 | P0 | Proposed | `X` 可立即停持续发现；状态栏尽量显示 App 渐变；详情页上下连续且按钮可定位；亮度 0/非 0 电流规则正确；测试和构建通过。 |

## Risks

- 原生 BLE 扫描没有 cancel 接口，点 `X` 后底层扫描可能仍会自然结束；本次只保证 App UI 立即停止并忽略旧回调。如果底层持续占用仍明显影响性能，后续需要单独做 BLE cancel 接口。
- vivo/Android 16 的状态栏是否透出 WebView 背景受系统 WebView、主题和厂商实现影响；本次会尽量补齐 theme + runtime + WebView 背景，仍需真机确认。
- 电流公式单位存在歧义。本方案默认 `power` 是百分数，使用 `power / 100 * 9.7272A`。如果实际要求是 `power * 9.7272mA`，实施前需要改验收口径。

## Verification

- TDD：先运行 `npm.cmd test -- src/app.test.ts` 看到新增用例失败，再实现并确认通过。
- 回归：运行 `npm.cmd test`。
- 构建：运行 `npm.cmd run build`、`npm.cmd run sync`。
- Android：使用 Android Studio JBR 执行 `.\gradlew.bat :app:assembleDebug`。
- 真机检查：点 `+` 后再点 `X`；状态栏渐变；详情页按钮定位；亮度 0 与亮度非 0 的电流显示。

## Rollback

- 如新 UI 交互不合适，回退 `app.ts` / `styles.css` 中锚点导航改动，保留电流规则独立修改。
- 如状态栏透明导致遮挡或显示异常，回退 Android theme/MainActivity 的 edge-to-edge 增强，保留 CSS safe-area。
- 如电流单位确认不同，只调整 `formatLoadCurrent()` 和对应测试，不影响 BLE/协议。

## Approval Gate

等待用户明确确认后再修改业务代码、UI、Android 原生文件和测试文件。
