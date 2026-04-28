# Task Packet T-011 - UI Convergence

## Owner Role

UI Agent

## Goal

基于现有两页 MVP 和参考素材，收敛设备首页与设备详情控制页，使 UI 更接近产品可验收状态，同时保持当前 BLE/协议调用链稳定。

## Write Scope

- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `项目文件/android-mvp-capacitor/public/assets/ui/`

## Do Not Modify

- `项目文件/android-mvp-capacitor/src/ble/`
- `项目文件/android-mvp-capacitor/src/protocol/`
- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- Android 原生 BLE 插件
- `底层协议/`

## Required Context

- `.agent/START_HERE.md`
- `.agent/AI_CONTEXT.md`
- `todo.md`
- `.agent/plans/2026-04-27-ui-reference-convergence.md`
- `.agent/SKILL_USAGE.md`

## Constraints

- UI 不直接解析原始 HEX。
- UI 只通过 `DeviceController` 暴露的方法发送命令和读取状态。
- 保留 5 条 MVP 命令入口：开/关、增加亮度、降低亮度、读参数、读状态。
- 调试台保留为隐藏联调入口，不作为主流程 UI。
- 不新增未接入协议的假功能。

## Acceptance

- 首页显示设备扫描/连接状态和关键状态概览。
- 控制页显示 5 条 MVP 命令入口和明确反馈。
- 移动端无文字/按钮重叠。
- `npm.cmd test` 通过。
- `npm.cmd run build` 通过。

## Handoff

完成后写入 `.agent/handoffs/YYYY-MM-DD-UI-T-011.md`。
