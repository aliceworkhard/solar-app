# Approval - T-028 Control Panel Command Buttons

Date: 2026-04-29

Approved by: user

Approval phrase:

> 执行

Approved plan:

- `.agent/plans/2026-04-29-t028-control-panel-command-buttons.md`

Approved scope:

- Redesign the control-panel command buttons in the App/UI layer.
- Make `开/关`, `增加亮度`, and `降低亮度` the primary manual controls.
- Keep `读状态` and `读参数` as low-priority reserved tools for now.
- Preserve all existing command ids/actions and command semantics.
- Do not change BLE, protocol HEX, response-waiting behavior, Android native files, or `src/device/deviceController.ts`.
