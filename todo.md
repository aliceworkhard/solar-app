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
  - 状态：Feasibility Passed；用户反馈使用 vivo X300 Pro 测试未发现扫描/连接/传输问题，正式 20 次采样与 P50/P90 后补
  - 涉及文件：`项目文件/通信参数确认表.md`
  - 验收标准：记录 20 次扫描首包耗时、连接到 `ready` 耗时、是否 fallback、失败原因，并计算 P50/P90；无真实样本时只能标记阻塞，不伪造结果。

- [ ] T-002 复测 5 条 MVP 命令
  - 优先级：P0
  - 状态：Feasibility Passed；用户反馈 5 条 MVP 命令可行性良好、无传输错误，逐次 TX/RX 表后补
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

- [ ] T-007 做一次旧文档归档压缩
  - 优先级：P2
  - 涉及文件：`.agent/archive/`、`.agent/CHANGE_INDEX.md`
  - 验收标准：把已完成/过期任务摘要归档，保持 `todo.md` 在 150 行以内。

## Blocked

- [ ] B-001 Gradle 终端验证受阻
  - 原因：当前终端环境缺 `JAVA_HOME`。
  - 下一步：安装或指定 JDK 后复验 Android 构建。

- [ ] B-002 协议回传规则未完全确认
  - 原因：设备普通指令通常不回传，只有特定指令可能回传。
  - 下一步：通过真机日志确认哪些指令需要等待 notify。

- [ ] B-003 开/关是否能区分独立开机/关机未确认
  - 原因：协议只给出 `0x0A` 开/关控制命令，未给出独立 on/off 子命令。
  - 下一步：真机测试 `FF CE 06 00 0A 00 00 30 0D` 的行为。

## Recently Done

