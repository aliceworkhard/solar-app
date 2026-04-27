# File Ownership

多 agent 并行时按本文件划分写入边界。默认规则：一个任务只能写自己认领的区域，跨区域修改必须先在 handoff 里说明。

## Root Coordination Files

Owner：Orchestrator / Docs Release

- `AGENTS.md`
- `todo.md`
- `.agent/AI_CONTEXT.md`
- `.agent/CHANGE_INDEX.md`
- `.agent/RULES.md`
- `.agent/START_HERE.md`

## BLE Layer

Owner：BLE Agent

- `项目文件/android-mvp-capacitor/src/ble/`
- `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`
- Android 权限、Manifest、Gradle 中与 BLE 直接相关的配置

需要协调：

- 修改 `src/types.ts` 前通知 Protocol/UI agent。
- 修改连接状态枚举前同步 UI agent。

## Protocol Layer

Owner：Protocol Agent

- `项目文件/android-mvp-capacitor/src/protocol/`
- `项目文件/最小命令集表.md`
- `项目文件/通信参数确认表.md`
- `底层协议/`

需要协调：

- 修改 `CommandDefinition` 字段前同步 DeviceController/UI agent。
- 修改状态解析字段前同步 UI agent。

## Device Controller

Owner：Orchestrator 或指定集成 agent

- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.test.ts`

说明：

这个文件连接 BLE、Protocol 和 UI，是集成层。不要让多个 agent 并行改它。

## UI Layer

Owner：UI Agent

- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/style.css`
- UI 资源文件

需要协调：

- 不要在 UI 层新增协议解析。
- 需要新业务字段时先让 Protocol/DeviceController 暴露状态。

## Tests

Owner：QA Agent，或对应功能 owner

- `项目文件/android-mvp-capacitor/src/**/*.test.ts`

规则：

- 功能 agent 写功能时可同步补对应单测。
- QA agent 可扩展测试，但不要重写业务逻辑。

## Do Not Touch By Default

- `项目文件/android-mvp-capacitor/android/.idea/`
- 用户刚修改但未说明用途的 Excel、图片、临时资料
- 与当前任务无关的历史备份目录
