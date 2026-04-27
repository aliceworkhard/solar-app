# Task Packet T-003 - Response Policy

## Owner Role

Protocol Agent + Orchestrator

## Goal

根据真机结果固化“哪些指令等待回传，哪些指令只写入成功即返回”的策略。

## Write Scope

- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`
- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.test.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.test.ts`
- `项目文件/最小命令集表.md`

## Coordination Required

这个任务会触碰 `deviceController.ts`，不能和 UI/BLE agent 并行改同一文件。

## Required Context

- `.agent/tasks/active/T-002-command-retest.md`
- 真机回包样例
- `.agent/OWNERSHIP.md`

## Acceptance

- 默认不等待回包。
- 读参数和读状态按协议属于可能回传命令，但当前仍只做被动 notify 解析。
- 只有真机确认必须阻塞等待时，才开启等待。
- 单元测试覆盖等待与不等待两种路径。

## Handoff

完成后写入 `.agent/handoffs/YYYY-MM-DD-Protocol-T-003.md`。
