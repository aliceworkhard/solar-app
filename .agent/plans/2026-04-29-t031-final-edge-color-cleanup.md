# Plan - T031 Final Edge Color Cleanup

## Request

vivo 真机安装 T031 Probe 后，顶部出现青色、底部出现绿色。该结果证明 Activity / native strip 的系统栏绘制链路已经生效。下一版需要关闭 Probe / Diagnostic 颜色，保留已生效的 edge-to-edge + native strip 方案，并输出正式浅色协调版 APK。

## Current Facts

- T031 Probe build id：`T031-system-bars-final`。
- Probe 真机结果：顶部青色、底部绿色可见，属于 T031 Probe 的 B 类结果：transparent edge-to-edge 成功，native strip fallback 可见。
- 当前 `MainActivity.java` 中 `EDGE_PROBE_COLORS = true`，Probe 色通过 `shouldUseProbeColors()` 在 Debug APK 中生效。
- 当前 native strip 只覆盖系统栏 inset 高度，未扩大到正文区域；这个结构应该保留。
- 当前 `capacitor.config.ts` 在 Probe 阶段设置 `SystemBars.insetsHandling = "disable"`，由 native 统一控制系统栏。
- 当前 Web 侧存在 `edge-visual-fallback` 和 diagnostic DOM overlay 逻辑；最终正式 APK 不应默认进入 visual fallback 或显示诊断背景。
- BLE、协议 HEX、普通命令不等待回包策略、`deviceController.ts` 均不属于本次范围。

## Proposed Scope

本次做：

- 固定最终系统栏策略为 `TRANSPARENT_EDGE_WITH_STRIPS`。
- 强制关闭 Probe 色：`EDGE_PROBE_COLORS = false`。
- 保留 Debug 可手动恢复诊断色的代码结构，但默认和交付 APK 都不可显示诊断色。
- 将 top/bottom native strip 改成真实浅色 UI 背景。
- 将 window/decor/content/WebView native fallback 背景统一为真实浅色，避免中间灰蓝发闷。
- Web/CSS 恢复浅色层次背景；底部 TabBar 继续 `bottom: 0`，用 padding/min-height 避让 bottom inset。
- App/JS 默认只进入 `transparent` edge mode，不默认进入 `visual-fallback` 或 probe/diagnostic 模式。
- 导出 `solar-remote-t031-sideload.apk`，不带黄/洋红/青/绿诊断色。

本次不做：

- 不改 BLE 扫描、连接、写入、notify。
- 不改协议帧、命令 HEX、回包等待策略。
- 不改 `src/device/deviceController.ts`。
- 不做 T-001/T-002 采样复测。
- 不覆盖底层协议 Excel。
- 不纳入 `android/.idea/`。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Android system bars | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java` | 增加/改名最终策略 `TRANSPARENT_EDGE_WITH_STRIPS`；关闭 `EDGE_PROBE_COLORS`；将 status/nav fallback、top/bottom strip、window/decor/content/WebView 背景统一到浅色 UI 色；保持 strip 只覆盖 inset 高度且不可点击/聚焦/无障碍不可见。 |
| Capacitor config | `项目文件/android-mvp-capacitor/capacitor.config.ts` | 保持 T031 Final 由 native 主控。暂不恢复 SystemBars CSS 注入，避免和 native strip 再次竞争；文档中说明该选择。 |
| Web edge mode | `项目文件/android-mvp-capacitor/src/app.ts` | 保留 build id 和 edge mode bridge；默认透明模式；诊断 DOM overlay 只在 native 明确传入 `diagnosticColors=true` 时生效，Final 中该值应为 false。 |
| CSS backgrounds | `项目文件/android-mvp-capacitor/src/styles.css` | 统一 `html/body/#app/.shell` 浅色渐变背景；移除默认 visual fallback 深色路径影响；bottom nav 背景和 bottom edge 背景匹配浅色系统栏。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | TDD 先补测试：默认 edge mode 不是 visual fallback；diagnosticColors false 时 DOM 背景透明；最终模式不会添加 probe/diagnostic 类；必要时补 CSS/static check 脚本。 |
| Verification report | `.agent/reports/` | 新增 T031 Final 布局/静态检查报告，确认诊断色不在最终可见路径中。 |
| Delivery | `交付物/`, `C:\solar-apk\` | 输出 `solar-remote-t031-sideload.apk`，记录 SHA256、manifest、签名检查结果。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-031 Final Edge Color Cleanup | P0 | Proposed | 正式 APK 顶部不再青色、底部不再绿色；无黄/洋红/青/绿诊断色；状态栏背后为页面浅色背景；手势横杠背后为底栏浅色背景；页面主体恢复浅色层次；左右宽度保持 T030 修复；`npm test`、build、sync、assembleDebug、aapt 无 testOnly、apksigner verify 通过。 |

## Risks

- Android 15/16 对 `setStatusBarColor` / `setNavigationBarColor` 的行为会弱化，但 Probe 已证明 native strip 可见，所以最终以 strip 为主、system bar color 只作为兼容 fallback。
- 如果 WebView 背景设为浅色后与页面渐变略有色差，需要以 CSS 背景为主调整，不扩大 strip 高度。
- 保留诊断代码但默认关闭，需用静态检查和运行时测试避免 Probe 色泄漏。

## Verification

- TDD red/green：
  - 先写测试证明最终默认模式不是 `visual-fallback`。
  - 先写测试证明 diagnosticColors false 时 DOM overlay 为透明。
  - 先写测试证明未知 mode 会回落到 `transparent`。
- Commands:
  - `npm.cmd test -- src/app.test.ts`
  - `npm.cmd test`
  - `npm.cmd run build`
  - `npm.cmd run sync`
  - `node .agent/reports/<t031-final-layout-check>.cjs`
  - `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`
  - `aapt dump xmltree ... AndroidManifest.xml | Select-String testOnly`
  - `apksigner verify --verbose ...`
- Static checks:
  - Final visible/default path不得出现 `EDGE_PROBE_COLORS = true`。
  - Probe 色 `#00FFFF/#00FF00/#FF00FF/#FFFF00` 或 `Color.CYAN/GREEN/MAGENTA/YELLOW` 只允许保留在 `shouldUseProbeColors()` guarded fallback 中，且常量开关为 false。

## Rollback

- 如最终浅色不协调，可回退到当前 T031 Probe 前的策略文件状态，但保留 Probe 结论；不要重新走深色 fallback，除非真机显示浅色 strip 不可见或系统 ROM 覆盖。
- 如 APK 安装异常，先复用 T031 Probe 的 build identity/log 方案定位安装包是否命中。

## Approval Gate

等待用户明确确认后再修改 Android 原生文件、Web 源码、CSS、构建配置或导出正式 APK。
