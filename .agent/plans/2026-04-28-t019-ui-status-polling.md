# Plan - T-019 UI card cleanup and status polling

## Request

用户提出 7 项需求变更：

1. 首页“附近设备”卡片去掉 2x2 指标的小框样式，RSSI 放到最右边，4 项指标从上下结构改为左右结构。
2. 首页去掉“当前设备”整块内容，不再展示该区域。
3. 首页设备卡片支持按住向左滑动，露出“取消连接”；点击后断开当前连接。
4. 控制页 Live Status 中“电池剩余”无真实数据，改为显示电池电压；取消固件显示。
5. 控制页 Live Status 中“晨亮时间”改为“模式（仅显示）”，“关灯时间”改为“太阳能电压”。
6. 雷达模式 / 时控模式 / 平均模式三个模式按钮从 Live Status 内移到控制面板最上面。
7. 系统连接成功后，每 5 秒自动发送一次“读状态”。

## Current Facts

- 当前主工程：`项目文件/android-mvp-capacitor`。
- 当前 UI 主文件：`src/app.ts`、`src/styles.css`、`src/app.test.ts`。
- 当前 `AC632N_1` 白名单、自动连接、连接后首次读状态、系统返回桥接已经完成。
- 当前 `readStatus()` 已通过 `CommandBuilder.readStatus()` 发送，且 `waitForResponse=false`，不会阻塞等待 BLE 回包。
- 当前 Notify 到达后由 `DeviceController` 被动解析并更新 `DeviceStatus`，UI 不直接解析 HEX。
- 当前首页仍有 `home-summary-card`（当前设备区域）。
- 当前附近设备卡片有 `.device-metrics` 的 2x2 小框。
- 当前控制页 Live Status 内包含模式按钮和固件字段。

## Proposed Scope

本次做：

- 首页设备列表视觉和滑动断开交互。
- 删除首页“当前设备”整块卡片。
- 控制页 Live Status 字段替换与模式按钮位置调整。
- App 层新增 5 秒读状态轮询，连接 ready 后启动，断开/非 ready 后停止或跳过。
- 补充单元测试，先写失败测试再实现。
- 完成后跑前端测试、构建、sync；如本机 JBR 可用，再跑 Gradle debug 构建。

本次不做：

- 不修改 Android BLE 原生插件。
- 不修改 RF 协议帧格式、命令 HEX、响应解析规则。
- 不修改 `deviceController.ts` 的命令语义，除非实施时发现必须增加只读状态查询；当前预期不需要。
- 不引入新设备字段，不伪造电池百分比、固件编码等无协议数据。
- 不扩展到 iOS。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Tests | `项目文件/android-mvp-capacitor/src/app.test.ts` | 新增/调整测试：附近设备指标模型、Live Status 字段替换、5s 轮询常量与轮询条件、模式按钮位置相关的可测试 helper。先跑红灯。 |
| UI logic | `项目文件/android-mvp-capacitor/src/app.ts` | 删除首页 `home-summary-card`；设备卡片改为 RSSI 右侧 badge；指标改为无边框 label/value 左右结构；新增 connected 卡片左滑露出“取消连接”；控制页字段替换；模式按钮移到控制面板顶部；新增 `STATUS_POLL_INTERVAL_MS=5000`、轮询启动/停止/跳过逻辑。 |
| Styles | `项目文件/android-mvp-capacitor/src/styles.css` | 删除/收敛当前设备卡片布局；调整设备卡片密度、RSSI 右侧布局、滑动操作层、指标横向样式；调整 Live Status 和模式按钮位置样式。 |
| Docs after implementation | `todo.md`、`.agent/logs/`、`.agent/handoffs/`、`.agent/AI_CONTEXT.md`、`.agent/CHANGE_INDEX.md` | 完成后记录 T-019 状态、验证结果和接力说明。 |

## Interaction Details

- 附近设备卡片：主体仍可点击进入详情或连接；已连接卡片左滑超过阈值后露出“取消连接”。
- “取消连接”：只对当前已连接设备生效，点击后调用现有 `disconnectDevice()`。
- 左滑阈值：计划使用触摸/指针横向位移，避免轻微滚动误触；滑开后点击卡片空白处或向右滑可收回。
- 5 秒读状态：连接进入 `ready` 后启动；每次只发送一次读状态，不等待 BLE 回包；如果上一轮仍在进行或连接非 ready，则跳过本轮；断开后清除计时器。
- UI 状态更新：仍依赖 notify 被动更新 `DeviceStatus`，轮询只负责周期性 TX。

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-019 UI card cleanup and status polling | P0 | Proposed | 首页无“当前设备”整块；附近设备卡片 RSSI 在右侧；4 项指标无小框且 label/value 左右排版；已连接设备可左滑取消连接；控制页 Live Status 显示电池电压、模式、太阳能电压且不显示固件；模式按钮位于控制面板顶部；ready 后每 5 秒发送读状态；测试与构建通过。 |

## Risks

- 滑动断开可能和点击进入详情冲突，需要阈值和 swiped 状态保护。
- 5 秒读状态可能与手动命令并发；现有 `DeviceController.runExclusive` 会串行化，App 层仍需要跳过重入，避免队列堆积。
- 删除当前设备卡片后，首页断开入口只剩滑动动作；如果真机上滑动体验不好，后续可能要加一个小型二级入口。
- 如果浏览器/Android WebView 的 pointer/touch 行为不一致，需要在真机上复测。

## Verification

实施后计划执行：

1. `npm.cmd test -- src/app.test.ts`
2. `npm.cmd test`
3. `npm.cmd run build`
4. `npm.cmd run sync`
5. 如 `JAVA_HOME` / Android Studio JBR 可用：`gradlew.bat :app:assembleDebug`
6. 真机手动验证：
   - 首页仅显示附近设备列表，无当前设备卡片。
   - 设备卡片左滑出现“取消连接”，点击后断开。
   - 点击已连接设备仍可进入控制页。
   - 控制页字段与本次需求一致。
   - 连接 ready 后日志每 5 秒出现一次读状态 TX。

## Rollback

- 若 UI 变更不符合预期，回退 `src/app.ts` 和 `src/styles.css` 中 T-019 改动即可恢复 T-018 状态。
- 若轮询影响稳定性，保留 UI 改动，单独移除 `STATUS_POLL_INTERVAL_MS` 计时器逻辑。
- 所有改动会在一个独立提交中完成，便于 Git 回滚。

## Approval Gate

等待用户明确确认后，再修改业务/UI 文件。确认前不改 `src/`、Android 原生文件、协议实现或构建配置。
