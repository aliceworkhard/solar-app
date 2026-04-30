# Approval - T041 status-page scroll performance and background scan cadence

## Approval

- Date: 2026-04-30
- User approval: "更改"
- Approved plan: `.agent/plans/2026-04-30-t041-status-page-scroll-performance-scan-cadence.md`

## Approved Scope

- Optimize App-layer refresh behavior to reduce status-page scroll jank.
- Tune background discovery to an approximately 3 second cadence with shorter scan windows.
- Keep `读状态` / `读参数` synchronization behavior.
- Keep ordinary business commands non-blocking and not waiting for BLE responses by default.
- Add tests and run verification.

## Explicit Non-Scope

- Do not modify `底层协议/新遥控器数据下载与控制协议.xlsx`.
- Do not include `项目文件/android-mvp-capacitor/android/.idea/`.
- Do not revert protocol frames to AA55.
- Do not make UI parse raw HEX.
- Do not implement multi-device BLE sessions or 2.4G replacement.
