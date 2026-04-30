# Plan - T036 Time-Control UI / Mode / Output / Duration Corrections

## Request

用户对 T035 效果基本认可，但提出 5 个修正：

1. 将 `雷达模式 / 时控模式 / 平均模式` 三个模式位置放到时控参数区域上方。
2. 去掉 `参数整包写入` 这几个字。
3. 三个模式按钮与 Live Status 内的模式显示联动：雷达显示雷达模式，时控显示时控模式，平均显示平均模式。
4. 将 `最大输出 raw` 改为百分比显示；协议写入时该字段后 1 字节固定 `00`，前 1 字节为 `00~FF`，按 `byte / 2.55` 显示为百分比。
5. 时段 1 到时段 5 的每段时长改为 `1~15`，步长 1，1 代表 30 分钟；协议仍按 5 分钟点发送，因此每 30 分钟发送值增加 6。

## Current Facts

- 当前模式条 `#modeSeg` 在 `renderTimeControlEditor()` 之后，位于时控卡片下方。
- 当前时控卡片标题包含：
  - eyebrow：`时控模式`
  - strong：`参数整包写入`
- 当前 `createLiveStatusModel()` 的模式文案为 `雷达 / 时控 / 平均`，没有带 `模式` 后缀。
- 当前 `#modeSeg .seg-btn` 的 active 状态已经由 `status.mode` 驱动。
- 当前 `responseParser.ts` 在 `B1` 回包中会按 `MODE=01/02/03` 更新 `status.mode` 为 `time/radar/average`。
- 当前 `timeControlParams.ts` 中最大输出是 `maxOutputRaw: 0~65535`，UI 显示十进制 raw + HEX。
- 当前时段使用 `durationMinutes`，UI 滑杆按 5 分钟步进，协议按 5 分钟累计点编码。
- 普通业务命令仍必须保持不默认等待回包。
- UI 不直接解析 HEX；协议转换仍在 `src/protocol/` 内完成。

## Proposed Scope

本次 T036 做：

- 调整控制面板布局：把模式条移动到时控卡片上方。
- 移除 `参数整包写入` 文案。
- 统一模式显示文案为 `雷达模式 / 时控模式 / 平均模式`，并确保 Live Status、模式条 active 状态、`B1` 回包解析后的状态联动一致。
- 把最大输出从 16-bit raw UI 改成百分比 UI，但协议层仍按两字节字段写入：
  - 第 1 字节：`0x00~0xFF`。
  - 第 2 字节：写入时固定 `0x00`。
  - 显示百分比：`firstByte / 2.55`。
- 把时段 1~5 的 UI 单位改成“30 分钟档位”：
  - UI 值范围按用户最后一句采用 `1~15`。
  - 每档代表 30 分钟。
  - 协议仍输出 5 分钟累计点，所以每档转换为 `档位 * 6`。
- 读参数回包同步后，把协议 5 分钟累计点转换成每段 30 分钟档位并同步到控件。

本次不做：

- 不实现 `MODE=02` 长帧写入或分包策略。
- 不实现 `MODE=03` 参数 UI/写入。
- 不改变普通开/关/亮度/读状态/读参数的默认不等回包策略。
- 不改源协议 Excel。
- 不导出正式 sideload APK，除非用户另行要求。

## Proposed Protocol Corrections

### 1. 最大输出字段

T035 当前：

```text
byte4-byte5 = 16-bit maxOutputRaw
```

T036 改为：

```text
byte4 = maxOutputByte, 范围 00~FF
byte5 = 00
```

UI 显示：

```text
maxOutputPercent = maxOutputByte / 2.55
```

实现建议：

- 模型字段从 `maxOutputRaw` 改为 `maxOutputByte`。
- 写入时永远输出 `[maxOutputByte, 0x00]`。
- 读取时：
  - 用 byte4 计算百分比并同步控件。
  - 如果 byte5 不是 `00`，保留为诊断字段或测试字段，但 UI 不显示 raw，不直接解析 HEX。
- 这样供应商样例 `FF 00` 显示 `100%`；用户改参帧 `06 00` 显示约 `2.4%`；若读回 `06 40`，UI 仍按 `06` 显示约 `2.4%`，后续写出会规范为 `06 00`。

### 2. 时段字段

T035 当前：

```text
UI durationMinutes -> protocol cumulative 5-minute points
```

T036 改为：

```text
UI segmentHalfHourUnits: 1~15
protocol segmentPoints = segmentHalfHourUnits * 6
```

