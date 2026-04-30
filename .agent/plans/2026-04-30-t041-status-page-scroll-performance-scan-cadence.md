# Plan - T041 status-page scroll performance and background scan cadence

## Request

用户反馈设备状态页面快速滑动时经常卡顿，并要求后台持续扫描频率不用太高，约 3 秒扫一次即可。

## Current Facts

- T039 后，连接 ready 后会保持后台发现，并自动发送一次 `读状态` 和 `读参数`。
- `src/app.ts` 当前 `BACKGROUND_DISCOVERY_INTERVAL_MS = 15000`，后台发现每轮扫描完成后等待 15 秒再调度下一轮。
- `runDiscoveryRound()` 后台扫描仍使用 `quickWindowMs: 1500`、`fullWindowMs: 4200`，并在扫描开始、进度回调、完成时多次调用 `refreshDeviceList()`。
- `refreshDeviceList()` 会对 `deviceList.innerHTML` 整体重建，并重新绑定卡片点击、取消连接、滑动事件。即使当前在设备状态页，home panel 仍在 DOM 中，所以这些隐藏列表重建仍会占用主线程。
- `controller.onStatusChange()` 每次状态变化都会执行 `refreshStatus()`、`refreshDeviceList()`、`syncStatusPolling()`。
- `refreshStatus()` 每次都会继续调用 `refreshTimeControlEditor()`，后者会重写多个文本、range value、时段摘要 `innerHTML` 和按钮状态。
- 读状态轮询当前为每 5 秒一次；这是业务状态同步，不是本次后台扫描频率问题。
- 现有普通业务命令不等待 BLE 回包；本任务不改变该策略。

## Root-Cause Hypothesis

主要不是某一个同步阻塞函数，而是前端渲染压力和 BLE 扫描事件叠加：

- 状态页滚动时，后台扫描进度和状态回调持续触发 DOM 批量更新。
- 最重的是隐藏 home 设备列表整包重建和时控控件重复写值。
- BLE native 扫描本身也会占用资源，但从当前代码看，首要可控点是减少 App 层不必要的 DOM 刷新和降低后台扫描窗口/进度刷新密度。

## Goals

- 快速滑动设备状态页时，不因后台扫描或状态同步反复重建 DOM。
- 后台发现保持存在，但改成约 3 秒一轮的低负担节奏，不做连续高占空扫描。
- 前台手动刷新和连接流程仍能发现 `AC632N_1`、`AC632N-1`、`M3240-G`、`N3230-U`。
- 连接后 `读状态` / `读参数` 初始同步和 5 秒读状态轮询继续保留。

## Proposed Scope

本次做：

- App 层刷新节流与可见性判断。
- 后台扫描窗口和调度频率调整。
- 设备列表刷新去重，避免数据未变时重建列表。
- 时控编辑器刷新条件收窄，避免读状态/扫描状态变化时反复写滑杆。
- 增加单测覆盖刷新策略和后台扫描参数。

本次不做：

- 不改时控协议帧、B1 编解码、AA55、协议 Excel。
- 不改普通业务命令的等待回包策略。
- 不做多设备并连或 2.4G 替代链路。
- 不改 Android native BLE 插件，除非后续真机证明 App 层优化不足。
- 不导出新 APK，除非用户另行要求。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| UI refresh scheduling | `项目文件/android-mvp-capacitor/src/app.ts` | 增加轻量刷新队列，使用 `requestAnimationFrame` 合并同一帧内的状态/扫描刷新；状态回调不再立即连续执行多个重 DOM 方法。 |
| Device list rendering | `项目文件/android-mvp-capacitor/src/app.ts` | 设备列表只在 home 可见或用户显式触发列表相关动作时刷新；在 control/profile/scene 页只合并内存数据并标记 dirty，返回 home 时再刷新。 |
| Device list dedupe | `项目文件/android-mvp-capacitor/src/app.ts` | 给设备列表生成渲染签名，设备顺序、连接态、RSSI、stale、当前设备指标未变时跳过 `innerHTML` 重建和事件重绑。 |
| Time-control editor | `项目文件/android-mvp-capacitor/src/app.ts` | `refreshStatus()` 不再无条件刷新时控编辑器；仅在读参数同步、draft 改动、active segment 改动、ready 状态变化时刷新控件。 |
| Background discovery cadence | `项目文件/android-mvp-capacitor/src/app.ts` | 将后台调度改为约 3000ms 一轮；后台扫描使用更短窗口，例如 quick 800ms / full 1200ms；quiet 后台进度只合并数据，减少 DOM 和提示刷新。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 增加后台扫描参数、列表刷新可见性、列表签名去重、时控刷新条件的单测；保留 T039 防误触测试。 |
| Optional CSS containment | `项目文件/android-mvp-capacitor/src/styles.css` | 仅在实际需要时给列表/大块面板加保守 `contain` 约束；不改变视觉设计。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-041 设备状态页滑动性能与后台扫描节奏优化 | P0 | Proposed | 快速滑动状态页时后台扫描/读状态不会反复重建隐藏设备列表；后台发现约 3 秒调度一轮且扫描窗口更短；读状态/读参数同步保留；普通命令不等待回包策略不变；测试/build/sync/Android debug build/APK 检查通过。 |

## Risks

- 3 秒后台调度比当前 15 秒更频繁，但通过缩短扫描窗口、静默进度刷新和不重建 DOM 来降低实际负担。
- 如果某些设备只在长扫描窗口后出现，后台发现可能更慢；前台手动刷新仍保留更明确的扫描反馈，可后续基于真机数据微调窗口。
- 设备列表在非 home 页不立即重绘，返回 home 时才可见更新；内存数据仍会更新，不影响连接状态同步。
- `requestAnimationFrame` 合并刷新会让 UI 更新最多延后一帧，换取滚动期间更稳定的主线程占用。

## Verification

- 先写或调整单测，观察 TDD 红灯：
  - 后台发现间隔为 3000ms 左右。
  - 后台扫描窗口使用短窗口。
  - 非 home 页扫描进度不触发设备列表 DOM 重建。
  - 状态变化不再无条件刷新时控编辑器。
  - 设备列表签名未变时跳过重建。
- 绿色验证：
  - `npm.cmd test -- src/app.test.ts`
  - `npm.cmd test`
  - `npm.cmd run build`
  - `npm.cmd run sync`
  - Android Studio JBR `gradlew.bat assembleDebug --project-prop android.injected.testOnly=false`
  - `aapt` 检查无 `testOnly`
  - `apksigner verify`
- 本地浏览器 smoke：
  - 320/360/390px 无横向溢出。
  - 状态页快速滚动无 console error。
- 真机建议验收：
  - 连接后进入设备状态页快速上下滑动 30 秒，观察是否仍明显卡顿。
  - 后台扫描日志约 3 秒调度一轮，不出现连续高频刷屏。
  - 点击 `读参数` 后时控 UI 仍能同步。

## Rollback

- 若后台 3 秒轻扫影响连接或发现稳定性，可单独恢复后台扫描间隔/窗口常量。
- 若刷新节流导致 UI 不同步，可恢复对应刷新队列到直接刷新。
- 本任务不触碰协议 Excel、Android `.idea`、协议帧格式或普通命令等待策略，回滚范围应只限 `src/app.ts`、`src/app.test.ts` 和可能的 `src/styles.css`。

## Approval Gate

等待用户确认后再修改业务/UI/BLE App 层文件。
