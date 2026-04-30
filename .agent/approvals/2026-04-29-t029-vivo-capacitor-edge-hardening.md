# Approval - T-029 Vivo Capacitor Edge-To-Edge Hardening

- Date: 2026-04-29
- Plan: `.agent/plans/2026-04-29-t029-vivo-capacitor-edge-hardening.md`
- User approval: “先做”
- Approved scope: implement the T-029 vivo / Capacitor WebView edge-to-edge hardening plan.
- Constraints:
  - Do not modify BLE protocol, commands, response-wait strategy, or `src/device/deviceController.ts`.
  - Do not modify source protocol Excel files.
  - Do not include `android/.idea/`.
  - Do not use legacy `SYSTEM_UI_FLAG_*` fullscreen/layout flags.
  - Do not use root layout global padding as the final system inset strategy.
