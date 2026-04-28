# Plan - T-016 UI reference realignment

## Request

用户已完成真机测试，功能效果可接受，但当前 UI “不好看”，并且与用户提供的参考图和 `HTML参考/app.html` 不契合。需要进一步修改和整理。

## Current Facts

- BLE、扫描、自动连接、`AC632N_1` 白名单、连接后发送一次读状态等主链路已经通过用户测试。
- 当前 UI 已完成 T-011 第一版 DOM 化，但视觉结果偏“工程调试面板”：英文标签较多、卡片层级重、设备首页和控制页与参考稿的信息密度/视觉比例不一致。
- 参考资产位置：
  - `mppt_app_design_assets/01_ui_pages/01_device_home_page.png`
  - `mppt_app_design_assets/01_ui_pages/02_device_detail_control_page.png`
  - `HTML参考/app.html`
  - `mppt_app_design_assets/02_device_assets/mppt_gray_black_controller_transparent.png`
- 当前项目技术栈仍是原生 TypeScript + CSS，不引入 Tailwind/React/图标库。
- 当前 MVP 仍只做 2 页：设备首页 + 设备详情控制页。
- 仍只允许 `AC632N_1` 显示/连接。
- UI 不直接解析 HEX，只通过 `DeviceController` 使用现有状态和 5 条命令。

## Design Decisions

- Color palette: 参考图浅灰背景 `#f5f7fb`、白色卡片、连接蓝 `#2388ff`、成功绿 `#17c77a`、控制橙 `#ff8a22`、正文深蓝黑 `#111827`。
- Typography: 保留本地可用字体栈，但减少英文装饰文案，界面主文案全部中文；字号、字重向参考稿靠拢。
- Spacing system: 移动端以 16px 页面边距、12/16/24px 卡片间距为主，减少当前大面积渐变和过厚卡片。
- Border-radius strategy: 页面卡片 16-20px，状态胶囊 8-12px，按钮 12px；避免当前过圆、过重的工业风。
- Shadow hierarchy: 使用非常轻的 iOS 风格阴影，强调设备卡和详情卡，不做大面积浮层阴影。
- Motion style: 保留轻量进入/按钮反馈；不新增复杂动效，优先稳定真机体验。

## Proposed Scope

本次只做 UI 参考稿二次对齐，不改 BLE、协议、控制器或 Android 原生层。

### 首页目标

- 顶部更接近参考图：状态栏、标题“设备”、副标题“连接并管理您的 MPPT 设备”、右侧 `+` 扫描按钮。
- 扫描状态卡改成参考图风格：蓝色圆形蓝牙标识 + “正在搜索附近设备...” / “准备搜索附近设备” + loading 状态。
- 附近设备列表改成参考图设备卡：左侧设备图，中间设备名/序列号/RSSI，右侧箭头/连接状态。
- 因当前只允许 `AC632N_1`，列表仍只显示一台目标设备；不为了贴图而展示假设备。
- 当前设备关键状态以参考图底部四格/六格指标条整理，不再做大面积设备海报卡。

### 控制页目标

- 顶部更接近参考图：返回箭头、居中设备名、已连接状态、右侧调试入口位置感。
- Segmented tabs 使用参考稿样式：`设备状态` / `控制面板`，但保持当前两页 MVP，不新增第三页。
- 设备详情卡重排：设备图、设备名、在线状态、电池/已开灯、序列号、固件、电池类型。
- 状态总览改成参考图的白色内嵌卡：当前模式、亮度、电压、电流、太阳能电压、最后刷新。
- 5 条 MVP 命令改造成“控制面板”区域的真实按钮，不再显得像调试命令表；文案保留清晰协议含义。
- 隐藏调试台继续保留，不作为主界面内容。

## Out Of Scope

- 不新增场景页、我的页、OTA、完整基础设置、时控设置、参数弹窗等未接入功能。
- 不新增 Tailwind、React、图标库或远程字体依赖。
- 不修改 `src/ble/`、`src/protocol/`、`src/device/deviceController.ts`。
- 不修改 Android 原生 BLE 插件、Gradle 配置、协议 Excel/源文件。
- 不伪造未实测字段；没有真实数据的字段显示 `-` 或沿用现有状态。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Plan | `.agent/plans/2026-04-28-ui-reference-realignment.md` | 记录本次二次 UI 对齐方案和边界。 |
| TODO | `todo.md` | 新增 T-016，状态为 Proposed，等待用户确认。 |
| UI structure | `项目文件/android-mvp-capacitor/src/app.ts` | 审批后重排首页/控制页 DOM，减少英文装饰文案，按参考稿组件层级组织。 |
| UI style | `项目文件/android-mvp-capacitor/src/styles.css` | 审批后重写主要视觉 token、卡片、设备列表、详情卡、指标区、按钮和移动端适配。 |
| UI tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 审批后补充或调整断言，确保仍只显示目标设备、5 条命令映射不变、素材路径不变。 |
| Assets | `项目文件/android-mvp-capacitor/public/assets/ui/` | 如需，仅复用已有透明设备图；不新增无来源图片。 |
| Logs | `.agent/logs/` | 实施完成后新增 session log。 |
| Handoff | `.agent/handoffs/` | UI 改动完成后写 UI handoff，方便下一个 agent 接力。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-016 UI 参考稿二次对齐 | P0 | Proposed | 首页和控制页在布局、卡片比例、颜色、文案层级上明显贴近 `01_device_home_page.png` 和 `02_device_detail_control_page.png`；只显示 `AC632N_1`；保留自动连接和读状态行为；保留 5 条 MVP 命令；隐藏调试台仍可用；`npm.cmd test`、`npm.cmd run build` 通过；移动端 390px 截图无横向溢出、重叠和截断。 |

## Risks

- 参考 HTML 里包含大量当前协议未接入功能，照搬会产生假功能；本次必须抽象视觉，不照搬功能。
- 当前工作区已有 T-011/T-015 未提交改动；实施时只在批准范围内继续修改，不回滚已有功能修复。
- 过度追求参考图可能压缩调试反馈入口；需要保留可见反馈条和隐藏调试入口，确保联调可用。
- 只显示 `AC632N_1` 与参考图多设备列表不完全一致，这是当前硬件验证策略决定的。

## Verification

- `npm.cmd test`
- `npm.cmd run build`
- 本地浏览器/Playwright 检查 390px 手机宽度：
  - 首页无横向滚动。
  - 控制页无横向滚动。
  - 设备卡、状态卡、命令按钮无重叠/截断。
- 真机复测：
  - 只显示 `AC632N_1`。
  - 自动连接仍正常。
  - 连接后仍发送一次读状态。
  - 从附近设备页点击已连接设备仍进入控制页。
  - 5 条 MVP 命令仍可发送。

## Rollback

- 如视觉方向不满意，回退本次对 `app.ts`、`styles.css`、`app.test.ts` 的改动即可。
- 不使用 destructive Git 命令，不回滚用户已有改动。

## Approval Gate

等待用户确认后再修改 UI 源码、样式和测试文件。
