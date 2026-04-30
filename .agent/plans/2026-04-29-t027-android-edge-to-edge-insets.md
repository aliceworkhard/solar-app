# Plan - T-027 Android Edge-To-Edge Insets Fix

## Request

修复 Android 系统栏 edge-to-edge 适配，目标是：

- 页面背景绘制到状态栏和底部导航栏/手势栏后面。
- 顶部标题、按钮等内容避开状态栏。
- 底部 TabBar 背景延伸到屏幕最底部，Tab 图标和文字避开手势栏/三键导航栏。
- 手势横杠仍由系统绘制，但背后不是黑色区域。
- 兼容 Android 10、Android 13/14、Android 15 targetSdk 35+。
- 后续需要同时验证手势导航和三键导航。

## Current Facts

- 主工程：`项目文件/android-mvp-capacitor`。
- 当前 `variables.gradle`：`compileSdkVersion = 36`，`targetSdkVersion = 36`，`androidxCoreVersion = 1.17.0`，满足 Android 15 edge-to-edge 语义场景。
- 当前只有一个 Activity：`android/app/src/main/java/com/solar/remote/MainActivity.java`。
- 当前 `MainActivity.installEdgeToEdgeStatusBar()` 存在问题：
  - 只手动 `setStatusBarColor(Color.TRANSPARENT)` / `setNavigationBarColor(Color.TRANSPARENT)`。
  - Android R+ 使用 `window.setDecorFitsSystemWindows(false)`。
  - Android R 以下仍使用旧 `SYSTEM_UI_FLAG_LAYOUT_STABLE / LAYOUT_FULLSCREEN / LAYOUT_HIDE_NAVIGATION`。
  - 没有通过 `WindowInsetsCompat` 把真实 systemBars/navigationBars/statusBars inset 分发给顶部 header 和底部 tab。
  - Android Q+ 没有关掉 navigation/status contrast enforcement。
- 当前 `styles.css` 使用 `--safe-top`、`--safe-bottom`，并把顶部/底部避让放在根 `.shell` 的整体 padding 上；这和用户要求的“不要给根布局整体加 top/bottom padding 来假装适配”冲突。
- 项目是 Capacitor WebView：`topHeader` / `bottomTabBar` 是 Web DOM，不是原生 XML View。因此原生 `WindowInsetsCompat` 需要通过 JS/CSS 变量传给 Web 层，再分别作用到 `.app-header`、`.bottom-nav` 和滚动内容。
- 项目没有发现 `android:fitsSystemWindows="true"`，也没有原生 `RecyclerView/NestedScrollView`。滚动内容是 Web 页面，应以 CSS content padding / scroll padding 等价处理。
- 官方 Android 文档确认：target SDK 35+ 在 Android 15 上会默认 edge-to-edge；系统栏颜色 API 在 Android 15 场景下不足以解决遮挡，必须处理 insets；三键导航如要透明需处理 navigation bar contrast enforcement。

## Proposed Scope

- Android 原生 Activity 系统栏初始化。
- Android native -> WebView -> CSS 变量的真实 inset 分发。
- Web/CSS 对顶部 header、底部 tab、滚动内容的分区 inset 应用。
- Theme/styles 中与系统栏、contrast、cutout 相关的整理。
- 测试脚本/说明更新，生成新的 sideload APK。

## Out Of Scope

