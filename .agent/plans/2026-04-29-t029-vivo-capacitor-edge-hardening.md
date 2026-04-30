# Plan - T-029 Vivo Capacitor Edge-To-Edge Hardening

## Request

用户在 `docs/try.md` 补充了 vivo / Capacitor WebView edge-to-edge 问题分析，要求先查看并做方案。目标是继续强化 T-027，解决 vivo 上仍可能出现的顶部或底部黑条。

## Current Facts

- 当前主工程是 `项目文件/android-mvp-capacitor`，targetSdkVersion/compileSdkVersion 为 36。
- T-027 已完成：
  - `MainActivity.java` 使用 `WindowCompat.enableEdgeToEdge(window)`。
  - Android Q+ 关闭 status/navigation contrast enforcement。
  - WebView 透明，WebView insets listener 注入 `--system-top/right/bottom/left`。
  - CSS 中 header 和 bottom nav 消费 `--system-*`，根 `.shell` 不再整体 top/bottom padding。
- T-027 尚未覆盖或仍有风险：
  - 只在 WebView 上监听 insets，没有在 DecorView 上统一监听与分发。
  - native window/decor 使用 `status_bar_gradient`，但 `android.R.id.content`、theme `windowBackground/colorBackground` 没有统一浅色兜底。
  - 没有 top/bottom native paint fallback view；如果 vivo WebView 未绘制到系统栏背后，仍可能露出 native 黑底。
  - native insets 当前以 Android 物理 px 数字注入 Web；Web CSS px 未做 density 换算。
  - CSS 只有 `--system-*`，没有合并 native、Capacitor SystemBars、`env(safe-area-inset-*)` 的 `--edge-*` 变量。
  - 当前 `capacitor.config.ts` 没有 `SystemBars` 配置；项目也没有使用 `@capacitor/status-bar` 的 `overlaysWebView/backgroundColor`。
  - `index.html` 已包含 `viewport-fit=cover`。
- T-028 已完成控制面板 UI 变更，T-029 不应回滚或覆盖 T-028。
- `docs/try.md` 是用户新增的未跟踪文件，本任务只读取，不修改。

## Root-Cause Hypothesis

vivo 黑条不是单一 `statusBarColor/navigationBarColor` 问题，更可能来自多层绘制链路缺口：

1. 系统栏透明后，native window/decor/content/WebView 某一层没有浅色背景，露出黑色。
2. WebView bounds 或厂商实现导致 Web DOM 没真正绘制到系统栏背后。
3. CSS 只让内容避开 inset，没有确保页面背景和 bottom nav 背景延伸到底。
4. native px 直接当 CSS px 用，在高密度 vivo 屏上会放大 inset。
5. Capacitor v8/SystemBars 现代 edge-to-edge 配置未启用，WebView `env()` 在部分 WebView 版本下不稳定。

## Proposed Scope

把 T-027 扩展为 T-029：`vivo / Capacitor WebView edge-to-edge hardening`。

本次会做：

- Native 背景兜底。
- Native top/bottom system bar paint fallback。
- DecorView + WebView insets 分发。
- native px -> CSS px 换算。
- Capacitor v8 `SystemBars` 配置。
- Web/CSS 背景延伸和内容避让变量重构。
- 自动化布局检查和 APK 交付。

## Not In Scope

- 不修改 BLE 扫描、连接、notify、写入逻辑。
- 不修改协议帧、命令 HEX、回包等待策略。
- 不修改 `src/device/deviceController.ts`。
- 不修改 T-001/T-002/T-010。
- 不修改底层协议 Excel。
- 不纳入 `android/.idea/`。
- 不使用旧 `SYSTEM_UI_FLAG_FULLSCREEN / LAYOUT_FULLSCREEN / LAYOUT_HIDE_NAVIGATION` 路径。
- 不把根 `.shell` 整体 top/bottom padding 当最终适配方案。
- 不引入 `@capacitor/status-bar` 的 `overlaysWebView` / `backgroundColor` 配置。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Native fallback | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java` | 增加浅色 fallback 常量；将 window/decor/content/WebView 背景统一为非黑色；WebView 保持透明并关闭 overscroll。 |
| Native paint views | `MainActivity.java` | 在 decor/content overlay 上增加不可点击的 top/bottom system bar paint view；高度随 status/cutout/nav/gesture/tappable insets 更新；底部使用 bottom nav 近似白色。 |
| Insets listener | `MainActivity.java` | 在 DecorView 上统一监听 `systemBars/displayCutout/systemGestures/tappableElement`；WebView listener 仅返回原始 insets；不返回 `CONSUMED`。 |
| CSS px bridge | `MainActivity.java` | 注入前将 native px 除以 density，生成 CSS px 字符串；写入 `--native-inset-*`，保留兼容 `--system-*`；同时设置 `window.__nativeSystemInsets`。 |
| Re-dispatch | `MainActivity.java` | `onResume()`、insets 变化后重新 request/apply；JS 未就绪时保留 `window.__nativeSystemInsets`，待 App 注册后补应用。 |
| Theme fallback | `项目文件/android-mvp-capacitor/android/app/src/main/res/values/styles.xml` | 增加 `android:windowBackground`、`android:colorBackground` 浅色兜底，保留透明 system bars 与 light icons。 |
| Capacitor config | `项目文件/android-mvp-capacitor/capacitor.config.ts` | 配置 `SystemBars: { insetsHandling: "css", style: "LIGHT", hidden: false, animation: "NONE" }`；不添加 StatusBar legacy background/overlay 配置。 |
| JS inset bridge | `项目文件/android-mvp-capacitor/src/app.ts` | `solarRemoteApplySystemInsets` 改为接受 string/number；写入 `--native-inset-*` 与兼容 `--system-*`；App 启动时读取 `window.__nativeSystemInsets`。 |
| CSS edge vars | `项目文件/android-mvp-capacitor/src/styles.css` | 引入 `--native-inset-*`、`--safe-area-inset-*`、`--edge-*`；html/body/#app/.shell 全屏背景兜底；header 内容用 top inset 避让，背景延伸；bottom nav `bottom:0`，用 padding-bottom 避让，背景延伸到底。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 更新 inset 单测，覆盖 string CSS px、native/system legacy vars、SystemBars fallback 变量口径。 |
| Verification reports | `.agent/reports/` | 新增 T-029 Chrome/CDP 布局检查，验证 320/360/390px header/nav/content 和背景延伸；截图留存。 |
| Docs/task state | `todo.md`、`.agent/logs/`、`.agent/AI_CONTEXT.md`、`.agent/CHANGE_INDEX.md` | 实施后更新任务状态、日志和当前事实。 |

## Diagnostic Option

`docs/try.md` 建议用洋红/绿色/lime 诊断具体露黑层。我的建议：

- 默认先实施 T-029 multi-layer hardening，不把诊断色放入最终 APK。
- 如果 T-029 后 vivo 仍黑，再单独写一个极小 T-029D diagnostic plan，生成诊断 APK：
  - DecorView 洋红。
  - content view 绿色。
  - Web DOM lime。
- 原因：当前代码缺口已经明确，直接补多层兜底比先发一个必然不可交付的诊断包更节省一次安装验证；但若仍失败，诊断包就是下一步根因定位手段。

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-029 vivo / Capacitor WebView edge-to-edge hardening | P0 | Proposed | native window/decor/content/WebView 背景非黑；有 top/bottom native paint fallback；insets 从 DecorView 分发且不消费；native px 转 CSS px；CSS 背景延伸到状态栏和底部手势/三键区域；bottom nav 背景到底且图标文字避开 bottom inset；320/360/390px 本地检查无黑底/无遮挡；`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、APK manifest/signature 校验通过。 |

