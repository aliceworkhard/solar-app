# Plan - T-021 Auto Scan, Nonblocking BLE UI, Edge Status Bar, Control Tabs

## Request

用户要求再优化一版，并补充当前真机发现的卡顿问题：

1. 打开 App 后直接开始扫描是否有可连接设备。
2. 当前底版渐变色较好，希望 UI 延伸到系统常驻状态栏区域，也就是手机时间、信号、电池所在顶部区域。
3. 设备详情页内“设备状态 / 控制面板”改为真正可点击切换；用户点击“控制面板”后切换到控制面板内容。
4. 控制面板内部顺序调整：控制面板内容在上方，三种模式“雷达 / 平均 / 时控”放在下方。
5. 断开连接后再搜索，页面不能卡住。
6. 连接后快速进入设备状态页时，即使系统还在处理上一次接收/读状态，也不能卡住页面。
7. 设备断开后要保留在附近设备列表，状态变成可连接，并移动到列表下方，不要直接清除。
8. 设备页“+”按钮点击后不能卡页面。

## Current Facts

- T-020 已完成并推送到 `origin/main`。
- 当前 `App.start()` 只安装返回逻辑、渲染页面和订阅状态/日志，不会自动触发扫描。
- 当前手动刷新已经是后台扫描，适合复用为启动自动扫描入口。
- 当前 `toggleContinuousDiscovery()` 启动持续发现后会 `await runDiscoveryRound()`，容易造成“+”按钮点击后的等待感。
- 当前扫描和连接流程没有 operation token；旧的扫描进度/连接回调可能在断开或新操作后继续更新 UI。
- 当前 `connectDevice()` 会等待 `requestInitialStatusRefresh()` 完成后才结束连接流程；如果读状态或 notify 正在处理，用户快速进入详情页会有明显卡顿风险。
- 当前设备卡点击逻辑只在 `ready` 时进入详情；如果同一设备已经连接但仍在 `connecting/discovering/subscribing` 或首次状态同步中，点击可能进入重复连接路径或等待路径。
- 当前 `disconnectDevice()` 清空 `activeDeviceId` 后刷新列表，但排序只按连接/过期/RSSI，没有“刚断开设备降到底部”的规则。
- 当前详情页 `detail-tabs` 只是两个静态 `span`，没有 tab 状态和点击事件。
- Web/CSS 只能控制 WebView 内部；要让渐变铺到 Android 系统状态栏后面，需要 Android 原生开启 transparent status bar / edge-to-edge。

## Proposed Scope

本次做：

- App 启动后自动发起一次后台扫描，并沿用现有目标设备过滤和自动连接逻辑。
- 将持续发现 `+` 按钮改为非阻塞启动：点击后立即返回 UI，扫描结果通过后续回调更新。
- 为扫描/连接相关异步流程增加轻量 operation token，过期的 scan progress、scan result、auto-connect result 不再更新当前 UI。
- 断开连接时记录最近断开的设备 ID：设备保留在列表、显示为可连接，并在排序上降到列表底部。
- 连接成功进入 `ready` 后，首次读状态改为后台 fire-and-forget，不阻塞连接流程和详情页打开；结果到达后自然刷新 UI。
- 同一 active 设备在连接阶段或状态同步阶段被点击时，进入详情页的安全加载态，不触发重复连接。
- 顶部系统状态栏区域做 Android edge-to-edge：状态栏透明，WebView 背景渐变延伸到系统时间/信号/电池下方。
- CSS 保留顶部安全区，避免页面标题与系统图标重叠。
- 设备详情页增加 `设备状态 / 控制面板` tab 状态和点击切换。
- 默认进入详情页显示“设备状态”；点击“控制面板”后显示命令控制内容。
- 控制面板内容顺序改为：控制命令区在上，模式展示在下。
- 用 TDD 补充启动自动扫描、非阻塞发现、断开后列表保留/降序、连接中点击进入详情、tab 默认值和控制面板顺序测试。

本次不做：

