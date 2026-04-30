# TODO

> 本文件只保留当前仍有行动价值的任务。
> 已完成、废弃、历史任务移动到 `.agent/archive/`。
> 历史背景先查 `.agent/CHANGE_INDEX.md`，不要把完整历史堆回本文件。

## Workflow Gate

- 涉及修改、实现、优化、修复、协议、UI、构建、发布或文档结构调整时，先写 `.agent/plans/` 方案。
- 方案阶段允许更新本文件的任务、优先级、状态、验收标准。
- 用户确认前，不改业务代码、协议、UI、Android 原生文件、构建配置或源协议文件。
- 用户确认后，在 `.agent/approvals/` 记录批准，再实施。

## Now

- [x] T-033 Edge Spacing Micro Adjust
  - 优先级：P0
  - 状态：Done；已在 T032 基础上把顶部标题/页面内容再上移一点点、底部 TabBar 内容再下移一点点，并将左右内容边距稍微放宽；已导出 `交付物/solar-remote-t033-sideload.apk` / `C:\solar-apk\solar-remote-t033-sideload.apk`，SHA256 `45AD1807CCD71BFFEFC964E7A77AF1E5FDA326AF439E1C17E51F303F6E621A4F`。
  - 方案：`.agent/plans/2026-04-30-t033-edge-spacing-micro-adjust.md`
  - 涉及文件：`项目文件/android-mvp-capacitor/src/styles.css`、`.agent/reports/`、`交付物/`
  - 验收标准：顶部标题/内容比 T032 再上移但不被状态栏遮挡；bottom TabBar 仍 `bottom:0` 且内容更贴底但不被手势栏遮挡；左右内容比 T032 稍微展开且无横向溢出；不改 BLE/协议/Android native/`deviceController.ts`；`npm test`、build、sync、layout check、assembleDebug、aapt、apksigner 通过。

- [x] T-032 UI Header / TabBar Compact Polish
  - 优先级：P0
  - 状态：Done；已按方案去掉标题下方矩形感、上移四类页面标题、下移底部 TabBar，并为详情页默认点亮“设备状态”选项卡；已导出 `交付物/solar-remote-t032-sideload.apk` / `C:\solar-apk\solar-remote-t032-sideload.apk`，SHA256 `861A9E929C97F24E51A4D0B6F6ED93E60ABEFF7925290FA8135B8F1D060A82FA`。
  - 方案：`.agent/plans/2026-04-29-t032-ui-header-tabbar-compact-polish.md`
  - 涉及文件：`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/styles.css`、`项目文件/android-mvp-capacitor/src/app.test.ts`、`.agent/reports/`、`交付物/`
  - 验收标准：标题下方矩形感去除；`设备/场景/我的/具体设备`标题上移且不被状态栏遮挡；bottom TabBar 更贴底且图标文字不被手势栏遮挡；详情页默认点亮`设备状态`，点击`控制面板`可切换点亮并滚动；不改 BLE/协议/普通命令回包策略/`deviceController.ts`；`npm test`、build、sync、layout check、assembleDebug、aapt、apksigner 通过。

- [x] T-031 Final Edge Color Cleanup
  - 优先级：P0
  - 状态：Done；T031 Probe 真机已出现顶部青色、底部绿色，说明 native strip / edge-to-edge 控制链路有效；已关闭诊断色并输出正式浅色协调 APK：`交付物/solar-remote-t031-sideload.apk` / `C:\solar-apk\solar-remote-t031-sideload.apk`，SHA256 `2CE79E87FDDCE625B537417A91927046C86E4E4863B61EAF0180C3DE90025F3E`。
  - 方案：`.agent/plans/2026-04-29-t031-final-edge-color-cleanup.md`
  - 涉及文件：`项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java`、`项目文件/android-mvp-capacitor/capacitor.config.ts`、`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/styles.css`、`项目文件/android-mvp-capacitor/src/app.test.ts`、`.agent/reports/`、`交付物/`
  - 验收标准：正式 APK 不出现黄/洋红/青/绿 Probe 色；顶部状态栏背后为页面浅色背景；底部手势横杠背后为 bottom nav 浅色背景；页面主体不灰蓝发闷；左右宽度保持 T030 修复；bottom nav 仍为 `bottom: 0`；不改 BLE、协议、普通命令回包策略和 `deviceController.ts`；`npm.cmd test`、build、sync、assembleDebug、aapt 无 `testOnly`、apksigner verify 全部通过。

