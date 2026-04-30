# Approval - T035 Time Control Real-Frame Corrections

## User Approval

User said: "你改一下，我看看效果"

## Approved Scope

Implement the approved plan in `.agent/plans/2026-04-30-t035-time-control-real-frame-corrections.md`.

Approved work:

- Correct `B1 MODE=01` time-control encoding/decoding from real frames.
- Keep time-control writes as one complete 29-byte frame.
- Decode read-params responses back into typed controls.
- Update UI labels/units for the corrected model.
- Add best-effort Android MTU request without adding app-layer splitting for `MODE=01`.
- Add/update tests and verification records.

Not approved:

- Do not implement `MODE=02` long-frame UI/protocol writing.
- Do not implement `MODE=03` UI/protocol writing.
- Do not change normal business commands to wait for BLE responses.
- Do not change the source protocol Excel file.
- Do not include Android `.idea/`.
