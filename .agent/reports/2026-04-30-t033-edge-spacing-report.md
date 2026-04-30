# T033 Edge Spacing Micro Adjust Report

Date: 2026-04-30

## Scope

Approved by user with `按方案做` after plan `.agent/plans/2026-04-30-t033-edge-spacing-micro-adjust.md`.

Implemented:

- Top headers/content moved slightly upward.
- Bottom TabBar content moved slightly closer to the bottom while keeping `.bottom-nav { bottom: 0; }`.
- Left/right shell padding reduced slightly to use more horizontal space.

Not changed:

- BLE behavior.
- Protocol HEX.
- Ordinary command response-wait strategy.
- Android native edge-to-edge code.
- `src/device/deviceController.ts`.

## Verification

- TDD red: T033 layout check failed on T032 spacing because title top was still `34px`.
- `npm.cmd test -- src/app.test.ts`: 39 passed.
- `npm.cmd test`: 5 files / 60 passed.
- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- `node .agent/reports/2026-04-30-t033-edge-spacing-layout-check.cjs`: passed.
- JBR Gradle `:app:assembleDebug --project-prop android.injected.testOnly=false`: passed.
- `aapt` manifest check on `C:\solar-apk\solar-remote-t033-sideload.apk`: no `testOnly`.
- `apksigner verify --verbose`: `Verifies`; v2 signing true; 1 signer.

## Layout Check Summary

- 320/360/390px Chrome CDP checks passed.
- Header pseudo layer remains `display:none`.
- Title top: `32px` with simulated `32px` top inset.
- Bottom nav: viewport bottom aligned.
- Bottom nav padding bottom: `18px` with simulated `24px` bottom inset.
- Shell horizontal padding:
  - 320/360px: `8px`.
  - 390px: `10px`.
- Detail tabs: default `设备状态` active.
- No horizontal overflow.

## Artifact

- `交付物/solar-remote-t033-sideload.apk`
- `C:\solar-apk\solar-remote-t033-sideload.apk`
- SHA256: `45AD1807CCD71BFFEFC964E7A77AF1E5FDA326AF439E1C17E51F303F6E621A4F`
- Screenshot: `.agent/reports/screenshots/2026-04-30-t033-edge-spacing-390x900.png`
