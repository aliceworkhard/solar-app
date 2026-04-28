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

- 当前没有正在实施的已批准任务。

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

- [ ] B-004 vivo 状态栏渐变真机未通过
  - 原因：T-025 已再做一版 native/window 渐变兜底；仍需 vivo 真机确认是否能进入系统顶部状态栏区域。
  - 下一步：安装最新 debug APK 后真机复验；如果仍不通过，先暂停，不继续凭感觉改。

- [ ] B-005 详情页锚点可能需要调整
  - 原因：T-025 已压缩详情页顶部间距；锚点滚动是否还需改等待真机反馈。
  - 下一步：等待用户补充信息后再判断是否写方案。

## Recently Done

- [x] T-026 Profile 密度与安全底栏修正：`我的设备` 改为短标签并在窄屏保持 1 行 3 项，`我的场景` 改为短标签并在窄屏保持 1 行 4 项；新增内容字号、图标、卡片间距和底部导航均收紧；底栏使用独立 safe-area 变量，顶部 profile header 间距同步压缩；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug --project-prop android.injected.testOnly=false` 通过；320/360/390px 浏览器自动检查无横向溢出且 profile 行数符合要求；已导出非 `testOnly` APK `交付物/solar-remote-t026-sideload.apk` 和 `C:\solar-apk\solar-remote-t026-sideload.apk`。
- [x] T-025 状态栏渐变、详情页压缩、底部三栏页面：新增底部导航 `设备/场景/我的`，`场景` 为预留页，`我的` 参考 `04_profile_settings_page.png` 做静态信息页；详情页顶部 spacing 已压缩；Android 增加 `status_bar_gradient` native/window 背景兜底；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug` 通过；390px 本地浏览器检查无横向溢出，Profile 截图已生成。
- [x] T-007 `Recently Done` 精简：保留当前仍影响接手判断的近期完成项；更早历史改从 `.agent/CHANGE_INDEX.md` 和定向 session log 查找；未移动日志、未改业务代码。
- [x] T-024 接手后状态口径同步：已记录用户最新口径：T-001/T-002 先不做但保留；协议回传只有读状态和读参数，其他控制命令不用回传；开/关按当前指令执行但独立开/关仍待真机确认；状态栏渐变真机未通过，是否再改等用户决定；详情页锚点等待用户信息；电流显示规则已通过。未改业务代码、协议实现、UI 或 Android 原生文件。
- [x] T-023 下一个 agent 项目接手包整理：已更新 `.agent/handoffs/NEXT_AGENT_HANDOFF.md` 和正式交接快照 `.agent/handoffs/2026-04-28-Orchestrator-next-agent-project-handoff.md`；`.agent/START_HERE.md` 顶部当前下一步已指向 T-001/T-002；已修正 `项目文件/上传日志.md` 最新 T-022 记录格式；未改业务代码。
- [x] T-022 UI 扫描停止、状态栏渐变、详情锚点与电流规则修正：`+ / X` 持续发现按钮改为独立状态 helper，点 `X` 会立即失效旧扫描回调并恢复 `+`；详情页取消隐藏式 tab，`设备状态` 与 `控制面板` 连续展示，顶部按钮改为锚点定位；电流显示规则改为亮度 `0` 用回传电流、亮度非 `0` 用 `power / 100 * 9.7272A`；Android 状态栏 theme/runtime/WebView 透明处理增强；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug` 通过。
- [x] 更早完成项已归入历史索引：BLE 主链路、正式 RF 协议切换、普通命令不等待回包、读状态解析、两页 UI、`AC632N_1` 目标流、多轮 UI/Android 交互修正等，详见 `.agent/CHANGE_INDEX.md` 的 M01-M16 和对应 `.agent/logs/`。