解码：

```text
segmentHalfHourUnits = (currentPoint - previousPoint) / 6
```

异常处理：

- 如果读回差值不是 6 的整数倍，按最近整数档位显示，同时测试和日志保留该风险。
- 协议单字节累计点仍有 `0~255` 上限。UI 每段允许 `1~15`，但发送前仍需防止累计点超过 `255`。
- 为避免用户把 5 个时段都推到 15 后生成不可编码帧，UI 可根据其他时段占用动态限制当前时段最大值，最低仍为 1。

### 3. 模式联动

- `formatModeLabel("radar") -> 雷达模式`
- `formatModeLabel("time") -> 时控模式`
- `formatModeLabel("average") -> 平均模式`
- Live Status 的当前模式、摘要模式和模式条 active 状态全部从同一个 `status.mode` 派生。
- `B1 MODE=01/02/03` 回包继续更新 `status.mode`，从而驱动上述联动。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Protocol | `项目文件/android-mvp-capacitor/src/protocol/timeControlParams.ts` | 将最大输出模型改为 `maxOutputByte` + 固定低字节 `00`；将时段模型改成 30 分钟档位并转换为 5 分钟累计点 |
| Protocol tests | `项目文件/android-mvp-capacitor/src/protocol/timeControlParams.test.ts` | 更新供应商/用户样例黄金测试：`FF00=100%`、`0600≈2.4%`、时段档位 `1~15`、30 分钟档位写入乘 6 |
| Command tests | `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.test.ts` | 验证完整 29 字节帧中最大输出低字节固定 `00`，时段累计点正确 |
| Response parser tests | `项目文件/android-mvp-capacitor/src/protocol/responseParser.test.ts` | 验证 `B1 MODE=01/02/03` 更新模式并驱动文案所需状态 |
| UI | `项目文件/android-mvp-capacitor/src/app.ts` | 移动模式条；移除 `参数整包写入`；模式文案加 `模式`；最大输出显示百分比；时段滑杆改为 1~15 档 |
| UI tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 覆盖模式条位置模型、模式文案、最大输出百分比模型、时段 30 分钟档位 |
| Styles | `项目文件/android-mvp-capacitor/src/styles.css` | 如移动模式条后间距不合适，做小范围布局调整 |
| Docs | `.agent/reports/` | 实施后记录字段修正和验证结果 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-036 时控 UI 模式联动、最大输出百分比与 30 分钟时段档位修正 | P0 | Proposed | 模式条位于时控参数区域上方；去掉 `参数整包写入` 文案；Live Status 和模式条显示 `雷达模式/时控模式/平均模式` 并由 `status.mode` 联动；最大输出 UI 显示百分比，写入字段为 `[00~FF, 00]`；时段 1~5 均为 1~15 档、每档 30 分钟、协议累计点按每档 6 写入；普通命令不等回包策略不变；测试、build、sync、Gradle、APK 检查通过。 |

## Risks

- 用户第 5 点同时出现 `0-15` 和 `1-15`，本方案按最后一句“时段1-时段5，都是（1-15）”执行。如果仍需要允许 `0` 表示关闭某段，需要在实施前改方案。
- 历史读回帧出现过 `06 40`。T036 会按用户新规则只用高字节 `06` 显示百分比，下一次写出会规范成 `06 00`。
- 5 个时段都设为 15 会超过协议单字节累计点 `255`，因此实现仍需要总累计保护。

## Verification

批准实施后运行：

1. 先补测试并观察 TDD 红灯。
2. `npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts src/app.test.ts`
3. `npm.cmd test`
4. `npm.cmd run build`
5. `npm.cmd run sync`
6. Android Studio JBR 临时 `JAVA_HOME` 下运行 `gradlew.bat assembleDebug`
7. `aapt` 检查无 `testOnly`
8. `apksigner verify --verbose`
9. 320/360/390px 本地 layout smoke，确认模式条上移后无横向溢出、文字不重叠。

## Rollback

- 如果最大输出百分比规则真机不接受，可只回退最大输出 codec 与 UI，保留模式条位置和时段档位修正。
- 如果时段必须允许 `0`，可把 UI/codec 范围从 `1~15` 改为 `0~15`，不影响 30 分钟档位到 5 分钟累计点的转换规则。

## Approval Gate

等待用户确认后再修改业务代码、协议实现、UI、样式、Android 构建或测试文件。

可批准口径：`按方案做`、`执行`、`批准执行`。
