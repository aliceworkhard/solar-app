# T035 Time Control Real-Frame Corrections Report

Date: 2026-04-30

## Scope

Implemented the approved T035 correction for `B1 MODE=01` time-control parameters.

## Protocol Corrections

- `MODE=01` remains a 29-byte full frame with `LEN=1A`.
- Segment durations now use 5-minute cumulative points.
- Segment and morning power now use 0-255 scaled percentage encoding:
  - `80% -> CC`
  - `50% -> 80`
  - `30% -> 4D`
  - `10% -> 1A`
  - `100% -> FF`
- `maxOutputRaw` is now a 16-bit raw field, preserving `FF00`, `0640`, and `0600`.
- Battery labels are corrected to `1=磷酸铁锂`, `2=锂电池`, `3=铅酸`.
- User read frame and supplier `MODE=01` frame are covered as golden samples.

## Send Strategy

- Time-control writes still call one `writeTimeControlParams()` command per committed edit.
- No app-layer splitting was added for `MODE=01`.
- Android native now requests `requestMtu(64)` best-effort after service discovery and logs negotiated MTU/write byte length.
- `MODE=02` long-frame splitting is intentionally not implemented in T035.

## UI Changes

- Time durations display as hours/minutes from minute-based values.
- Maximum output displays as decimal raw plus hex, for example `65280 / 0xFF00`.
- Sensitivity labels now show high/middle/low/remote labels.
- Read-params `B1 MODE=01` responses continue to sync into the time-control editor.

## Verification

- TDD red check observed before implementation:
  - New T035 tests failed against T034 half-hour/percent assumptions.
  - New device-controller byte-length test failed before the log change.
- `npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts src/device/deviceController.test.ts src/app.test.ts`: passed, 5 files / 68 tests.
- `npm.cmd test`: passed, 6 files / 71 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- Android Studio JBR `gradlew.bat assembleDebug`: passed.
- `aapt dump badging`: `NO_TEST_ONLY`.
- `apksigner verify --verbose`: verifies with v2 signature, 1 signer.
- Chrome/Playwright layout smoke with system Chrome at 320/360/390px: no horizontal overflow in the time-control editor.

## Notes For Real-Device Validation

- User frame `FF CE 1A 01 B1 00 ... 30 49` should decode to 4h30m / 2h / 2h / 2h / 1h, max output raw `0x0640`, morning duration 11h20m, all powers 100%.
- Supplier time-control frame should encode to `FF CE 1A 00 B1 00 01 01 0C 80 FF 00 1E 02 18 2A 36 3C 42 CC FF 80 4D 4D 0C 4D 00 30 A9`.
- User changed frame with raw power `05` is represented as about 2% and re-encodes back to `05`.
- No T035 sideload APK was exported unless requested; latest delivered sideload APK remains T033.
