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

- [ ] T-011 基于 HTML/图片收敛两页 MVP UI
  - 优先级：P0
  - 状态：Proposed（方案已写，等待确认后实施）
  - 涉及文件：`HTML参考/app.html`、`mppt_app_design_assets/`、`项目文件/android-mvp-capacitor/src/app.ts`、`项目文件/android-mvp-capacitor/src/styles.css`、`项目文件/android-mvp-capacitor/src/app.test.ts`、`项目文件/android-mvp-capacitor/public/assets/ui/`
  - 处理口径：吸收参考稿的信息层级与视觉语言，落到当前设备首页 + 设备详情控制页；不照搬 OTA、场景页、我的页和未接入协议的完整参数设置。
  - 验收标准：首页和控制页按参考稿重构为真实 DOM UI；透明背景 MPPT 设备图接入；5 条 MVP 命令入口保留且反馈明确；调试台隐藏保留；不新增假功能；`npm.cmd test`、`npm.cmd run build` 通过；移动端截图检查无文字/按钮重叠。

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
