# T036 Time Control UI / Mode / Output / Duration Corrections Report

Date: 2026-04-30

## Scope

Approved plan: `.agent/plans/2026-04-30-t036-time-control-ui-mode-output-duration-corrections.md`

Approval record: `.agent/approvals/2026-04-30-t036-time-control-ui-mode-output-duration-corrections.md`

User requested corrections after T035:

- Move `雷达模式 / 时控模式 / 平均模式` above the time-control parameter area.
- Remove `参数整包写入`.
- Link those mode labels with Live Status.
- Change `最大输出 raw` to percentage: high byte `00~FF`, low byte always `00`, display as `byte / 2.55%`.
- Change time segments 1~5 to 1~15 units, one unit = 30 minutes, protocol point step still 5 minutes, so one UI unit writes 6 protocol points.

## Implementation

- `src/protocol/timeControlParams.ts`
  - Replaced segment UI model with `durationHalfHours`.
  - Added `POINTS_PER_HALF_HOUR_UNIT = 6`.
  - Encodes each segment as cumulative `durationHalfHours * 6` protocol points.
  - Decodes read-params cumulative points back into half-hour units for UI sync.
  - Replaced max output UI/write model with `maxOutputByte`; write payload always emits `[maxOutputByte, 0x00]`.
  - Kept read-side `maxOutputLowByte` so returned values like `06 40` can be observed without preserving the low byte on the next write.

- `src/app.ts`
  - Moved mode strip above `renderTimeControlEditor()`.
  - Removed the `参数整包写入` heading.
  - Kept Live Status and nearby-device mode display linked through `formatModeLabel()`.
  - Changed max output slider to `0..255 step 1` and percent display.
  - Changed active segment duration slider to `1..15 step 1` half-hour units.
  - Kept morning duration on the existing 5-minute model.

- Tests
  - Updated protocol tests to cover supplier/user frames, `FF00`/`0600`, low-byte read preservation, half-hour unit encoding, and validation.
  - Updated App tests for mode strip placement, model metadata, and mode label linkage.

## Verification

- TDD red check was observed before implementation: targeted suite failed with expected old-model failures.
- `npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts src/app.test.ts`
  - 4 files passed
  - 56 tests passed
- `npm.cmd test`
  - 6 files passed
  - 72 tests passed
- `npm.cmd run build`
  - Passed
- `npm.cmd run sync`
  - Passed
- Android Studio JBR `gradlew.bat assembleDebug`
  - Passed
- APK checks
  - `aapt dump badging` on ASCII temp copy showed package metadata and no `testOnly`.
  - `apksigner verify --verbose` passed with v2 signature true.
- Chrome/Playwright layout smoke at 320/360/390px
  - Mode strip above editor.
  - `参数整包写入` removed.
  - `最大输出 raw` removed.
  - Live Status, summary, and active mode label show `时控模式`.
  - Max output slider is `0..255 step 1`, default display `100%`.
  - Segment duration slider is `1..15 step 1`, default display `4档 / 2h`.
  - No horizontal overflow.

## Delivery

No T036 sideload APK was exported. The latest delivered APK remains T033:

- `C:\solar-apk\solar-remote-t033-sideload.apk`
- `交付物/solar-remote-t033-sideload.apk`

T036 was built and APK-checked as a debug build only.

## Remaining Real-device Checks

- Confirm max output high-byte percent with low byte fixed to `00` matches the actual device behavior.
- Confirm read-back after user edits syncs every button and slider as expected.
- Confirm segment 1~5 half-hour units match the device or supplier UI interpretation.
- Confirm 29-byte `B1 MODE=01` full-frame write remains stable on the target phone/device.
