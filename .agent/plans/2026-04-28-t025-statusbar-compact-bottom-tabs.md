# Plan - T-025 Status Bar, Compact Detail, Bottom Tabs

## Request

用户希望继续做一版 UI 调整：

1. 再试一版渐变 UI，验证是否能延伸到 Android 系统顶部状态栏位置。
2. 设备详情页进入后，减少设备名称 `AC632N_1` 上方和详情内容之间的空白，让页面更紧凑。
3. 首次添加底部页面导航：`设备`、`场景`、`我的`。`场景` 页面先预留为空；`我的` 页面参考 `04_profile_settings_page.png` 添加基础信息。

## Current Facts

- 主工程：`项目文件/android-mvp-capacitor`。
- 当前页面渲染集中在 `src/app.ts`，样式集中在 `src/styles.css`。
- 当前详情页为连续布局：顶部按钮滚动到 `设备状态` / `控制面板` 锚点。
- 当前 Android 状态栏已经做过透明 / edge-to-edge / WebView 透明处理，但用户反馈 vivo 真机渐变未通过。
- 参考图路径：`mppt_app_design_assets/01_ui_pages/04_profile_settings_page.png`。
- 当前 BLE、协议、`deviceController.ts` 命令语义不需要调整。
- 当前工作区已有接手文档类改动，未涉及业务代码。

## Proposed Scope

- 做一版 UI/App-layer 和 Android 状态栏呈现调整。
- 添加底部三栏导航：
  - `设备`：承载现有设备列表和设备详情页，详情页仍保持 `设备` 高亮。
  - `场景`：新增预留页面，先保持极简空白状态。
  - `我的`：新增账号/设备概览/设置入口页面，视觉参考 `04_profile_settings_page.png`，但只做本地静态信息，不接入账号系统。
- 详情页压缩顶部间距：
  - 减少 control view 的顶部 padding。
  - 缩短详情 header 高度。
  - 缩小 `设备状态 / 控制面板` 锚点按钮与首个状态卡之间的间距。
  - 保持 Android 状态栏不遮挡标题。
- 状态栏渐变再试一版：
  - 保留现有 edge-to-edge 逻辑。
  - 增加 native window/decor 背景渐变或等效顶部背景兜底，让 vivo WebView 未能铺满时也能看到接近 App 的顶部渐变。
  - 同步 CSS 顶部背景层，避免 WebView 与 native 背景割裂。

## Not In Scope

- 不改 BLE 扫描、连接、写入或 notify 逻辑。
- 不改协议命令、帧解析、回包等待策略。
- 不改 `deviceController.ts`，除非实施中发现只改 UI 无法完成页面导航；如需改，先停下说明。
- 不覆盖底层协议 Excel。
- 不纳入 `android/.idea/`。
- 不新增真实账号、云端、场景自动化或权限系统。
- 不做 T-001/T-002 真机数据采样。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| App UI | `项目文件/android-mvp-capacitor/src/app.ts` | 增加顶层页面 tab 状态、底部导航渲染、`场景` 预留页、`我的` 页静态结构；保留设备详情的现有 BLE 控制入口 |
| App Style | `项目文件/android-mvp-capacitor/src/styles.css` | 增加底部导航、Profile 页面、Scene 预留页样式；压缩详情页顶部 spacing；增强顶部渐变背景 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 增加底部导航 copy/页面模式/详情页布局 chrome 的轻量单测 |
| Android | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java` | 再试一版 native status bar 背景兜底，优先保持现有 back dispatch 和透明栏逻辑 |
| Android Resources | `项目文件/android-mvp-capacitor/android/app/src/main/res/values/styles.xml` 或 `res/drawable/*` | 如需要，添加/引用顶部状态栏渐变背景资源 |
| Project Memory | `todo.md`、`.agent/logs/`、必要时 `.agent/AI_CONTEXT.md` / `.agent/handoffs/` | 实施完成后记录结果、验证和真机待验项 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-025 状态栏渐变、详情页压缩、底部三栏页面 | P1 | Proposed | 构建通过；底部导航包含设备/场景/我的；我的页参考图方向完成静态信息；详情页顶部更紧凑且不遮挡；状态栏渐变完成一版并标记需 vivo 真机复验 |

## Risks

- vivo WebView/系统状态栏可能仍不允许完全显示 App 渐变；本次只承诺再试一版并保留真机复验项。
- 底部导航会改变页面高度，需要额外检查滚动区域和按钮不被底栏遮挡。
- 详情页压缩不能过度，否则可能与系统状态栏或返回按钮重叠。
- `场景` 预留页如果完全空白，用户可能误以为未加载；本次按用户要求保持预留，不引入复杂说明。

## Verification

- `npm.cmd test -- src/app.test.ts`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run sync`
- 使用 Android Studio JBR 执行 `:app:assembleDebug`
- 如条件允许，使用浏览器/Playwright 或 Vite 本地页面检查移动宽度无横向溢出。
- 真机需用户复验：状态栏渐变是否进入系统顶部、详情页是否更紧凑、底部三栏是否符合预期。

## Rollback

- 回退本次涉及的 `app.ts`、`styles.css`、`app.test.ts`、Android 状态栏相关文件即可恢复到 T-022/T-024 后状态。
- 如果状态栏 native 兜底效果不好，可单独回退 Android 资源/MainActivity 部分，保留底部导航和页面压缩。

## Approval Gate

等待用户确认后再修改业务/UI/Android 文件。
