# Plan - T038 Time-Control Label Density Polish

## Request

用户要求在 T037 基础上再改一版：

1. Live Status 主标题从 `当前是时控模式` 改为 `时控模式`。
2. Live Status 内“模式”小卡片从 `当前是时控模式` 改为 `时控`。
3. 去掉控制面板里的 `当前模式` 显示卡。
4. 时段设置内，把 `?档 / ?h` 去掉 `/`，并把 `?档` 与 `?h` 分成上下结构。

## Current Facts

- T037 已完成但本地尚未提交，当前改动基于 T037 工作区继续做。
- 当前 `createLiveStatusModel()` 只有一个 `modeLabel`，同时用于 Live Status 大标题和“模式”小卡片。
- 控制面板里 `renderControlModeContext()` 会渲染 `当前模式 / 当前是时控模式` 卡片。
- 时段标签、当前时段时长、摘要累计等位置都复用 `formatTimeControlHalfHours()` 返回的单行字符串，例如 `4档 / 2h`。
- 本次只调整 UI 文案与排版，不改协议、BLE、Android 原生、构建配置、源 Excel 或 `deviceController.ts`。

## Proposed Scope

本次做：

- 拆分 Live Status 模式显示：
  - 大标题：`时控模式`。
  - “模式”小卡片：`时控`。
- 移除控制面板内独立的 `当前模式` 显示卡及相关 CSS/刷新逻辑。
- 将时段设置内的档位/时长显示改成可排版结构：
  - 上方显示 `?档`。
  - 下方显示 `?h` 或当前已有分钟/小时格式。
  - 不再显示 `/`。
- 更新 App 单测覆盖长/短模式文案和上下结构模型。
- 做窄屏 layout smoke，确认 320/360/390px 无横向溢出。

本次不做：

- 不修改 `B1 MODE=01` 帧格式、编码、解码、校验和或分包策略。
- 不修改普通业务命令不等待 BLE 回包的策略。
- 不修改 Android 原生 BLE、MTU、writeType 或 Capacitor 配置。
- 不导出新 APK，除非用户另行要求。
- 不处理 T001/T002/T010。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Live Status model | `项目文件/android-mvp-capacitor/src/app.ts` | 将主标题模式文案与小卡片短文案拆开，例如 `modeLabel = "时控模式"`、`modeSummaryLabel = "时控"`。 |
| Control panel | `项目文件/android-mvp-capacitor/src/app.ts` | 移除 `renderControlModeContext()` 调用、方法和刷新 `controlModeContextValue` 的逻辑。 |
| Time segment display | `项目文件/android-mvp-capacitor/src/app.ts` | 新增或调整 helper，把时段档位和时长拆为结构化显示，渲染为上下两行。 |
| Styling | `项目文件/android-mvp-capacitor/src/styles.css` | 删除 `.control-mode-context` 样式；新增时段档位上下结构样式，保持紧凑且不撑宽。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 更新模式文案断言；增加时段档位格式/结构相关断言。 |
| Docs | `todo.md`、后续报告/日志 | 记录 T038 范围、审批、验证与完成状态。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-038 时控模式文案与时段档位排版微调 | P0 | Proposed | Live Status 大标题显示 `时控模式`；“模式”小卡片显示 `时控`；控制面板不再显示 `当前模式` 卡；时段设置内档位与时长上下排列且无 `/`；不改协议/BLE/Android native/`deviceController.ts`；单测、build、sync、Android debug build、APK 静态检查和 320/360/390px layout smoke 通过。 |

## Risks

- 当前 `modeLabel` 被多个 DOM 节点复用，拆成主/短两个字段时要避免影响附近设备卡片或其他模式显示。
- 时段档位上下结构如果放在 5 个窄 tab 内，可能导致高度或文字挤压，需要 CSS 控制固定尺寸和换行。
- `formatTimeControlHalfHours()` 也用于摘要和累计，需决定是否所有“时段设置内”的显示都统一改上下结构；实施时优先覆盖时段 tabs 与当前时段时长，摘要如果保持紧凑可只去掉 `/`。

## Verification

- 先按 TDD 更新 `src/app.test.ts`，观察红灯。
- 实施后运行：
  - `npm.cmd test -- src/app.test.ts`
  - `npm.cmd test`
  - `npm.cmd run build`
  - `npm.cmd run sync`
  - Android Studio JBR `gradlew.bat assembleDebug`
  - APK `aapt` 检查无 `testOnly`
  - APK `apksigner verify --verbose`
  - Chrome/Playwright 320/360/390px layout smoke：确认无横向溢出、无 `当前模式` 卡、Live Status 文案正确、时段档位上下显示且无 `/`。

## Rollback

- 回退本次对 `src/app.ts`、`src/styles.css`、`src/app.test.ts`、`todo.md` 和 T038 报告/日志的改动即可恢复到 T037 状态。
- 不涉及协议或 Android 原生，因此回滚不影响 BLE 通信链路。

## Approval Gate

等待用户确认后再修改 `项目文件/android-mvp-capacitor/src/` 下的 UI/测试文件。
