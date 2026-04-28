# Plan - T-017 UI navigation bugs and compact layout polish

## Request

用户在 T-016 真机测试后反馈 7 个问题：

1. 连接后退出“设备状态”，点击“刷新”会重新进入上一个设备的“设备状态”。
2. Android 系统“返回上一级”会退出软件，而不是返回上一级页面。
3. 设备页单个设备卡片占位太大，希望接近 `HTML参考/app.html` 的小卡片。
4. 顶部 `9:41 / BLE / 5G / 92%` 是无用占位，应去掉。
5. 设备状态页右侧三个点和“等待操作”卡片可去掉。
6. 设备状态页详情卡片太大，需要浓缩信息并重新排版。
7. 整体文字偏大，需要缩小字号并重排。

## Root Cause Investigation

- 问题 1 根因：`刷新` 按钮当前绑定 `quickConnectPreferred()`；该方法在 `status.connected && ready` 时直接调用 `openControlPage()`，所以从控制页返回首页后点刷新会再次进入控制页。
- 问题 2 根因：当前 App 只有内部 `view` 状态，没有写入浏览器/WebView history，也没有监听 `popstate` 或 Android 返回事件；Capacitor WebView 在没有可回退 history 时会直接退出 App。
- 问题 3/6 根因：T-016 为了贴近参考图建立了较强的卡片视觉，但设备卡和详情卡仍保留大图、大字号、多行指标，单设备场景下空间效率低。
- 问题 4 根因：T-016 DOM 中手写了 `.status-bar` 模拟系统状态栏；真机系统已经显示时间/信号/电池，App 内重复显示无意义。
- 问题 5 根因：`.more-dot` 是参考稿视觉占位，当前没有对应功能；`.feedback-bar` 默认显示“等待操作”，作为全局反馈卡片占用空间。
- 问题 7 根因：标题、设备名、卡片指标、命令按钮字号偏大，移动端真实使用时信息密度不足。

## Proposed Scope

本次做一个 UI/导航修复小版本，继续保持 BLE、协议、控制器不变。

### 行为修复

- 把首页 `刷新` 从“快连/进详情”改为“仅刷新附近设备列表”。
- 新增 `refreshDeviceDiscovery()` 或等价方法：
  - 扫描 `AC632N_1`。
  - 更新设备列表。
  - 不自动进入控制页。
  - 已连接时不重连、不跳转。
- 保留已有自动连接能力，但限定在启动扫描/发现目标的流程中；`刷新` 不触发详情页跳转。
- 新增轻量返回栈：
  - `openControlPage()` 时写入 `history.pushState`。
  - 系统返回键触发 WebView history back 后回到首页。
  - App 内返回按钮与系统返回一致。
  - 首页根页面再按系统返回才允许退出。

### 视觉修复

- 删除 App 内模拟系统状态栏：去掉 `9:41 / BLE / 5G / 92%` DOM 和样式。
- 删除控制页右侧三个点占位。
- 删除“等待操作”默认卡片；反馈改为更轻的内联状态：
  - 首页可用扫描卡副文案/轻量提示表达状态。
  - 控制页保留命令结果区域，但不默认占用大卡片。
- 缩小整体字号：
  - 首页标题从约 36px 降到约 30-32px。
  - 设备名从约 18-22px 降到约 16-18px。
  - 正文/标签保持 12-14px。
- 压缩首页设备卡：
  - 图片缩小。
  - 只保留设备名、连接状态、序列号/RSSI、箭头。
  - 指标行改成紧凑两到三项，或只在已连接时显示。
- 压缩控制页设备详情卡：
  - 图片缩小到小图标级别。
  - 设备名、在线、电池、已开灯、固件/序列号整合到更短区域。
  - 状态指标改成更密集的 2 列小格，不再拉长页面。

## Out Of Scope

- 不改 BLE 扫描/连接原生实现。
- 不改 `src/device/deviceController.ts`。
- 不改协议命令、解析、帧格式。
- 不新增 `@capacitor/app` 依赖；优先用 WebView history 解决系统返回。
- 不新增场景页、我的页、OTA、高级设置。
- 不改 `底层协议/` 和 Excel 源文件。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Approval | `.agent/approvals/2026-04-28-t017-ui-navigation-polish.md` | 用户确认后记录审批。 |
| Plan | `.agent/plans/2026-04-28-t017-ui-navigation-polish.md` | 本方案。 |
| TODO | `todo.md` | 新增 T-017 Proposed。 |
| UI behavior | `项目文件/android-mvp-capacitor/src/app.ts` | 拆分刷新和快连逻辑；加入 history/back 处理；删除模拟状态栏/三点/默认等待卡片 DOM；压缩设备卡/详情卡结构。 |
| UI tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 先写失败测试：刷新已连接设备不应打开控制页；返回导航状态应从 control 回 home；参考 UI 不再包含模拟系统状态栏/三点占位。 |
| UI style | `项目文件/android-mvp-capacitor/src/styles.css` | 缩小字号、卡片高度、图片尺寸、间距；删除 `.status-bar` 和 `.more-dot` 相关样式；改反馈样式。 |
| Docs | `.agent/logs/`, `.agent/handoffs/`, `.agent/AI_CONTEXT.md`, `.agent/CHANGE_INDEX.md` | 实施后记录结果。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-017 UI 导航 bug 与紧凑排版修复 | P0 | Proposed | 点击首页“刷新”只刷新列表，不跳转设备状态；Android 系统返回从控制页回首页；去掉模拟系统状态栏、控制页三点、默认“等待操作”卡片；首页设备卡与控制页详情卡显著压缩；整体字号下调；保留 `AC632N_1` 白名单、自动连接、连接后读状态、5 条 MVP 命令和隐藏调试台；`npm.cmd test`、`npm.cmd run build`、390px 页面无横向溢出通过。 |

## Risks

- WebView history 方案依赖 Android WebView 对 `history.pushState` 的返回处理；通常可行，但真机仍需验证。
- 删除全局“等待操作”卡片后，首页操作反馈不能完全消失；需要把关键状态合并到扫描卡副文案或轻量提示中。
- 卡片压缩过度可能影响点击区域；需要保证主点击区域仍接近 44px 触控标准。
- `刷新` 不再自动跳转可能改变之前“快连最近”的行为；但符合用户这次对刷新语义的反馈。

## Verification

- TDD：
  - 先补 `app.test.ts` 行为/文案测试并确认失败。
  - 实现后确认测试转绿。
- 自动验证：
  - `npm.cmd test -- src/app.test.ts`
  - `npm.cmd test`
  - `npm.cmd run build`
- 浏览器布局验证：
  - Chrome CDP 390px 首页/控制页截图。
  - 检查 `scrollWidth === 390`。
- 真机验收：
  - 连接后返回首页，点“刷新”不进入设备状态。
  - 系统返回键从设备状态回首页。
  - 首页根页面再系统返回才退出。
  - 设备卡/详情卡更紧凑且可读。
  - 5 条 MVP 命令仍可发送。

## Rollback

- 回退本次 `app.ts`、`styles.css`、`app.test.ts` 和新增文档即可。
- 不使用 destructive Git 命令，不回滚用户已有 T-011/T-015/T-016 修改。

## Approval Gate

等待用户确认后再修改 UI 源码、样式和测试。