- [x] T-023 下一个 agent 项目接手包整理：已更新 `.agent/handoffs/NEXT_AGENT_HANDOFF.md` 和正式交接快照 `.agent/handoffs/2026-04-28-Orchestrator-next-agent-project-handoff.md`；`.agent/START_HERE.md` 顶部当前下一步已指向 T-001/T-002；已修正 `项目文件/上传日志.md` 最新 T-022 记录格式；未改业务代码。
- [x] T-022 UI 扫描停止、状态栏渐变、详情锚点与电流规则修正：`+ / X` 持续发现按钮改为独立状态 helper，点 `X` 会立即失效旧扫描回调并恢复 `+`；详情页取消隐藏式 tab，`设备状态` 与 `控制面板` 连续展示，顶部按钮改为锚点定位；电流显示规则改为亮度 `0` 用回传电流、亮度非 `0` 用 `power / 100 * 9.7272A`；Android 状态栏 theme/runtime/WebView 透明处理增强；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug` 通过。
- [x] T-021 启动自动扫描、状态栏渐变延伸、详情页 tab 化与 BLE UI 卡顿修复：打开 App 后会自动后台扫描 `AC632N_1`；`+` 持续发现改为非阻塞启动；扫描/连接异步流程加入 operation token，过期回调不再覆盖当前 UI；断开后设备保留为可连接并降到列表下方；连接后首次读状态改为后台发送，快速进入详情不阻塞；详情页支持“设备状态 / 控制面板”tab 切换，控制面板内命令区在上、模式按钮在下；Android 状态栏改为透明 edge-to-edge；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug` 通过。
- [x] T-020 首页搜索卡片移除、左滑动效、电量百分比和后台扫描优化：删除首页“准备搜索附近设备”卡片；刷新/查询改为后台扫描并通过进度回调增量更新列表或自动连接；已连接卡片静止时改为完全不透明，左滑取消连接增加拖动反馈、缓动和四角圆角；Live Status 下方第三个 chip 改为电量 `%`，按 `2.5V=0%`、`3.4V=100%` 线性换算并钳制；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug` 通过。
- [x] T-019 UI 卡片收敛与 5s 读状态轮询：首页已移除“当前设备”整块；附近设备卡片 RSSI 移到右侧，4 项指标改为无框左右排版；已连接设备支持左滑显示“取消连接”；控制页 Live Status 改为电池电压、模式、太阳能电压等真实字段且不显示固件；模式按钮移到控制面板顶部；连接 ready 后每 5s 自动发送一次读状态；`npm.cmd test -- src/app.test.ts`、`npm.cmd test`、`npm.cmd run build`、`npm.cmd run sync`、JBR `:app:assembleDebug` 通过。
- [x] T-018 Android back dispatch + Live Status layout + nearby-device 2x2 metrics: Android native back now calls WebView JS so control-page system/gesture back can return home before exit; control-page status area uses a Live Status card; nearby-device cards expose current mode, battery voltage, solar voltage, and brightness metrics; `npm.cmd test`, `npm.cmd run build`, `npm.cmd run sync`, temporary-JBR `:app:compileDebugJavaWithJavac`, and `:app:assembleDebug` passed. Needs real-phone gesture retest.
- [x] T-017 UI navigation and compact layout polish: homepage refresh now only refreshes the device list, control-page entry uses WebView history so system Back returns home first, placeholder phone chrome / control-page dots / default waiting card were removed, home device cards and control detail cards were compacted, typography scale was reduced; `npm.cmd test`, `npm.cmd run build`, and Chrome 430px screenshot verification passed.
- [x] T-016 UI reference realignment: home/control pages restyled closer to the provided reference images and HTML prototype; only `AC632N_1` remains visible/connectable; auto-connect/read-status/card navigation and five MVP commands preserved; `npm.cmd test`, `npm.cmd run build`, and Chrome CDP 390px overflow checks passed.
- [x] T-015 AC632N_1 whitelist + auto-connect + connected-card navigation fix: only `AC632N_1` enters the UI list/connect flow; scan result can auto-connect the target; connect success sends one `readStatus`; tapping the already connected device card enters the control page instead of reconnecting; `npm.cmd test` and `npm.cmd run build` passed.
- [x] T-011 UI convergence: two-page MVP UI rebuilt as real DOM, transparent MPPT device asset added, five MVP command entries and hidden debug console retained; `npm.cmd test` and `npm.cmd run build` passed; Chrome CDP 390px home/control checks reported no horizontal overflow.
- [x] T-014 Agent 接力整理与测试模板：已记录 T-001/T-002 可行性冒烟测试通过；新增正式验收模板、T-011 UI 任务包、skill 使用说明和 session log；未改业务代码。
- [x] T-012 读状态回传可读化：电池显示单位改为 `V`；`E1` 状态回传的工作时长、亮度、电池电压、电池电流、太阳能电压已转为结构化可读状态；短包不更新业务状态；测试与构建通过。
- [x] T-013 Skill 白名单二次筛选与安装：已安装 `kb-retriever`、`web-design-engineer`、`gpt-image-2`、`requesting-code-review`、`receiving-code-review`、`security-best-practices`；已更新白名单与安装日志；`gpt-image-2` 作为图片工作流首选，但未覆盖系统 `.system/imagegen`。
- [x] T-009 建立先方案后修改流程：已新增项目级 skill、流程文档、计划模板、审批模板，并接入 `AGENTS.md`。
- [x] BLE 主链路已跑通：可连接、可发送、可接收。
- [x] 写入方式已锁定为 `write`。
- [x] RAW 调试发送已改为不等待 BLE 回包。
- [x] 普通业务命令已改为写入成功即返回。
- [x] T-003 响应等待策略已固化：5 条 MVP 命令默认不等待回包，显式等待路径已补单测，写入失败会清理 pending 后重试。
- [x] BLE 扫描/连接提速方案已实现。
- [x] 根据 `docs/improve.md` 建立 `.agent` 记忆框架。
- [x] 建立多 agent 协作框架、任务包、交接模板和文件所有权规则。
- [x] 按正式协议把 MVP 命令从 `AA 55` 临时帧切换为 `FF CE` RF 控制帧。
- [x] 固化读参数命令：`FF CE 06 00 0D 00 00 30 10`。
- [x] T-004 两页业务 UI 已收敛：主页反馈可见，控制页 5 个 RF 命令一一映射，调试台隐藏保留。
- [x] T-009 持续发现现阶段已实现：扫描按钮可开始/停止，5 秒补扫，同名设备按 MAC 区分，新设备追加，已连接设备不清除。
