# Report - T039 Touch Guard, Discovery Stability, And Initial Sync

## Scope

Implemented the approved T039 plan:

- Added pre-dispatch touch intent guards for ordinary command buttons, time-control steppers, segment buttons, and time-control sliders.
- Expanded supported device names to `AC632N_1`, `AC632N-1`, `M3240-G`, and `N3230-U`.
- Switched App discovery scans to no-prefix scanning, then filters in App by the supported-name list.
- Kept a low-frequency background discovery loop after connect/disconnect without stopping the foreground control page.
- Sent `读状态` then `读参数` once after connection ready, using the existing non-blocking command path.
- Retained missing devices for multiple scan rounds and kept recently disconnected devices visible longer, demoted below connectable devices.

## Files Changed

- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/device/deviceController.ts`
- `项目文件/android-mvp-capacitor/src/device/deviceController.test.ts`
- `todo.md`
- `.agent/approvals/2026-04-30-t039-touch-guard-discovery-sync.md`

## Preserved Rules

- Did not modify `底层协议/新遥控器数据下载与控制协议.xlsx`.
- Did not include `项目文件/android-mvp-capacitor/android/.idea/`.
- Did not change ordinary business commands to wait for BLE response.
- Did not revert protocol to AA55 frames.
- UI still does not parse raw HEX.
- `deviceController.ts` was modified only by this agent in this task.
- No new release APK was exported; latest delivery APK remains T033 unless requested.

## TDD Evidence

Red checks:

- `npm.cmd test -- src/app.test.ts`: failed as expected with 7 new failures for supported names, touch guards, initial sync, and device retention.
- `npm.cmd test -- src/device/deviceController.test.ts`: failed as expected with 1 new failure for no-prefix scan override.

Green checks:

- `npm.cmd test -- src/app.test.ts`: 47 passed.
- `npm.cmd test -- src/device/deviceController.test.ts`: 14 passed.
- `npm.cmd test`: 6 files / 80 tests passed.

## Verification

- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- Android Studio JBR `gradlew.bat assembleDebug --project-prop android.injected.testOnly=false`: passed.
- `aapt dump badging app/build/outputs/apk/debug/app-debug.apk`: package output present, no `testOnly` entry.
- `apksigner.bat verify --verbose app/build/outputs/apk/debug/app-debug.apk`: verifies; v2 signature true, 1 signer.
- Chrome CDP smoke with temporary Vite dev server:
  - 320px ok
  - 360px ok
  - 390px ok
  - Connected mock device, opened control page, confirmed `#controlPanelSection` and `#timeSegmentDurationRange`, and no horizontal overflow.

## Notes

- Direct `npx --package playwright` did not expose the `playwright` package to `require()` in this environment, so browser smoke used Chrome DevTools Protocol directly without changing project dependencies.
- The first APK static-check attempt failed because `aapt` could not open a path containing Chinese characters. The check was rerun successfully from the Android project directory using the ASCII relative APK path.
- T040 remains separate: true multi-BLE-device simultaneous control and 2.4G replacement need an architecture/feasibility pass before implementation.