## Risks

- native paint fallback 可以避免黑底，但真机上 top/bottom 颜色只能近似当前 Web 背景；如果设计后续继续变化，需要同步颜色常量。
- Capacitor `SystemBars` 会注入 `--safe-area-inset-*`，与 native 自定义注入并存时必须明确优先级，避免双倍 inset。
- 将 raw px 改为 CSS px 会改变当前模拟测试数据；测试必须同步改为字符串/密度后语义。
- bottom nav 背景延伸和内容避让必须保持 `bottom: 0`，不能把底栏整体抬高，否则系统栏后面仍可能露出底层背景。
- 不能通过本地浏览器完全复现 vivo 厂商 WebView 绘制层；最终仍需要真机手势导航和三键导航复验。

## Verification

实施后计划验证：

1. TDD 红灯：先更新/新增 app inset 单测，确认当前实现不支持 string CSS px / native vars。
2. `npm.cmd test -- src/app.test.ts`
3. `npm.cmd test`
4. `npm.cmd run build`
5. `npm.cmd run sync`
6. 静态检查：
   - 无 `SYSTEM_UI_FLAG_*`。
   - 无 `WindowInsetsCompat.CONSUMED`。
   - 无 `setStatusBarColor` / `setNavigationBarColor` 作为主要路径。
   - 无 `StatusBar.overlaysWebView/backgroundColor` legacy 配置。
7. Chrome/CDP 移动布局检查：
   - 320/360/390px。
   - 模拟 top/bottom/left/right CSS px inset。
   - header 内容不压状态栏。
   - bottom nav 背景触达 viewport bottom，tab 内容避开 bottom inset。
   - html/body/#app/.shell 背景存在，不出现透明空洞。
8. Android 构建：
   - `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`
   - `aapt` 检查无 `testOnly`。
   - `apksigner verify --verbose` 通过。
9. 导出 `solar-remote-t029-sideload.apk`。
10. 真机复验清单：
   - vivo / Android 16 手势导航：顶部和手势横杠背后无黑条，内容不被遮挡。
   - vivo / 三键导航：底部不出现纯黑断层，底栏背景协调。
   - Android 13/14 手势导航：无顶部/底部黑条。
   - Android 15/16 targetSdk 35/36：系统栏透明时内容和背景符合预期。

## Rollback

- 回退 `MainActivity.java` 中 native fallback、paint views、insets bridge 改动，恢复 T-027 状态。
- 回退 `styles.xml` 背景兜底项。
- 回退 `capacitor.config.ts` 的 `SystemBars` 配置。
- 回退 `app.ts` / `styles.css` 的 inset 变量重构。
- 保留 T-028 控制面板 UI，不回滚 BLE、协议或 `deviceController.ts`。

## References

- Android edge-to-edge 要求：target SDK 35+ 在 Android 15+ 默认 edge-to-edge，top/bottom bars 应绘制到系统栏背后，并处理 insets。
- Android WebView insets：WebView 非零 inset 依赖与系统 UI overlap；可通过 listener 提供完整系统尺寸并返回原始 insets。
- Capacitor v8 SystemBars：`SystemBars` bundled with `@capacitor/core`，用于现代 edge-to-edge；可注入 `--safe-area-inset-*`。
- Chrome Android edge-to-edge：Web 内容需 `viewport-fit=cover`，底部固定元素需用 safe-area 让背景延伸或内容避让。

## Approval Gate

等待用户确认后，再修改 Android 原生、Capacitor 配置、App/UI/CSS 和测试文件。
