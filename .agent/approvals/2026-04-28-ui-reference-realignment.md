# Approval - T-016 UI reference realignment

Date: 2026-04-28

## Approved By

User

## User Confirmation

“下一步就按 T-016 修改”

## Approved Scope

- Update the two-page MVP UI to better match the provided reference images and `HTML参考/app.html`.
- Allowed files:
  - `项目文件/android-mvp-capacitor/src/app.ts`
  - `项目文件/android-mvp-capacitor/src/styles.css`
  - `项目文件/android-mvp-capacitor/src/app.test.ts`
  - `项目文件/android-mvp-capacitor/public/assets/ui/`
- Keep current BLE, protocol, and controller behavior unchanged.

## Boundaries

- Do not modify BLE bridge files.
- Do not modify protocol files.
- Do not modify `src/device/deviceController.ts`.
- Do not modify Android native plugin files.
- Do not add fake scene/profile/OTA/advanced-setting features.
- Do not include `项目文件/android-mvp-capacitor/android/.idea/` in Git.
