# Plan - T-026 Profile Density And Safe Bottom Navigation

## Request

用户反馈 T-025 真机效果与快照不一致：

- `我的` 页中“在线设备 / 可连接 / 离线”会上下排列，未保持并排。
- `我的场景` 变成 2x2，未保持一行并排。
- 底部三栏导航过大，且容易受 Android 系统底部导航栏干扰；希望参考 iOS 思路贴近底部但避开系统区域。
- 顶部状态栏区域也需要更稳，避免内容和系统状态栏互相干扰。
- 新增页面文字整体偏大，需要再收紧。

## Current Facts

- 主工程：`项目文件/android-mvp-capacitor`。
- T-025 已新增底部导航 `设备 / 场景 / 我的`、`场景` 预留页、`我的` 静态信息页、详情页顶部压缩和 Android native/window 渐变兜底。
- 当前 `styles.css` 在 `@media (max-width: 360px)` 中将 `.profile-device-stats` 放进单列规则，并将 `.profile-scene-grid` 改为 2 列，这是用户真机看到上下排列和 2x2 的直接原因。
- 当前底部导航 `.bottom-nav-item` `min-height: 52px`，底栏 padding 为 `9px 12px calc(9px + env(safe-area-inset-bottom))`，真机底部安全区叠加后视觉高度偏大。
- 本次只应调整 App/UI 层与必要的 CSS safe-area 表达；不应修改 BLE、协议命令、普通命令回包策略或 `deviceController.ts`。

## Goals

- 在窄屏手机上让 `我的设备` 始终一行 3 项。
- 在窄屏手机上让 `我的场景` 始终一行 4 项。
- 让底部三栏导航更接近 iOS tab bar 的紧凑体量，并通过 safe-area padding 避开系统底部导航栏。
- 收紧 `我的` 页新增内容的字号、图标、卡片间距和行高。
- 让顶部内容继续避开系统状态栏，同时保留 T-025 的渐变背景尝试。

## Proposed Scope

- UI/CSS 密度调整。
- `我的` 页少量展示文案缩短，用于保证 320/360/390px 宽度都能单行展示。
- 底部导航 safe-area 和高度调整。
- 单测中与 profile 文案/底栏结构相关的断言同步。
- 构建并导出新的非 `testOnly` sideload APK。

## Out Of Scope

- 不做 T-001/T-002 真机采样和命令复测。
- 不做 T-010 持续发现策略优化。
- 不改 BLE native plugin、协议 HEX、回包等待策略、`deviceController.ts`。
- 不继续覆盖或修改底层协议 Excel。
- 不纳入 `android/.idea/`。
- 不做新的详情页锚点逻辑，除非用户后续单独给信息。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Profile copy | `项目文件/android-mvp-capacitor/src/app.ts` | 将 profile 统计和场景标签缩短为更适合窄屏单行的文案，例如 `在线 / 可连 / 离线`、`夜间 / 日常 / 节能 / 高亮`；保留页面信息属性，不引入动态业务逻辑。 |
| Profile layout | `项目文件/android-mvp-capacitor/src/styles.css` | 移除或覆盖 360px 下 profile 统计单列、场景 2 列规则；使用 `repeat(3, minmax(0, 1fr))` 和 `repeat(4, minmax(0, 1fr))`，缩小 gap、图标、字号并避免换行撑开。 |
| Bottom navigation | `项目文件/android-mvp-capacitor/src/styles.css` | 建立更紧凑的 bottom tab 尺寸：更小图标/文字/内边距，使用 CSS 变量计算底部安全区和 shell padding，避免内容被 fixed bottom nav 或系统导航栏遮挡。 |
| Top safe area | `项目文件/android-mvp-capacitor/src/styles.css` | 微调 `--safe-top`、header min-height/padding，使标题不压系统栏，同时减少新增页面顶部空白。优先 CSS 解决，不扩大 Android native 改动。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 同步 profile 文案断言，必要时增加 bottom nav/profile copy 不触碰 BLE 命令路径的回归断言。 |
| Delivery | `交付物/`、`C:\solar-apk\` | 验证通过后导出 `solar-remote-t026-sideload.apk`，并确认 manifest 不含 `android:testOnly`。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-026 Profile 密度与安全底栏修正 | P1 | Proposed | 320/360/390px 检查 `我的设备` 为一行 3 项、`我的场景` 为一行 4 项；新增内容字号明显小于 T-025；底部导航紧凑且不遮挡内容；顶部内容不与系统状态栏重叠；测试/build/sync/APK 构建通过；不改 BLE/协议/`deviceController.ts`。 |

## Risks

- 320px 宽度下 4 个场景项会非常紧，必须依赖短标签、小图标和更小字号；如果用户坚持完整长文案，可能无法同时保证一行 4 项。
- Android WebView 对 `env(safe-area-inset-bottom)` 和 vivo 系统导航栏的处理可能与浏览器模拟不同，最终仍需真机截图确认。
- 顶部系统状态栏渐变是否真正铺满 vivo 状态栏仍受 OEM/WebView 控制；本轮以“不遮挡、少空白”为主要目标，不继续无边界尝试。

## Verification

- `npm.cmd test -- src/app.test.ts`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run sync`
- 使用 Android Studio JBR 临时 `JAVA_HOME` 执行 `gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`
- 验证导出的 APK manifest 不含 `android:testOnly`，并运行 `apksigner verify`
- 本地浏览器/Playwright 或 CDP 检查 320、360、390px profile/scene/device 页面：无横向溢出，profile 统计 3 列，profile 场景 4 列，底栏不遮内容

## Rollback

- 如真机效果仍不接受，回退本次 `app.ts`、`styles.css`、`app.test.ts` 的 T-026 改动，继续使用 T-025 版本 APK。
- 本次不碰 BLE/协议和 Android native 主逻辑，因此回滚范围应仅限 UI/CSS/测试与交付物。

## Approval Gate

等待用户明确确认后，再修改 `src/`、构建 APK 和更新完成记录。
