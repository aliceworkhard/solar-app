# Approval - T-030 Edge-To-Edge Supplemental Hardening

- Date: 2026-04-29
- User approval: “做吧”
- Approved plan: `.agent/plans/2026-04-29-t030-edge-to-edge-supplemental-hardening.md`
- Scope:
  - Apply the T-030 supplemental Android edge-to-edge hardening.
  - Keep Capacitor v8 SystemBars config because `@capacitor/core/android/cli` are confirmed as `8.3.1`.
  - Remove the WebView no-op insets listener and avoid overriding Capacitor SystemBars parent listener.
  - Keep main insets handling on DecorView without consuming insets.
  - Limit native paint fallback to system bar regions and keep it non-interactive.
  - Request insets immediately after early edge-to-edge initialization.
  - Use CSS max(native, system, safe-area, env) without double-counting.
  - Restore content left/right width by not applying ordinary side gesture insets to `.shell` horizontal padding.
  - Add width-ratio validation/fallback and debug-only diagnostic color switch, default off.
- Out of scope:
  - BLE, protocol, source protocol Excel, `deviceController.ts`, T-001/T-002/T-010.
