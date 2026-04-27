# AI Context

更新时间：2026-04-27

## Project Purpose

本项目是一个太阳能遥控器 Android MVP，当前目标是先把 BLE 通信和真实协议闭环跑稳，再收敛 2 页业务 UI。

## Current Scope

- 平台：Android 优先，iOS 暂不进入实施。
- 技术路线：Capacitor + TypeScript + Android 原生 BLE 插件。
- 主工程：`项目文件/android-mvp-capacitor`。
- 当前 UI 范围：设备首页 + 设备详情控制页，调试台保留但默认作为联调工具。

## Current BLE Facts

- 设备名前缀：`AC632N`。
- Service UUID：`0000FFF0-0000-1000-8000-00805F9B34FB`。
- Write UUID：`0000FFF1-0000-1000-8000-00805F9B34FB`。
- Notify UUID：`0000FFF2-0000-1000-8000-00805F9B34FB`。
- 写入方式：固定 `write`。
- 普通业务命令：只确认写入成功，不等待 BLE 回包。
- Notify：如果设备主动返回数据，则被动解析并更新 UI 状态。
- 正式 RF 控制帧：`FF CE + LEN + DESC + CMD + SUB + DATA + 30 + SUM`。
- 读参数命令：`FF CE 06 00 0D 00 00 30 10`。
- 读状态命令：`FF CE 06 00 0E 00 00 30 11`。

## Current Architecture

- `src/app.ts`：2 页 UI、调试台、设备列表、控制按钮、日志展示。
- `src/ble/bleBridge.ts`：Capacitor BLE JS 接口封装。
- `android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`：Android 原生扫描、连接、发现服务、订阅、写入。
- `src/device/deviceController.ts`：UI 唯一业务入口，负责扫描、连接、命令发送和状态更新。
- `src/protocol/commandBuilder.ts`：`CommandDefinition` 与 5 条 MVP 命令。
- `src/protocol/frameCodec.ts`：RF 协议编码、收包缓冲、切帧、累加和校验。
- `src/protocol/responseParser.ts`：notify 解析与状态字段提取。

## Current Verification State

- `npm.cmd test`：最近一次通过，5 个测试文件、27 个测试通过。
- T-003 响应等待策略：5 条 MVP 命令默认不等待回包；显式 `waitForResponse=true` 路径已补单测，写入失败会清理 pending 后重试。
- T-004 两页业务 UI：主页扫描/快连/连接反馈可见，控制页 5 个 RF 命令一一映射到 `DeviceController`，调试台隐藏保留。
- T-002 前置接入：App 面向方法已锁定 5 条最小命令集 HEX，并有 `CommandBuilder` 与 `DeviceController` 写入链路测试覆盖。
- T-009 持续发现：扫描按钮可开始/停止，默认每 5 秒补扫；列表按 MAC/deviceId 区分同名设备，新设备追加，已连接设备不清除。
- T-012 读状态可读化：`E1` 回传会解析工作时长、亮度、电池电压、电池电流、太阳能电压；电池 UI 单位为 `V`，电流为 `A`，太阳能电压为 `V`，短包不会更新业务状态。
- T-001/T-002 可行性冒烟测试：用户使用 vivo X300 Pro 测试，设备连接、发送、接收和 5 条 MVP 命令执行均未发现传输错误；该结论不是完整 20 次/P50/P90 或逐条 10 次验收。
- `npm.cmd run build`：最近一次通过。
- Gradle 终端构建：当前环境缺 `JAVA_HOME`，需在本机 Android Studio 或配置 JDK 后复验。
- Android 真机：BLE 已能发送和接收；正式量化采样和命令逐次复测记录仍需后补。

## Working Rules

1. 每次开始任务时先读 `AGENTS.md` 和 `.agent/START_HERE.md`。
2. 再读本文件和根目录 `todo.md`。
3. 多 agent 任务还要读 `.agent/agents/ROLES.md`、`.agent/OWNERSHIP.md` 和对应 task packet。
4. 不要默认读取完整日志；需要历史时先读 `.agent/CHANGE_INDEX.md`。
5. 完成一次有价值的修改后，新增 `.agent/logs/YYYY-MM-DD-session-N.md`。
6. TODO 只保留当前行动项；已完成或废弃内容归档到 `.agent/archive/`。
7. 重大技术取舍写入 `.agent/decisions/`。
8. 跨 agent 交接写入 `.agent/handoffs/`。
9. 不要把 Git diff、完整日志或长流水账塞回 `todo.md`。
10. 不要把 `项目文件/android-mvp-capacitor/android/.idea/` 纳入 Git 备份，除非用户明确要求。

## Multi-Agent Coordination

- Orchestrator：拆任务、分配写入边界、合并结果、维护上下文。
- BLE Agent：负责 Android BLE 桥接、扫描连接性能、权限与异常。
- Protocol Agent：负责命令、CRC、帧解析、回包规则和协议文档。
- UI Agent：负责 2 页 UI 和交互反馈，不直接解析 HEX。
- QA Agent：负责测试、真机验收、性能数据和回归报告。
- Docs Release Agent：负责文档、日志、上传记录和交付说明。

并行开发时必须遵守 `.agent/OWNERSHIP.md`，特别是 `deviceController.ts` 不能多人并行修改。

## Current Open Problems

- T-001 20 次扫描/连接性能采样未补齐；当前只有可行性通过结论。
- T-002 5 条 MVP 命令逐次复测数据未补齐；当前只有可行性通过结论。
- T-009 持续发现仍需真机验证补扫间隔、过期时间和进入控制页后的低频保活策略。
- 哪些特定指令稳定有回传仍待真机复测确认；程序默认不等待，仅允许显式标记命令等待。
- 开/关命令在协议中是单一 `0x0A` 控制命令，是否能区分开机/关机仍待真机确认。
- Debug APK 的常规 Gradle 命令验证需要补 `JAVA_HOME`。
- 多 agent 框架已建立，但还未经过一次真实多人协作演练。

## Skill Baseline

- 2026-04-27 installed additional global skills: `kb-retriever`, `web-design-engineer`, `gpt-image-2`, `requesting-code-review`, `receiving-code-review`, `security-best-practices`.
- `gpt-image-2` is the preferred image prompt/workflow skill for this project, but system `.system/imagegen` remains installed as the host image tool entry.

## Feasibility Smoke Test Baseline

- 测试日期：2026-04-27。
- 测试手机：vivo X300 Pro。
- 型号：V2502A。
- Android：16。
- 硬件版本：MP_0.1。
- 软件版本：PD2502B_A_16.0.25.5.W10.V000L1。
- 结论：T-001/T-002 可行性良好，连接、收发和 5 条 MVP 命令执行没有一次出错。
- 记录文件：`.agent/reports/2026-04-27-feasibility-smoke-test.md`。
- 正式补测模板：`.agent/reports/templates/`。
