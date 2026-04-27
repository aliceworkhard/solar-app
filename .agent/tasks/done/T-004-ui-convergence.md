# Task Packet T-004 - Two Page UI Convergence

## Owner Role

UI Agent

## Goal

把 2 页 UI 从调试可用收敛到业务可用，不扩大页面数量。

## Write Scope

- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/style.css`
- 必要时只读 `src/device/deviceController.ts`

## Do Not Modify

- BLE 原生插件
- 协议命令定义
- 帧解析逻辑

## Required Context

- `.agent/AI_CONTEXT.md`
- `.agent/OWNERSHIP.md`
- `.agent/tasks/active/T-002-command-retest.md`

## UI Requirements

- 首页保留扫描、快连、设备列表、连接阶段、关键状态。
- 控制页保留模式、功率参数、读取状态、读取版本、开机、关机、设置参数。
- 调试台隐藏保留。
- 控制按钮只在 `ready` 后可用。
- 发送成功和失败必须有明确反馈。

## Acceptance

- UI 不直接解析 HEX。
- 每个控件映射到唯一 DeviceController 方法。
- `npm.cmd run build` 通过。

## Handoff

完成后写入 `.agent/handoffs/YYYY-MM-DD-UI-T-004.md`。
