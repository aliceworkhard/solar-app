# Approval - T-026 Profile Density And Safe Bottom Navigation

- Date: 2026-04-28
- Plan: `.agent/plans/2026-04-28-t026-profile-density-safe-nav.md`
- User approval: “可以，试一下”
- Approved scope:
  - Adjust profile page density and labels.
  - Keep `我的设备` as one row with 3 items on narrow screens.
  - Keep `我的场景` as one row with 4 items on narrow screens.
  - Make bottom navigation more compact and safer around Android bottom navigation/safe area.
  - Keep top content clear of the system status bar.
  - Update relevant tests and deliver a non-`testOnly` APK after verification.
- Explicit non-scope:
  - No BLE/protocol command changes.
  - No `deviceController.ts` changes.
  - No default response waiting for normal commands.
  - No protocol Excel changes.
  - No `android/.idea/`.
