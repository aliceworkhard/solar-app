# Report - T041 Status Page Scroll Performance And Background Scan Cadence

## Scope

Implemented the approved T041 plan:

- Added App-layer UI refresh coalescing through `requestAnimationFrame`.
- Changed status updates so they no longer immediately run multiple heavy DOM refreshes in sequence.
- Avoided rebuilding the hidden home device list while the user is on control/profile/scene views.
- Added a device-list render signature so unchanged lists skip `innerHTML` rebuild and event rebind.
- Changed quiet background discovery to a 3000ms cadence with shorter scan windows.
- Reduced quiet background scan progress rendering to in-memory merging plus one deferred list refresh.
- Stopped hidden debug log DOM updates unless the debug panel is visible.
- Limited time-control editor refreshes to parameter sync, draft changes, active segment changes, or ready-state changes.

## Files Changed

- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- `todo.md`
- `.agent/approvals/2026-04-30-t041-status-page-scroll-performance-scan-cadence.md`

## Preserved Rules

- Did not modify `底层协议/新遥控器数据下载与控制协议.xlsx`.
- Did not include `项目文件/android-mvp-capacitor/android/.idea/`.
- Did not change ordinary business commands to wait for BLE responses.
- Did not change protocol frame format or revert to AA55.
- UI still does not parse raw HEX.
- Did not modify `deviceController.ts` in T041.
- No new release APK was exported; latest delivery APK remains T033 unless requested.

## Behavior Notes

- Foreground continuous discovery remains 5000ms with the existing foreground scan window.
- Quiet background discovery now waits 3000ms after a round completes, then uses `quickWindowMs=800` and `fullWindowMs=1200`.
- Manual refresh keeps its existing user-visible scan behavior through named constants.
- Returning to the home page forces the device list to render from the latest in-memory discovery data.
- The 5 second `readStatus` polling cadence is unchanged.

## TDD Evidence

Red check:

- `npm.cmd test -- src/app.test.ts`: failed as expected with 4 new failures for background cadence, visible-list rendering, list render signature, and time-control editor refresh gating.

Green checks:

- `npm.cmd test -- src/app.test.ts`: 51 passed.
- `npm.cmd test`: 6 files / 84 tests passed.

## Verification

- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- Android Studio JBR `gradlew.bat assembleDebug --project-prop android.injected.testOnly=false`: passed.
- `aapt dump badging app/build/outputs/apk/debug/app-debug.apk`: package output present, no `testOnly` entry.
- `apksigner.bat verify --verbose app/build/outputs/apk/debug/app-debug.apk`: verifies; v2 signature true, 1 signer.
- Chrome CDP smoke with temporary Vite dev server:
  - 320px control-page path and rapid scroll: exit 0.
  - 360px control-page path and rapid scroll: exit 0.
  - 390px control-page path and rapid scroll: exit 0.
  - Checked no horizontal overflow, reached control view through the mock connected device, and saw no runtime exceptions or console errors.

## Notes

- The first browser smoke pass reached the expected control page, but the PowerShell here-string corrupted a direct Chinese string comparison. The rerun used Unicode escapes.
- A Chrome resource 404 log was excluded from the final smoke because it was not a runtime exception or app console error.
- The first APK badging attempt failed on a Chinese path; the successful check was rerun from the Android project directory using `app/build/outputs/apk/debug/app-debug.apk`.
