# Next Agent Handoff

更新时间：2026-04-27

## Situation

项目已完成 BLE 基础收发、写入方式锁定为 `write`、普通命令不等待 BLE 回包、`.agent` 记忆框架和多 agent 协作框架已建立。

协议层已切换为正式 RF 控制帧：`FF CE + LEN + DESC + CMD + SUB + DATA + 30 + SUM`。读参数命令是 `FF CE 06 00 0D 00 00 30 10`。

## Best Next Task

优先执行：

1. `.agent/tasks/active/T-001-performance-sampling.md`
2. `.agent/tasks/active/T-002-command-retest.md`

原因：

- 没有真机性能数据，就无法判断 BLE 提速是否达标。
- 没有命令复测数据，就无法判断哪些特定指令需要等待 notify。

## Important Constraints

- 不要修改 `底层协议/新遥控器数据下载与控制协议.xlsx`，除非任务明确要求。
- 不要纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
- 不要把普通命令重新改成默认等待回包。
- 不要把命令协议退回 `AA 55 + CRC16` 临时帧。
- 不要让 UI 直接解析 HEX。

## Known Local State

- 当前工作区存在此前 BLE/协议相关未提交改动。
- 当前工作区存在用户保留的 Excel 修改。
- 接手前必须先运行 Git 状态检查。

## Suggested Prompt For Next Agent

请先读取 `AGENTS.md`、`.agent/START_HERE.md`、`.agent/AI_CONTEXT.md`、`todo.md`，然后选择 `.agent/tasks/active/` 中一个任务包执行。不要默认读取完整日志，不要回滚用户改动。
