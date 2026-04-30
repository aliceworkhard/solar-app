# Plan - T-030 Edge-To-Edge Supplemental Hardening

## Request

用户对刚完成的 T-029 方向补充 9 条要求，要求先检查 Capacitor 版本与当前实现，再按补充要求整改。该任务继续聚焦 Android edge-to-edge / Capacitor WebView / CSS inset 处理。

## Current Facts

- 用户追加反馈：上一版修改后，内容 UI 左右两边被稍微向中心压缩，页面显得局促；本次需要把主内容左右宽度恢复到 T-029 前的观感。
- 当前 `src/styles.css` 中 `.shell` 使用 `padding: 0 calc(14px + var(--edge-right)) 0 calc(14px + var(--edge-left))`，小屏媒体查询也把 `--edge-left/right` 叠加到 `padding-inline`。如果 Android/vivo 报告侧边 gesture/system inset，这会直接减少内容可用宽度。
- 主工程：`项目文件/android-mvp-capacitor`。
- 当前已存在 T-029 未提交改动；本方案不会回滚 T-029，只在批准后做补充整改。
- `npm.cmd ls @capacitor/core @capacitor/android @capacitor/cli` 已确认：
  - `@capacitor/core@8.3.1`
  - `@capacitor/android@8.3.1`
  - `@capacitor/cli@8.3.1`
- 本地 `node_modules/@capacitor/core/system-bars.md` 和官方文档均说明：
  - `SystemBars` 随 `@capacitor/core` 捆绑。
  - `SystemBars` 从 8.0.0 开始支持。
  - Android `insetsHandling: "css"` 会注入 `--safe-area-inset-*`。
- 本地 `node_modules/@capacitor/android/.../SystemBars.java` 显示 Capacitor SystemBars 会在 `getBridge().getWebView().getParent()` 上安装 `WindowInsets` listener 并注入 safe-area CSS。
- 当前 T-029 状态：
  - `MainActivity` 已在 `super.onCreate()` 前调用 `WindowCompat.enableEdgeToEdge(window)`。
  - 当前 `MainActivity` 也在 WebView 上安装了 no-op `ViewCompat.setOnApplyWindowInsetsListener(webView, ...)`，这需要删除。
  - 当前 native top/bottom paint fallback 添加到 DecorView 上，虽然 `clickable=false/focusable=false/accessibility=no`，但在视觉层级上仍可能盖在 WebView/底栏之上；应改成只在系统栏区域做背后兜底。
  - 当前 CSS `--edge-*` 只取 `max(native, safe-area)`，需要改成 `max(native, system, safe-area, env)`。
  - 当前 native px -> CSS px 只按 density 换算，缺少 `window.innerWidth ≈ webView.getWidth()/density` 的验证或 ratio fallback。
  - 当前没有 Debug-only 诊断色开关。
- 当前透明系统栏 fallback 已保留在 theme XML 中：`statusBarColor/navigationBarColor` 为 transparent；T-030 不把它作为主要修复路径。

## Proposed Scope

本次做 T-030：补齐 T-029 的补充约束，使实现更符合 Capacitor v8 SystemBars 与 Android edge-to-edge 的协作方式。

本次会做：

- 恢复主内容左右宽度：主内容 `.shell` 不再把普通左右 gesture inset 叠加进基础 padding；只为真实 display cutout / system bar 横向安全区预留最小必要空间。
- 保留 `SystemBars` 配置，因为项目已确认是 Capacitor 8.3.1 且支持该 API。
- 删除 WebView no-op `WindowInsets` listener。
- 主 inset listener 保持在 DecorView；不覆盖 Capacitor SystemBars 在 WebView parent 上的 listener。
- native paint fallback 改为 behind-content/behind-WebView 的系统栏区域兜底，不覆盖 bottom nav 图标文字。
- `enableEdgeToEdge` 后立即 request decor insets；WebView 创建后再补一次 request。
- 保留透明 system-bar theme fallback，但不把 `setStatusBarColor/navigationBarColor` 当主要路径。
- CSS `--edge-*` 改为 `max(native, system, safe-area, env)`，并保持 bottom nav `bottom: 0`，只用 padding/min-height 避让。
- 增加 native px -> CSS px 的 width-ratio 校验/换算。
- 增加默认关闭的 Debug-only 诊断色开关：decor 洋红、content 绿色、Web DOM lime。
- 更新本地 CDP 检查，覆盖 ratio metadata、edge max 变量、bottom nav 不抬高。

## Not In Scope

