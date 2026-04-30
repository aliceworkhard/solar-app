# Approval - T032 UI Header / TabBar Compact Polish

- Date: 2026-04-29
- Approved by: user
- Approval phrase: `执行`
- Approved plan: `.agent/plans/2026-04-29-t032-ui-header-tabbar-compact-polish.md`

## Scope

Implement the approved UI polish only:

- Remove the rectangular header/background feel under page titles.
- Move `设备 / 具体设备 / 场景 / 我的` titles slightly upward while keeping status-bar safety.
- Move the bottom `设备 / 场景 / 我的` TabBar visually lower while preserving gesture/navigation-bar safety.
- Default the detail page to active `设备状态`, with a clear active state when switching to `控制面板`.

## Guardrails

- Do not modify BLE, protocol logic, ordinary command response behavior, Android native edge-to-edge code, or `src/device/deviceController.ts`.
- Do not touch T-001, T-002, or T-010.
- Export T032 APK only after verification.
