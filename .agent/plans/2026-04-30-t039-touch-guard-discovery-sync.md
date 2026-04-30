# Plan - T039 Touch Guard, Discovery Stability, And Initial Sync

## Request

用户要求继续迭代：

1. 按键、点击滑杆、拉动滑杆都要增加防误触；上下滑动页面时不应误触控件并立即发送数据。
2. 设备页除当前目标外，也允许 `M3240-G` 和 `N3230-U` 进入；暂时按同一种设备控制。
3. 连接后不要停止扫描；在不影响前台控制的情况下做长期后台扫描。
4. 连接设备后自动发送一次 `读状态` 和 `读参数`，并用回包同步设备信息。
5. 取消连接后不要像移除设备一样消失，设备应保留在列表下方。
6. 评估多设备同时连接，目标最多 5 个，或 2.4G 替代 BLE。
7. 扫描到的设备在前台列表中保留几轮，不要立刻清掉，保证显示稳定。

## Current Facts

- 当前 App 只用 `TARGET_DEVICE_NAME = "AC632N_1"` 精确过滤，`filterSupportedDevices()` 会拒绝 `M3240-G`、`N3230-U`，也会拒绝用户写法 `AC632N-1`。
- `DeviceController.scan()` 当前默认 `PROFILE.namePrefix = "AC632N"`，并带 `allowFallbackNoPrefix`；M/N 设备可能只能依赖 fallback 扫描出现。
- `autoConnectSupportedDevice()` 自动连接前会调用 `stopContinuousDiscovery()`，`openControlPage()` 进入控制页也会停止持续发现，所以连接后确实容易不再持续扫。
- 当前连接成功后只调用 `requestInitialStatusRefresh()`，只发 `读状态`，没有自动发 `读参数`。
- 当前普通业务按钮是 `click` 后立即 `handleAction()`；时控步进按钮和滑杆已有约 400ms trailing debounce，但这是“提交后的发送合并”，不能阻止页面滚动时的误触提交。
- 当前发现列表保留规则是约 30 秒 stale、60 秒 forget；断开后虽然有 `recentlyDisconnectedDeviceId`，但保留时间较短，并且断开流程会停止发现，用户体感像设备被移除。
- 当前 `DeviceController` 是单 active BLE 连接模型：单 `currentDeviceId`、单 write/notify UUID、单 status、单订阅链路。真正同时连接多个 BLE 设备需要单独架构设计。
- 手机 App 不能直接使用任意 2.4G 私有遥控链路；除非供应商提供 Wi-Fi/网关/USB/串口桥接硬件与协议，否则只能通过当前 BLE 能力实现。

## Proposed Scope

本次 T039 做：

- 增加控件防误触层，而不是只做发送延迟：
  - 普通业务按钮、时控步进按钮：点击前检查 pointer 轨迹和最近滚动状态；明显纵向滑动、pointer cancel、滚动后短时间内的 click 不发送。
  - 时控滑杆：拖动中仍只预览；松手/提交时检查是否为有意的横向滑杆操作。如果判断为滚屏误触，则恢复到当前 draft 值，不发整包。
  - 保留 T037 的 400ms trailing debounce：通过误触判定后，时控整包仍延迟合并发送。
- 扩展目标设备名称：
  - 允许 `AC632N_1`、`AC632N-1`、`M3240-G`、`N3230-U`。
  - 这些设备点击后暂时进入同一套控制页、同一套 BLE profile、同一套时控参数 UI。
  - UI 文案从单一 `AC632N_1` 改为“目标设备”或支持设备列表，避免误导。
- 连接后的后台发现：
  - 自动连接和进入控制页后不再彻底停止后台发现。
  - 增加低频、静默的后台发现循环；前台控制页不弹出扫描结果提示，不抢占页面焦点。
  - 连接状态为 ready 时的后台扫描不应把前台控制临时变成不可发送状态；必要时在 `DeviceController.scan()` 增加 connected/background scan 选项，保持 ready 状态。
- 连接成功后的初始同步：
  - 成功 ready 后依次发送一次 `读状态` 和 `读参数`。
  - 不把普通业务命令改成等待回包；读状态/读参数仍按现有命令策略写出，依靠 notify 被动解析并同步 UI。
  - 若 `读参数` 回包包含时控整包，继续同步到模式、时段、时长、功率、最大输出等控件。
- 断开后的列表稳定：
  - 断开设备保留在列表内并排到下方，显示为最近断开/离线状态。
  - 延长已发现设备保留时间，并按“几轮扫描”稳定显示，避免一轮没扫到就消失。
  - 断开后恢复发现，不把列表清空作为断开动作的副作用。
- 增加单测覆盖过滤、保留、误触判定、连接后读状态/读参数触发、后台扫描状态策略。

本次 T039 不做：