- [x] T-031 Final System Bars Probe + Visual Fallback
  - 优先级：P0
  - 状态：Done；T031 Probe 已在 vivo 真机出现顶部青色、底部绿色，判定为 native strip / edge-to-edge 路径有效；最终正式浅色 `solar-remote-t031-sideload.apk` 已导出。
  - 输入依据：T030 后 vivo 真机顶部/底部系统栏仍完全无可观察变化；用户要求 T031 不再继续纯 CSS / 纯 inset 细修，而是证明 Activity/system bars 控制链路并准备视觉兜底。
  - 涉及文件：`项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java`、`项目文件/android-mvp-capacitor/capacitor.config.ts`、`项目文件/android-mvp-capacitor/android/app/src/main/res/values*/`、`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/styles.css`、`项目文件/android-mvp-capacitor/src/app.test.ts`、`.agent/reports/`、`交付物/`
  - Probe APK：`交付物/solar-remote-t031-probe.apk`、`C:\solar-apk\solar-remote-t031-probe.apk`；SHA256 `1B27F2DC25FB55AB0A3831EA7E77A002F6C28127E806C960FD531239DE37F6E2`；报告见 `.agent/reports/2026-04-29-t031-probe-report.md`
  - 验收标准：生成 `solar-remote-t031-probe.apk`；vivo logcat/Web console 能看到 `T031-system-bars-final`；Probe 至少出现系统栏变色、native strip 可见或 visual fallback 生效之一；如果完全没变化，暂停排查 APK/Activity 命中，不继续 CSS 猜测；最终 `solar-remote-t031-sideload.apk` 无黄/洋红/青/绿 Probe 色；T030 左右宽度恢复不回退；BLE、协议、普通命令回包策略和 `deviceController.ts` 不改；`npm.cmd test`、build、sync、assembleDebug、aapt 无 `testOnly`、apksigner verify 通过。