- 不修改 BLE 扫描、连接、notify、写入逻辑。
- 不修改协议帧、命令 HEX、回包等待策略。
- 不修改 `src/device/deviceController.ts`。
- 不修改 T-001/T-002/T-010。
- 不修改底层协议 Excel。
- 不纳入 `android/.idea/`。
- 不把普通业务命令改成等待回包。
- 不改控制面板按钮逻辑或 UI 业务层。

## Requirement Audit

| # | Requirement | Current Result | T-030 Action |
| --- | --- | --- | --- |
| 1 | 先检查 Capacitor 版本，v8 才加 SystemBars | 已确认 `@capacitor/core/android/cli` 均为 `8.3.1`；SystemBars 支持并已同步到 `capacitor.config.json` | 保留 `SystemBars` 配置，并在日志中记录版本依据 |
| 2 | 不随便在 WebView 装 no-op listener | 当前 T-029 有 WebView no-op listener | 删除 WebView listener；只在 DecorView 监听，避免覆盖 SystemBars parent listener |
| 3 | paint fallback 只能画系统栏区域且不影响点击 | 属性已设置为 non-click/focus/accessibility；层级仍需更稳 | 把 fallback view 放到内容背后或同等背板层，只按 insets 高度绘制 |
| 4 | edge-to-edge 尽量早初始化并立即 requestApplyInsets | `enableEdgeToEdge` 已早于 `super.onCreate()`；立即 request 不足 | `installEdgeToEdgeWindow()` 内立即 request decor insets，bridge/WebView ready 后再 request |
| 5 | 保留透明系统栏 fallback，但主路径不是 set colors | Theme 已保留透明栏 | 保留 XML fallback，不新增 legacy fullscreen path |
| 6 | `--edge-*` 必须 max(native, system, safe-area, env)，不相加 | 当前只有 max(native, safe-area) | 改 CSS 变量，保留 bottom nav `bottom:0`，不用 margin/bottom 抬高 |
| 7 | native px -> CSS px 后验证 innerWidth 与 webView width/density | 当前只有 density 换算 | 注入 `webViewWidthPx/density/window.innerWidth/ratio` 元数据；不匹配时用 width ratio 修正；加测试/报告 |
| 8 | 预留 Debug 诊断色开关，正式关闭 | 当前没有 | 增加 `EDGE_DIAGNOSTIC_COLORS = false`，仅 `BuildConfig.DEBUG && flag` 时启用；正式交付关闭 |
| 9 | 验收覆盖真机与自动化 | 当前自动化已覆盖，真机未复验 | 更新验收清单和报告，导出新 APK 后由用户真机复验 |
| 10 | 恢复内容左右宽度，不被 side inset 压缩 | 当前 `.shell` 和 `.bottom-nav` 把 `--edge-left/right` 叠加到左右 padding，可能被 vivo/Android 侧边 inset 压窄 | 拆分纵向避让与横向安全变量；主内容恢复原基础左右 padding，只在真实横向 cutout/system bar 时补安全区；本地 320/360/390 检查无横向压缩 |

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Capacitor support record | `.agent/logs/` after implementation | 记录 `@capacitor/core/android/cli@8.3.1` 与 SystemBars 支持依据。 |
| Native insets listener | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java` | 删除 WebView no-op listener；主 listener 保持在 DecorView；不返回 `CONSUMED`。 |
| Native paint fallback layer | `MainActivity.java` | 将 top/bottom paint views 放到 content 背后或不覆盖交互的背板层，继续限制高度为 top/bottom inset，保持 non-click/focus/accessibility。 |
| Early edge init | `MainActivity.java` | `WindowCompat.enableEdgeToEdge(window)` 后立即 request decor insets；WebView ready 后再 request。 |
| Width-ratio conversion | `MainActivity.java` / `src/app.ts` | 传入 raw px、density、webViewWidthPx、nativeCssWidth；Web 侧比较 `window.innerWidth`，不匹配时用 ratio 修正 CSS px。 |
| Diagnostic switch | `MainActivity.java` / `src/styles.css` / `src/app.ts` | 增加默认关闭的 Debug-only 诊断色路径：decor magenta、content green、DOM lime；交付 APK 必须保持关闭。 |
| CSS edge vars | `项目文件/android-mvp-capacitor/src/styles.css` | `--edge-* = max(var(--native-inset-*), var(--system-*), var(--safe-area-inset-*), env(safe-area-inset-*));`；bottom nav 保持 `bottom:0`。 |
| Content width restore | `项目文件/android-mvp-capacitor/src/styles.css` / `src/app.ts` | 将主内容左右 padding 与纵向 edge inset 解耦：`.shell` 恢复 14/12/10px 基础左右间距，不再叠加普通 `--edge-left/right`；如需横向安全区，使用独立的 cutout/system-bar-only 变量。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 增加 ratio conversion helper 单测；保留 CSS px string 单测。 |
| Reports | `.agent/reports/` | 更新 T-030 CDP 检查，校验 edge max、ratio metadata、bottom nav 未抬高、背景非透明、无横向溢出。 |
| Docs/task state | `todo.md`、`.agent/logs/`、必要时 `.agent/AI_CONTEXT.md` / `.agent/CHANGE_INDEX.md` | 实施后更新状态。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-030 edge-to-edge supplemental hardening | P0 | Proposed | Capacitor 8.3.1/SystemBars 支持已记录；WebView no-op insets listener 删除；DecorView listener 不消费且不覆盖 SystemBars parent listener；paint fallback 只绘制系统栏区域且不覆盖/影响 bottom nav；edge-to-edge 初始化后立即 request insets；透明 system-bar fallback 保留但主修复靠 edge-to-edge + insets + CSS 背景；`--edge-*` 使用 max(native, system, safe-area, env) 且 bottom nav `bottom:0`；px->CSS px 有 width-ratio 校验/测试；Debug 诊断色默认关闭；自动化与 APK 校验通过。 |

## Risks

- Capacitor SystemBars 在 WebView parent 上安装 listener；如果我们改到同一 parent 会覆盖它，所以 T-030 必须只监听 DecorView，或先明确比较对象后再动。
- paint fallback 如果放在前景层，可能视觉覆盖 bottom nav 的系统栏背景；因此要移动为 behind-content fallback。
- native/Web 宽度 ratio 在真实 WebView 上只能通过 runtime metadata 间接验证，本地 Chrome 只能验证 JS 计算路径。
- 诊断色开关必须默认关闭；否则交付 APK 会出现 magenta/green/lime 色块。

## Verification

实施后计划验证：

1. TDD 红灯：先补 ratio conversion / edge variable 行为测试，确认当前 T-029 不满足。
2. `npm.cmd test -- src/app.test.ts`
3. `npm.cmd test`
4. `npm.cmd run build`
5. `npm.cmd run sync`
6. 静态检查：
   - `@capacitor/core/android/cli` 版本为 8.x。
   - `capacitor.config.json` 有 `SystemBars.insetsHandling = "css"`。
   - 无 WebView no-op `setOnApplyWindowInsetsListener(webView, ...)`。
   - 无 `WindowInsetsCompat.CONSUMED`。
   - 无 legacy `SYSTEM_UI_FLAG_*` / `LAYOUT_FULLSCREEN` / `LAYOUT_HIDE_NAVIGATION`。
   - bottom nav CSS 保持 `bottom: 0`，不使用 `bottom: var(--edge-bottom)` 或 margin-bottom 抬高。
   - 诊断色 flag 为 false，正式 APK 不启用诊断色。
7. Chrome/CDP mobile layout check：
   - 320/360/390px。
   - 模拟 native/system/safe-area/env，不出现双倍 inset。
   - header 不压状态栏。
   - bottom nav 背景触达 viewport bottom，tab 内容避开 bottom inset。
   - `.shell` 内容宽度不被普通 side gesture inset 压缩；320/360/390px 下左右视觉间距恢复为基础 10/12/14px 档位。
   - ratio metadata 存在并符合预期。
8. Android build:
   - `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`
   - `aapt` 检查无 `testOnly`。
   - `apksigner verify --verbose` 通过。
9. 导出 `solar-remote-t030-sideload.apk`。
10. 真机验收清单：
   - vivo 手势导航：顶部和底部无黑条，手势横杠背后是页面/底栏背景。
   - vivo 三键导航：底部无纯黑断层。
   - Android 13/14：无顶部/底部黑条。
   - Android 15/16 targetSdk 35/36：内容不被状态栏/导航栏遮挡。

## Rollback

- 回退 T-030 在 `MainActivity.java` 中 listener、paint fallback、ratio conversion、diagnostic switch 的增量改动，恢复 T-029 状态。
- 回退 `src/app.ts` / `src/styles.css` / `src/app.test.ts` 的 T-030 增量。
- 保留 T-028 控制面板与 T-029 已验证 APK，不回滚 BLE、协议或 `deviceController.ts`。

## References

- Capacitor SystemBars 官方文档：`https://capacitorjs.com/docs/apis/system-bars`
- 本地 `node_modules/@capacitor/core/system-bars.md`
- 本地 `node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/plugin/SystemBars.java`

## Approval Gate

等待用户确认后，再修改 Android 原生、Capacitor/Web/CSS 和测试文件。
