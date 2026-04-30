# T037 Time-Control Interaction Visual Debounce Report

Date: 2026-04-30

## Scope

- Implemented the approved T037 UI/App-layer refinement for the time-control editor.
- T037 did not change BLE native code, protocol frame encoding, ordinary command response-wait policy, source protocol Excel, or `deviceController.ts`.
- No T037 sideload APK was exported; latest delivery APK remains T033 unless a new package is requested.

## Changes

- Control-panel mode strip now treats `时控模式` as the only implemented active mode. `雷达模式` and `平均模式` remain visible but disabled as not-yet-open editors.
- Live Status and the control-panel mode context now show `当前是时控模式`, while the underlying raw `status.mode` is retained for data/debug use.
- Segment tabs, current segment duration, and current segment power are grouped in a stronger linked editor card.
- Selecting a segment updates the card title, active segment button, duration slider/value, and power slider/value together.
- Time-control stepper buttons and slider `change` commits now use a 400ms trailing debounce before calling `writeTimeControlParams()`.
- Consecutive time-control edits within the debounce window collapse into one final full `B1 MODE=01` write.
- Incoming `readParams` / `B1 MODE=01` sync cancels pending local time-control writes before replacing the draft with device-returned params.

## Verification

- TDD red phase observed on `src/app.test.ts` before implementation.
- `npm.cmd test -- src/app.test.ts`: 1 file / 41 tests passed.
- `npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts src/app.test.ts`: 4 files / 57 tests passed.
- `npm.cmd test`: 6 files / 73 tests passed.
- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- Android Studio JBR `gradlew.bat assembleDebug`: passed.
- APK `aapt dump badging`: no `testOnly`.
- APK `apksigner verify --verbose`: verifies with v2 signature, 1 signer.
- Chrome/Playwright smoke at 320/360/390px:
  - no horizontal overflow;
  - active mode is `time`;
  - `雷达模式` and `平均模式` are disabled;
  - current mode text is linked across Live Status and the control panel;
  - time segment card exists and segment 3 selection updates duration/power controls;
  - slider release does not write immediately or at 150ms, writes once after 400ms;
  - two rapid slider releases produce one trailing write with the final value;
  - a stepper button click also writes only after the debounce delay.

## Remaining Real-Device Checks

- Confirm on the physical controller that the delayed full `B1 MODE=01` write is accepted after slider/button edits.
- After editing, press `读参数` and verify the returned full time-control params sync back into every button and slider.
- Keep T001/T002/T010 deferred until the user asks to resume them.
