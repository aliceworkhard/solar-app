# Plan - T-028 Control Panel Command Buttons

## Request

用户希望重新设计控制面板里的 5 个业务按键：`读状态`、`读参数`、`开/关`、`增加亮度`、`降低亮度`。

## Current Facts

- 当前主工程是 `项目文件/android-mvp-capacitor`。
- 控制面板位于 `src/app.ts` 的 `mvp-command-card`，5 个按钮由 `BUSINESS_COMMANDS` 渲染到 `.command-grid`。
- 当前 5 条命令映射保持为：
  - `readStatusBtn` -> `readStatus`
  - `readParamsBtn` -> `readParams`
  - `powerToggleBtn` -> `powerToggle`
  - `brightnessUpBtn` -> `brightnessUp`
  - `brightnessDownBtn` -> `brightnessDown`
- 按钮点击路径是 App UI 层直接调用 `DeviceController` 已有方法，不在 UI 里解析 HEX。
- 用户已确认协议回传口径：只有读状态、读参数关注回传；其他普通业务命令不需要回传。
- 开/关仍按当前 `0x0A` 指令执行，能否区分独立开机/关机待真机确认。
- T-001/T-002 当前保留不做。
- T-027 edge-to-edge 改动已在工作区，不能回滚或覆盖。

## Proposed Scope

本次只做控制面板按钮 UI 一版重设计，保持功能路径不变：

- 将 5 个命令从普通 2 列按钮重排为更清楚的操作区：
  - `开/关` 作为主按钮，面积更大、位置更突出，但文案仍保持 `开/关`，不伪装成独立开机/关机。
  - `增加亮度` / `降低亮度` 做成一组对称的亮度调节按钮，强化 `+` / `-` 识别。
  - `读状态` / `读参数` 不再作为主要人工操作按钮，只放到低层级的“系统读取预留”区域；后续 App 系统性完成后，这两类读取应由系统自动触发，不再需要用户手动点。
- 添加轻量图形符号或短标签，但不引入新图标库，避免改构建依赖。
- 保留当前 ready 后启用、非 ready 禁用的控制逻辑。
- 保留 `resultArea` 和只读模式条位置，必要时只微调间距。
- 本次暂不删除 `读状态` / `读参数` 的现有 id/action，避免影响后续 T-002 复测入口；只在视觉上降级为预留工具。

## Not In Scope

- 不修改 BLE、协议、命令 HEX、回包等待策略。
- 不修改 `src/device/deviceController.ts`。
- 不修改 Android 原生 edge-to-edge/system bar 代码。
- 不修改详情页锚点行为，等用户后续信息。
- 不做 T-001/T-002 真机采样或命令复测。
- 不覆盖底层协议 Excel，不纳入 `android/.idea/`。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Command model | `项目文件/android-mvp-capacitor/src/app.ts` | 在不改变 5 条 `BUSINESS_COMMANDS` action 的前提下，为命令增加 UI 分组/视觉 variant 字段，或新增只服务渲染的布局模型。 |
| Control panel markup | `项目文件/android-mvp-capacitor/src/app.ts` | 将 `.command-grid` 改为主操作、亮度调节、读取命令三段式布局；保留每个按钮原 id 和 data-action。 |
| Styling | `项目文件/android-mvp-capacitor/src/styles.css` | 新增/调整控制面板按钮样式，压缩文字，确保 320/360/390px 宽度下不换乱、不溢出。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 增加 UI 布局模型测试，确认 5 条命令仍一一映射、主按钮/亮度组/读取组分类正确。 |
| Visual check | `.agent/reports/` | 如实施，新增移动端布局检查脚本或截图记录。 |
| Task tracking | `todo.md` | 新增 T-028 Proposed，实施后更新状态。 |
| Session log | `.agent/logs/` | 实施完成后新增 session log。 |

## Design Direction

- 方向：偏工业控制面板，紧凑、清晰、可盲扫，不做营销式卡片。
- 层级：
  - 第一层：`开/关` 主按钮，强调这是最重要的控制。
  - 第二层：亮度 `- / +` 两个等宽按钮，形成明确的调节关系。
  - 第三层：`读状态`、`读参数` 作为低层级预留工具，文案弱化为系统读取/参数读取，不抢主要控制注意力。
- 视觉细节：
  - 使用现有橙色作为主操作强调色，搭配深灰/蓝灰中性色，避免单一大面积橙色。
  - 所有按钮保留可点击尺寸，但字号比当前更克制。
  - 禁用态保持明显，避免误以为已连接可操作。

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-028 控制面板 5 个命令按钮重设计 | P1 | Proposed | 5 个按钮 id/action 不变；`开/关` 和亮度调节成为主要人工操作；`读状态`/`读参数` 仅作为低层级预留入口；普通业务命令仍不等待回包；320/360/390px 无横向溢出；控制面板视觉分组清晰；`npm.cmd test`、`npm.cmd run build` 通过。 |

## Risks

- `开/关` 做成主按钮后，用户可能理解成独立开机/关机；需要保留 `开/关` 和 `RF 0x0A` 口径，不引入“开机/关机”分离文案。
- 小屏上三段式布局可能挤压，因此需要自动化检查 320/360/390px。
- T-027 的 edge-to-edge 工作区改动尚未提交，本次实施时必须只叠加 UI 变更，不回滚系统栏适配。

## Verification

实施后计划运行：

1. 先加测试并确认红灯：命令布局模型不存在或分类不符合预期时失败。
2. `npm.cmd test -- src/app.test.ts`
3. `npm.cmd test`
4. `npm.cmd run build`
5. `npm.cmd run sync`
6. 本地 Chrome/Playwright 移动宽度检查：320、360、390px 控制页无横向溢出，5 个按钮均可见，文本不挤压。
7. 如需要交付 APK，再用 Android Studio JBR 执行 `.\gradlew.bat :app:assembleDebug --project-prop android.injected.testOnly=false`，并检查 `NO_TEST_ONLY` 与签名。

## Rollback

- 回退 `src/app.ts` 中控制面板 markup/UI 布局模型改动。
- 回退 `src/styles.css` 中新增的命令按钮样式。
- 回退 `src/app.test.ts` 中对应 UI 布局测试。
- 不影响 BLE、协议、Android 原生或 T-027 edge-to-edge 适配。

## Approval Gate

等待用户明确确认后，再修改 `src/app.ts`、`src/styles.css`、`src/app.test.ts` 等业务/UI 文件。
