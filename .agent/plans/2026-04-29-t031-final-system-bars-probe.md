# Plan - T031 Final System Bars Probe + Visual Fallback

## Request

T030 后主内容左右压缩已恢复，但 vivo 真机顶部状态栏和底部导航/手势栏仍然没有可观察变化，仍然表现为黑色。T031 不再继续做纯 CSS / 纯 inset 细修，而是最后一次证明系统栏控制链路是否命中，并在不可控时提供可交付视觉兜底。

## Current Facts

- 主工程：`项目文件/android-mvp-capacitor`。
- 当前 `compileSdkVersion = 36`，`targetSdkVersion = 36`。
- 当前 Capacitor 版本已确认：
  - `@capacitor/core@8.3.1`
  - `@capacitor/android@8.3.1`
  - `@capacitor/cli@8.3.1`
- 当前 `capacitor.config.ts` 仍有 `SystemBars.insetsHandling = "css"`。
- T030 已完成：
  - `WindowCompat.enableEdgeToEdge(window)` 早期调用。
  - 删除 WebView no-op insets listener。
  - 主 listener 在 DecorView，不消费 insets。
  - `--edge-* = max(native, system, safe-area, env)`。
  - raw px + density + WebView width ratio fallback。
  - `.shell` 左右宽度恢复基础档位，不再被 ordinary side gesture inset 压缩。
- 用户反馈：即使 T030 做完，顶部/底部仍完全没有变化；问题很可能不在 Web CSS，而在 Activity/system bars 控制链路、后续覆盖、native strip 层级、安装 APK 命中、或 vivo/system 限制。
- 官方文档依据：
  - Android 15+ target SDK 35+ 默认/强制 edge-to-edge；gesture navigation status/nav bar 透明，三键导航可能有 translucent scrim。
  - Android 16 target SDK 36 下 `windowOptOutEdgeToEdgeEnforcement` 已禁用，不能靠 opt-out 回退。
  - Android 15 行为变更中，`setStatusBarColor` 对 Android 15 状态栏无效，gesture navigation 下 `setNavigationBarColor` 也不可靠。
  - Capacitor v8 `SystemBars` 随 `@capacitor/core` 捆绑，`insetsHandling` 支持 `css` 与 `disable`。

## Proposed Scope

本次做 T031，作为最后一版系统栏诊断和视觉兜底任务：

1. 增加 T031 build identity，证明 vivo 上运行的是本 APK 和本 Activity。
2. 增加明显颜色 Probe 模式，证明 Activity 是否能控制 system bar color / transparent area / native strip。
3. T031 Probe 阶段临时隔离 Capacitor SystemBars CSS 注入，把系统栏控制权集中到 native。
4. 把 top/bottom system bar strip 改为 DecorView 前景层，但只覆盖系统栏高度，non-click/focus/accessibility，不能覆盖正文和底部 Tab 图标文字。
5. 把系统栏配置集中到 `applyT031SystemBars(stage)`，在多个生命周期重复应用并输出 log。
6. 增加三种最终策略常量：
   - `TRANSPARENT_EDGE`
   - `COLOR_MATCH_SAFE`
   - `VISUAL_FALLBACK`
7. 增加 Web `solarRemoteSetEdgeMode(mode)` 和 CSS visual fallback 模式。
8. 先输出 `solar-remote-t031-probe.apk`；用户根据 vivo 真机现象反馈 A/B/C/D 后，同一个 T031 再输出最终 `solar-remote-t031-sideload.apk`。

## Not In Scope

- 不修改 BLE 扫描、连接、notify、写入逻辑。
- 不修改协议帧、命令 HEX、回包等待策略。
- 不修改 `src/device/deviceController.ts`。
- 不修改 T-001/T-002/T-010。
- 不修改底层协议 Excel。
- 不纳入 `android/.idea/`。
- 不把普通业务命令改成等待回包。
- 不继续做没有诊断依据的 CSS/inset 细修。

## Probe Classification