- 不改 BLE 扫描、连接、写入、notify、协议命令和回包策略。
- 不改 `deviceController.ts`。
- 不改底层协议 Excel。
- 不纳入 `android/.idea/`。
- 不做 T-001/T-002 真机采样。
- 不把 UI 改成原生 Android View；仍保持 Capacitor WebView 架构。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Edge-to-edge init | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java` | 用 `WindowCompat.enableEdgeToEdge(getWindow())` 作为入口，删除旧 `SYSTEM_UI_FLAG_*` 分支；保留透明 WebView 和 native background fallback；用 `WindowCompat.getInsetsController(...).setAppearanceLightStatusBars(true)` / `setAppearanceLightNavigationBars(true)` 设置浅色背景下的深色系统图标。 |
| Contrast/cutout | `MainActivity.java`、必要时 `styles.xml` / `values-v29` | Android Q/API 29+ 设置 `setNavigationBarContrastEnforced(false)`，如 API 可用同时设置 `setStatusBarContrastEnforced(false)`；Android P/API 28+ 设置 `layoutInDisplayCutoutMode = LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS`，避免 cutout 黑边。 |
| Inset bridge | `MainActivity.java` | 给 WebView 安装 `ViewCompat.setOnApplyWindowInsetsListener`，读取 `WindowInsetsCompat.Type.systemBars()` 和 `displayCutout()`；把 `top/right/bottom/left` 通过 `evaluateJavascript` 注入为 CSS 变量，例如 `--system-top`、`--system-bottom`、`--system-left`、`--system-right`；listener 返回原始 `insets`，不返回 `CONSUMED`。 |
| Dependency | `项目文件/android-mvp-capacitor/android/app/build.gradle` | 如当前编译无法直接解析 `WindowCompat.enableEdgeToEdge` / `WindowInsetsCompat`，显式添加 `implementation "androidx.core:core:$androidxCoreVersion"`；不改业务依赖。 |
| Web inset receiver | `项目文件/android-mvp-capacitor/src/app.ts` | 在 App 启动前注册 `window.solarRemoteApplySystemInsets` 或同等函数，接收原生传入的 inset 并写入 `document.documentElement.style`；为浏览器测试保留 0 fallback。 |
| CSS layout | `项目文件/android-mvp-capacitor/src/styles.css` | 移除 `.shell` 根整体 top/bottom safe padding；让 `html/body/#app/.shell` 背景/高度覆盖全屏；把 status bar top padding 只加到 `.app-header`；把 navigation bottom padding 只加到 `.bottom-nav`；给滚动内容底部留出 `bottomTabBar 内容高度 + system bottom`，避免内容滚到 tab 下不可点；保持 `.bottom-nav` 背景 `bottom:0` 覆盖到屏幕最底部。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts`、`.agent/reports/*` | 增加 Web 端 inset CSS 变量/回调的单测；扩展本地 layout check，模拟 top/bottom inset，验证 header 内容下移、bottom nav 背景到底、tab 内容不落入 bottom inset。 |
| Theme cleanup | `android/app/src/main/res/values/styles.xml` | 保留透明系统栏 theme，移除会导致黑条或旧 fullscreen 行为的配置；确认无 `windowFullscreen`、固定状态栏占位 View、`fitsSystemWindows`。 |
| Delivery | `交付物/`、`C:\solar-apk\` | 验证通过后导出 `solar-remote-t027-sideload.apk`，确认 manifest 无 `testOnly`，签名验证通过。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-027 Android edge-to-edge insets 修复 | P1 | Proposed | `MainActivity` 不再使用旧 `SYSTEM_UI_FLAG_*`；使用 AndroidX edge-to-edge 入口和 `WindowInsetsCompat`；Android Q+ contrast enforcement 关闭；WebView 将真实 insets 注入 CSS；根 `.shell` 不再靠整体 top/bottom padding 避让；header/tab 分区避让；本地模拟 inset 检查通过；Gradle build/APK/testOnly/apksigner 通过；如有真机，补充 Android 13/14、Android 15、手势/三键导航截图或说明。 |

## Risks

- Capacitor WebView 的 DOM safe-area 环境变量在 Android 上不一定稳定，因此本方案以原生 `WindowInsetsCompat` 注入 CSS 变量为主。
- `WindowCompat.enableEdgeToEdge(window)` 是否直接可用取决于当前 AndroidX Core 1.17.0 编译解析；如编译不通过，将显式补 `androidx.core:core` 依赖或改用同等 AndroidX Activity/Core API，但不退回旧 `SYSTEM_UI_FLAG_*`。
- 三键导航的视觉在不同厂商 ROM 上可能仍有系统半透明保护层；本轮会按官方建议关闭 contrast enforcement，并用真机/截图确认。
- 当前本地可能没有可切换手势/三键导航的 Android 13/14/15 设备；如果无法实测，会交付可复验 APK、ADB/人工检查清单，并明确未实测项。

## Verification

实施后运行：

- `npm.cmd test -- src/app.test.ts`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run sync`
- JBR Gradle：`.\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`
- `aapt` manifest check：确认无 `android:testOnly`
- `apksigner verify --verbose`
- 本地 Chrome/Playwright layout check：
  - 390x900，模拟 `top=32px/bottom=24px`：header 内容不压到 top inset，bottom tab 背景到底，tab 文字/图标位于 bottom inset 之上。
  - 320/360/390px：无横向溢出，底部内容不被 tab 遮挡。
- 真机/模拟器验证（如果设备可用）：
  - Android 13/14 手势导航：无顶部/底部黑条，手势横杠背后是页面/TabBar 背景。
  - Android 15 targetSdk 35+：标题/按钮/Tab 内容不被状态栏或导航栏遮挡。
  - 三键导航：底部背景协调，无纯黑断层。

## Rollback

- 回退 `MainActivity.java`、`styles.xml`、`build.gradle`、`src/app.ts`、`src/styles.css`、`src/app.test.ts` 的 T-027 改动即可恢复 T-026。
- 不涉及 BLE/协议/`deviceController.ts`，因此回滚不会影响通信链路。

## Approval Gate

等待用户明确确认后，再修改 Android 原生、Web UI/CSS、构建配置和测试文件。
