# Approval - T033 Edge Spacing Micro Adjust

- Date: 2026-04-30
- Approved by: user
- Approval phrase: `按方案做`
- Approved plan: `.agent/plans/2026-04-30-t033-edge-spacing-micro-adjust.md`

## Scope

Implement only the approved micro spacing pass:

- Move top titles/page content slightly upward from T032.
- Move bottom TabBar content slightly closer to the bottom while keeping `bottom:0`.
- Slightly widen the content by reducing left/right shell padding.

## Guardrails

- Do not modify BLE, protocol HEX, Android native edge-to-edge code, ordinary command response behavior, or `src/device/deviceController.ts`.
- Do not modify T-001/T-002/T-010.
- Export T033 APK only after verification.
