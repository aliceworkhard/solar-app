# Plan - T037 Time Control Interaction Visual And Debounce Polish

## Request

用户要求继续优化时控控制面板：

1. 当前只制作了“时控”模式，因此控制面板里的 `雷达模式 / 时控模式 / 平均模式` 应该选择 `时控模式`。
2. 时段、时长、功率需要用一个更强的卡片圈起来，并强化“选中时段”和“当前时段时长 / 当前时段功率”的联动 UI。
3. 检验并优化按键/拉杆发送策略：用户按下按键或拖动拉杆，停下并松手后，应有一定消抖或延迟才发送整包数据。
4. 优化“当前模式”文案，例如 `当前是时控模式`，并让它与下方时控 UI 形成更清晰的可视化关联。

## Current Facts

- T036 已完成 `B1 MODE=01` 时控模型修正：
  - 最大输出为高字节百分比，写入 `[maxOutputByte, 00]`。
  - 时段 1~5 为 1~15 档，每档 30 分钟，协议编码为每档 6 个 5 分钟点。
  - 模式条已移动到时控编辑器上方。
- 当前 `#modeSeg .seg-btn` 的 active 状态来自 `status.mode`。
- 当前 `DeviceController` 默认 `status.mode` 仍是 `radar`；如果还没有真实 `B1` 回包把模式改成 `time`，控制面板会点亮 `雷达模式`。
- 当前只实现了时控编辑器；雷达/平均没有编辑 UI，也不应该显示成可操作入口。
- 当前滑杆：
  - `input` 事件只更新预览值。
  - `change` 事件立即调用 `commitTimeControlChange()` 并发送整包。
- 当前步进按键：
  - 点击后立即调用 `commitTimeControlChange()` 并发送整包。
- 普通开/关/亮度命令仍不应改成等待 BLE 回包。
- UI 仍不能直接解析 HEX。
- 不修改 `底层协议/新遥控器数据下载与控制协议.xlsx`。

## Proposed Scope

本次做：

- 将控制面板模式条定义为“当前已实现/正在编辑的模式”指示器，固定突出 `时控模式`。
- 雷达/平均保留为只读灰化项，文案表达“未开放/待接入”，不作为可切换按钮。
- Live Status 的模式主标题改成更明确的中文句式，例如 `当前是时控模式`。
- 在控制面板内增加一个靠近模式条和时控编辑器的视觉提示，把“当前是时控模式”和下面时控参数卡片关联起来。
- 重构时段编辑区域：
  - 时段 1~5 tabs + 当前时段时长 + 当前时段功率放进一个更明确的 `time-segment-editor-card`。
  - 选中时段高亮更强，并在卡片标题/状态区显示 `正在编辑：时段 X`。
  - 当前时段时长和功率的数值标签跟随所选时段刷新。
- 给时控参数写入增加 trailing debounce：
  - 用户拖动滑杆时只预览，不发送。
  - 松手触发 `change` 后，延迟约 400ms 再发送。
  - 用户连续点按步进按键或连续调整多个时控控件时，重置计时器，只发送最后一次 draft 的完整 `B1 MODE=01` 整包。
  - UI 状态显示 `准备发送... / 发送中... / 已发送`，避免误以为没响应。

本次不做：

- 不实现雷达模式参数 UI。
- 不实现平均模式参数 UI。
- 不实现真实模式切换命令。
- 不改普通业务命令等待回包策略。
- 不改 RF 帧格式、校验和、`B1 MODE=01` 字段定义。
- 不改 Android 原生 BLE 分包策略。
- 不导出新 APK，除非用户后续明确要求。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| App model constants | `项目文件/android-mvp-capacitor/src/app.ts` | 增加时控面板当前实现模式、模式视觉文案、写入 debounce 时间等常量；更新 `TIME_CONTROL_EDITOR_MODEL` 记录 `activeMode=time` 和 `writeDebounceMs`。 |
| Mode display | `项目文件/android-mvp-capacitor/src/app.ts` | 新增/调整 mode label helper：Live Status 显示 `当前是时控模式`；控制面板模式条固定 `时控模式` active，雷达/平均为只读未开放视觉。 |
| Segment editor markup | `项目文件/android-mvp-capacitor/src/app.ts` | 将时段 tabs、当前时段时长、当前时段功率包进新的编辑卡片；增加 `正在编辑：时段 X` 状态文案。 |
| Debounced write | `项目文件/android-mvp-capacitor/src/app.ts` | 拆分当前 `commitTimeControlChange()`：先应用 draft 与刷新 UI，再调度延迟发送；新增清理/flush pending 写入逻辑。 |
| UI styles | `项目文件/android-mvp-capacitor/src/styles.css` | 强化模式条 active/disabled 状态、当前模式提示、时段编辑卡片、选中时段和联动滑杆视觉。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 增加模式固定为时控、当前模式文案、debounce 策略常量、时段编辑卡片模型的测试。 |
| Browser smoke | no committed script unless needed | 用 Playwright 验证 320/360/390px 无横向溢出，且拖动/点击后不会立即写入、延迟后只写一次。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-037 时控交互可视化与消抖发送优化 | P0 | Proposed | 控制面板模式条固定突出时控；当前模式文案为 `当前是时控模式`；时段 tabs/时长/功率形成一个联动卡片；滑杆松手/按键点击后约 400ms trailing debounce 才发送，连续操作只发最终一次整包；普通命令不等回包策略不变；测试、build、sync、layout/debounce smoke、Gradle、APK 检查通过。 |

## Risks

- 如果设备真实返回 `radar/average`，控制面板仍显示时控为当前可编辑模式，可能与真实设备模式不同。本次按用户“当前只制作时控模式”的口径处理，把模式条定义为“当前可用编辑模式”，而不是完整三模式切换器。
- debounce 会让发送结果晚约 400ms；需要 UI 明确显示准备发送状态，避免用户误判没有响应。
- 连续操作只发送最后一次整包，符合减少 BLE 写入的目标，但真机上需要确认设备不要求每一步都即时接收。
- 如果发送失败，需要保留 draft 但提示失败，避免悄悄回退 UI。

## Verification

实施后计划运行：

1. TDD red/green：
   - `npm.cmd test -- src/app.test.ts`
2. 协议/时控相关回归：
   - `npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts src/app.test.ts`
3. 全量测试：
   - `npm.cmd test`
4. Web build：
   - `npm.cmd run build`
5. Capacitor sync：
   - `npm.cmd run sync`
6. Android debug build：
   - Android Studio JBR `gradlew.bat assembleDebug`
7. APK 检查：
   - `aapt dump badging` 确认无 `testOnly`
   - `apksigner verify --verbose`
8. Playwright layout/debounce smoke：
   - 320/360/390px 无横向溢出。
   - `时控模式` 为 active。
   - `当前是时控模式` 可见。
   - 时段卡片选中态和时长/功率联动可见。
   - 滑杆 `change` 后立即不调用 `writeTimeControlParams`，约 400ms 后调用一次。
   - 连续多个时控变更只写最终整包一次。

## Rollback

- 回退 `src/app.ts`、`src/styles.css`、`src/app.test.ts` 中 T037 的改动即可恢复 T036 行为。
- 不涉及协议 Excel、Android native、BLE UUID、RF 帧格式或普通命令等待策略。

## Approval Gate

等待用户确认后再修改业务代码、UI、样式或测试文件。
