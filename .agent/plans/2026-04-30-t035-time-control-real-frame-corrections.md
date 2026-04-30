# Plan - T035 Time Control Real-Frame Corrections

## Request

用户已经提供真机读参/改参帧，并追加供应商给出的 `B1` 三种模式样例。需要把 T034 的时控字段假设修正为真实帧规则；时控模式发送时仍按“整个模式参数一包”写入，不能拆成单字段命令。

## Current Facts

用户先前提供的两条 `B1 MODE=01` 时控真机帧：

1. 读参数回传，从机描述符 `DESC=01`：

```text
FF CE 1A 01 B1 00 01 01 0C 80 06 40 37 01 36 4E 66 7E 8A FF FF FF FF FF 88 FF 00 30 49
```

2. 改了部分参数后的发送帧，主机描述符 `DESC=00`：

```text
FF CE 1A 00 B1 00 01 01 0C 80 06 00 37 01 48 60 78 90 9C 05 FF FF FF FF 3C FF 00 30 1C
```

供应商追加的三条 `B1` 样例：

```text
FF CE 13 00 B1 00 03 01 0C 80 FF 00 1E 02 CC 33 1E 80 1A 00 30 27

FF CE 1A 00 B1 00 01 01 0C 80 FF 00 1E 02 18 2A 36 3C 42 CC FF 80 4D 4D 0C 4D 00 30 A9

FF CE 22 00 B1 00 02 01 0C 80 FF 00 1E 02 18 2A 36 3C CC FF 80 4D 1E 1E 1E 1E 80 80 80 80 1A 1A 1A 1A 00 30 AA
```

帧级事实：

| 样例 | MODE | LEN | 整帧长度 | 当前判断 |
| --- | ---: | ---: | ---: | --- |
| 供应商样例 1 | `03` | `13` | 22 bytes | 平均/普通类短帧，后续任务处理 |
| 供应商样例 2 | `01` | `1A` | 29 bytes | 时控帧，T035 处理，整包一次发送 |
| 供应商样例 3 | `02` | `22` | 37 bytes | 长帧，供应商说明特别长时可以拆分；不在 T035 实现 |
| 用户真机读参 | `01` | `1A` | 29 bytes | 时控回传帧，T035 解码黄金样例 |
| 用户改参发送 | `01` | `1A` | 29 bytes | 时控写入帧，T035 编码黄金样例 |

共同事实：

- 帧头都是 `FF CE`。
- `CMD=B1`，`SUB=00`。
- 写入方向使用 `DESC=00`，回传方向使用 `DESC=01`。
- 校验和均正确。
- `MODE=01` 时控参数应作为完整模式包发送，不做单字段写入。
- 供应商说明“特别长的话会分开”，对应当前看到的 `MODE=02 / LEN=22 / 37 bytes`；`MODE=01` 29 bytes 和 `MODE=03` 22 bytes 可以整包发。

字段修正结论：

| 字段 | T034 当前假设 | T035 修正 |
| --- | --- | --- |
| 电池类型 | 1/2/3 但 UI 标签映射不准 | `1=磷酸铁锂`、`2=锂电池`、`3=铅酸` |
| 最大 PWM / 最大输出 | 单字节百分比 + `00` 占位 | 16-bit raw，大端；供应商默认常见 `FF 00`，用户真机出现 `06 40`、`06 00`，先保留 raw |
| 光控延时 | 秒 | 继续按秒；样例 `37=55s`、`1E=30s` |
| 灵敏度 | 1~4 | 继续按 1~4 映射；样例出现 `01`、`02` |
| 时长 1~5 | 0.5h 单位，最大累计 7.5h | 确认为 5 分钟单位的累计点 |
| 功率 1~5 | 直接 0~100 百分比 | 确认为 0~255 缩放百分比，`CC=80%`、`80≈50%`、`4D≈30%`、`1A≈10%`、`FF=100%` |
| 晨亮时间 | 0.5h 单位 | 5 分钟单位 |
| 晨亮功率 | 直接 0~100 百分比 | 0~255 缩放百分比 |

时长样例：

- 供应商时控帧 `18 2A 36 3C 42` = 累计点 24/42/54/60/66，每点 5 分钟。
- 对应分段时长：2h / 1h30m / 1h / 30m / 30m。
- 用户真机读参 `36 4E 66 7E 8A` = 4h30m / 2h / 2h / 2h / 1h。
- 用户改参发送 `48 60 78 90 9C` = 6h / 2h / 2h / 2h / 1h。

功率样例：

- `CC = 204`，`204 / 255 = 80%`。
- `80 = 128`，约 50%。
- `4D = 77`，约 30%。
- `1A = 26`，约 10%。
- 因此用户改参帧里的 `05` 更可能是约 2% raw，而不是 5% 直写。

当前代码状态：

