# Approval - T031 Final System Bars Probe + Visual Fallback

- Date: 2026-04-29
- User approval: “执行”
- Approved plan: `.agent/plans/2026-04-29-t031-final-system-bars-probe.md`
- Approved phase: Probe stage first.
- Scope:
  - Add T031 build identity and native/Web logging.
  - Add Debug probe colors and foreground system bar strips.
  - Reapply system bar configuration across lifecycle stages.
  - Temporarily disable Capacitor SystemBars CSS injection during Probe.
  - Add Web edge mode bridge and visual fallback CSS.
  - Export `solar-remote-t031-probe.apk`.
- Pause point:
  - Final `solar-remote-t031-sideload.apk` waits for vivo Probe result A/B/C/D.
- Out of scope:
  - BLE, protocol, source protocol Excel, `deviceController.ts`, T-001/T-002/T-010.
