# Approval - T-027 Android Edge-To-Edge Insets Fix

- Date: 2026-04-29
- Plan: `.agent/plans/2026-04-29-t027-android-edge-to-edge-insets.md`
- User approval: “按方案做”
- Approved scope:
  - Replace legacy system bar flags with AndroidX edge-to-edge setup.
  - Disable Android Q+ system bar contrast enforcement where available.
  - Bridge real `WindowInsetsCompat` values from Android WebView to Web/CSS.
  - Move inset consumption from root shell padding to header, bottom tab bar, and scroll/content spacing.
  - Update tests, layout checks, session docs, and deliver a non-`testOnly` APK.
- Explicit non-scope:
  - No BLE/protocol command changes.
  - No `deviceController.ts` changes.
  - No default response waiting for normal commands.
  - No protocol Excel changes.
  - No `android/.idea/`.
