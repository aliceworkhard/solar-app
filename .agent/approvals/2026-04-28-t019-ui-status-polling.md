# Approval - T-019 UI card cleanup and status polling

- Time: 2026-04-28 11:59:31 +08:00
- User approval: 执行
- Approved plan: `.agent/plans/2026-04-28-t019-ui-status-polling.md`
- Approved scope:
  - Update home nearby-device card layout and swipe-left disconnect action.
  - Remove the home current-device summary card.
  - Update control-page Live Status fields and move mode buttons to the top of the control panel.
  - Start 5s read-status polling after connection reaches ready.
  - Add tests first, then implement and verify.
- Not approved:
  - Android BLE native changes.
  - Protocol HEX/frame changes.
  - iOS work.
