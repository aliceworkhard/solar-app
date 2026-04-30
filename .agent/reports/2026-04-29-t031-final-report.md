# T031 Final Report - Edge Color Cleanup

Date: 2026-04-29

## Result

T031 Probe on vivo showed cyan top strip and green bottom strip, so the final strategy is `TRANSPARENT_EDGE_WITH_STRIPS`.

This final build keeps the working edge-to-edge + native strip path and removes the visible Probe colors from the default APK.

## Final APK

- APK: `C:\solar-apk\solar-remote-t031-sideload.apk`
- Project copy: `交付物/solar-remote-t031-sideload.apk`
- SHA256: `2CE79E87FDDCE625B537417A91927046C86E4E4863B61EAF0180C3DE90025F3E`
- Size: `8053173` bytes

## Key Changes

- `EDGE_PROBE_COLORS = false`.
- Native strategy fixed to `TRANSPARENT_EDGE_WITH_STRIPS`.
- Native top strip: final light page top color.
- Native bottom strip: final bottom navigation edge color.
- Native window/decor/content/WebView fallback background: final light page color.
- Web default edge mode: `transparent`.
- Web diagnostic overlay: transparent unless native explicitly enables diagnostics.
- CSS page background restored to a light blue layered gradient.
- Bottom nav remains `bottom: 0`, with bottom inset handled through padding/min-height.

## Not Changed

- BLE behavior.
- Protocol frames or HEX.
- Normal business command response waiting.
- `src/device/deviceController.ts`.
- Source protocol Excel.
- `android/.idea/`.

## Verification

- TDD red check: added tests failed before implementation because `EDGE_DEFAULT_MODE` / `EDGE_DIAGNOSTIC_DOM_BACKGROUND` did not exist.
- `npm.cmd test -- src/app.test.ts`: 38 passed.
- `npm.cmd test`: 5 files / 59 tests passed.
- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- `node .agent/reports/2026-04-29-t031-final-layout-check.cjs`: passed.
- `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`: BUILD SUCCESSFUL.
- `aapt dump xmltree C:\solar-apk\solar-remote-t031-sideload.apk AndroidManifest.xml | Select-String testOnly`: no output.
- `apksigner verify --verbose C:\solar-apk\solar-remote-t031-sideload.apk`: Verifies; v2 true; Number of signers 1.

## Local Layout Check

- Results: `.agent/reports/2026-04-29-t031-final-layout-results.json`
- Screenshot: `.agent/reports/screenshots/2026-04-29-t031-final-390x900.png`
- 320/360/390px checks confirmed:
  - DOM build id is `T031-system-bars-final`.
  - Body class defaults to `edge-transparent`.
  - Diagnostic overlay is `transparent`.
  - Page background uses the final light gradient.
  - Bottom nav background is `rgba(228, 242, 255, 0.96)`.
  - `.shell` left/right padding remains `10px/10px` at 320/360 and `12px/12px` at 390.
  - Bottom nav reaches viewport bottom and active tab stays above the simulated bottom inset.

## Pending Real-Phone Check

Install `solar-remote-t031-sideload.apk` on vivo and confirm:

- Top system bar is no longer cyan.
- Bottom gesture area is no longer green.
- Status bar background matches the light page top.
- Gesture handle background matches the bottom nav area.
- Page body no longer looks gray-blue or diagnostic-tinted.
