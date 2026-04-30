# Approval - T034 Time Control Mode Write

日期：2026-04-30

## User Approval

用户已回复“按方案做”。

## Approved Scope

- 按 `.agent/plans/2026-04-30-t034-time-control-mode-write.md` 实施 T034。
- 时长 2-5 按累计到达点发送。
- 本次按协议 `LEN=1A` 的 29 字节帧实现，不补齐 40 字节。
- 每次完成一次时控参数修改后，发送整个 `B1 MODE=01` 时控模式参数包。
- 滑块拖动过程中不连续发送，松手后发送一次整包。
- `读参数` 返回 `B1 MODE=01` 时，按同一字段布局尝试反解并覆盖当前 UI/draft。

## Boundaries

- 不覆盖 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
- 不把普通业务命令改成默认等待 BLE 回包。
- 不把协议退回 `AA55` 临时帧。
- 不让 UI 直接解析 HEX。
