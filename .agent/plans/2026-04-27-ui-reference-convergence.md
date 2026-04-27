# Plan - UI reference convergence

## Request

基于用户提供的 `HTML参考/app.html` 和图片素材，研究当前 Android MVP UI 应该如何处理，并把后续 UI 任务更新到 `todo.md`。

## Current Facts

- 当前主工程是 `项目文件/android-mvp-capacitor`，技术栈为 Capacitor + TypeScript + 原生 CSS，没有 React、Tailwind 构建链或图标库依赖。
- 当前 App 范围是两页：设备首页与设备详情控制页；调试台保留但默认隐藏。
- 当前 UI 已引用两张整页视觉稿 `public/assets/ui/01_device_home_page.png` 和 `public/assets/ui/02_device_detail_control_page.png`，但只是作为顶部裁切图片展示，还没有把参考稿的真实布局组件化落地。
- `HTML参考/app.html` 是完整移动端原型，包含设备列表、详情/控制、基础设置、时控、分段功率、OTA、主题切换等大量模块。
- `mppt_app_design_assets` 中有可复用素材：
  - `01_ui_pages/01_device_home_page.png`
  - `01_ui_pages/02_device_detail_control_page.png`
  - `02_device_assets/mppt_gray_black_controller_transparent.png`
  - `03_original_references/*`
- 当前协议层只稳定接入 5 条 MVP 命令：开/关、增加亮度、降低亮度、读参数、读状态。普通命令默认不等待回包，notify 到达后被动更新 UI。
- T-001/T-002 用户口头反馈“好像均没有问题”，但 TODO 不应伪造正式采样/复测记录。

## Visual Thesis

做一个克制的工业设备控制界面：浅色洁净底、深色 MPPT 设备图作为视觉锚点、蓝色表示连接/扫描状态、橙色只表示主操作和控制动作。

## Content Plan

- 首页：设备标题、扫描/连接状态、附近设备列表、当前连接设备摘要、进入控制页主按钮。
- 控制页：返回与设备名、连接状态、实时状态总览、5 条 MVP 命令控制区、隐藏调试入口。
- 不在 MVP 阶段展示场景页、我的页、OTA 页面、完整基础设置和未接入的高级参数。

## Interaction Thesis

- 扫描态使用稳定的状态条和按钮文案变化，不使用占位大图表达状态。
- 设备卡片点击即连接；已连接设备突出显示并允许进入控制页。
- 控制命令按钮保留发送中/成功/失败反馈，并与 `DeviceController` 当前 5 条业务方法一一对应。

## Proposed Scope

- 将参考 HTML/图片转化为当前两页 MVP 可实现方案。
- 后续实施时重构 `src/app.ts` 的 DOM 模板，使首页和控制页接近参考稿的信息层级。
- 后续实施时重写 `src/styles.css` 的视觉系统，使界面接近参考图但不直接依赖 Tailwind CDN。
- 把透明背景 MPPT 设备图复制到 `public/assets/ui/` 或等效静态资源目录，并在设备卡/详情页中使用。
- 保留现有 BLE/协议/命令调用链，不改业务语义。

## Out Of Scope

- 不接入 `HTML参考/app.html` 中的 OTA、场景页、我的页、完整参数设置、时段功率设置等未进入当前 MVP 的功能。
- 不新增 Tailwind、React 或额外 UI 框架。
- 不修改协议命令、BLE 原生插件、Excel 源协议文件。
- 不把整页 PNG 当成最终 UI 背景；图片只作为视觉参考和设备素材来源。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Plan | `.agent/plans/2026-04-27-ui-reference-convergence.md` | 记录 UI 收敛方案和实施边界。 |
| TODO | `todo.md` | 新增 T-011：基于 HTML/图片收敛两页 MVP UI；补充 T-001/T-002 口头反馈状态。 |
| UI structure | `项目文件/android-mvp-capacitor/src/app.ts` | 审批后调整首页/控制页 DOM 结构，保留现有事件和业务方法。 |
| UI style | `项目文件/android-mvp-capacitor/src/styles.css` | 审批后按参考稿重做移动端视觉系统、设备卡、状态总览、命令区和响应式布局。 |
| Assets | `项目文件/android-mvp-capacitor/public/assets/ui/` | 审批后加入透明背景 MPPT 设备图。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 审批后按新结构调整或补充 UI 行为测试。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-011 基于 HTML/图片收敛两页 MVP UI | P0 | Proposed | 首页和控制页按参考稿重构为真实 DOM UI；设备图素材接入；5 条 MVP 命令入口保留并反馈明确；调试台隐藏保留；不引入未接入协议功能；`npm.cmd test` 和 `npm.cmd run build` 通过；用浏览器截图检查移动端布局无重叠。 |

## Risks

- 参考 HTML 功能远超当前协议能力，照搬会造成不可用按钮和假功能。
- 当前源码已有未提交改动，实施时必须先完整读取目标文件并只做批准范围内的 UI 修改。
- 图片稿尺寸为移动端长图，不能直接裁切当界面；需要抽象为组件、状态和样式。
- 当前项目没有图标库；若不新增依赖，图标只能用 CSS/内联 SVG/文字符号实现。

## Verification

- `npm.cmd test`
- `npm.cmd run build`
- 本地浏览器检查至少 390px 手机宽度和桌面窄容器布局。
- 截图核对首页、控制页、连接态、未连接态、命令反馈态，确认文字不溢出、按钮不重叠。

## Rollback

- 撤销本次 UI 相关 `app.ts`、`styles.css`、`app.test.ts` 和新增素材文件即可回到当前 UI。
- 不使用 destructive Git 命令，不回滚用户已有改动。

## Approval Gate

本方案和 TODO 更新完成后等待用户确认；确认前不修改 UI 源码、样式、资源或测试。
