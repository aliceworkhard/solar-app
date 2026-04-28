# Approval - T-018 Android back dispatch and live status layout

Date: 2026-04-28

## Approved By

User

## User Confirmation

“执行”

## Approved Scope

- Add Android native back dispatch so the control page handles system/gesture back by returning to the homepage first.
- Keep homepage system back allowed to exit.
- Re-layout the control page read-status area as a Live Status card based on the provided screenshot and `HTML参考/app.html`.
- Add 2x2 metrics to each nearby-device card: current mode, battery voltage, solar voltage, brightness.

## Allowed Files

- `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java`
- `项目文件/android-mvp-capacitor/src/app.ts`
- `项目文件/android-mvp-capacitor/src/styles.css`
- `项目文件/android-mvp-capacitor/src/app.test.ts`
- Documentation/session/handoff/context files required by project workflow.

## Boundaries

- Do not modify BLE bridge files.
- Do not modify protocol files.
- Do not modify `项目文件/android-mvp-capacitor/src/device/deviceController.ts`.
- Do not add `@capacitor/app` unless a native compile issue proves it is required and the user approves.
- Do not fabricate unavailable protocol fields such as morning/off time.
- Do not include `项目文件/android-mvp-capacitor/android/.idea/` in Git.
