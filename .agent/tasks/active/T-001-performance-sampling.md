# Task Packet T-001 - BLE Performance Sampling

## Owner Role

BLE Agent 或 QA Agent

## Goal

补齐 20 次真机扫描/连接性能采样，确认 BLE 提速是否达到验收线。

## Write Scope

- `项目文件/通信参数确认表.md`
- `.agent/reports/`
- `todo.md`
- `.agent/logs/`

## Do Not Modify

- 协议命令实现
- UI 布局
- Excel 原始协议文件

## Required Context

- `.agent/AI_CONTEXT.md`
- `.agent/VERIFICATION.md`
- `项目文件/通信参数确认表.md`

## Steps

1. 使用同一台 Android 真机和同一设备。
2. 连续记录 20 次扫描首包耗时。
3. 连续记录 20 次连接到 `ready` 耗时。
4. 记录 fallback 是否触发。
5. 计算 P50/P90。
6. 把结果写入通信参数确认表或 `.agent/reports/`。

## Acceptance

- 扫描 P50 <= 2s。
- 连接到 `ready` P50 <= 3s。
- 失败样本有原因。

## Handoff

完成后写入 `.agent/handoffs/YYYY-MM-DD-BLE-T-001.md`。
