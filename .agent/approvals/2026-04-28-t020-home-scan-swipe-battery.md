# Approval - T-020 Home Scan, Swipe, Battery Percent

## Approval

- Date: 2026-04-28
- User approval: 可以，执行
- Approved plan: `.agent/plans/2026-04-28-t020-home-scan-swipe-battery.md`

## Approved Scope

- Remove the home search preparation card.
- Make the connected nearby-device card fully opaque when not swiped.
- Improve left-swipe disconnect animation and fully round the red disconnect action.
- Replace the lower Live Status refresh chip with battery percentage.
- Calculate battery percentage from battery voltage using `2.5V = 0%`, `3.4V = 100%`, clamped to `0-100%`.
- Make manual device refresh/background search non-blocking at the app UI layer.

## Boundaries

- Do not change Android native BLE.
- Do not change UUIDs, write type, protocol HEX, or command semantics.
- Do not change `deviceController.ts` unless a blocker is found and a new approval is requested.
