# Approval - T031 Final Edge Color Cleanup

日期：2026-04-29

## Approved Plan

- `.agent/plans/2026-04-29-t031-final-edge-color-cleanup.md`

## User Approval

用户回复：`按方案做`

## Approved Scope

- 关闭 T031 Probe / Diagnostic 颜色。
- 保留已在 vivo 真机证明有效的 edge-to-edge + native strip 路径。
- 将 Android native top/bottom strip、window/decor/content/WebView fallback 和 Web/CSS 背景统一为正式浅色协调版。
- 输出正式 `solar-remote-t031-sideload.apk`。

## Explicit Non-Scope

- 不修改 BLE 扫描、连接、写入、notify。
- 不修改协议帧或命令 HEX。
- 不修改普通业务命令不等待 BLE 回包策略。
- 不修改 `src/device/deviceController.ts`。
- 不覆盖底层协议 Excel。
- 不纳入 `android/.idea/`。
