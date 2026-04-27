# Task Packet T-002 - MVP Command Retest

## Owner Role

Protocol Agent 或 QA Agent

## Goal

复测 5 条正式 RF 控制命令，确认哪些命令只有写入、哪些命令会产生 notify。

## Write Scope

- `项目文件/最小命令集表.md`
- `项目文件/通信参数确认表.md`
- `.agent/reports/`
- `todo.md`
- `.agent/logs/`

## Do Not Modify

- UI 文件
- Android BLE 原生插件
- `deviceController.ts`，除非 Orchestrator 明确分配

## Required Context

- `.agent/AI_CONTEXT.md`
- `.agent/VERIFICATION.md`
- `项目文件/最小命令集表.md`

## Steps

1. 对开/关执行 10 次：`FF CE 06 00 0A 00 00 30 0D`。
2. 对增加亮度执行 10 次：`FF CE 06 00 0B 00 00 30 0E`。
3. 对降低亮度执行 10 次：`FF CE 06 00 0C 00 00 30 0F`。
4. 对读参数执行 10 次：`FF CE 06 00 0D 00 00 30 10`。
5. 对读状态执行 10 次：`FF CE 06 00 0E 00 00 30 11`。
6. 记录每次 TX、RX、是否更新 UI。
7. 标记是否需要等待回包。

## Acceptance

- 普通命令不出现假超时。
- 如果某条命令稳定 notify，记录回包特征。
- 异常 notify 不更新业务状态。

## Handoff

完成后写入 `.agent/handoffs/YYYY-MM-DD-Protocol-T-002.md`。
