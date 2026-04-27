---
name: plan-first-development
description: Use in this project before any non-trivial code, protocol, UI, architecture, documentation-structure, task-management, or release change. Requires Codex to inspect context, write a concrete plan, update todo.md with priority and acceptance criteria, wait for explicit user approval, then implement only the approved scope.
---

# Plan First Development

## Core Rule

Do not modify business code, protocol logic, UI, build config, or major docs before the user has seen and approved a written plan.

Allowed before approval:

- Read files.
- Ask concise clarification questions when required.
- Create or update a plan file under `.agent/plans/`.
- Update `todo.md` with proposed tasks, priority, status, and acceptance criteria.
- Update `.agent/approvals/` only to record user approval after it is given.

Not allowed before approval:

- Changing files under `项目文件/android-mvp-capacitor/src/`.
- Changing Android native files.
- Changing protocol implementation.
- Changing UI behavior or styling.
- Changing Excel/source protocol files.
- Running destructive Git commands.

## Trigger Examples

Use this skill when the user says or implies:

- 修改、优化、实现、开发、重构、调整、接入、修复。
- “根据这个协议改一下”
- “下一步怎么做，然后做”
- “把 UI 改成...”
- “把命令换成...”
- “实现这个计划”

Skip only for:

- Pure explanation questions.
- Read-only analysis.
- Tiny typo/document wording fixes where the user explicitly asks for direct edit.
- Emergency one-line command/config updates explicitly approved in the same message.

## Workflow

1. Inspect context.
   - Read `AGENTS.md`.
   - Read `.agent/START_HERE.md`.
   - Read `.agent/AI_CONTEXT.md`.
   - Read `todo.md`.
   - Read only files directly related to the requested change.

2. Produce a plan.
   - Write `.agent/plans/YYYY-MM-DD-short-topic.md`.
   - Include scope, current facts, proposed changes, files affected, risks, test plan, rollback, and approval gate.

3. Update `todo.md`.
   - Add or adjust tasks with priority.
   - Use statuses: `Proposed`, `Approved`, `In Progress`, `Blocked`, `Done`.
   - Include acceptance criteria.

4. Stop and ask for approval.
   - Summarize the plan in the final response.
   - Ask the user to approve or revise.
   - Do not implement yet.

5. Implement only after explicit approval.
   - Accept approval phrases such as `同意`, `批准执行`, `按方案做`, `开始修改`, `执行`.
   - Record approval in `.agent/approvals/YYYY-MM-DD-short-topic.md`.
   - Modify only the approved files.

6. Verify and close.
   - Run relevant tests/builds.
   - Update `todo.md`.
   - Add a session log under `.agent/logs/`.
   - Update `.agent/CHANGE_INDEX.md` for milestone-level changes.

## Plan File Template

```md
# Plan - <topic>

## Request

用户要解决的问题。

## Current Facts

- 已确认事实。
- 相关文件。

## Proposed Scope

- 本次做什么。
- 本次不做什么。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
|  |  |  |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
|  | P0/P1/P2 | Proposed |  |

## Risks

- 风险和不确定点。

## Verification

- 需要运行的测试或真机验证。

## Rollback

- 如何回退。

## Approval Gate

等待用户确认后再修改业务文件。
```

