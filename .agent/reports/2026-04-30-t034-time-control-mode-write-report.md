# T034 Time Control Mode Write Report

Date: 2026-04-30

## Summary

Implemented the approved time-control mode integration for `B1 MODE=01`.

Implemented behavior:

- Time-control parameters are represented as typed data in `src/protocol/timeControlParams.ts`.
- Any committed time-control edit builds and sends one complete `B1 MODE=01` parameter frame.
- The frame uses `LEN=1A`, 21 bytes of data payload, and 29 total bytes.
- Time segment durations are encoded as cumulative half-hour arrival points.
- Sliders use `change` commit handling, so dragging does not spam BLE writes.
- `readParams` remains non-blocking; if a notify returns `B1 MODE=01`, the parsed parameters update `DeviceStatus.timeControlParams`, and the App syncs the draft controls from status.
- The App only syncs the editor from a new `timeControlParams` object, so ordinary status refreshes do not overwrite a locally edited draft with an older read-params snapshot.

Preserved behavior:

- Existing 5 MVP command definitions remain in `CommandBuilder.allDefinitions()`.
- Ordinary control commands still do not wait for BLE responses.
- Time-control write also does not wait for BLE responses.
- UI uses typed params and does not parse HEX directly.
- No source protocol Excel file was modified.

## Files

- `项目文件/android-mvp-capacitor/src/protocol/timeControlParams.ts`
- `项目文件/android-mvp-capacitor/src/protocol/timeControlParams.test.ts`
- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`
- `项目文件/android-mvp-capacitor/src/protocol/commandBuilder.test.ts`
- `项目文件/android-mvp-capacitor/src/protocol/responseParser.ts`
- `项目文件/android-mvp-capacitor/src/protocol/responseParser.test.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- `项目文件/android-mvp-capacitor/src/types.ts`
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`

## TDD

Red check observed first:

- `npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts src/app.test.ts`
- Failed because `timeControlParams` did not exist, `TIME_CONTROL_EDITOR_MODEL` was missing, and `MODE=01` still mapped to radar.

Green checks:

- `npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts`: 3 files / 12 tests passed.
- `npm.cmd test -- src/app.test.ts src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts`: 4 files / 52 tests passed.
- `npm.cmd test`: 6 files / 67 tests passed.

## Verification

- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- `gradlew.bat assembleDebug` with temporary `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`: passed.
- `aapt dump badging` on a temporary ASCII-path copy of debug APK: no `testOnly` entry; package `com.solar.remote`.
- `apksigner.bat verify --verbose`: `Verifies`, v2 signing true, 1 signer.
- Chrome local smoke at 320/360/390px: time-control editor visible, 13 time-control controls enabled after mock ready, 5 segment buttons present, no horizontal overflow.

## Notes

- The local Vite dev server was started at `http://127.0.0.1:5174/` for browser verification.
- `JAVA_HOME` is still not globally configured; Gradle was verified by temporarily pointing the shell to Android Studio JBR.
- Existing local untracked old APKs and the modified protocol Excel were not touched.