| Result | Meaning | T031 Final Action |
| --- | --- | --- |
| A | 顶部/底部系统栏颜色变成 Probe 黄/洋红 | `COLOR_MATCH_SAFE`：系统栏颜色匹配页面背景/底栏背景 |
| B | 系统栏颜色未变，但系统栏背后出现 cyan/green strip | `TRANSPARENT_EDGE`：透明 edge-to-edge + native strip fallback |
| C | 黄/洋红无效，cyan/green strip 也不可见，仍黑 | `VISUAL_FALLBACK`：不继续死磕透明，UI 上下收紧并做浅/深色协调 |
| D | logcat/Web console 没有 `T031-system-bars-final` | 先停下，排查 APK 未更新、Activity 未命中、Gradle sync/install 错误 |

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Build identity | `MainActivity.java` / `src/app.ts` | 增加 `EDGE_BUILD_ID = "T031-system-bars-final"`；onCreate/onResume/onWindowFocusChanged log；注入 `document.documentElement.dataset.edgeBuild` 和 `window.__edgeBuildId`；Web console 输出 `[EdgeT031]`。 |
| Lifecycle system bar apply | `MainActivity.java` | 新增 `applyT031SystemBars(stage)`，在 super 前、after-super、bridge-ready、onResume、window-focus、postDelayed 100/500ms 调用；统一设置 decorFits、enableEdgeToEdge、transparent/fallback colors、contrast、cutout、icon color、requestApplyInsets，并记录 stage/statusColor/navColor。 |
| Probe colors | `MainActivity.java` / build-time constants | Debug-only `EDGE_PROBE_COLORS`：status yellow、navigation magenta、top strip cyan、bottom strip green、DOM light blue；formal sideload 必须 false。 |
| Foreground system bar strips | `MainActivity.java` | `topSystemBarStrip` / `bottomSystemBarStrip` 加到 DecorView 前景层并 `bringToFront()`；高度只等于 system bar inset；non-click/focus/accessibility；不能覆盖 header 正文或 bottom nav 图标文字。 |
| SystemBars isolation | `capacitor.config.ts` | Probe 阶段把 `SystemBars.insetsHandling` 设为 `"disable"`，避免 Capacitor parent listener/CSS 注入干扰定位；最终是否恢复 `"css"` 取决于 Probe 结果。 |
| Theme hard cleanup | `android/app/src/main/res/values*/*.xml` | 搜索并清理黑色 system-bar/theme 回退；保留透明状态/导航栏 fallback、浅色 icon flags、contrast=false；不得使用 `windowOptOutEdgeToEdgeEnforcement`。 |
| Edge strategy | `MainActivity.java` / `src/app.ts` | 增加 `EdgeStrategy`，native 发布 mode 到 Web：`transparent` / `color-match` / `visual-fallback`。 |
| Visual fallback CSS | `src/styles.css` | 增加 `body.edge-visual-fallback`：顶部 header 更贴近外侧、底部 nav 更贴底但不进入手势区域；深色模式与黑色系统栏协调；浅色模式匹配页面背景。 |
| Tests | `src/app.test.ts` | TDD 增加 build id、edge mode class、probe/fallback mode、content width 不回退、release 禁止 probe 色相关断言。 |
| Reports | `.agent/reports/` | 新增 T031 report，记录官方依据、local checks、Probe A/B/C/D 结果、最终策略、SystemBars 是否禁用/恢复。 |
| APK export | `交付物/` and `C:\solar-apk\` | 先导出 `solar-remote-t031-probe.apk`；Probe 结果确认后导出 `solar-remote-t031-sideload.apk`。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-031 Final System Bars Probe + Visual Fallback | P0 | Proposed | 生成 T031 Probe APK；vivo logcat/Web console 能看到 `T031-system-bars-final`；Probe 至少出现系统栏变色、native strip 可见或 visual fallback 生效之一；如果完全没变化，暂停排查 APK/Activity 命中而不是继续 CSS；最终 APK 无黄/洋红/青/绿 Probe 色；T030 左右宽度恢复不回退；BLE/协议/`deviceController.ts` 不改；`npm.cmd test`、build、sync、assembleDebug、aapt 无 `testOnly`、apksigner verify 通过。 |

## Risks

- 本地 Chrome 无法验证 vivo system bar 是否可控；T031 必须依赖用户真机 Probe 反馈 A/B/C/D 决定最终策略。
- Foreground strip 虽然只覆盖系统栏高度且不可点击，但仍需本地布局检查确认不会覆盖 header 正文或 bottom nav 图标文字。
- Probe 阶段禁用 `SystemBars.insetsHandling=css` 后，Web safe-area 注入来源切换为 native bridge；必须确认 T030 左右宽度恢复和 bottom inset 避让不回退。
- 如果 Probe D，继续做 UI/CSS 没有意义，必须先解决安装/Activity/logcat 命中问题。
- Android 15/16 上 system bar color API 可能部分无效；所以 Probe 结果可能只能证明“不可控”，不能强行承诺无黑条。

## Verification

实施后计划：

1. TDD 红灯：先写 build id / edge mode / visual fallback / release no-probe-colors 测试，确认当前 T030 不满足。
2. `npm.cmd test -- src/app.test.ts`
3. `npm.cmd test`
4. `npm.cmd run build`
5. `npm.cmd run sync`
6. 静态检查：
   - `targetSdkVersion = 36`
   - 无 `windowOptOutEdgeToEdgeEnforcement`
   - formal APK `EDGE_PROBE_COLORS = false`
   - no legacy `SYSTEM_UI_FLAG_*`
   - no `WindowInsetsCompat.CONSUMED`
   - no WebView no-op listener
   - no black `statusBarColor/navigationBarColor`
7. Chrome/CDP local layout check：
   - 320/360/390px。
   - `.shell` 左右基础宽度仍保持 T030 状态。
   - foreground strip 模拟高度不覆盖 header/body/bottom nav 文本图标。
   - `edge-visual-fallback` class 能改变顶部/底部紧凑度。
8. Android build:
   - `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`
   - `aapt` 无 `testOnly`
   - `apksigner verify --verbose`
9. 真机 Probe 验收：
   - logcat 出现 `EdgeT031`。
   - Web console 或 DOM dataset 出现 `T031-system-bars-final`。
   - 记录 A/B/C/D。
10. 最终 APK 验收：
   - 无 Probe 色。
   - 根据 A/B/C/D 选择最终策略并记录。

## Rollback

- 回退 T031 的 build identity、probe colors、foreground strips、strategy mode、visual fallback CSS 和 SystemBars `disable` 改动，恢复 T030 状态。
- 保留 T030 的左右宽度修复、raw px ratio fallback 和 no WebView listener 改动，除非用户明确要求整体回退。
- 不回退 BLE、协议或 `deviceController.ts`，因为本任务不会修改它们。

## References

- Android edge-to-edge Views guidance: https://developer.android.com/develop/ui/views/layout/edge-to-edge
- Android 15 behavior changes: https://developer.android.com/about/versions/15/behavior-changes-15
- Android 16 behavior changes: https://developer.android.com/about/versions/16/behavior-changes-16
- Capacitor SystemBars v8 docs: https://capacitorjs.com/docs/apis/system-bars

## Approval Gate

等待用户明确确认后，再修改 Android 原生、Capacitor 配置、Web/CSS、测试和构建交付文件。
