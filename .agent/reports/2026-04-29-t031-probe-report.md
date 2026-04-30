# T031 Probe Report

Date: 2026-04-29

## Purpose

T031 Probe is not the final visual APK. It is a diagnostic APK to prove whether the vivo device is running the current Activity and whether Android system bars can be controlled by the app.

## Build Identity

- Native build id: `T031-system-bars-final`
- Native log tag: `EdgeT031`
- Web globals:
  - `window.__edgeBuildId = "T031-system-bars-final"`
  - `document.documentElement.dataset.edgeBuild = "T031-system-bars-final"`
- Web console:
  - `[EdgeT031] build id = T031-system-bars-final`

## Probe Configuration

- `EDGE_PROBE_COLORS = true`, debug-only via `ApplicationInfo.FLAG_DEBUGGABLE`.
- Status bar probe color: yellow `#FFFF00`.
- Navigation bar probe color: magenta `#FF00FF`.
- Top system bar strip: cyan `#00FFFF`.
- Bottom system bar strip: green `#00FF00`.
- Web diagnostic overlay: light blue `rgba(90, 170, 255, 0.22)`.
- `SystemBars.insetsHandling = "disable"` for Probe stage.
- Current native edge strategy: `TRANSPARENT_EDGE`.

## Probe Classification To Report From Vivo

| Result | What You See | Meaning | Next Action |
| --- | --- | --- | --- |
| A | Top/bottom system bars turn yellow/magenta | System bar color APIs are taking effect | Final can use `COLOR_MATCH_SAFE` |
| B | Yellow/magenta do not apply, but cyan/green strips appear behind bars | Transparent edge-to-edge works and strip fallback is visible | Final can use `TRANSPARENT_EDGE` + strip fallback |
| C | Still pure black; yellow/magenta and cyan/green not visible | App cannot draw/control system-bar area on this path | Final should use `VISUAL_FALLBACK` |
| D | No `EdgeT031` log or Web build id | APK/Activity is not this build, or install/sync is wrong | Stop and fix install/Activity hit before more UI changes |

## APK

- Probe APK: `C:\solar-apk\solar-remote-t031-probe.apk`
- Project copy: `交付物/solar-remote-t031-probe.apk`
- SHA256: `1B27F2DC25FB55AB0A3831EA7E77A002F6C28127E806C960FD531239DE37F6E2`

## Verification

- `npm.cmd test -- src/app.test.ts`: 36 passed.
- `npm.cmd test`: 5 files / 57 tests passed.
- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`: BUILD SUCCESSFUL.
- `aapt dump xmltree C:\solar-apk\solar-remote-t031-probe.apk AndroidManifest.xml | Select-String testOnly`: no output.
- `apksigner verify --verbose C:\solar-apk\solar-remote-t031-probe.apk`: Verifies; v2 true; Number of signers 1.
- `node .agent/reports/2026-04-29-t031-probe-layout-check.cjs`: passed.

## Local Layout Probe

- Results: `.agent/reports/2026-04-29-t031-probe-layout-results.json`
- Screenshot: `.agent/reports/screenshots/2026-04-29-t031-probe-390x900.png`
- 320/360/390px checks confirmed:
  - DOM build id is `T031-system-bars-final`.
  - Edge mode class switch works.
  - Diagnostic DOM overlay is active.
  - `.shell` left/right padding remains 10/10 at 320/360 and 12/12 at 390.
  - `content-safe-left/right` stays `0px` when ordinary side gesture inset is simulated.
  - Bottom nav reaches viewport bottom and active tab text/icon stays above the simulated bottom inset.

## Not Changed

- BLE behavior.
- Protocol frames or HEX.
- Normal business command response waiting.
- `src/device/deviceController.ts`.
- Source protocol Excel.
- `android/.idea/`.

## Next Step

Install `solar-remote-t031-probe.apk` on vivo and classify the result as A/B/C/D above. Final `solar-remote-t031-sideload.apk` should not be produced until that result is known.
