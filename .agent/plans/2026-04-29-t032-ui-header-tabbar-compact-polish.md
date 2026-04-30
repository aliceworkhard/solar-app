# Plan - T032 UI Header / TabBar Compact Polish

## Request

用户反馈 T031 Final 系统栏已经明显改变，接下来做一轮 UI 细化：

1. 去掉 `设备 / 场景 / 我的 / 具体设备名` 标题下方贴着底层 UI 的矩形感。
2. 将 `设备 / 具体设备 / 场景 / 我的` 的标题整体再往顶部移动一点。
3. 将底部 `设备 / 场景 / 我的` TabBar 往下面移一点，让页面更贴底。
4. 进入具体设备页时默认选中并点亮 `设备状态`，后续点击 `控制面板` 时也要有明确选中态。

## Current Facts

- 当前 UI 入口在 `项目文件/android-mvp-capacitor/src/app.ts`，样式在 `项目文件/android-mvp-capacitor/src/styles.css`。
- 页面标题由 `.app-header`、`.page-title` 和 `.app-header::before` 控制；`.app-header::before` 当前绘制了一个覆盖标题区域的矩形背景层，可能是用户看到的“矩形”来源。
- 底部 TabBar 由 `.bottom-nav` 固定 `bottom: 0`，当前通过 `min-height` 和 `padding-bottom` 避让 `--edge-bottom`。
- 详情页按钮 `设备状态 / 控制面板` 当前 DOM 为 `.detail-tab-button`，但没有默认 active class，也没有 `aria-selected`，只在 hover/focus 时变亮。
- 详情页仍是锚点式连续页面，`设备状态` 和 `控制面板` 都在同一滚动页内，不应改回隐藏式 tab。
- 本次只做 UI/App 层；BLE、协议、普通命令回包策略、Android native edge-to-edge 和 `deviceController.ts` 不改。

## Proposed Scope

本次做：

- 移除或透明化标题区下方产生矩形感的 header 背景层，保留页面整体浅蓝渐变。
- 对 `home/detail/scene/profile` 四类 header 用一组更紧凑的 top padding / min-height，让标题整体更靠近顶部，但仍通过 `--edge-top` 避开状态栏。
- 微调 bottom TabBar：
  - 保持 `bottom: 0`。
  - 降低底部额外内边距，让 TabBar 视觉上更贴底。
  - 图标和文字仍避开手势横杠，不进入不可点区域。
- 为详情锚点按钮增加状态：
  - 默认 active 为 `status`，点亮 `设备状态`。
  - 点击 `控制面板` 后切换 active，并滚动到对应锚点。
  - 返回或重新进入详情页时默认回到 `设备状态` active。
  - 增加 `aria-selected` / `aria-current`，让选中态明确。
- 更新自动布局检查，覆盖 320/360/390px：
  - 标题上移但不撞状态栏。
  - header 下方不出现独立矩形背景层。
  - bottom nav 到底且 active item 不被 bottom inset 遮挡。
  - 详情页默认 `设备状态` active。

本次不做：

- 不改 BLE、Android BLE 插件、协议 HEX、回包等待策略。
- 不改 `src/device/deviceController.ts`。
- 不改 T-001/T-002/T-010。
- 不改 Android native edge-to-edge 逻辑。
- 不导入新的 UI 库或图标库。
- 不改变详情页为隐藏式 tab；仍保持连续页面 + 锚点滚动。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Detail tab state | `项目文件/android-mvp-capacitor/src/app.ts` | 增加 `activeDetailSection` 状态，默认 `status`；渲染 `.detail-tab-button.active`、`aria-selected`；点击锚点按钮时切换状态并滚动。 |
| UI copy/model tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | TDD 先补默认详情 active 为 `status`、切换目标合法化/回退逻辑等纯函数测试。 |
| Header compacting | `项目文件/android-mvp-capacitor/src/styles.css` | 统一调小 `.app-header.home/detail/scene/profile` 的 `min-height` 和 top/bottom padding；移除或弱化 `.app-header::before` 的矩形背景层。 |
| Detail tabs style | `项目文件/android-mvp-capacitor/src/styles.css` | 为 `.detail-tab-button.active` 增加明确点亮样式；与 hover/focus 区分；保持紧凑。 |
| Bottom nav placement | `项目文件/android-mvp-capacitor/src/styles.css` | 保持 `bottom:0`，减少额外 bottom padding/min-height，使底栏更贴底但仍避让 `--edge-bottom`。 |
| Layout report | `.agent/reports/` | 新增 T032 layout check 脚本/结果/截图，检查标题位置、底栏位置、详情默认 active。 |
| Delivery | `交付物/`, `C:\solar-apk\` | 验证通过后导出 `solar-remote-t032-sideload.apk`。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-032 UI Header / TabBar Compact Polish | P0 | Proposed | 标题下方矩形感去除；四类页面标题上移但不被状态栏遮挡；bottom TabBar 更贴底且不遮挡手势栏；详情页默认点亮 `设备状态`，点击 `控制面板` 能切换点亮；本地 320/360/390px 布局检查、`npm test`、build、sync、assembleDebug、aapt、apksigner 通过；BLE/协议/deviceController 不改。 |

## Risks

- 标题继续上移可能在不同 vivo 状态栏高度下接近系统图标，需要用 `--edge-top` 保守约束。
- 底栏下移如果减少 padding 过多，三键导航或手势横杠可能遮住文字；需要模拟 bottom inset 并让 active item bottom 留出余量。
- 用户说的“矩形”可能来自 header 背景层，也可能来自某个反馈 chip。第一版优先处理 header 背景层和标题下方视觉断层；如果真机仍指向某个具体 chip，再单独小改。

## Verification

- TDD:
  - 新增默认详情 active section 测试，先红后绿。
  - 新增非法 detail target 回退到 `status` 的测试。
- Commands:
  - `npm.cmd test -- src/app.test.ts`
  - `npm.cmd test`
  - `npm.cmd run build`
  - `npm.cmd run sync`
  - `node .agent/reports/2026-04-29-t032-ui-compact-layout-check.cjs`
  - `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`
  - `aapt dump xmltree ... AndroidManifest.xml | Select-String testOnly`
  - `apksigner verify --verbose ...`

## Rollback

- 如标题过高或底栏过低，可只回退 T032 的 CSS spacing 与 detail active state 修改，保留 T031 Final edge-to-edge / native strip 改动。
- 如真机指出“矩形”不是 header 背景层，保留 T032 其他通过项，再针对具体元素写下一版小方案。

## Approval Gate

等待用户确认后再修改 `src/app.ts`、`src/styles.css`、测试、报告脚本或导出 APK。