- [x] T-034 时控模式 B1 参数下载接入
  - 优先级：P0
  - 状态：Done；已实现类型化 B1 MODE=01 编码/解码与写入链路、时控 UI 提交后整包发送、读参数 B1 MODE=01 回包同步到控件。
  - 方案：`.agent/plans/2026-04-30-t034-time-control-mode-write.md`
  - 审批：`.agent/approvals/2026-04-30-t034-time-control-mode-write.md`
  - 涉及文件：`项目文件/android-mvp-capacitor/src/protocol/timeControlParams.ts`、`项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`、`项目文件/android-mvp-capacitor/src/protocol/responseParser.ts`、`项目文件/android-mvp-capacitor/src/device/deviceController.ts`、`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/styles.css`、相关测试、`.agent/reports/`
  - 验收标准：App 通过类型化控件编辑本地时控 draft，每次提交一个参数修改后发送 `B1 MODE=01` 整模式参数包；`LEN=1A`、总长 29 字节、字段顺序、累计时长和校验和正确；滑块拖动过程中不刷屏，松手后发送一次；点击“读参数”后若收到 `B1 MODE=01` 回包，能把整包参数同步到所有对应按键、步进控件、滑块和摘要；现有 5 条 MVP 命令不变；普通控制命令和时控写入均不默认等待回包；UI 不直接解析 HEX；320/360/390px 无横向溢出。
  - 验证：已先观察 TDD 红灯；`npm.cmd test -- src/app.test.ts src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、Android Studio JBR `gradlew.bat assembleDebug`、APK `aapt` 无 `testOnly`、`apksigner verify`、Chrome 320/360/390px layout smoke 均通过。

- [x] T-035 时控真实帧字段修正与单次完整写入
  - 优先级：P0
  - 状态：Done；已按用户确认实施，修正真实帧字段、整包写入策略和读参同步模型。
  - 方案：`.agent/plans/2026-04-30-t035-time-control-real-frame-corrections.md`
  - 审批：`.agent/approvals/2026-04-30-t035-time-control-real-frame-corrections.md`
  - 报告：`.agent/reports/2026-04-30-t035-time-control-real-frame-corrections-report.md`
  - 输入依据：用户提供 `FF CE 1A 01 B1 00 ... 30 49` 读参数回传帧、`FF CE 1A 00 B1 00 ... 30 1C` 改参发送帧，以及供应商 `MODE=03/LEN=13`、`MODE=01/LEN=1A`、`MODE=02/LEN=22` 三条样例；证明 T034 的时长单位、功率编码和最大 PWM 字段假设需要修正，并确认 `MODE=01` 时控为 29 字节整包写入，`MODE=02` 长帧后续可单独考虑分包。
  - 涉及文件：`项目文件/android-mvp-capacitor/src/protocol/timeControlParams.ts`、`项目文件/android-mvp-capacitor/src/protocol/commandBuilder.ts`、`项目文件/android-mvp-capacitor/src/protocol/responseParser.ts`、`项目文件/android-mvp-capacitor/src/device/deviceController.ts`、`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/styles.css`、`项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`、相关测试、`.agent/reports/`
  - 验收标准：时控时长按 5 分钟累计点编码/解码；最大 PWM/最大输出按 16-bit raw 处理；功率按 0~255 缩放百分比编码/解码，覆盖 `CC=80%`、`80≈50%`、`4D≈30%`、`1A≈10%`、`FF=100%`；电池类型标签修正为 `1=磷酸铁锂/2=锂电池/3=铅酸`；每次时控提交只发一次完整 29 字节 `B1 MODE=01` 帧；Android/JS 不对时控做应用层分包并 best-effort 请求 MTU；`MODE=02` 长帧分包不在本次实现；现有 5 条 MVP 命令和普通命令不等回包策略不变；测试、build、sync、Gradle、APK 检查通过。
  - 验证：TDD 红灯已观察；`npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts src/device/deviceController.test.ts src/app.test.ts` 5 files / 68 tests 通过；`npm.cmd test` 6 files / 71 tests 通过；`npm.cmd run build`、`npm.cmd run sync`、Android Studio JBR `gradlew.bat assembleDebug`、APK `aapt` 无 `testOnly`、`apksigner verify`、Chrome 320/360/390px 时控布局烟测均通过。

- [x] T-036 时控 UI 模式联动、最大输出百分比与 30 分钟时段档位修正
  - 优先级：P0
  - 状态：Done；已按用户确认实施，最大输出和时段模型已改为当前修正版。
  - 方案：`.agent/plans/2026-04-30-t036-time-control-ui-mode-output-duration-corrections.md`
  - 审批：`.agent/approvals/2026-04-30-t036-time-control-ui-mode-output-duration-corrections.md`
  - 报告：`.agent/reports/2026-04-30-t036-time-control-ui-mode-output-duration-corrections-report.md`
  - 输入依据：用户反馈 T035 效果基本可用，但要求模式条上移、去掉 `参数整包写入`、模式文案与 Live Status 联动、最大输出改为高字节百分比且低字节固定 `00`、时段 1~5 改为 1~15 档且每档 30 分钟。
  - 涉及文件：`项目文件/android-mvp-capacitor/src/protocol/timeControlParams.ts`、`项目文件/android-mvp-capacitor/src/protocol/timeControlParams.test.ts`、`项目文件/android-mvp-capacitor/src/protocol/commandBuilder.test.ts`、`项目文件/android-mvp-capacitor/src/protocol/responseParser.test.ts`、`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/app.test.ts`、`.agent/reports/`
  - 验收标准：模式条位于时控参数区域上方；去掉 `参数整包写入` 文案；Live Status 和模式条统一显示 `雷达模式/时控模式/平均模式` 并由 `status.mode` 联动；最大输出 UI 显示百分比，写入字段为 `[00~FF, 00]`；时段 1~5 均为 1~15 档、每档 30 分钟、协议累计点按每档 6 写入；普通命令不等回包策略不变；测试、build、sync、Gradle、APK 检查通过。
  - 验证：TDD 红灯已观察；`npm.cmd test -- src/protocol/timeControlParams.test.ts src/protocol/commandBuilder.test.ts src/protocol/responseParser.test.ts src/app.test.ts` 4 files / 56 tests 通过；`npm.cmd test` 6 files / 72 tests 通过；`npm.cmd run build`、`npm.cmd run sync`、Android Studio JBR `gradlew.bat assembleDebug`、APK `aapt` 无 `testOnly`、`apksigner verify`、Chrome 320/360/390px T036 layout smoke 均通过。未导出 T036 sideload APK，仍以 T033 APK 为最新交付包。

- [ ] T-037 时控交互可视化与消抖发送优化
  - 优先级：P0
  - 状态：Proposed；已写方案，等待用户确认后再实施。
  - 方案：`.agent/plans/2026-04-30-t037-time-control-interaction-visual-debounce.md`
  - 输入依据：用户要求当前只实现时控时模式条应选中 `时控模式`；强化时段/时长/功率联动 UI；检验并增加按键/滑杆松手后的消抖延迟发送；优化 `当前是时控模式` 与下方 UI 的视觉关联。
  - 涉及文件：`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/styles.css`、`项目文件/android-mvp-capacitor/src/app.test.ts`、`.agent/reports/`
  - 验收标准：控制面板模式条固定突出 `时控模式`，雷达/平均为未开放只读视觉；Live Status/控制面板出现 `当前是时控模式` 语义并与下方时控卡片关联；时段 tabs、当前时段时长、当前时段功率被一个强化卡片圈起，选中时段与两个滑杆/数值联动明显；时控步进按键和滑杆松手后约 400ms trailing debounce 才发送整包，连续操作只发送最终一次完整 `B1 MODE=01`；普通业务命令不等待回包策略不变；UI 不解析 HEX；测试、build、sync、Gradle、APK 检查和 320/360/390px layout/debounce smoke 通过。

- 当前没有正在实施的已批准任务；T-037 等待确认；T-001/T-002/T-010 保持不动。

- [ ] T-001 补齐 20 次真机性能采样
  - 优先级：P0
  - 状态：Deferred；用户明确要求先不做、任务保留；用户反馈使用 vivo X300 Pro 测试未发现扫描/连接/传输问题，正式 20 次采样与 P50/P90 后补
  - 涉及文件：`项目文件/通信参数确认表.md`
  - 验收标准：记录 20 次扫描首包耗时、连接到 `ready` 耗时、是否 fallback、失败原因，并计算 P50/P90；无真实样本时只能标记阻塞，不伪造结果。

- [ ] T-002 复测 5 条 MVP 命令
  - 优先级：P0
  - 状态：Deferred；用户明确要求先不做、任务保留；用户反馈 5 条 MVP 命令可行性良好、无传输错误，逐次 TX/RX 表后补
  - 涉及文件：`项目文件/最小命令集表.md`
  - 前置状态：App 已接入最新最小命令集，读状态命令为 `FF CE 06 00 0E 00 00 30 11`。
  - 验收标准：开/关、增加亮度、降低亮度、读参数、读状态各执行 10 次，记录是否有 notify、是否更新 UI、失败表现。

## Next

- [ ] T-010 基于真机结果优化持续发现策略
  - 优先级：P2
  - 涉及文件：`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/device/deviceController.ts`
  - 前置状态：T-009 现阶段已实现 5 秒持续发现、按 MAC 区分同名设备、已连接设备不清除。
  - 验收标准：根据 T-001/T-009 真机数据调整补扫间隔、过期时间、是否进入控制页后继续低频保活。

- [ ] T-008 用多 agent 框架跑一次真实交接演练
  - 优先级：P2
  - 涉及文件：`.agent/handoffs/`、`.agent/tasks/active/`
  - 验收标准：至少一个任务按 task packet 执行，并生成 handoff，验证下一位 agent 能直接接手。

- [ ] T-005 配置 `JAVA_HOME` 并纳入 Gradle Debug APK 验证
  - 优先级：P1
  - 涉及文件：`项目文件/android-mvp-capacitor/android`
  - 验收标准：终端可执行 `gradlew.bat :app:assembleDebug`，并记录 APK 位置和构建结果。

- [ ] T-006 做 30 分钟 BLE 长稳测试
  - 优先级：P1
  - 验收标准：连续发送/接收不崩溃，断线、设备重启、App 前后台切换后可恢复。

## Blocked

- [ ] B-001 Gradle 终端验证受阻
  - 原因：全局终端环境仍未固定 `JAVA_HOME`；但已多次通过临时指定 Android Studio JBR 构建 debug APK。
  - 下一步：如需常规终端直接运行，再配置全局 `JAVA_HOME`。

- [ ] B-002 读状态/读参数回传特征仍待记录
  - 原因：用户已确认协议回传只有读状态和读参数；其他控制命令不用回传。
  - 下一步：后续真机记录只确认读状态/读参数 notify 特征；不要把普通业务命令改成默认等待回包。

- [ ] B-003 开/关是否能区分独立开机/关机未确认
  - 原因：当前按 `0x0A` 开/关控制命令执行，能否区分独立开机/关机仍待真机确认。
  - 下一步：真机测试 `FF CE 06 00 0A 00 00 30 0D` 的行为。

- [ ] B-004 vivo / Android 系统栏与 T033 UI 最终包待复验
  - 原因：T-031 Probe 已在 vivo 真机证明 native strip / edge-to-edge 路径可见；T-033 已在 T032 基础上继续做顶部/底部/左右边距微调并导出 APK，本地 Chrome 只能验证 Web/layout。
  - 下一步：安装 `solar-remote-t033-sideload.apk`，确认状态栏/手势栏背后为正式浅色背景，且顶部内容更靠上、底部 TabBar 更贴底、左右空间更合适、详情页默认点亮 `设备状态`。

- [ ] B-005 详情页锚点可能需要调整
  - 原因：T-025 已压缩详情页顶部间距；锚点滚动是否还需改等待真机反馈。
  - 下一步：等待用户补充信息后再判断是否写方案。

## Recently Done

- [x] T-033 Edge Spacing Micro Adjust：在 T032 基础上做 1-2px 级别间距微调；模拟 top inset 32px 时标题 top 从 34px 上移到 32px；bottom nav padding-bottom 从 20px 收到 18px 且仍 `bottom:0`；320/360px shell 左右 padding 从 10px 放宽到 8px，390px 从 12px 放宽到 10px；未改 BLE、协议、Android native edge-to-edge 和 `deviceController.ts`；`npm.cmd test -- src/app.test.ts` 39 tests、`npm.cmd test` 5 files / 60 tests、build、sync、T033 layout check、JBR assembleDebug、aapt 无 `testOnly`、apksigner verify 均通过；已导出 `交付物/solar-remote-t033-sideload.apk` 和 `C:\solar-apk\solar-remote-t033-sideload.apk`。
- [x] T-032 UI Header / TabBar Compact Polish：关闭标题区矩形伪背景，home 状态提示改为无卡片文字行，`场景` 预留页不再显示空矩形；`设备/场景/我的/具体设备` 标题上移；bottom TabBar 保持 `bottom:0` 且内容更贴底；详情页默认点亮 `设备状态`，点击 `控制面板` 可切换点亮；未改 BLE、协议、Android native edge-to-edge 和 `deviceController.ts`；`npm.cmd test -- src/app.test.ts` 39 tests、`npm.cmd test` 5 files / 60 tests、build、sync、T032 layout check、JBR assembleDebug、aapt 无 `testOnly`、apksigner verify 均通过；已导出 `交付物/solar-remote-t032-sideload.apk` 和 `C:\solar-apk\solar-remote-t032-sideload.apk`。
- [x] T-031 Final Edge Color Cleanup：vivo Probe 顶部青色/底部绿色已证明 native strip 路径有效；最终版固定 `TRANSPARENT_EDGE_WITH_STRIPS`，关闭 `EDGE_PROBE_COLORS`，Web 默认 `edge-transparent`，页面和 bottom nav 恢复正式浅色背景；`npm.cmd test` 59 tests、build、sync、T031 Final layout check、JBR `assembleDebug --project-prop android.injected.testOnly=false`、aapt 无 `testOnly`、apksigner verify 均通过；已导出 `交付物/solar-remote-t031-sideload.apk` 和 `C:\solar-apk\solar-remote-t031-sideload.apk`。

- [x] T-030 edge-to-edge 补充加固：确认 Capacitor `@capacitor/core/android/cli@8.3.1` 支持 `SystemBars` 后保留配置；删除 WebView no-op insets listener，主监听保持 DecorView 且不消费；native paint fallback 改为 content 背后系统栏区域，保持 non-click/focus/accessibility；native 注入 raw px、density、WebView 宽度、content-safe 左右安全区和默认关闭的诊断色；Web 侧增加 width-ratio fallback，CSS `--edge-*` 改为 max(native, system, safe-area, env)，`.shell` 左右间距恢复基础档位不再被普通 side gesture inset 压缩；BLE、协议、普通命令回包策略和 `deviceController.ts` 均未修改；TDD 红灯先失败后转绿，`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP 检查、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、APK manifest/signature 校验通过；已导出 `交付物/solar-remote-t030-sideload.apk` 和 `C:\solar-apk\solar-remote-t030-sideload.apk`。
- [x] T-029 vivo / Capacitor WebView edge-to-edge hardening：基于 `docs/try.md` 强化 T-027，Android native 增加 window/decor/content/WebView 非黑背景、top/bottom system-bar paint fallback、DecorView insets 分发且不消费、native px 转 CSS px 注入；Capacitor 增加 `SystemBars` 配置；Web/CSS 增加 `--native-inset-*`、`--safe-area-inset-*`、`--edge-*` 并让 header/bottom TabBar 分区避让；BLE、协议、普通命令回包策略和 `deviceController.ts` 均未修改；TDD 红灯先失败后转绿，`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP 布局检查、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、APK manifest/signature 校验通过；已导出 `交付物/solar-remote-t029-sideload.apk` 和 `C:\solar-apk\solar-remote-t029-sideload.apk`。
- [x] T-028 控制面板 5 个命令按钮重设计：`开/关` 改为主控制按钮，`降低亮度 / 增加亮度` 改为一组对称调节按钮，`读状态 / 读参数` 降级为低层级“系统读取”预留入口；5 个按钮 id/action 保持不变，`deviceController.ts`、BLE、协议 HEX、普通命令不等待回包策略均未修改；TDD 红灯先失败后转绿，`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、320/360/390px Chrome CDP 布局检查、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、APK manifest/signature 校验通过；已导出 `交付物/solar-remote-t028-sideload.apk` 和 `C:\solar-apk\solar-remote-t028-sideload.apk`。
- [x] T-027 Android edge-to-edge insets 修复：`MainActivity` 改为 `WindowCompat.enableEdgeToEdge(window)`，删除旧 `SYSTEM_UI_FLAG_*` 分支和手动 system-bar color 路径；Android Q+ 关闭 status/navigation contrast enforcement；WebView 通过 `WindowInsetsCompat` 注入 `--system-top/right/bottom/left`；Web/CSS 改为 header、main、bottom TabBar 分区消费 inset，根 `.shell` 不再用整体 top/bottom padding 假装适配；本地模拟 top=32px/bottom=24px 检查通过，TabBar 背景到底且图标/文字避开 bottom inset；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false`、APK `NO_TEST_ONLY` 和 `apksigner verify` 通过；已导出 `交付物/solar-remote-t027-sideload.apk` 和 `C:\solar-apk\solar-remote-t027-sideload.apk`。
- [x] T-026 Profile 密度与安全底栏修正：`我的设备` 改为短标签并在窄屏保持 1 行 3 项，`我的场景` 改为短标签并在窄屏保持 1 行 4 项；新增内容字号、图标、卡片间距和底部导航均收紧；底栏使用独立 safe-area 变量，顶部 profile header 间距同步压缩；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false` 通过；320/360/390px 浏览器自动检查无横向溢出且 profile 行数符合要求；已导出非 `testOnly` APK `交付物/solar-remote-t026-sideload.apk` 和 `C:\solar-apk\solar-remote-t026-sideload.apk`。
- [x] T-025 状态栏渐变、详情页压缩、底部三栏页面：新增底部导航 `设备/场景/我的`，`场景` 为预留页，`我的` 参考 `04_profile_settings_page.png` 做静态信息页；详情页顶部 spacing 已压缩；Android 增加 `status_bar_gradient` native/window 背景兜底；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug` 通过；390px 本地浏览器检查无横向溢出，Profile 截图已生成。
- [x] T-007 `Recently Done` 精简：保留当前仍影响接手判断的近期完成项；更早历史改从 `.agent/CHANGE_INDEX.md` 和定向 session log 查找；未移动日志、未改业务代码。
- [x] T-024 接手后状态口径同步：已记录用户最新口径：T-001/T-002 先不做但保留；协议回传只有读状态和读参数，其他控制命令不用回传；开/关按当前指令执行但独立开/关仍待真机确认；状态栏渐变真机未通过，是否再改等用户决定；详情页锚点等待用户信息；电流显示规则已通过。未改业务代码、协议实现、UI 或 Android 原生文件。
- [x] T-023 下一个 agent 项目接手包整理：已更新 `.agent/handoffs/NEXT_AGENT_HANDOFF.md` 和正式交接快照 `.agent/handoffs/2026-04-28-Orchestrator-next-agent-project-handoff.md`；`.agent/START_HERE.md` 顶部当前下一步已指向 T-001/T-002；已修正 `项目文件/上传日志.md` 最新 T-022 记录格式；未改业务代码。
- [x] T-022 UI 扫描停止、状态栏渐变、详情锚点与电流规则修正：`+ / X` 持续发现按钮改为独立状态 helper，点 `X` 会立即失效旧扫描回调并恢复 `+`；详情页取消隐藏式 tab，`设备状态` 与 `控制面板` 连续展示，顶部按钮改为锚点定位；电流显示规则改为亮度 `0` 用回传电流、亮度非 `0` 用 `power / 100 * 9.7272A`；Android 状态栏 theme/runtime/WebView 透明处理增强；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug` 通过。
- [x] 更早完成项已归入历史索引：BLE 主链路、正式 RF 协议切换、普通命令不等待回包、读状态解析、两页 UI、`AC632N_1` 目标流、多轮 UI/Android 交互修正等，详见 `.agent/CHANGE_INDEX.md` 的 M01-M16 和对应 `.agent/logs/`。
