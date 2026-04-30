# T032 UI Header / TabBar Compact Polish Report

Date: 2026-04-29

## Scope

Approved by user with `执行` after plan `.agent/plans/2026-04-29-t032-ui-header-tabbar-compact-polish.md`.

Implemented:

- Removed title-area rectangular feel by disabling `.app-header::before`.
- Changed home feedback from a card to a text-only status line.
- Removed visible empty rectangle from the `场景` reserved page.
- Moved `设备 / 场景 / 我的 / 具体设备` headers upward.
- Moved bottom TabBar content lower while keeping `bottom:0` and bottom inset safety.
- Added detail tab active state:
  - default `设备状态`;
  - click `控制面板` switches active state and scrolls to the matching section.

Not changed:

- BLE behavior.
- Protocol HEX.
- Ordinary command response-wait strategy.
- Android native edge-to-edge code.
- `src/device/deviceController.ts`.

## Verification

- `npm.cmd test -- src/app.test.ts`: 39 passed.
- `npm.cmd test`: 5 files / 60 passed.
- `npm.cmd run build`: passed.
- `npm.cmd run sync`: passed.
- `node .agent/reports/2026-04-29-t032-ui-compact-layout-check.cjs`: passed.
- JBR Gradle `:app:assembleDebug --project-prop android.injected.testOnly=false`: passed.
- `aapt` manifest check on `C:\solar-apk\solar-remote-t032-sideload.apk`: no `testOnly`.
- `apksigner verify --verbose`: `Verifies`; v2 signing true; 1 signer.

## Layout Check Summary

- 320/360/390px Chrome CDP checks passed.
- Header pseudo layer: `display:none`.
- Home feedback: transparent background and `0px` border.
- Header title top: `34px` with simulated `32px` top inset.
- Bottom nav: viewport bottom aligned.
- Bottom nav padding bottom: `20px` with simulated `24px` bottom inset.
- Detail tabs: default `设备状态` active; click `控制面板` switches active.

## Artifact

- `交付物/solar-remote-t032-sideload.apk`
- `C:\solar-apk\solar-remote-t032-sideload.apk`
- SHA256: `861A9E929C97F24E51A4D0B6F6ED93E60ABEFF7925290FA8135B8F1D060A82FA`
- Screenshot: `.agent/reports/screenshots/2026-04-29-t032-ui-compact-390x900.png`