- T034 已实现 `B1 MODE=01` 整包写入和回包同步，但字段单位仍按旧假设：时长 0.5h、功率 0~100 直写、最大 PWM 单字节。
- 当前 `BleBridgePlugin.write()` 已经是一次 `BluetoothGatt.writeCharacteristic(characteristic)` 调用，没有 App 层按字段拆包。
- 当前 Android 原生插件没有显式 `requestMtu()`。
- 普通业务命令仍必须保持不默认等待回包。
- 不得覆盖 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不得纳入 `项目文件/android-mvp-capacitor/android/.idea/`。

## Proposed Scope

本次 T035 做：

- 只修正并落地 `B1 MODE=01` 时控模式。
- 用用户真机帧和供应商时控帧作为黄金样例，修正时控编码/解码。
- 保持 `MODE=01` 为 `LEN=1A`、29 字节完整帧，不补齐 40 字节。
- 保持每次时控参数提交只发送一条完整 `B1 MODE=01` 帧，不按单字段拆开。
- 对 Android BLE 增加 best-effort `requestMtu(64)`，提高 29 字节整包写入成功率。
- UI 显示改为真实单位：时长/晨亮时间用小时分钟，功率按百分比但底层按 0~255 raw，最大输出显示 raw/hex。
- 读参数收到 `B1 MODE=01` 后，同步到所有对应按钮、步进器、滑杆和摘要。

本次不做：

- 不实现 `MODE=02` 长帧 UI/协议写入；它后续可以按供应商说法单独设计分包。
- 不实现 `MODE=03` 平均/普通模式 UI/协议写入；本次只记录样例。
- 不把普通开/关/亮度命令改成等待回包。
- 不把时控写入改成自动等待回包；仍由用户主动按“读参数”复核。
- 不做单字段写入。
- 不补齐 40 字节。
- 不改源协议 Excel。
- 不导出正式 sideload APK，除非用户额外要求。

## Proposed Protocol Corrections

### 1. `B1 MODE=01` 数据区布局

`B1 MODE=01` 数据区为 21 字节：

| 数据区序号 | 字段 | 修正后解释 |
| ---: | --- | --- |
| 0 | 工作模式 | 固定 `01` |
| 1 | 电池类型 | `1=磷酸铁锂`、`2=锂电池`、`3=铅酸` |
| 2-3 | 电池电压 | 16-bit mV，大端，例如 `0C80=3200mV` |
| 4-5 | 最大 PWM / 最大输出 | 16-bit raw，大端，例如 `FF00`、`0640`、`0600` |
| 6 | 光控延时 | 秒 |
| 7 | 灵敏度 | `1=高`、`2=中`、`3=低`、`4=远程/预留` |
| 8-12 | 时长累计点 1~5 | 5 分钟单位，累计点；UI 显示为每段时长 |
| 13-17 | 功率 1~5 | 0~255 缩放百分比 |
| 18 | 晨亮时间 | 5 分钟单位 |
| 19 | 晨亮功率 | 0~255 缩放百分比 |
| 20 | 扩展 | `00` |

### 2. 时长规则

- UI 内部用分钟表示每段时长。
- 编码时，每段分钟数按 5 分钟取整后转为累计点。
- 解码时，读取 5 个累计点，再用相邻差值还原每段时长。
- 如果累计点递减，判定为异常帧，不覆盖当前 UI draft。
- 单字节累计点范围为 `0~255`，最大可表示 `21h15m`；不再套用旧速读版 `0~15 / 7.5h` 限制。

### 3. 功率规则

功率按 0~255 缩放：

- 解码：`percent = round(raw / 255 * 100)`，UI 显示 0~100%。
- 编码：`raw = round(percent / 100 * 255)`。
- 黄金样例必须覆盖：
  - `100% -> FF`
  - `80% -> CC`
  - `50% -> 80`
  - `30% -> 4D`
  - `10% -> 1A`
- 模型里仍保留 raw byte，便于日志和真机核对，例如用户帧 `05` 显示为约 2% 且保留 raw `0x05`。

### 4. 最大 PWM / 最大输出字段

- T035 暂命名为“最大输出原始值”或“最大 PWM 原始值”。
- 模型使用 `maxOutputRaw: number`，范围 `0~65535`。
- UI 显示十进制和 HEX，例如 `1600 / 0x0640`、`65280 / 0xFF00`。
- 控件先用 raw 步进，避免把 `FF00`、`0640`、`0600` 强行解释成同一个百分比体系。
- 后续真机确认单位后，再单独把 UI 改为百分比、A 或其他业务单位。

### 5. 单次完整发送策略

- `MODE=01` 时控：每次参数提交只调用一次 `writeTimeControlParams()`，生成一条完整 29 字节 `B1` 帧。
- `payloadHex` 必须是完整 29 字节帧。
- JS/Controller 层不按字段拆包。
- Android native 不为 `MODE=01` 做应用层分包。
- Android 原生连接成功后增加 best-effort `requestMtu(64)`：
  - 成功则记录 negotiated MTU。
  - 失败或超时不回退到字段拆包；仍按整包写入尝试并暴露 write 结果。
