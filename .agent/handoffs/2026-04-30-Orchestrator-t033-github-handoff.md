# Handoff - T033 GitHub Backup And Next Agent Plan

日期：2026-04-30
角色：Orchestrator / Docs Release

## 接手入口

下一位 agent 先按顺序读取：

1. `AGENTS.md`
2. `.agent/START_HERE.md`
3. `.agent/AI_CONTEXT.md`
4. `.agent/handoffs/NEXT_AGENT_HANDOFF.md`
5. `todo.md`
6. 如果要改代码、UI、协议、Android 或文档结构，继续读 `.agent/PLAN_FIRST_WORKFLOW.md` 和 `.codex/skills/plan-first-development/SKILL.md`
7. 需要历史时读 `.agent/CHANGE_INDEX.md`

不要默认读取 `.agent/logs/` 全量内容。

## 当前版本状态

当前可交接版本为 T033。

- 主工程：`项目文件/android-mvp-capacitor`
- 最新侧载 APK：`交付物/solar-remote-t033-sideload.apk`
- 英文路径副本：`C:\solar-apk\solar-remote-t033-sideload.apk`
- SHA256：`45AD1807CCD71BFFEFC964E7A77AF1E5FDA326AF439E1C17E51F303F6E621A4F`

T033 基于 T031/T032 的系统栏与 UI 调整继续做了很小的边距微调：

- 模拟 top inset 32px 时，标题 top 从 T032 的 `34px` 上移到 `32px`。
- bottom nav padding-bottom 从 `20px` 收到 `18px`。
- 320/360px shell 左右 padding 从 `10px` 收到 `8px`。
- 390px shell 左右 padding 从 `12px` 收到 `10px`。
- bottom nav 仍为 `bottom:0`。
- 详情页仍默认点亮 `设备状态`。

## 已完成重点

- BLE 已跑通：扫描、连接、订阅 notify、写入、接收。
- 目标设备限定：`AC632N_1`。
- UUID：
  - Service：`0000FFF0-0000-1000-8000-00805F9B34FB`
  - Write：`0000FFF1-0000-1000-8000-00805F9B34FB`
  - Notify：`0000FFF2-0000-1000-8000-00805F9B34FB`
- 写入方式固定：`write`。
- 普通业务命令不等待 BLE 回包。
- 只有读状态和读参数需要关注回传；其他控制命令不用回传。
- 正式帧格式：`FF CE + LEN + DESC + CMD + SUB + DATA + 30 + SUM`。
- 读参数：`FF CE 06 00 0D 00 00 30 10`
- 读状态：`FF CE 06 00 0E 00 00 30 11`
- 开/关：`FF CE 06 00 0A 00 00 30 0D`
- 增加亮度：`FF CE 06 00 0B 00 00 30 0E`
- 降低亮度：`FF CE 06 00 0C 00 00 30 0F`
- T031 Probe 在 vivo 真机出现顶部青色、底部绿色，证明 native strip / edge-to-edge 路径可见。
- T031 Final 关闭 Probe 色，使用正式浅色系统栏背景。
- T032 去掉标题下方矩形感，详情页默认点亮 `设备状态`。
- T033 微调顶部、底部和左右间距。

## 最近验证

T033 已通过：

- `npm.cmd test -- src/app.test.ts`：39 tests passed
- `npm.cmd test`：5 files / 60 tests passed
- `npm.cmd run build`：passed
- `npm.cmd run sync`：passed
- `node .agent/reports/2026-04-30-t033-edge-spacing-layout-check.cjs`：passed
- `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr` 后 `gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`：passed
- `aapt` manifest check：无 `testOnly`
- `apksigner verify --verbose`：Verifies，v2 signing true，1 signer

## 下一步建议

当前用户口径：T-001/T-002 先不做，任务保留。

建议下一位 agent 等用户真机反馈后再行动：

1. 如果用户确认 T033 UI 通过：
   - 不再继续调整顶部/底部/左右间距。
   - 保持当前 Android native edge-to-edge 方案。
   - 等用户决定是否进入 T-001/T-002 正式采样。

2. 如果用户反馈 T033 仍需小改：
   - 必须重新走 Plan First。
   - 只改明确指出的 UI 间距或组件。
   - 不要凭感觉继续扩大系统栏方案。

3. 如果进入 T-001：
   - 只做真机扫描/连接性能采样记录。
   - 不改 UI、协议、Android native 或 `deviceController.ts`。

4. 如果进入 T-002：
   - 只做 5 条 MVP 命令逐条复测记录。
   - 不把普通控制命令改成默认等待回包。

5. T-010 只能在有 T-001/T-009 真机数据后做。

## 禁止事项

- 不要覆盖 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不要纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
- 不要把普通业务命令改成默认等待 BLE 回包。
- 不要把协议退回 `AA55` 临时帧。
- 不要让 UI 直接解析 HEX。
- 不要多人同时修改 `src/device/deviceController.ts`。

## GitHub 备份范围

本次 GitHub 备份应包含：

- T027-T033 的源码、Android 配置、测试、计划、审批、报告、截图和交接文档。
- 最新 APK：`交付物/solar-remote-t033-sideload.apk`。
- 不包含协议 Excel 和 `android/.idea/`。

如下一位 agent 继续提交，请先运行：

```powershell
git -c core.quotepath=false status --short
```

确认没有误纳入协议 Excel 或 Android Studio `.idea` 文件。
