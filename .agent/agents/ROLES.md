# Agent Roles

本文件定义多 agent 开发时的推荐角色。实际不一定每次都全部启用，但每个 agent 必须只认领一个主要职责和清晰写入范围。

## Orchestrator Agent

职责：

- 读取 `AGENTS.md`、`.agent/START_HERE.md`、`.agent/AI_CONTEXT.md`、`todo.md`。
- 拆分任务、分配写入边界、合并结果。
- 维护 `.agent/CHANGE_INDEX.md`、`todo.md`、session log。

禁止：

- 不要把所有代码都集中自己改。
- 不要让两个 worker 同时写同一文件。

## BLE Agent

职责：

- Android BLE 扫描、连接、发现服务、订阅、写入、断开、权限、异常恢复。
- 连接速度、扫描速度、快连与 fallback 策略。

主要文件：

- `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`
- `项目文件/android-mvp-capacitor/src/ble/bleBridge.ts`
- `项目文件/android-mvp-capacitor/src/types.ts`

交付证据：

- 扫描/连接耗时记录。
- Android 日志或 UI 调试日志。
- 相关单测或构建结果。

## Protocol Agent

职责：

- 命令定义、帧构建、CRC、notify 缓冲解析、回包判定。
- 维护最小命令集和协议确认表。

主要文件：

- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`
- `项目文件/android-mvp-capacitor/src/protocol/frameCodec.ts`
- `项目文件/android-mvp-capacitor/src/protocol/responseParser.ts`
- `项目文件/最小命令集表.md`
- `项目文件/通信参数确认表.md`

交付证据：

- 命令 HEX 来源。
- 真机回包样例。
- 协议测试结果。

## UI Agent

职责：

- 设备首页和设备详情控制页。
- 状态展示、按钮门控、错误反馈、调试入口隐藏。

主要文件：

- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/style.css`
- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`

约束：

- UI 不直接解析原始 HEX。
- UI 只调用 `DeviceController`。
- 控制页只在 `ready` 状态发送业务命令。

## QA Agent

职责：

- 单元测试、构建验证、真机验收记录、回归场景。
- 不主动做产品代码改动，除非修测试夹具。

主要文件：

- `项目文件/android-mvp-capacitor/src/**/*.test.ts`
- `.agent/reports/`
- `项目文件/推进工作.md`

交付证据：

- `npm.cmd test`
- `npm.cmd run build`
- Gradle/APK 验证结果或阻塞原因。
- 真机测试表。

## Docs Release Agent

职责：

- 文档、日志、GitHub 上传记录、交付说明。
- 保持 `todo.md` 简短。

主要文件：

- `.agent/`
- `todo.md`
- `项目文件/上传日志.md`
- `项目文件/推进工作.md`

约束：

- 不要把完整代码 diff 写入 Markdown。
- 文档记录语义历史，精确历史交给 Git。
