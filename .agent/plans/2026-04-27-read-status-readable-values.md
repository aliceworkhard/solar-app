# Plan - read status readable values

## Request

用户反馈：读状态后，电池字段当前在 UI 上显示为 `%`，需要改成 `V`；同时把读状态回传里的其他“有效值”转成可读状态，先更新 TODO 和方案，等待确认后再实现。

## Current Facts

- 读状态发送命令已固化为 `FF CE 06 00 0E 00 00 30 11`。
- `底层协议/新遥控器数据下载与控制协议_AI速读版.md` 中 `E1` 状态回传字段包括：工作时长、电池当前电压、电池当前电流、当前亮度、太阳能当前电压、扩展字符。
- `src/protocol/responseParser.ts` 当前已经计算 `workMinutes`、`batteryVoltage`、`loadCurrent`、`brightness`、`solarVoltage`，但 `statusPatch` 只写入 `power`、`battery`、`lastUpdatedAt`。
- `src/app.ts` 当前把 `status.battery` 渲染为 `${battery}%`，但该数值实际来自电池电压计算，应显示为 `V`。
- `src/types.ts` 的 `DeviceStatus` 目前缺少工作时长、负载电流、太阳能电压等结构化字段。
- 当前工作树已有用户未提交改动：`todo.md` 与 `.agent/plans/2026-04-27-t001-performance-sampling.md`，本任务不得覆盖。

## Proposed Scope

- 修正电池显示单位：读状态后的电池值显示为 `V`，不再显示 `%`。
- 将 `E1` 读状态回传中已确认字段转为结构化 `DeviceStatus` 字段：
  - 工作时长：原始值 * 5，显示为分钟或小时分钟。
  - 当前亮度：保留为功率/亮度百分比。
  - 电池当前电压：保留 2 位，单位 `V`。
  - 电池当前电流：保留 2 位，单位 `A`。
  - 太阳能当前电压：保留 1 位，单位 `V`。
  - 扩展字符：先作为原始值记录，不猜业务含义。
- 在控制页/状态区增加这些可读状态的展示，避免只出现在日志 summary。
- 补充单元测试，锁定单位和字段映射。

## Out Of Scope

- 不改读状态命令 HEX。
- 不改 BLE 写入/notify 机制。
- 不引入阻塞等待回包；仍保持“写入成功即返回，notify 到达后被动解析”。
- 不修改 Excel 源文件。
- 不把未确认字段解释为故障码、健康状态或开关状态。
- 不处理参数回传 `B1` 的完整参数 UI。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Types | `项目文件/android-mvp-capacitor/src/types.ts` | 扩展 `DeviceStatus`，增加 `workMinutes`、`batteryVoltage`、`loadCurrentAmp`、`solarVoltage`、`statusExtraRaw` 等字段；保留现有字段兼容当前 UI。 |
| Parser | `项目文件/android-mvp-capacitor/src/protocol/responseParser.ts` | 将 `E1` payload 的有效值统一解析为结构化字段；长度不足时只输出日志摘要，不写入不完整状态。 |
| Parser tests | `项目文件/android-mvp-capacitor/src/protocol/responseParser.test.ts` | 增加读状态字段映射测试：电池电压、电流、太阳能电压、工作时长、亮度。 |
| UI | `项目文件/android-mvp-capacitor/src/app.ts` | 电池显示单位改为 `V`；增加读状态可读字段展示，优先展示已收到的有效值，未收到显示 `-`。 |
| UI styles | `项目文件/android-mvp-capacitor/src/styles.css` | 如新增状态行导致布局拥挤，做最小样式调整，保证移动端不重叠。 |
| UI tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 覆盖电池单位为 `V`，并验证状态字段可格式化展示。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-012 读状态回传可读化 | P0 | Proposed | 电池显示为 `V`；`E1` 回传的工作时长、亮度、电池电压、电池电流、太阳能电压能转成结构化状态并在 UI 中可读展示；未知扩展字段只保留原始值；测试和构建通过。 |

## Risks

- 真实 `E1` 回包长度在协议文档中存在轻微不一致，必须继续依赖帧层 `LEN/END/SUM` 校验，不硬编码整包长度。
- “扩展字符”的业务含义未确认，不能把它包装成明确状态。
- 如果 UI 状态区一次性塞入太多字段，手机屏幕可能拥挤；实现时需要压缩为两列状态格或只在控制页展示详细值。
- `battery` 字段现有语义已被 UI 当作百分比，但实际解析是电压；实现时要减少字段歧义，避免后续误用。

## Verification

- `npm.cmd test`
- `npm.cmd run build`
- 真机复测读状态：点击“读状态”后，记录 RX HEX、日志 summary、首页/控制页状态是否更新。
- 核对 UI：电池显示 `V`，功率/亮度仍显示 `%`，电流显示 `A`，太阳能电压显示 `V`。

## Rollback

- 如真机确认字段映射不对，回退本次 `DeviceStatus` 扩展、`responseParser` 字段映射和 UI 展示；保留原始 RX 日志用于重新分析。
- 不使用 `git reset --hard` 或 `git checkout --` 回滚用户改动。

## Approval Gate

等待用户确认后再写 `.agent/approvals/` 并实施。确认前不修改业务代码、协议、UI、Android 原生文件、构建配置或源协议文件。
