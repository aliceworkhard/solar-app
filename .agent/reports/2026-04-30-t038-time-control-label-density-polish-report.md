# T038 Time-Control Label Density Polish Report

Date: 2026-04-30

## Scope

- Implemented the approved T038 UI text and layout polish on top of T037.
- T038 did not change BLE native code, protocol encoding/decoding, ordinary command response-wait policy, source protocol Excel, or `deviceController.ts`.
- No T038 sideload APK was exported; latest delivery APK remains T033 unless requested.

## Changes

- Live Status main mode title now displays `时控模式`.
- Live Status mini `模式` card now displays `时控`.
- Removed the control-panel `当前模式` display card.
- Added structured time-segment duration labels:
  - top line: `?档`;
  - bottom line: `?h`;
  - no `/` between the two values.
- Kept the time-control mode strip active state and T037 400ms trailing debounce behavior unchanged.

## Verification

- TDD red phase observed on `src/app.test.ts` before implementation.
- `npm.cmd test -- src/app.test.ts`: 1 file / 42 tests passed.
- `npm.cmd test`: 6 files / 74 tests passed.
- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- Android Studio JBR `gradlew.bat assembleDebug`: passed.
- APK `aapt dump badging`: no `testOnly`.
- APK `apksigner verify --verbose`: verifies with v2 signature, 1 signer.
- Chrome/Playwright smoke at 320/360/390px:
  - no horizontal overflow;
  - no `当前模式` context card;
  - Live Status title is `时控模式`;
  - Live Status mode mini-card is `时控`;
  - time segment labels render as stacked unit/time values and contain no `/`;
  - mode strip still highlights `time`.

## Remaining Real-Device Checks

- Confirm the shorter Live Status labels read correctly on the vivo phone.
- Confirm the stacked time-segment labels remain legible in the real WebView.
- Protocol and BLE behavior should be unchanged from T037.
