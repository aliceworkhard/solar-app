# Approval - T036 Time-Control UI / Mode / Output / Duration Corrections

## User Approval

User said: "执行"

## Approved Scope

Implement the approved plan in `.agent/plans/2026-04-30-t036-time-control-ui-mode-output-duration-corrections.md`.

Approved work:

- Move the mode strip above the time-control parameter area.
- Remove the `参数整包写入` copy.
- Link mode display across Live Status and the mode strip as `雷达模式 / 时控模式 / 平均模式`.
- Change max output from raw UI to percentage UI, encoded as `[00~FF, 00]`.
- Change time segments 1-5 to `1~15` half-hour units, encoded as 5-minute cumulative points.
- Update tests and verification records.

Not approved:

- Do not implement `MODE=02` long-frame writing or splitting.
- Do not implement `MODE=03` parameter UI/writing.
- Do not change ordinary commands to wait for BLE responses.
- Do not change the source protocol Excel file.