- 不实现真正多 BLE 设备同时连接和同时控制；这需要把 `DeviceController` 改成多 session 架构，并重做状态、通知、UI 选择和命令路由。
- 不实现直接 2.4G 私有链路；没有供应商硬件/API 时，手机无法直接替代 BLE 连接遥控器的 2.4G 私有射频。
- 不改变 RF 帧格式、`B1 MODE=01` 编码/解码、校验、分包策略。
- 不把普通开/关、亮度、时控写入等业务命令改成默认等待 BLE 回包。
- 不让 UI 解析 raw HEX。
- 不修改 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不纳入 `项目文件/android-mvp-capacitor/android/.idea/`。
- 不导出新 APK，除非用户后续明确要求。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Touch guard model | `项目文件/android-mvp-capacitor/src/app.ts` | 增加控件意图判定 helper 和阈值常量：纵向滚动、pointer cancel、最近 scroll、过大垂直位移时拒绝提交。 |
| Buttons | `项目文件/android-mvp-capacitor/src/app.ts` | 普通业务按钮和时控步进按钮在执行前先走 touch guard；被判定为误触时不调用 BLE 命令、不更新发送状态。 |
| Sliders | `项目文件/android-mvp-capacitor/src/app.ts` | 时控 range 记录 pointer 轨迹；误触时恢复 draft 值并跳过 `commitTimeControlChange()`，有效提交仍复用 400ms trailing debounce。 |
| Device names | `项目文件/android-mvp-capacitor/src/app.ts` | 用 `SUPPORTED_DEVICE_NAMES` / `isSupportedDeviceName()` 替代单一 `TARGET_DEVICE_NAME` 精确判断；更新空列表和扫描提示文案。 |
| Discovery stability | `项目文件/android-mvp-capacitor/src/app.ts` | 延长 stale/forget 规则，增加按扫描轮次保留；断开设备排到下方并更久保留。 |
| Background scan | `项目文件/android-mvp-capacitor/src/app.ts` | 将前台持续发现和连接后的低频后台发现分开；连接 ready 后保持静默后台刷新，避免打断控制页。 |
| Connected scan state | `项目文件/android-mvp-capacitor/src/device/deviceController.ts` | 如实现需要，增加 connected/background scan 状态保护，避免后台扫描期间把 `connectionState` 暂时改成不可发命令状态。 |
| Initial sync | `项目文件/android-mvp-capacitor/src/app.ts` | 将连接后初始刷新改为 `读状态` + `读参数` 顺序写出；结果提示合并为“已请求同步”。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 覆盖支持设备名、误触拒绝、滑杆有效提交、列表保留、断开排序、连接后初始同步。 |
| Tests | `项目文件/android-mvp-capacitor/src/device/deviceController.test.ts` | 如修改 controller scan 状态，补充后台扫描保持 ready 的单测。 |
| Docs | `todo.md`、后续 approval/report/log | 记录 T039 范围、审批、验证结果；另列 T040 多设备/2.4G 可行性。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-039 防误触、多目标设备发现、连接后同步与列表稳定 | P0 | Proposed | 滚动页面时误触按钮/滑杆不发送；有效点击/拖动仍能发送；支持 `AC632N_1`、`AC632N-1`、`M3240-G`、`N3230-U`；连接后自动发 `读状态` 和 `读参数` 并被动同步回包；连接后低频后台发现不影响前台控制；断开设备保留并排到下方；设备列表保留几轮扫描；普通业务命令不改等待回包；测试/build/sync/Android debug build/APK 检查通过。 |
| T-040 多设备并连与 2.4G 替代链路可行性评估 | P1 | Proposed | 梳理当前单连接架构改成多 BLE session 所需改动；确认 Android/Capacitor/native 插件是否支持最多 5 个并连；说明 2.4G 替代链路需要的供应商硬件/API 前提；输出单独方案后再决定是否实施。 |

## Risks

- 防误触阈值过严会让很轻的快速点击被忽略；实施时需要以“滚动误触不发、正常点击不费力”为优先级调平衡。
- 后台 BLE 扫描虽然计划低频静默，但不同 Android 机型可能对 scan + GATT write 并行支持不同；如果真机上影响前台控制，需要降低频率或在发送命令时暂停后台扫描。
- `M3240-G`、`N3230-U` 目前按同一 BLE profile 连接；如果真机服务 UUID 或协议不同，连接/控制会失败，需要供应商补充差异。
- 连接后连续发 `读状态` 和 `读参数` 会增加两次 BLE 写入；需保持顺序和间隔，避免和自动连接后的订阅初始化抢占。
- 多设备并连不是小改：如果直接塞进本次，会影响 `deviceController.ts`、status 模型、UI 选择器、命令路由和测试面，风险高于当前 MVP 迭代。

## Verification

实施后计划运行：

1. TDD / 单文件：
   - `npm.cmd test -- src/app.test.ts`
   - 如修改 `DeviceController.scan()`：`npm.cmd test -- src/device/deviceController.test.ts`
2. 全量测试：
   - `npm.cmd test`
3. Web 构建：
   - `npm.cmd run build`
4. Capacitor 同步：
   - `npm.cmd run sync`
5. Android debug build：
   - Android Studio JBR `gradlew.bat assembleDebug`
6. APK 静态检查：
   - `aapt dump badging` 确认无 `testOnly`
   - `apksigner verify --verbose`
7. Browser / Playwright smoke：
   - 320/360/390px 无横向溢出。
   - 模拟纵向滚动经过按钮/滑杆，不触发命令。
   - 模拟有效点击按钮、有效拖动滑杆，仍能进入发送路径。
   - 断开设备后列表仍保留且排在下方。
   - 连接后发出 `读状态` 与 `读参数` 两个请求。

## Rollback

- 回退 `src/app.ts`、`src/styles.css`、`src/app.test.ts` 以及可能的 `src/device/deviceController.ts` / `src/device/deviceController.test.ts` 中 T039 改动即可恢复 T038 行为。
- 本次不改协议 Excel、Android native、RF 帧定义、构建配置或 APK 交付物，因此回滚不影响已验证的 T033 APK 和 T034-T038 时控协议链路。

## Approval Gate

等待用户确认后，再修改业务代码、UI、BLE discovery 逻辑和测试文件。确认前只保留本计划与 `todo.md` 更新。
