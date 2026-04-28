# Approval - T-025 Status Bar, Compact Detail, Bottom Tabs

日期：2026-04-28

## Plan

`.agent/plans/2026-04-28-t025-statusbar-compact-bottom-tabs.md`

## User Approval

用户回复：“按方案做”。

## Approved Scope

- 再试一版顶部状态栏渐变，增加 native/window 背景兜底。
- 压缩详情页顶部间距。
- 新增底部三栏：`设备`、`场景`、`我的`。
- `场景` 作为预留页。
- `我的` 页面参考 `04_profile_settings_page.png` 增加静态信息。
- 更新相关测试、文档和日志。

## Not Approved

- 不改 BLE 扫描、连接、写入或 notify 逻辑。
- 不改协议命令、帧解析或回包等待策略。
- 不覆盖底层协议 Excel。
- 不纳入 `android/.idea/`。
- 不做 T-001/T-002 真机数据采样。
