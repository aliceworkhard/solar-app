# Approval - T-012 read status readable values

## Approved At

2026-04-27

## User Approval

用户回复：“做吧”。

## Approved Scope

- 按 `.agent/plans/2026-04-27-read-status-readable-values.md` 实施 T-012。
- 电池读状态显示单位从 `%` 改为 `V`。
- 将 `E1` 读状态回传中的工作时长、亮度、电池电压、电池电流、太阳能电压转成结构化可读状态。
- 扩展字符只保留原始值，不猜业务含义。
- 补充测试并运行 `npm.cmd test`、`npm.cmd run build`。

## Boundaries

- 不修改读状态命令 HEX。
- 不修改 BLE 写入/notify 机制。
- 不修改 Excel 源文件。
- 不纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
