# Plan - T-007 Recently Done Cleanup

## Request

用户希望精简 `todo.md` 的 `## Recently Done`，因为很多历史完成项已经没有继续占用当前 TODO 的价值。

## Current Facts

- `todo.md` 当前 108 行，未超过 150 行，但 `Recently Done` 包含大量历史完成项。
- `.agent/CHANGE_INDEX.md` 已覆盖从 M00 到 M16 的阶段性历史索引，可承接长期历史入口。
- 当前仍需要在 `todo.md` 保留最新接手口径、当前阻塞项和近期完成状态，避免下一位 agent 误读。
- 本次不涉及业务代码、协议实现、UI、Android 原生文件或底层协议 Excel。

## Proposed Scope

- 精简 `todo.md` 的 `## Recently Done`。
- 保留最近且仍影响当前判断的完成项：
  - `T-024` 接手后状态口径同步。
  - `T-023` 下一 agent 接手包整理。
  - `T-022` 最新 UI/扫描停止/锚点/电流规则修正摘要。
- 将更早完成项压缩为 1 条总览，指向 `.agent/CHANGE_INDEX.md` 和 `.agent/logs/`。
- 完成后新增一份 session log。

## Not In Scope

- 不移动或删除 `.agent/logs/`。
- 不改业务代码、协议、UI、Android 原生文件或构建配置。
- 不覆盖底层协议 Excel。
- 不调整 T-001/T-002/T-010 的任务口径。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| TODO | `todo.md` | 精简 `Recently Done`，删除长历史流水账，保留最新 3 条和一条历史索引说明 |
| Log | `.agent/logs/2026-04-28-session-10.md` | 记录本次 TODO 精简 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-007 做一次旧文档归档压缩 | P2 | Proposed | `todo.md` 的 `Recently Done` 精简到少量当前相关条目；历史入口仍能从 `.agent/CHANGE_INDEX.md` 找到 |

## Risks

- 如果删减过多，下一位 agent 可能少看到近期关键状态；因此保留 T-024/T-023/T-022 和历史索引。
- 如果把历史移动到 archive，范围会扩大；本次先不做文件搬迁。

## Verification

- 检查 `todo.md` 行数。
- 运行 `git diff --check`。
- 确认 `git status --short` 只包含文档类变更。

## Rollback

- 使用 Git diff 恢复 `todo.md` 的 `Recently Done` 原段落即可。

## Approval Gate

等待用户确认后再修改 `Recently Done` 正文。
