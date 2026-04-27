# Change Index

本文件只做历史入口，不写完整过程。需要细节时再定向读取对应日志、归档或项目文档。

## M00 - 项目资料整理

日期：2026-04-22

摘要：整理 `readme.md`、系统文件结构、聊天记录总结与后续开发方案，形成第一阶段资料。

相关文件：

- `readme.md`
- `项目文件/系统文件整理.md`
- `项目文件/chat总结与后续开发方案.md`
- `项目文件/第一阶段执行任务清单.md`

## M01 - Android BLE 基础闭环

日期：2026-04-22 至 2026-04-23

摘要：实现 Android BLE 扫描、连接、服务发现、订阅 notify、写入和调试日志，确认 `FFF0/FFF1/FFF2` 主链路。

关键结论：

- `FFF1` 是发送通道。
- `FFF2` 是接收通道。
- 真机确认能发送和接收。

相关文件：

- `项目文件/android-mvp-capacitor/src/ble/bleBridge.ts`
- `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`
- `项目文件/通信参数确认表.md`

## M02 - BLE 提速与连接状态收敛

日期：2026-04-23 至 2026-04-24

摘要：加入快速扫描首包、后台补全、无前缀 fallback、连接/发现服务超时、快连入口和状态机可视化。

关键结论：

- 目标扫描体验从固定等待 5s 改为快速首包 + 后台补全。
- 控制页只允许 `ready` 状态发送业务命令。

相关文件：

- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.test.ts`
- `项目文件/推进工作.md`

## M03 - 命令定义与不等待回包策略

日期：2026-04-24

摘要：新增 `CommandDefinition`，固化 5 条 MVP 命令；根据真机行为，将普通命令调整为写入成功即返回，不等待 BLE 回包。

关键结论：

- 写入方式固定 `write`。
- 普通命令不等待 BLE 回包，避免假超时。
- 只有后续确认稳定有回传的特定命令才单独开启等待。

相关文件：

- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`
- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.test.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- `项目文件/最小命令集表.md`

## M04 - Agent 记忆框架

日期：2026-04-27

摘要：根据 `docs/improve.md` 建立分层记忆框架，区分当前上下文、当前任务、变更索引、session 日志、归档和决策记录。

相关日志：

- `.agent/logs/2026-04-27-session-01.md`

关键文件：

- `.agent/AI_CONTEXT.md`
- `todo.md`
- `.agent/CHANGE_INDEX.md`
- `.agent/RULES.md`
- `.agent/decisions/ADR-001-agent-memory-structure.md`

## M05 - 多 Agent 协作框架

日期：2026-04-27

摘要：在原有记忆框架上增加多 agent 启动入口、角色定义、文件所有权、工作流、验证指南、任务包模板和交接模板，方便后续不同 agent 无缝接手。

相关日志：

- `.agent/logs/2026-04-27-session-02.md`

关键文件：

- `.agent/START_HERE.md`
- `.agent/agents/ROLES.md`
- `.agent/OWNERSHIP.md`
- `.agent/WORKFLOWS.md`
- `.agent/VERIFICATION.md`
- `.agent/tasks/active/`
- `.agent/templates/`
- `.agent/handoffs/NEXT_AGENT_HANDOFF.md`
- `.agent/decisions/ADR-002-multi-agent-coordination.md`

## M06 - 正式 RF 协议帧切换

日期：2026-04-27

摘要：读取 `新遥控器数据下载与控制协议.xlsx` 后，废弃 `AA 55 + CRC16` 临时调试帧，切换为正式 `FF CE + LEN + DESC + CMD + SUB + DATA + 30 + SUM` RF 控制帧。读参数命令按用户提供整条命令 `FF CE 06 00 0D 00 00 30 10` 固化。

关键结论：

- RF 控制命令总是 9 字节。
- 最后 1 字节是前面所有字节的无进位累加和低 8 位。
- 5 条控制命令为 `0x0A/0x0B/0x0C/0x0D/0x0E`。
- 读参数和读状态协议上需要回传，但当前程序仍不阻塞等待 BLE 回包，只做被动解析。

相关日志：

- `.agent/logs/2026-04-27-session-03.md`

关键文件：

- `项目文件/android-mvp-capacitor/src/protocol/frameCodec.ts`
- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`
- `项目文件/android-mvp-capacitor/src/protocol/responseParser.ts`
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/最小命令集表.md`
- `项目文件/通信参数确认表.md`

## M07 - 先方案后修改工作流

日期：2026-04-27

摘要：建立项目级 `plan-first-development` skill 和 `.agent/PLAN_FIRST_WORKFLOW.md`，要求后续非微小修改先写方案、更新 `todo.md` 优先级和验收标准，等待用户确认后再实施。

关键结论：

- 未确认前，只允许读取、写方案、更新 TODO 和记录审批。
- 用户明确确认后，才允许修改业务代码、协议、UI、Android 原生文件、构建配置或源协议文件。
- 项目内 skill 位于 `.codex/skills/plan-first-development/SKILL.md`。

相关日志：

- `.agent/logs/2026-04-27-session-04.md`

关键文件：

- `.codex/skills/plan-first-development/SKILL.md`
- `.agent/PLAN_FIRST_WORKFLOW.md`
- `.agent/templates/change-plan.md`
- `.agent/templates/approval-record.md`
- `.agent/plans/2026-04-27-plan-first-workflow.md`
- `.agent/approvals/2026-04-27-plan-first-workflow.md`
