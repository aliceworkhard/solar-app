# Plan - AC632N_1 auto-connect and status refresh fix

## Request

Fix the current app behavior reported by the user:

1. Only `AC632N_1` is allowed through the device flow; other BLE devices should not be displayed.
2. The app should auto-connect to the allowed device, then send one `readStatus` command so notify data can update the UI.
3. After returning from the detail page to the nearby-device page, clicking the already connected device should open the detail page instead of reconnecting.

## Current Facts

- Current BLE profile scans by prefix `AC632N`, so `AC632N_2` and other matching devices can appear.
- `src/app.ts` merges every scan result into the device list without an exact-name whitelist.
- `connectDevice()` currently only calls `controller.connectAndPrepare(deviceId)` and does not send `readStatus()` after the connection becomes ready.
- `refreshDeviceList()` binds every device-card click to `connectDevice(target)`, even when the target is already the active ready device. That is the root cause of the “clicking connected device looks like reconnecting” bug.
- `CommandBuilder.readStatus()` already sends `FF CE 06 00 0E 00 00 30 11` and does not wait for a BLE response; notify parsing remains passive and updates status when data arrives.
- There are uncommitted T-011 UI convergence changes in the worktree; this fix should build on them and still exclude `项目文件/android-mvp-capacitor/android/.idea/`.

## Proposed Scope

Do:

- Add a single UI whitelist target: `AC632N_1`.
- Filter scan progress and scan results before they enter `mergeDiscoveryDevices()`.
- Change scan/quick-connect behavior so the app auto-connects the whitelisted target once discovered.
- After a successful connect, immediately call `controller.readStatus()` once and show feedback that the app is waiting for notify data to refresh status.
- Change connected-device card click behavior: if the clicked card is the current ready device, open the control/detail page directly; otherwise connect.
- Add tests for target filtering and connected-card navigation decision logic.

Do not:

- Do not modify Android native BLE code.
- Do not modify protocol frame definitions.
- Do not change `write` mode.
- Do not wait/block for BLE response after `readStatus()`.
- Do not display or connect non-`AC632N_1` devices.

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| UI flow | `项目文件/android-mvp-capacitor/src/app.ts` | Add target-name filter, auto-connect guard, post-connect read-status send, and open-detail-on-connected-card behavior. |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | Add pure tests for whitelist filtering and connected-device click routing. |
| Project tracking | `todo.md` | Add T-015 as P0 Proposed. |
| Approval | `.agent/approvals/2026-04-27-ac632n1-autoconnect.md` | Create after user approval, before implementation. |
| Logs | `.agent/logs/2026-04-27-session-13.md` | Create after implementation. |

## TODO Update

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-015 AC632N_1 whitelist + auto-connect + connected-card navigation fix | P0 | Proposed | Only `AC632N_1` appears; finding it can auto-connect; connect success sends one `readStatus`; clicking already connected `AC632N_1` opens detail page instead of reconnecting; tests/build pass. |

## Risks

- If the real device sometimes advertises a different name, exact whitelist will hide it. This is intentional per the user’s current requirement.
- Auto-connecting during an active scan can conflict with BLE operations if done inside progress callbacks. Implementation should trigger auto-connect after scan returns a stable batch, not directly inside the progress callback.
- Since `readStatus()` does not wait for notify, UI update still depends on the device actually sending notify afterward.

## Verification

- `npm.cmd test`
- `npm.cmd run build`
- Optional browser check at `http://127.0.0.1:5173/` after implementation.
- Real phone check: scan should only show `AC632N_1`; app should auto-connect and send read-status once; returning to nearby page then tapping the connected card should enter the control page.

## Rollback

- Revert only the changes in `src/app.ts`, `src/app.test.ts`, and this plan/TODO entry.
- Do not use destructive Git commands.

## Approval Gate

Waiting for user approval before modifying business/UI files.
