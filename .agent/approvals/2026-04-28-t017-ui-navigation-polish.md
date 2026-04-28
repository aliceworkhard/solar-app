# Approval - T-017 UI navigation bugs and compact layout polish

Date: 2026-04-28

## Approved By

User

## User Confirmation

“确认”

## Approved Scope

- Fix the refresh/navigation bug.
- Add page-level back navigation behavior for Android WebView/system back.
- Remove placeholder status bar, control-page three dots, and default feedback card.
- Compact the home device card and control-page device status card.
- Reduce overall typography scale.

## Allowed Files

- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- Documentation/session/handoff/context files required by project workflow.

## Boundaries

- Do not modify BLE bridge files.
- Do not modify protocol files.
- Do not modify `项目文件/android-mvp-capacitor/src/device/deviceController.ts`.
- Do not modify Android native plugin files.
- Do not add fake scene/profile/OTA/advanced setting features.
- Do not include `项目文件/android-mvp-capacitor/android/.idea/` in Git.
