# Approval - T039 Touch Guard, Discovery Stability, And Initial Sync

## Approved Plan

- `.agent/plans/2026-04-30-t039-touch-guard-discovery-sync.md`

## User Approval

- 2026-04-30: 用户回复“执行”。

## Approved Scope

- 增加按钮、步进按钮、时控滑杆的防误触判定。
- 支持 `AC632N_1`、`AC632N-1`、`M3240-G`、`N3230-U` 作为同一类目标设备。
- 连接 ready 后保持低频后台发现，不影响前台控制。
- 连接成功后自动发送一次 `读状态` 与 `读参数`，并依靠 notify 同步 UI。
- 断开后设备保留在列表下方；扫描设备保留多轮以稳定显示。
- 增加对应测试和验证记录。

## Out Of Scope

- 不实现多 BLE 设备同时连接。
- 不实现直接 2.4G 私有链路。
- 不修改协议 Excel、AA55、RF 帧格式、普通业务命令等待回包策略、UI raw HEX 解析、Android `.idea`。