- 不改 UUID、协议 HEX、写入方式或命令语义。
- 不改 Android BLE 原生扫描/连接底层实现，除非实现 edge-to-edge 需要调整 `MainActivity.java`。
- 不改 `deviceController.ts`，除非 TDD 证明 pending response/断开清理必须在控制器层修复，届时再单独确认。
- 不引入 iOS。
- 不做沉浸式隐藏系统状态栏；系统时间/信号/电池仍显示，只让背景延伸到其后。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Auto scan | `项目文件/android-mvp-capacitor/src/app.ts` | 新增 `scheduleInitialDiscovery()`，在 `start()` 首屏渲染完成后异步触发一次后台扫描，不阻塞首屏。 |
| Nonblocking discovery | `项目文件/android-mvp-capacitor/src/app.ts` | 调整 `toggleContinuousDiscovery()`，启动后不 `await` 首轮扫描；扫描进度通过现有回调刷新列表。 |
| Async operation guard | `项目文件/android-mvp-capacitor/src/app.ts` | 新增 scan/connect operation token，旧扫描和旧自动连接结果被忽略，避免断开后旧回调再次改 UI。 |
| Disconnect retention | `项目文件/android-mvp-capacitor/src/app.ts` | 新增最近断开设备记录；`mergeDiscoveryDevices` 或排序参数支持 disconnected demotion，设备保留为可连接并排到下方。 |
| Fast detail entry | `项目文件/android-mvp-capacitor/src/app.ts` | 同一 active 设备在非 ready 连接阶段被点击时打开详情页同步态，不重复 connect；首次 `readStatus` 后台执行。 |
| Control tabs | `项目文件/android-mvp-capacitor/src/app.ts` | 增加 `controlTab` 状态；`detail-tabs` 改为 button；绑定点击切换；按 tab 渲染状态卡或控制卡。 |
| Control panel order | `项目文件/android-mvp-capacitor/src/app.ts` | 控制面板 tab 内先显示命令区，再显示模式按钮；模式按钮仅用于 UI 选择/展示，不直接改协议语义。 |
| Visual CSS | `项目文件/android-mvp-capacitor/src/styles.css` | 调整 tab、控制面板、模式区、loading/sync 状态样式；扩展渐变背景到全屏顶部并保留 safe-area padding。 |
| Android status bar | `项目文件/android-mvp-capacitor/android/app/src/main/java/com/solar/remote/MainActivity.java` | 开启 edge-to-edge / 透明状态栏 / 深色状态栏图标。 |
| Android dependency if needed | `项目文件/android-mvp-capacitor/android/app/build.gradle` | 如 `WindowCompat` 编译需要显式依赖，则添加 `androidx.core:core:$androidxCoreVersion`。 |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | TDD 先加失败测试：启动自动扫描决策、非阻塞持续发现、断开设备保留并降序、连接中点击不重复连接、详情 tab 和控制面板顺序。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-021 启动自动扫描、状态栏渐变延伸、详情页 tab 化与 BLE UI 卡顿修复 | P0 | Proposed | 打开 App 自动后台扫描目标设备且首屏不卡；`+` 按钮立即响应；断开后再搜索不卡；连接后快速进入详情不卡且不重复连接；断开设备保留为可连接并移到列表下方；状态栏区域显示 App 渐变背景且页面内容不压到系统图标；详情页 tab 可点击切换；控制面板 tab 内命令区在上、模式按钮在下；测试和构建通过。 |

## Risks

- Android edge-to-edge 在不同系统版本、不同厂商状态栏图标颜色上可能有差异；本机 vivo Android 16 需要真机确认。
- 如果 Android WebView 对 `env(safe-area-inset-top)` 支持不一致，可能需要额外用原生注入 CSS 变量或保守增加顶部 padding。
- 自动扫描会更早触发蓝牙权限请求/错误提示；如果用户未授权，首页应显示错误而不是卡住。
- operation token 能解决旧回调覆盖 UI，但不能真正取消底层 BLE 扫描；底层扫描仍由已有 timeout 收口。
- 详情页 tab 化会隐藏非当前 tab 内容；默认只看设备状态，控制按钮需要点击“控制面板”后出现。

## Verification

实施阶段按 TDD：

1. 先改 `src/app.test.ts`，新增失败测试并运行 `npm.cmd test -- src/app.test.ts` 确认红灯。
2. 实现 `src/app.ts` / `src/styles.css` / `MainActivity.java`，必要时调整 `build.gradle`。
3. 运行：
   - `npm.cmd test -- src/app.test.ts`
   - `npm.cmd test`
   - `npm.cmd run build`
   - `npm.cmd run sync`
   - `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr; .\gradlew.bat :app:assembleDebug`
4. 真机验收：
   - 冷启动 App 后无需点击刷新即可开始扫描并发现/自动连接 `AC632N_1`。
   - `+`、刷新、断开后搜索都不出现整页卡顿。
   - 断开后设备仍在附近设备列表，变为可连接，并显示在下方。
   - 连接后快速进入详情页不阻塞，状态数据后续到达后刷新。
   - 状态栏时间/信号/电池区域后面是 App 渐变背景。
   - 详情页 tab 点击切换正常，控制面板内命令区在上、模式按钮在下。

## Rollback

- 如启动自动扫描导致权限/性能问题，回退 `start()` 中的自动扫描入口，保留 UI tab 调整。
- 如 operation token 影响自动连接，可回退 token 检查，保留断开设备保留/降序和 UI tab 调整。
- 如 edge-to-edge 在 vivo 上状态栏图标或安全区异常，回退 `MainActivity.java` 的状态栏透明配置，保留 Web UI 调整。
- 如 tab 化降低操作效率，可保留按钮样式但恢复状态卡和控制卡同时显示。

## Approval Gate

等待用户明确回复“执行”“可以，做吧”“按这个改”或同等确认后，再修改业务文件、样式文件和 Android 原生文件。
