# Plan - Plan First Workflow

日期：2026-04-27
状态：Approved

## Request

用户希望后续提问或修改时，先做方案、更新 `todo.md`、写优先级，用户看过方案后再修改，以便精准处理问题。

## Current Facts

- 项目已有 `.agent` 多 agent 协作框架。
- 项目已有 `todo.md` 当前任务面板。
- 后续会有 BLE、协议、UI、文档、构建等多类修改。

## Goal

- 建立“先方案、后修改”的项目级流程。
- 提供可复用 project skill。
- 让下一个 agent 能按同一规则执行。

## Scope

本次做：

- 新增项目级 skill：`.codex/skills/plan-first-development/SKILL.md`。
- 新增流程文档：`.agent/PLAN_FIRST_WORKFLOW.md`。
- 新增计划和审批模板。
- 更新 `AGENTS.md`、`.agent/RULES.md`、`.agent/START_HERE.md`、`todo.md`。

本次不做：

- 不改业务代码。
- 不改协议实现。
- 不改 UI。
- 不提交 Git。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Skill | `.codex/skills/plan-first-development/SKILL.md` | 定义触发条件和执行规则 |
| Rule | `.agent/PLAN_FIRST_WORKFLOW.md` | 固化先方案后修改流程 |
| Templates | `.agent/templates/change-plan.md` | 计划模板 |
| Templates | `.agent/templates/approval-record.md` | 审批记录模板 |
| Entry | `AGENTS.md` | 增加入口规则 |
| TODO | `todo.md` | 增加流程任务记录 |

## TODO Updates

| Task ID | Task | Priority | Status | Acceptance |
| --- | --- | --- | --- | --- |
| T-009 | 建立先方案后修改流程 | P0 | Approved | 有 skill、规则、模板、TODO 记录 |

## Risks

- 项目级 `.codex/skills` 是否被所有环境自动加载不确定，所以同时写入 `AGENTS.md` 和 `.agent` 规则。

## Verification

- 检查文件存在。
- 检查 skill frontmatter。
- 检查 `todo.md` 已记录流程规则。

## Rollback

- 删除 `.codex/skills/plan-first-development/`。
- 删除 `.agent/PLAN_FIRST_WORKFLOW.md` 和相关模板。
- 从 `AGENTS.md`、`.agent/RULES.md`、`todo.md` 移除流程说明。

## Approval Gate

用户已回复“确认”，允许只修改协作层文件。

