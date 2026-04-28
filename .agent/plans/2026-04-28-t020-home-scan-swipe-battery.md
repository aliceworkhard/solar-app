# Plan - T-020 Home Scan, Swipe, Battery Percent

## Request

用户要求在现有 T-019 基础上再做一版首页和设备状态页调整：

- 删除设备页“准备搜索附近设备”的整块 UI 卡片。
- 附近设备中，已连接设备的白色卡片必须 100% 不透明，未左滑时不能看到下面的“取消连接”。
- 优化向左滑出“取消连接”的动效。
- “取消连接”红色按钮四角全部改成圆角。
- Live Status 下方第三个 chip 从“刷新”改成“电量”，单位 `%`。
- 电量按电池电压换算：`3.4V = 100%`，`2.5V = 0%`，超过 `3.4V` 按 `100%`，低于 `2.5V` 按 `0%`。
- 设备查询连接设备时减少页面卡顿，让搜索在后台进行，发现可连接设备后再前台显示或自动连接。

## Current Facts

- T-019 已完成并推送，当前 BLE、协议、Android 原生逻辑不需要改。
- 首页仍渲染 `scan-card`，其中包含“准备搜索附近设备”相关文案和动画。
- `refreshScanControls()` 当前直接读取 `scanStateTitle` / `scanStateSub`，删除卡片后必须改成可选更新或移除依赖。
- `refreshDeviceDiscovery()` 当前 `await controller.scan(...)`，会等扫描窗口结束后再完成刷新流程，容易造成“页面在查询时卡住”的感受。
- 已连接设备左滑目前用 `.device-row-shell.swiped .device-item { transform: translateX(-96px); }`，动画较硬。
- `.device-swipe-action` 当前是 `border-radius: 0 18px 18px 0`，左侧是直角。
- Live Status 顶部已经有“最后刷新”，下方 chip 仍显示“刷新”。

## Proposed Scope

本次只做 UI/App 层改动：

- 首页设备搜索视觉精简。
- 已连接卡片左滑取消连接交互优化。
- Live Status 电量百分比显示。
- 首页刷新/查询改为后台扫描，不阻塞当前页面交互。
- 增加/调整单元测试覆盖新增行为。

本次不做：

- 不改 Android 原生 BLE 插件。
- 不改 UUID、写入方式、协议命令 HEX。
- 不改 `deviceController.ts` 的 BLE 扫描实现语义。
- 不改 5 秒读状态轮询策略。
- 不填 T-001/T-002 正式采样表。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Home UI | `项目文件/android-mvp-capacitor/src/app.ts` | 删除 `scan-card` 渲染；保留“附近设备”和刷新入口；`refreshScanControls()` 不再依赖已删除节点。 |
| Background scan | `项目文件/android-mvp-capacitor/src/app.ts` | 将手动刷新/查询改为后台启动扫描：快速返回 UI，扫描进度通过 `onProgress` 增量更新列表；有目标设备时继续走现有自动连接保护。 |
| Scan state guard | `项目文件/android-mvp-capacitor/src/app.ts` | 增加后台扫描 in-flight 判断，避免用户频繁点击刷新导致多个扫描叠加。 |
| Battery percent | `项目文件/android-mvp-capacitor/src/app.ts` | 新增电压转百分比 helper，并把 Live Status 下方第三个 chip 改成“电量”。 |
| Swipe behavior | `项目文件/android-mvp-capacitor/src/app.ts` | 保留现有阈值，必要时增加拖动中的状态类，避免点击和滑动互相干扰。 |
| Swipe visual | `项目文件/android-mvp-capacitor/src/styles.css` | 已连接设备卡片设置实色背景和不透明；取消连接按钮四角圆角；增加更顺滑的 transform/opacity 动效。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | TDD 先加失败测试，再实现：电量换算、Live Status chip 模型、后台扫描状态守卫、左滑阈值保持。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-020 首页搜索卡片移除、左滑动效、电量百分比和后台扫描优化 | P0 | Proposed | 首页不再出现“准备搜索附近设备”卡片；未左滑时看不到“取消连接”；左滑按钮四角圆角且动效顺滑；Live Status 下方显示电量百分比；刷新不会阻塞 UI，发现目标后列表更新或自动连接；测试和构建通过。 |

## Risks

- 删除扫描卡片后，扫描状态可见性会降低，需要保留轻量状态 chip 或刷新按钮状态，避免用户不知道是否在扫描。
- 后台扫描如果没有 in-flight 防重入，可能导致多次点击刷新触发并发扫描。
- 电量百分比是按用户给定公式计算，不代表真实电池 SOC 曲线；UI 文案应只显示为估算电量。
- 左滑按钮完全隐藏会降低可发现性，但符合当前需求。

## Verification

实施阶段按 TDD：

1. 先改 `src/app.test.ts`，新增失败测试。
2. 运行 `npm.cmd test -- src/app.test.ts`，确认按预期失败。
3. 实现 `src/app.ts` / `src/styles.css`。
4. 运行：
   - `npm.cmd test -- src/app.test.ts`
   - `npm.cmd test`
   - `npm.cmd run build`
   - `npm.cmd run sync`
5. 如本机 JBR 可用，再运行 Android Gradle debug 构建。
6. 真机验收：
   - 首页无搜索准备卡片。
   - 已连接卡片静止时不透出取消连接。
   - 左滑取消连接动效自然，红色按钮四角圆角。
   - Live Status 下方显示电量 `%`，电压到百分比符合公式。
   - 点击刷新时页面可操作，设备出现后列表更新或自动连接。

## Rollback

- 如 UI 回归，回退 `src/app.ts` 和 `src/styles.css` 中 T-020 的渲染/样式改动。
- 如后台扫描引发连接不稳定，保留视觉改动，单独回退 `refreshDeviceDiscovery()` 的后台化逻辑到 T-019 行为。
- 如电量百分比不符合真实业务，保留 helper，调整换算公式或改回显示电池电压。

## Approval Gate

等待用户明确回复“执行”或同等确认后，再修改业务文件。
