# Plan - T-023 Next Agent Project Handoff

## Request

用户希望整理当前项目信息，让下一个 agent 可以完整接手项目。

## Current Facts

- 当前分支：`main`。
- 当前远端：`https://github.com/aliceworkhard/solar-app.git`。
- 最新推送成功范围：`80c1208..b4d0333 main -> main`。
- 最新提交：
  - `3ede780 feat: refine BLE UI anchors and current display`
  - `b4d0333 docs: record github backup for t022`
- T-022 已完成并已推送：自动扫描、`+ / X` 停止、详情锚点、状态栏透明增强、电流计算规则。
- 主要未完成任务仍是：
  - `T-001` 真机 20 次扫描/连接性能采样。
  - `T-002` 5 条 MVP 命令复测。
  - `T-010` 基于真机数据继续优化持续发现。
- 发现 `项目文件/上传日志.md` 最新一条有 PowerShell 反引号转义造成的格式问题，需要一起修正，避免下个 agent 误读。

## Goal

- 给下一个 agent 一个“打开即读”的交接入口。
- 明确当前项目状态、关键事实、最新 GitHub 备份状态、未完成任务、风险、命令和禁止事项。
- 不改业务代码、不改 BLE、不改协议、不改 UI。

## Proposed Scope

- 更新 `.agent/handoffs/NEXT_AGENT_HANDOFF.md` 为当前 T-022 后的最新接手说明。
- 新增一份带日期的正式 handoff：`.agent/handoffs/2026-04-28-Orchestrator-next-agent-project-handoff.md`。
- 更新 `.agent/START_HERE.md` 顶部当前最佳下一步，指向最新 handoff 和 T-001/T-002。
- 修正 `项目文件/上传日志.md` 最新 T-022 上传记录中的 `$hash`、异常控制字符和命令格式。
- 更新 `todo.md` 的 T-023 状态。
- 新增 session log。

## Non-Scope

- 不改 `项目文件/android-mvp-capacitor/src/`。
- 不改 Android 原生代码。
- 不改协议实现、Excel 源协议和命令定义。
- 不重新跑 APK 构建；本次是文档交接整理。
- 不自动 commit/push，除非用户要求。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Handoff | `.agent/handoffs/NEXT_AGENT_HANDOFF.md` | 更新为当前项目接手总览，覆盖旧的 2026-04-27 信息。 |
| Handoff | `.agent/handoffs/2026-04-28-Orchestrator-next-agent-project-handoff.md` | 新增正式交接快照，包含状态、角色建议、文件入口、验证命令、下一步。 |
| Start | `.agent/START_HERE.md` | 更新顶部 `Current Best Next Step`，避免继续指向早期 T-011。 |
| Release log | `项目文件/上传日志.md` | 修正最新 T-022 上传记录格式。 |
| TODO | `todo.md` | 新增/更新 T-023 文档整理任务。 |
| Session log | `.agent/logs/2026-04-28-session-08.md` | 记录本次交接整理。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-023 下一个 agent 项目接手包整理 | P0 | Proposed | 下个 agent 只读 `AGENTS.md`、`START_HERE.md`、`AI_CONTEXT.md`、`NEXT_AGENT_HANDOFF.md`、`todo.md` 即可明确接手路径。 |

## Risks

- 交接信息如果过长会难读；本次只写关键事实和入口，不复制完整历史。
- `上传日志.md` 已经随上一提交推送过一次，修正后如需 GitHub 同步，需要再单独提交推送。

## Verification

- 文档验证：检查 handoff 是否包含当前提交号、最新状态、下一步任务和禁止事项。
- Git 验证：运行 `git status -sb` 确认只产生文档变更。
- 不运行 `npm` / Gradle，因为不改代码。

## Rollback

- 如交接文档方向不合适，删除新增 handoff 并回退 `NEXT_AGENT_HANDOFF.md` / `START_HERE.md` / `todo.md` 的 T-023 相关段落即可。

## Approval Gate

等待用户确认后再修改 handoff、START_HERE、上传日志和 session log。