- 日志补充 payload byte length，便于确认 `MODE=01` 是 29 字节一次写入。
- 未来 `MODE=02 / LEN=22 / 37 bytes` 单独开任务处理；届时可按供应商说明为长帧设计分包策略。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Protocol | `项目文件/android-mvp-capacitor/src/protocol/timeControlParams.ts` | 修正字段模型：`maxOutputRaw` 16-bit、时长 5 分钟累计点、功率 0~255 缩放、电池类型标签、晨亮 5 分钟单位 |
| Protocol | `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts` | 保持 `writeTimeControlParams()` 一次生成完整 29 字节 `B1 MODE=01` 帧；更新黄金样例 |
| Protocol | `项目文件/android-mvp-capacitor/src/protocol/responseParser.ts` | 解码 `DESC=01 B1 MODE=01` 回传帧，异常时不覆盖参数状态 |
| Device | `项目文件/android-mvp-capacitor/src/device/deviceController.ts` | 保持单次 dispatch；补充完整帧 byte length 日志 |
| BLE Native | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/BleBridgePlugin.java` | 增加 best-effort MTU 请求和记录；不为 `MODE=01` 加 chunk 分包 |
| UI | `项目文件/android-mvp-capacitor/src/app.ts` | 修正时控 UI 单位和标签；读参同步使用新模型 |
| UI | `项目文件/android-mvp-capacitor/src/styles.css` | 必要的紧凑数值/HEX 显示样式调整 |
| Tests | `项目文件/android-mvp-capacitor/src/protocol/timeControlParams.test.ts` | 用户真机帧和供应商时控帧 decode/encode 黄金样例 |
| Tests | `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.test.ts` | 验证写入帧 29 字节、`DESC=00`、校验和正确 |
| Tests | `项目文件/android-mvp-capacitor/src/protocol/responseParser.test.ts` | 验证 `DESC=01 B1 MODE=01` 回传解析并生成 status patch |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 验证 UI 单位、读参同步和单次整包发送策略 |
| Docs | `.agent/reports/` | 实施后记录字段修正、供应商样例解析和验证结果 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-035 时控真实帧字段修正与单次完整写入 | P0 | Proposed | 基于用户真机帧和供应商 `MODE=01` 样例修正时控字段；时长按 5 分钟累计点编码/解码；最大 PWM/最大输出按 16-bit raw；功率按 0~255 缩放百分比；电池类型标签修正；每次时控提交只发一次完整 29 字节帧；`MODE=02` 长帧分包不在本次做；现有 5 条 MVP 命令和普通命令不等回包策略不变；测试、build、sync、Gradle、APK 检查通过。 |

## Risks

- 最大输出 `FF00/0640/0600` 的业务单位仍未完全确认。T035 保留 raw，避免错误转成百分比。
- 用户改参帧中的功率 `05` 按供应商样例应显示为约 2%，但需要真机继续确认该字段是否存在特殊低值语义。
- Android `requestMtu(64)` 是 best-effort，不同手机或设备可能拒绝；拒绝时 T035 不对 `MODE=01` 分包，只让一次完整 write 的结果暴露真实失败。
- `MODE=02` 37 字节长帧可能需要分包，但 T035 不实现该模式，避免把长帧策略错误套到时控。

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
9. 320/360/390px 本地 layout smoke，确认时控 UI 无横向溢出

真机复核建议：

- 读参能把用户真机回传帧解析为：
  - 磷酸铁锂 3.2V
  - 最大输出 raw `0x0640`
  - 光控延时 55s
  - 灵敏度高
  - 时段 4h30m / 2h / 2h / 2h / 1h
  - 功率全 100%
  - 晨亮时间 `0x88 * 5min = 11h20m`
  - 晨亮功率 100%
- 供应商时控帧能解析为：
  - 最大输出 raw `0xFF00`
  - 光控延时 30s
  - 灵敏度中
  - 时段 2h / 1h30m / 1h / 30m / 30m
  - 功率 80% / 100% / 50% / 30% / 30%
  - 晨亮时间 1h
  - 晨亮功率 30%
- 写入第二条用户改参帧时 TX 是完整 29 字节一次发送。
- 写入后手动读参数，若设备接受，应回传与写入一致或可解释的字段。

## Rollback

- 若 T035 真机验证不通过，可仅回退 T035 改动，恢复 T034 的整包入口。
- 若 MTU 请求导致连接问题，可单独回退 Android MTU best-effort 逻辑，保留协议字段修正。
- 若功率规则被证实还有特殊语义，只改 `timeControlParams.ts` 的 power codec 和对应测试，不动 UI 主结构。

## Approval Gate

等待用户确认后再修改业务代码、协议实现、UI、Android 原生和测试文件。

可批准口径：`按方案做`、`执行`、`批准执行`。
