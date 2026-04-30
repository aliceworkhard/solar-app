# Plan - T033 Edge Spacing Micro Adjust

## Request

用户在 T032 APK 后反馈：

1. 顶部 UI / 页面内容还可以再往顶部移动一点点。
2. 底部状态栏 / TabBar 还可以再往底部移动一点点。
3. 左右两边现在空出位置稍多，希望两侧内容稍微展开一点。

## Current Facts

- 当前主工程：`项目文件/android-mvp-capacitor`。
- T032 已完成：
  - 关闭 `.app-header::before` 矩形背景层。
  - home 状态提示改为无卡片文字行。
  - bottom TabBar 保持 `bottom:0`。
  - 详情页默认 `设备状态` active。
- T032 自动布局结果：
  - 320/360/390px 无横向溢出。
  - 模拟 top inset 32px 时标题 top 为 `34px`。
  - 模拟 bottom inset 24px 时 bottom nav padding-bottom 为 `20px`，active tab bottom 为 `880px`。
  - shell 左右 padding：320/360px 为 `10px`，390px 为 `12px`。
- 当前 CSS 关键值：
  - `.app-header.home` padding top 为 `edge-top + 2px`，bottom 为 `8px`。
  - `.app-header.detail` padding top 为 `edge-top`，bottom 为 `3px`。
  - `.app-header.scene/profile` padding top 为 `edge-top + 2px`，bottom 为 `7px`。
  - `.bottom-nav` padding-bottom 为 `edge-bottom - 4px`，最小 `4px`。
  - `.shell` 基础左右 padding 为 `14px`，窄屏 media 下为 `12px`；更早的 360px 检查期望会落到 `10px`。
- 本次只做 UI spacing；BLE、协议、Android native edge-to-edge、`deviceController.ts` 不改。

## Proposed Scope

本次做：

- 顶部再小幅上移：
  - home / scene / profile header 顶部额外量从 `+2px` 调到 `0px` 或接近 `0px`。
  - detail header 仅微调 bottom / min-height，避免 `AC632N_1` 撞状态栏。
  - 保持 `--edge-top` 仍然参与计算，不使用硬编码状态栏高度。
- 页面内容跟随标题微上移：
  - 适度缩小 header bottom padding 或 main gap，目标是整体上移 2-4px。
- 底部 TabBar 再小幅下移：
  - 保持 `.bottom-nav { bottom: 0; }`。
  - 将 bottom padding 再收紧约 2px，例如从 `edge-bottom - 4px` 到 `edge-bottom - 6px`，仍保留最小安全 padding。
  - 不让图标/文字压到手势横杠。
- 左右内容稍微展开：
  - 微调 `.shell` 窄屏左右 padding，目标 320/360px 约少 1-2px，390px 约少 1-2px。
  - 不改变普通 side gesture inset 不参与左右压缩的 T030 结论。
- 更新 T032 layout check 为 T033：
  - 允许标题 top 从 34px 下探到约 32px，但不小于模拟 top inset。
  - bottom nav 仍贴底。
  - active tab bottom 仍保留安全余量。
  - shell padding 符合新的稍宽布局。
- 导出 `solar-remote-t033-sideload.apk`。

本次不做：

- 不改 BLE、协议 HEX、普通命令是否等待回包。
- 不改 Android native edge-to-edge / MainActivity / Capacitor SystemBars。
- 不改 `src/device/deviceController.ts`。
- 不改详情页结构，不做新的控件设计。
- 不改 T-001/T-002/T-010。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Header micro spacing | `项目文件/android-mvp-capacitor/src/styles.css` | 微调 `.app-header.home/detail/scene/profile` 的 top/bottom padding 和必要的 min-height，让标题/页面内容再上移约 2-4px。 |
| Main/shell horizontal spacing | `项目文件/android-mvp-capacitor/src/styles.css` | 窄屏 shell 左右 padding 轻微减少，让两侧内容稍微展开，仍保持无横向溢出。 |
| Bottom TabBar micro spacing | `项目文件/android-mvp-capacitor/src/styles.css` | 保持 `bottom:0`，轻微减少 bottom padding，让底部 tab 内容再贴底约 2px。 |
| Layout check | `.agent/reports/` | 新增 T033 layout check 和结果，验证 320/360/390px 的顶部、底部和左右宽度。 |
| Delivery | `交付物/`, `C:\solar-apk\` | 验证通过后导出 `solar-remote-t033-sideload.apk`。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-033 Edge Spacing Micro Adjust | P0 | Proposed | 顶部标题/内容比 T032 再上移一点但不被状态栏遮挡；bottom TabBar 仍 `bottom:0` 且内容更贴底但不被手势栏遮挡；左右内容比 T032 稍微展开且无横向溢出；不改 BLE/协议/Android native/`deviceController.ts`；`npm test`、build、sync、layout check、assembleDebug、aapt、apksigner 通过。 |

## Risks

- 顶部继续上移空间很小；如果真机状态栏高度比模拟值更大，过度压缩可能接近系统图标。
- 底部继续下移可能在手势导航下更贴近横杠，需要保留最小安全余量。
- 左右展开过多会增加 320px 小屏横向溢出风险，因此只做 1-2px 级别调整。

## Verification

- `npm.cmd test -- src/app.test.ts`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run sync`
- `node .agent/reports/2026-04-30-t033-edge-spacing-layout-check.cjs`
- `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`
- `aapt dump xmltree ... AndroidManifest.xml | Select-String testOnly`
- `apksigner verify --verbose ...`

## Rollback

- 若真机反馈顶部太靠上或底部太贴手势栏，只回退 T033 的 spacing 数值，保留 T032 的矩形去除和详情 active tab 逻辑。

## Approval Gate

等待用户确认后再修改 `src/styles.css`、layout check、文档记录或导出 APK。
