Q:
我要复刻一个我已经有UI（html）的一个小程序，我也有我们与单片机的通信协议，但是我们是通过蓝牙串口和2.4G进行控制的，我需要做iOS和安卓两个的小程序。后期，我们需要对IC进行适配，我只能找到他们的uuid，名称，Mac地址等，可能没有办法找到其他的内容。同时我也不会开发前后端，我没有开发过，但这件事情可以完成我认为。所以需要你给我一些帮助和看法，我需要怎么一步一步进行开发

A:
可以做，而且你“不懂前后端”并不是最大障碍。你这个项目本质上更像是**智能硬件本地控制 App**：核心难点不是后端，而是**手机 App 与单片机/蓝牙 IC/2.4G 模块之间的通信层**。

我建议你把它拆成三个层级来做：**UI 层、通信层、协议层**。你已有 HTML UI，这是很好的起点；真正要补的是蓝牙/2.4G 通信能力和后期 IC 适配架构。

---

## 一、先确认一个最关键的问题：你说的“蓝牙串口”到底是哪一种？

这会直接决定 iOS 能不能做。

### 1. 如果是 BLE 低功耗蓝牙“透传串口”

这是最推荐、最可行的路线。

BLE 通常不是传统串口，而是通过：

```text
Service UUID
Characteristic UUID
write / writeWithoutResponse
notify / indicate
```

来模拟串口通信。Android 官方文档明确支持 BLE 中心设备角色，可以发现设备、查询服务、传输数据；iOS 也通过 Core Bluetooth 与 BLE 外设通信。([Android Developers][1])

这种情况下，你的 App 流程大概是：

```text
扫描设备 → 连接设备 → 获取服务 → 找到特征值 → 打开 notify → 写入命令 → 接收回包 → 解析协议
```

### 2. 如果是经典蓝牙 SPP 串口

Android 可以做，但 iOS 会非常麻烦。

iOS 普通 App 不能像 Android 那样随便连接经典蓝牙串口设备。Apple 的 External Accessory 框架主要用于 MFi 认证配件；Apple 文档也说明，BLE 配件不需要走 External Accessory，而是使用 Core Bluetooth。([Apple Developer][2])

所以如果你现在的硬件是经典蓝牙 SPP，建议尽快让硬件端改成 **BLE 透传服务**，否则 iOS 端会成为大坑。

### 3. 如果是“私有 2.4G”控制

手机本身不能直接发私有 2.4G 射频协议，例如 nRF24L01 那类私有 2.4G。手机能直接使用的是蓝牙、BLE、Wi-Fi、蜂窝网络、NFC 等。

所以 2.4G 控制通常需要一个“桥”：

```text
手机 App → BLE / Wi-Fi / USB → 网关/主控 → 私有 2.4G → 目标设备
```

也就是说，App 不应该直接关心 2.4G 的底层射频，而是通过一个可连接的模块把命令转过去。

---

## 二、不要依赖 MAC 地址，尤其是 iOS

你提到后期适配 IC 时，可能只能找到 UUID、名称、MAC 地址等。这里要特别注意：

**不要把 MAC 地址当成核心识别依据。**

iOS 的 Core Bluetooth 通常给你的是外设的 `identifier`，也就是 UUID 形式的标识，而不是 BLE 设备真实 MAC；Silicon Labs 也明确说明 iOS CoreBluetooth 不直接暴露外设真实 MAC 地址。([Apple Developer][3])

Android 这边虽然经常能看到类似 MAC 的地址，但 BLE 地址本身有 public、random、private 等类型，随机私有地址可能会变化；Nordic 的 BLE 基础资料也说明 BLE 地址分为 public 和 random，private 地址会周期性变化以防止追踪。([Nordic Developer Academy][4]) Android 新 API 里也专门区分 public、random、unknown 等地址类型。([Android Developers][5])

更稳的识别方式应该是：

```text
设备名称前缀
广播里的 Service UUID
Manufacturer Data
设备内部序列号
协议版本号
产品型号
Service UUID + Characteristic UUID
```

如果你能控制单片机固件，最好加一个“设备信息读取命令”，例如：

```text
读取设备型号
读取固件版本
读取协议版本
读取 IC 类型
读取设备唯一 ID
```

这样后期适配 IC 会轻松很多。

---

## 三、技术路线建议：优先做“混合 App”，不要一开始写原生 Swift/Kotlin

你已经有 HTML UI，所以最适合你的不是从零写两个原生 App，而是用一套 Web UI 打包成 iOS/Android。

我建议你优先考虑这两条路线。

---

## 路线 A：Capacitor + 你的 HTML UI + BLE 插件

适合你这种情况：

```text
已有 HTML / CSS / JS UI
主要目标是 iOS App + Android App
不想分别学 Swift 和 Kotlin
希望快速做出可测试版本
```

Capacitor 的作用是把 Web 页面放进原生 App 容器里，然后通过插件调用原生能力；官方文档也说明，Capacitor 插件可以为 Web 端生成 JavaScript 调用接口，底层再接 Swift/Obj-C 或 Java/Kotlin。([Capacitor][6])

BLE 可以用类似 `capacitor-community/bluetooth-le` 这种插件。这个插件支持 Web、Android、iOS，但它只支持 **BLE**，不支持经典蓝牙串口。([GitHub][7])

所以这条路线的前提是：你的蓝牙通信最好是 BLE。

推荐结构：

```text
你的 HTML UI
    ↓
JavaScript 控制逻辑
    ↓
BLE Transport 蓝牙通信层
    ↓
协议编码/解码层
    ↓
设备适配层
    ↓
单片机
```

---

## 路线 B：uni-app

如果你说的“小程序”是真的指微信小程序、支付宝小程序，或者你未来想同时做：

```text
iOS App
Android App
微信小程序
H5 页面
```

那么 uni-app 也可以考虑。

DCloud 的 uni-app BLE 文档里有低功耗蓝牙的发现、读、写、notify 等 API；文档也说明 App 端目前主要支持 BLE 设备发现。([Uni App][8])

uni-app 的优势是国内生态更熟，适合“App + 小程序”多端；缺点是蓝牙这种底层能力遇到复杂情况时，最后仍然可能要写原生插件或找插件。

---

## 四、我建议你的第一版目标：不要做完整产品，先做“通信调试器”

第一阶段不要急着复刻全部 UI。你应该先做一个很丑但很有用的页面：

```text
1. 扫描蓝牙设备
2. 显示设备名称、RSSI、deviceId、serviceUUID
3. 连接设备
4. 显示所有 Service UUID
5. 显示所有 Characteristic UUID
6. 选择写入特征值
7. 选择通知特征值
8. 手动输入十六进制命令
9. 发送命令
10. 显示收到的原始十六进制数据
11. 显示解析后的协议结果
```

这个调试器做出来，你的项目就成功了一半。

你还可以同时用 nRF Connect 或 LightBlue 这类 BLE 调试工具验证硬件。nRF Connect 可以扫描、探索 BLE 设备、发现服务和特征值、读写特征；LightBlue 也支持扫描、连接、读、写、notify，适合 BLE 开发调试。([Nordic Semiconductor][9])

---

## 五、你现在要整理一份“通信资料表”

你已经有单片机通信协议，但移动端开发需要的信息通常比单片机协议多。你应该整理成下面这种表。

### 1. 设备发现信息

```text
设备名称规则：
例如 ABC-XXXX、BT_DEVICE、XXX_LIGHT

广播 Service UUID：
例如 FFE0、FFF0、自定义 128-bit UUID

Manufacturer Data：
有没有？
里面是否包含产品型号、设备 ID、版本号？

是否需要配对：
需要 / 不需要

是否需要密码：
需要 / 不需要
```

### 2. BLE GATT 信息

```text
主 Service UUID：
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

写入 Characteristic UUID：
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

通知 Characteristic UUID：
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

写入方式：
write
writeWithoutResponse

接收方式：
notify
indicate

MTU：
默认 20 字节？
是否支持更大 MTU？
```

### 3. 协议帧格式

例如：

```text
帧头：AA 55
长度：1 字节
命令字：1 字节
数据区：N 字节
校验：CRC8 / CRC16 / 累加和
帧尾：0D 0A
```

你需要明确：

```text
大小端：大端 / 小端
CRC 算法
是否需要 ACK
超时时间
重发次数
一条命令是否可能分包
一条回包是否可能分多次 notify
错误码含义
设备状态机
```

BLE 的 notify 数据可能会被拆包，也可能多包连在一起，所以 App 里一定要做“协议缓冲区解析”，不能假设一次 notify 就是一条完整协议帧。

---

## 六、软件架构一定要这样拆，后期适配 IC 才不会崩

你后期要适配不同 IC，所以千万不要把 UUID、命令、UI 按钮逻辑全部写死在页面里。

建议结构：

```text
src/
  pages/
    index.html
    control.html

  bluetooth/
    BleTransport.ts
    BluetoothScanner.ts
    ConnectionManager.ts

  rf24/
    Rf24BridgeTransport.ts

  protocol/
    FrameCodec.ts
    CommandBuilder.ts
    ResponseParser.ts
    Crc.ts

  profiles/
    ChipAProfile.ts
    ChipBProfile.ts
    DefaultBleUartProfile.ts

  device/
    DeviceController.ts
    DeviceState.ts
```

核心思想是：

```text
UI 不关心 UUID
UI 不关心 CRC
UI 不关心具体 IC
UI 只调用“开灯、关灯、调参数、读取状态”
```

中间由 `DeviceController` 处理。

例如：

```text
UI 点击“开机”
    ↓
DeviceController.powerOn()
    ↓
Protocol.buildPowerOnCommand()
    ↓
BleTransport.write()
    ↓
设备 notify 回包
    ↓
Protocol.parse()
    ↓
更新 UI 状态
```

---

## 七、IC 适配应该做成“配置文件 + 少量代码”

每个 IC 或蓝牙模块建立一个 profile：

```ts
const ChipAProfile = {
  name: "ChipA",
  match: {
    namePrefix: "ABC",
    serviceUUIDs: ["0000FFE0-0000-1000-8000-00805F9B34FB"]
  },
  serviceUUID: "0000FFE0-0000-1000-8000-00805F9B34FB",
  writeCharacteristicUUID: "0000FFE1-0000-1000-8000-00805F9B34FB",
  notifyCharacteristicUUID: "0000FFE1-0000-1000-8000-00805F9B34FB",
  writeType: "writeWithoutResponse",
  mtu: 20,
  codec: "default"
}
```

如果后期换 IC，但协议不变，只是 UUID 变了，你只需要新增一个 profile。

如果后期协议也变了，再新增一个 codec：

```text
ChipAProfile → DefaultCodec
ChipBProfile → NewCodec
ChipCProfile → EncryptedCodec
```

这样 UI 不用重写。

---

## 八、一步一步开发路线

### 第 1 步：确认硬件通信类型

先搞清楚这几件事：

```text
蓝牙是 BLE 还是经典蓝牙 SPP？
2.4G 是私有 2.4G、Wi-Fi，还是某个网关？
手机是否直接连接设备？
还是手机连接一个中间转发器？
```

如果蓝牙不是 BLE，要先评估 iOS 风险。

---

### 第 2 步：用 BLE 调试工具跑通协议

先不要写 App。

用 nRF Connect 或 LightBlue 做这些事：

```text
扫描设备
连接设备
找到 Service UUID
找到 write characteristic
找到 notify characteristic
打开 notify
手动发送协议命令
确认设备有回包
```

如果调试工具都不能稳定通信，先不要进入 App 开发。

---

### 第 3 步：做一个最小 App

只做这几个功能：

```text
扫描
连接
订阅 notify
发送一条固定命令
显示原始回包
```

例如先实现：

```text
读取设备版本
读取设备状态
开机/关机
```

不要一开始就做完整 UI。

---

### 第 4 步：做协议解析

把十六进制数据变成业务状态：

```text
AA 55 05 01 01 XX
↓
{
  command: "power",
  status: "on"
}
```

这一步很重要。后面 UI 都靠它。

---

### 第 5 步：接入你已有的 HTML UI

等通信稳定后，再把按钮接进去：

```text
按钮点击 → 调用 DeviceController
设备回包 → 更新页面状态
```

比如：

```js
document.querySelector("#powerBtn").onclick = async () => {
  await deviceController.powerOn()
}
```

---

### 第 6 步：做异常处理

真实产品里，蓝牙问题会很多：

```text
扫描不到
连接失败
连接后没有服务
写入失败
notify 没打开
设备突然断开
手机蓝牙关闭
权限没给
App 切后台
Android 不同品牌手机兼容性
iOS 后台限制
```

Android 12 以后蓝牙扫描、连接等需要 `BLUETOOTH_SCAN`、`BLUETOOTH_CONNECT` 等运行时权限；官方文档也说明这些权限需要用户批准。([Android Developers][10])

iOS 后台蓝牙也有限制；Apple 文档说明，很多 Core Bluetooth 任务在后台或挂起状态默认不可用，需要配置后台模式，而且即使配置了也不能无限后台运行。([Apple Developer][11])

---

### 第 7 步：做 IC 适配系统

把每个 IC 的差异放到 profile 里：

```text
设备名不同
Service UUID 不同
Characteristic UUID 不同
写入方式不同
MTU 不同
协议版本不同
```

App 启动扫描时自动判断：

```text
发现设备
↓
根据 name / serviceUUID / manufacturerData 匹配 profile
↓
使用对应连接参数
↓
使用对应协议解析器
```

---

### 第 8 步：再考虑后端

第一版大概率不需要后端。

只有你需要这些功能时才需要后端：

```text
用户账号
设备绑定
云端远程控制
云端数据记录
固件 OTA 管理
售后诊断日志
多用户共享设备
App 自动更新配置
```

否则可以先做纯本地 App。

---

## 九、你需要准备的工具和环境

你大概率需要：

```text
一台 Mac：用于 iOS 打包、真机测试、上架
Xcode：iOS 开发和签名
Android Studio：Android 打包和调试
真实 iPhone：iOS 蓝牙测试
真实 Android 手机：Android 蓝牙测试
nRF Connect / LightBlue：BLE 调试
逻辑分析仪或串口工具：单片机侧调试
```

蓝牙项目不要依赖模拟器，必须用真机。

---

## 十、我对你的项目的总体建议

我建议你按这个顺序做：

```text
1. 先确认蓝牙类型：BLE / 经典蓝牙 / 2.4G 网关
2. 用 nRF Connect 或 LightBlue 找到 serviceUUID 和 characteristicUUID
3. 用调试工具手动发送协议，确认硬件回包
4. 选 Capacitor 或 uni-app
5. 做最小通信 App
6. 做协议解析层
7. 接入你已有 HTML UI
8. 做断线重连、权限、错误处理
9. 做 IC Profile 适配层
10. 最后再考虑后端、云端、OTA、上架
```

如果你的目标只是 iOS/Android App，并且已有 HTML UI，我更倾向于：

```text
Capacitor + HTML/CSS/JS + BLE 插件 + 自己封装协议层
```

如果你未来还要微信小程序、H5、多端发布，我更倾向于：

```text
uni-app + BLE API + 自定义协议层
```

但无论选哪个框架，真正决定项目成败的是这三件事：

```text
BLE 服务/特征值是否明确
单片机协议是否稳定
IC 适配层是否一开始就设计好
```

你现在最应该做的不是马上找人写完整 App，而是先整理一份“设备通信资料表”，然后做一个能扫描、连接、发命令、收回包的最小版本。只要这个最小版本跑通，后面的 UI 复刻和 IC 适配都会清晰很多。

[1]: https://developer.android.com/develop/connectivity/bluetooth/ble/ble-overview "Bluetooth Low Energy  |  Connectivity  |  Android Developers"
[2]: https://developer.apple.com/library/archive/qa/qa1657/_index.html "Technical Q&A QA1657: Using External Accessory framework with Bluetooth devices."
[3]: https://developer.apple.com/documentation/corebluetooth/cbpeer/identifier?utm_source=chatgpt.com "identifier | Apple Developer Documentation"
[4]: https://academy.nordicsemi.com/courses/bluetooth-low-energy-fundamentals/lessons/lesson-2-bluetooth-le-advertising/topic/bluetooth-address/ "Bluetooth address - Nordic Developer Academy"
[5]: https://developer.android.com/reference/android/bluetooth/BluetoothDevice.BluetoothAddress "BluetoothDevice.BluetoothAddress  |  API reference  |  Android Developers"
[6]: https://capacitorjs.com/docs/plugins "Capacitor Plugins | Capacitor Documentation"
[7]: https://github.com/capacitor-community/bluetooth-le "GitHub - capacitor-community/bluetooth-le: Capacitor plugin for Bluetooth Low Energy · GitHub"
[8]: https://en.uniapp.dcloud.io/api/system/bluetooth.html "uni-app"
[9]: https://www.nordicsemi.com/Products/Development-tools/nRF-Connect-for-mobile?utm_source=chatgpt.com "nRF Connect for Mobile"
[10]: https://developer.android.com/develop/connectivity/bluetooth/bt-permissions "Bluetooth permissions  |  Connectivity  |  Android Developers"
[11]: https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html "Core Bluetooth Background Processing for iOS Apps"



Q:
首先，我手里只有Windows系统，其次，这是我用第三方开发的一个蓝牙调试助手进行测试，找到的一些内容：如图片所示，这个就是接收和发生的uuid，还有一个是接收名称的一个uuid，这个IC不是我们自己的，是别人的，是我们供应商的，他们是不会告诉我们上面的内容的，所以。能读取到的数据是不多的。

A:
你这张图很关键。**结论先说：你现在拿到的信息已经足够启动第一版开发，不需要供应商把 IC 的完整资料给你。** 你现在要做的不是研究 IC 内部，而是把它当成一个“黑盒 BLE 透传模块”来适配。

从截图看，这个设备不是单纯的经典蓝牙 SPP，而是已经暴露出了 BLE 的 GATT UUID。杰理 AC63 系列官方文档里也有类似方向：经典蓝牙侧用 SPP，BLE 侧用自定义 profile，并通过 `WRITE`、`WRITE_WITHOUT_RESPONSE`、`NOTIFY`、`INDICATE` 等属性收发数据；AC632N 也在支持列表里。这个和你现在看到的 `FFF0 / FFF1 / FFF2 / FFF3` 很吻合。([Jieli Documentation System][1])

---

## 1. 先把你截图里的 UUID 翻译成开发人员能用的信息

你现在已经知道这些：

| 项目           |                                目前看到的内容 | 作用判断                       |
| ------------ | -------------------------------------: | -------------------------- |
| 设备名称         |                             `AC632N_1` | 可以作为扫描过滤条件之一               |
| 自定义服务 UUID   | `0000FFF0-0000-1000-8000-00805F9B34FB` | 很可能是真正的串口透传服务              |
| 发送 UUID      | `0000FFF1-0000-1000-8000-00805F9B34FB` | 你截图中已选中它作为发送通道             |
| 候选接收 UUID    |                   `FFF1 / FFF2 / FFF3` | 需要进一步确认哪个有 notify/indicate |
| 设备名称 UUID    |             `00001800` 服务下的 `00002A00` | 通常只是读取设备名称                 |
| 系统 GATT UUID |                `00001801` / `00002A05` | 通常不是业务控制通道                 |

`1800`、`1801`、`2A00`、`2A05` 这类是 Bluetooth SIG 分配的标准 GATT 编号，重点不在这里；你真正要关心的是 `FFF0` 服务下面的 `FFF1 / FFF2 / FFF3`。Bluetooth SIG 的 Assigned Numbers 文档就是这类标准编号的官方清单。([Bluetooth® Technology Website][2])

你现在可以先建立一个设备配置：

```js
const AC632N_PROFILE = {
  name: "AC632N",
  namePrefix: "AC632N",
  serviceUUID: "0000FFF0-0000-1000-8000-00805F9B34FB",

  // 从截图看，发送 UUID 已经选中了 FFF1
  writeCharacteristicUUID: "0000FFF1-0000-1000-8000-00805F9B34FB",

  // 接收 UUID 还需要实测确认
  notifyCandidates: [
    "0000FFF1-0000-1000-8000-00805F9B34FB",
    "0000FFF2-0000-1000-8000-00805F9B34FB",
    "0000FFF3-0000-1000-8000-00805F9B34FB"
  ],

  deviceNameServiceUUID: "00001800-0000-1000-8000-00805F9B34FB",
  deviceNameCharacteristicUUID: "00002A00-0000-1000-8000-00805F9B34FB",

  writeType: "待确认：write 或 writeWithoutResponse",
  mtu: "先按 20 字节分包处理"
}
```

---

## 2. 你现在最需要确认的不是 IC 型号，而是这 5 个通信点

供应商不告诉你 IC 细节没关系。你只需要确认：

```text
1. 哪个 service 是业务服务
2. 哪个 characteristic 用来写入
3. 哪个 characteristic 用来接收 notify
4. 写入方式是 write 还是 writeWithoutResponse
5. 你们单片机协议是否可以原样透传
```

你图里第 1、2 点基本已经有了：

```text
serviceUUID: FFF0
writeUUID:   FFF1
```

现在要确认的是接收 UUID。

你可以这样测：

```text
第一轮：
发送 UUID 选 FFF1
接收 UUID 选 FFF1
发送一条你们已知的读取状态命令

第二轮：
发送 UUID 选 FFF1
接收 UUID 选 FFF2
发送同一条命令

第三轮：
发送 UUID 选 FFF1
接收 UUID 选 FFF3
发送同一条命令
```

哪一个能收到设备回包，哪个就是接收 notify UUID。

如果三个都收不到，再测试：

```text
1. 是否需要先打开 notify
2. HEX 格式是否正确
3. 命令是否需要 CRC
4. 是否需要帧头帧尾
5. 是否需要先发握手命令
6. 写入方式是否需要 writeWithoutResponse
```

---

## 3. 你说“只有 Windows 系统”，这里要分两种情况

你现在截图看起来像是**微信小程序里的蓝牙调试助手**。所以你要先区分目标到底是哪一种。

---

### 情况 A：你要做的是微信小程序

这对你最友好。

因为微信小程序本来就是一个小程序，同时运行在 iOS 微信和 Android 微信里。你不需要分别做两个原生 App，也不需要一开始买 Mac。

大概流程是：

```text
Windows 电脑
    ↓
微信开发者工具
    ↓
开发一个微信小程序
    ↓
小程序调用 BLE API
    ↓
iPhone / Android 真机测试
```

微信小程序蓝牙流程大概是：

```text
初始化蓝牙
    ↓
搜索设备
    ↓
连接设备
    ↓
获取 services
    ↓
获取 characteristics
    ↓
打开 notify
    ↓
写入 ArrayBuffer 数据
    ↓
监听回包
```

相关开发者整理的流程也基本是围绕 `wx.openBluetoothAdapter`、搜索设备、连接设备、获取服务、获取特征值、写入和监听特征值展开。([Huawei Cloud Community][3])

这种路线下，你的技术方案应该是：

```text
微信小程序原生开发
或者
uni-app 编译到微信小程序
```

如果你已有的是 HTML UI，需要注意：**微信小程序不能直接把完整 HTML 页面原封不动塞进去运行**。它通常要改成：

```text
HTML  →  WXML / uni-app template
CSS   →  WXSS / uni-app style
JS    →  小程序 JS / uni-app JS
```

但是 UI 结构、颜色、布局、按钮逻辑都可以复用思路。

我更建议你第一版走：

```text
微信小程序 + BLE + 你们现有协议
```

而不是一开始就做独立 iOS App 和 Android App。

---

### 情况 B：你要做的是独立安装包 App

那 Windows 就只能完成大部分 Android 和前端部分。

Android Studio 官方支持 Windows 环境，所以 Android 版本你可以在 Windows 上开发、打包和真机调试。([Android Developers][4])

iOS 独立 App 最终仍然绕不开 Xcode、签名、上传、TestFlight 或 App Store 流程。Apple 的 App Store Connect 文档说明，Xcode 用于构建、测试、优化和提交 Apple 平台 App，也可以用 Xcode Cloud 做持续集成。([Apple Developer][5])

所以独立 App 的现实方案是：

```text
Windows 上开发大部分代码
    ↓
Android 本地调试
    ↓
iOS 阶段租 Mac / 借 Mac / 买 Mac mini / 找人代打包
    ↓
iPhone 真机测试
```

如果做独立 App，同时想最大限度复用你的 HTML UI，可以走：

```text
Capacitor + HTML/CSS/JS + BLE 插件
```

Capacitor 的 BLE 插件支持 Web、Android、iOS，但它只支持 Bluetooth Low Energy，不支持经典蓝牙串口。你的截图已经是 BLE UUID，所以这个路线是可行的。([GitHub][6])

---

## 4. 我建议你现在先不要做完整 UI，先做“蓝牙通信最小 Demo”

第一版不要急着复刻完整界面。先做一个很简单的页面：

```text
扫描设备
连接 AC632N_1
显示 services
显示 characteristics
选择接收 UUID
选择发送 UUID
输入 HEX 命令
发送
显示收到的 HEX 回包
```

这个页面跑通后，项目就成功了一半。

你的最小目标应该是：

```text
发送：
AA 55 ... CRC

收到：
AA 55 ... CRC
```

只要这一步能稳定收发，你后面复刻 UI 就只是把按钮接到命令上。

---

## 5. Windows 上还可以先做一个 PC 蓝牙测试工具

你不一定非要先进入小程序开发。Windows 上可以用 Python 的 Bleak 库做 BLE 调试。Bleak 是一个跨平台 BLE GATT client，支持连接 BLE 设备、通信，且支持 Windows 10 16299 及以上。([Bleak][7])

这一步的价值很大：

```text
不用先做 UI
不用先做小程序
不用先研究 iOS
先验证 UUID 和协议是否能跑通
```

你可以让开发人员先写一个 Windows 小脚本，实现：

```text
扫描 AC632N_1
连接
列出所有 service/characteristic
打开 FFF1/FFF2/FFF3 的 notify
向 FFF1 写入 HEX
打印回包 HEX
```

这样能最快判断：

```text
FFF1 是不是写入通道
FFF2/FFF3 哪个是接收通道
命令是不是原样透传到单片机
设备有没有回包
```

---

## 6. 后期适配不同 IC，不要靠 MAC 地址

你前面提到可能只能拿到 UUID、名称、MAC 地址。这里特别注意：**不要把 MAC 地址作为核心识别条件。**

iOS 的 Core Bluetooth 对外主要给的是 peripheral identifier，也就是 UUID 形式的标识；Silicon Labs 也明确说明 iOS CoreBluetooth 不直接给外设真实 MAC 地址。([Apple Developer][8])

你的设备识别应该按这个优先级：

```text
1. serviceUUID
2. 设备名称前缀
3. manufacturerData
4. 读取设备型号命令
5. 读取协议版本命令
6. 读取固件版本命令
```

不要这样做：

```text
只靠 MAC 地址绑定设备
```

更好的做法是每种 IC 建一个 profile：

```js
const profiles = [
  {
    name: "AC632N",
    match: {
      namePrefix: "AC632N",
      serviceUUID: "0000FFF0-0000-1000-8000-00805F9B34FB"
    },
    serviceUUID: "0000FFF0-0000-1000-8000-00805F9B34FB",
    writeUUID: "0000FFF1-0000-1000-8000-00805F9B34FB",
    notifyUUID: "待确认",
    protocol: "default"
  },
  {
    name: "未来其他IC",
    match: {
      namePrefix: "XXX",
      serviceUUID: "另一个UUID"
    },
    serviceUUID: "另一个UUID",
    writeUUID: "另一个写UUID",
    notifyUUID: "另一个通知UUID",
    protocol: "default"
  }
]
```

这样以后供应商换 IC，只要协议不变，你只改 UUID 配置，不改 UI。

---

## 7. 你现在的开发顺序应该这样排

### 第一步：把 UUID 固定下来

你现在先整理成这张表：

```text
设备名：AC632N_1
服务 UUID：0000FFF0-0000-1000-8000-00805F9B34FB
发送 UUID：0000FFF1-0000-1000-8000-00805F9B34FB
接收 UUID：待确认，测试 FFF1 / FFF2 / FFF3
设备名称 UUID：1800 / 2A00
是否需要配对：待确认
写入方式：待确认
单包长度：先按 20 字节
```

---

### 第二步：用蓝牙助手确认接收 UUID

拿一条你们确定有效的单片机命令，例如：

```text
读取版本
读取状态
开机
关机
```

依次测试：

```text
接收 FFF1
接收 FFF2
接收 FFF3
```

记录哪一个有回包。

---

### 第三步：做通信 Demo

先不要接完整 UI，只做：

```text
连接
发送
接收
显示 HEX
```

这一版可以用：

```text
微信小程序
或者
Windows Python Bleak
或者
Android Demo
```

---

### 第四步：做协议解析

不要让 UI 直接处理 HEX。

应该这样拆：

```text
UI 按钮
    ↓
DeviceController
    ↓
Protocol.buildCommand()
    ↓
BleTransport.write()
    ↓
BleTransport.notify()
    ↓
Protocol.parseResponse()
    ↓
更新 UI 状态
```

比如：

```js
device.powerOn()
device.powerOff()
device.readStatus()
device.setSpeed(value)
device.setMode(mode)
```

UI 只调用这些函数，不直接拼十六进制。

---

### 第五步：复刻你的 HTML UI

通信跑通后再接 UI：

```text
按钮点击 → 调命令
滑块变化 → 调命令
设备回包 → 更新显示
```

这样做不会乱。

---

### 第六步：做异常处理

蓝牙产品最容易出问题的不是正常连接，而是这些情况：

```text
设备扫不到
连接失败
连接后找不到 FFF0
FFF1 写入失败
notify 没打开
手机蓝牙关闭
小程序没有权限
设备突然断开
Android 某些机型写入太快失败
iOS 收包分包
数据包超过 20 字节
```

这些必须在第一版后期补上。

---

## 8. 关于 2.4G，你的软件端大概率不用直接处理

如果你说的 2.4G 是私有 2.4G，不是 Wi-Fi，那么手机小程序或 App 通常不能直接发私有 2.4G 射频。

更现实的路径是：

```text
手机小程序 / App
    ↓
BLE 写入命令
    ↓
AC632N / 网关 / 主控
    ↓
2.4G
    ↓
目标设备
```

所以对你的小程序来说，核心还是：

```text
通过 BLE 把你们协议发出去
```

2.4G 的部分由硬件侧处理。

---

## 9. 你找开发人员时，不要说“我要做前后端”

你这个项目重点不是传统前后端。你应该找这种人：

```text
微信小程序 BLE 开发
或
uni-app BLE 开发
或
Capacitor / Android / iOS BLE 开发

同时要懂：
二进制协议
HEX
CRC
BLE notify
BLE write
分包粘包
硬件调试
```

验收标准不要写“页面做好就行”，要写成：

```text
1. 能扫描到 AC632N_1
2. 能连接设备
3. 能列出 FFF0 / FFF1 / FFF2 / FFF3
4. 能向 FFF1 发送 HEX 命令
5. 能从正确 notify UUID 收到回包
6. 能解析你们单片机协议
7. 能处理断线重连
8. 能在 iPhone 和 Android 真机测试通过
9. 所有 UUID 做成配置，不写死在页面里
```

---

## 10. 我给你的当前路线建议

按照你现在的条件，我建议这样做：

```text
第一阶段：
Windows + 蓝牙助手 / Python Bleak
确认 FFF1 写入、哪个 UUID 接收

第二阶段：
做微信小程序 BLE 通信 Demo
只做扫描、连接、发送、接收

第三阶段：
把你们单片机协议封装成 JS 函数

第四阶段：
接入你已有 HTML UI 的页面逻辑

第五阶段：
做 Android 微信 + iPhone 微信真机兼容测试

第六阶段：
后期再考虑独立 App、云端、OTA、账号系统
```

你现在最重要的下一步不是问供应商要 IC 文档，而是把这三个结果测出来：

```text
写入 UUID：是不是 FFF1
接收 UUID：FFF1 / FFF2 / FFF3 哪一个
写入方式：write 还是 writeWithoutResponse
```

只要这三个确认，再加上你已有的单片机协议，第一版小程序就可以开始落地。

[1]: https://doc.zh-jieli.com/AC63/zh-cn/release_v2.3.0/module_demo/spple/spp_le.html "4.3.1. SPP+BLE — JL Project Documentation"
[2]: https://www.bluetooth.com/specifications/assigned-numbers/ "Assigned Numbers | Bluetooth® Technology Website"
[3]: https://bbs.huaweicloud.com/blogs/385472?utm_source=chatgpt.com "微信小程序使用蓝牙通信协议连接硬件整理总结（初始化蓝牙"
[4]: https://developer.android.com/studio/install "Install Android Studio  |  Android Developers"
[5]: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/ "Upload builds - Manage builds - App Store Connect - Help - Apple Developer"
[6]: https://github.com/capacitor-community/bluetooth-le "GitHub - capacitor-community/bluetooth-le: Capacitor plugin for Bluetooth Low Energy · GitHub"
[7]: https://bleak.readthedocs.io/ "bleak — bleak 3.0.1 documentation"
[8]: https://developer.apple.com/documentation/corebluetooth/cbpeer/identifier?utm_source=chatgpt.com "identifier | Apple Developer Documentation"


Q:
微信小程序已经有供应商做好了，接下来我想做安卓的，调试可以用Windows的串口直接连他的IC，这个我们已经跑通了，iOS如果必须需要mac的话，就先别做，我们做好安卓后，让别人用AI迁移一下，我是有iPhone的但是没有Mac，我也有安卓的机器。我用第三方的调试助手，已经跑通发送和接收了。UI的话，我可能迭代，但是我可以将我小程序的UI截图给你，同时他的小程序的UI是基于我的html进行创建的。写入 UUID FFF1 接收 FFF3。写入方式不知道

A:
这就很清楚了。**你现在完全可以先只做安卓，而且用 Windows 就能推进。**

你目前已经有了最关键的几项：

* 小程序已经跑通，说明业务逻辑和交互方向是对的
* 第三方蓝牙助手已经跑通发送和接收，说明 BLE 通道是通的
* 你已经确认：

  * 写入 UUID：`FFF1`
  * 接收 UUID：`FFF3`
* 你有 iPhone 和安卓真机，后面至少能做联调验证
* 你有 HTML UI，后面可以复刻界面，不是从 0 开始

所以现在的目标，不是“研究供应商 IC”，而是把它当成一个**黑盒 BLE 设备**接起来。

---

# 我先给你一个明确建议

## 最适合你的路线

**先做安卓 App，技术上优先选：Capacitor + 你的 HTML/CSS/JS + Android 原生 BLE 通信层。**

原因很简单：

* 你已经有 HTML UI
* 你现在只有 Windows
* 你先只做安卓
* 以后真要补 iOS，这套前端和协议逻辑还能继续用
* 真正和蓝牙打交道的部分，可以单独放到 Android 原生层，不影响 UI

也就是说，你不用在两个极端里选：

* 不是纯原生 Kotlin 全重写 UI
* 也不是纯 Web 硬怼 BLE

而是走中间路线：

```text
HTML UI
↓
JS/TS 业务逻辑
↓
Android 原生 BLE 模块
↓
FFF1 写入 / FFF3 通知
↓
供应商 IC
```

---

# 先提醒你一件很重要的事

## 不要把“安卓做好后让 AI 迁移 iOS”当成交付方案

这个思路可以当辅助，但不能当计划。

更准确地说应该是：

* **现在把 UI、协议层、状态管理写成可迁移的**
* 后面真做 iOS 时，再补：

  * Mac 打包
  * iPhone 真机调试
  * iOS BLE 适配
  * 上架签名

也就是说，**现在先把“可迁移性”设计好**，而不是指望后面一键改出来。

---

# 你现在应该怎么做

我建议你按下面这条线推进。

---

## 第 1 步：把设备配置先固定下来

先建立一个设备 profile，哪怕先写死也行。

先按你现在已知信息整理成这样：

```js
const DEVICE_PROFILE = {
  namePrefix: "AC632N",
  serviceUUID: "0000FFF0-0000-1000-8000-00805F9B34FB", // 先按你截图里的判断
  writeUUID: "0000FFF1-0000-1000-8000-00805F9B34FB",
  notifyUUID: "0000FFF3-0000-1000-8000-00805F9B34FB",
  writeType: "待确认",
  mtu: 20
}
```

这里最重要的是这 4 个字段：

* `serviceUUID`
* `writeUUID`
* `notifyUUID`
* `writeType`

你现在其实已经确认了 3 个，剩下就一个写入方式。

---

## 第 2 步：先确认写入方式

你说现在还不知道写入方式，这一步要尽快补上。

### 最简单的判断方式

安卓连接后，发现特征值时，读取 `FFF1` 的属性。

重点看它是否具备这些能力：

* `WRITE`
* `WRITE_NO_RESPONSE`

### 你的开发逻辑可以这样定

#### 情况 1：只有 `WRITE`

那就用**有响应写入**

#### 情况 2：只有 `WRITE_NO_RESPONSE`

那就用**无响应写入**

#### 情况 3：两个都有

第一版建议先用**有响应写入**，更稳，方便排错。
如果后面发现发送频率高、性能不够，再切到无响应。

### 实战上怎么判断是否正确

拿一条你已经跑通的命令，比如：

* 读取状态
* 读取版本
* 开关控制

分别测试：

1. 用 `WRITE`
2. 用 `WRITE_NO_RESPONSE`

比较这几个结果：

* 是否发送成功
* 设备是否稳定回包
* 是否有延迟或丢包
* 连续发送时是否异常

你现在已经用第三方助手跑通过，所以这个验证不会很难。

---

# 第 3 步：不要一上来做完整 App，先做“安卓 BLE 调试版”

这是最关键的一步。

第一版安卓 App 只做下面几个功能：

### 页面 1：扫描页

* 扫描 BLE 设备
* 过滤出 `AC632N` 或匹配设备
* 点击连接

### 页面 2：调试页

* 显示连接状态
* 显示服务 UUID
* 显示特征 UUID
* 显示当前写入 UUID：`FFF1`
* 显示当前接收 UUID：`FFF3`
* 输入 HEX 命令
* 点击发送
* 显示收到的原始 HEX
* 保存日志

### 页面 3：控制页

* 先只放 2 到 4 个按钮
* 例如：

  * 读取状态
  * 开机
  * 关机
  * 某个参数控制

这一版先不要追求好看，先追求：

```text
连得上
发得出
收得到
能复现第三方助手的效果
```

---

# 第 4 步：把协议单独封装，别让 UI 直接发 HEX

这一点非常重要。

你后面 UI 会迭代，IC 可能也会变。如果 UI 直接写十六进制，后期一定会乱。

应该拆成这样：

```text
UI
↓
DeviceController
↓
ProtocolEncoder / ProtocolParser
↓
BleManager
↓
Android BLE
```

## 举个例子

UI 层只写：

```js
device.readStatus()
device.powerOn()
device.powerOff()
device.setMode(2)
```

协议层负责：

```js
buildReadStatusCommand()
buildPowerOnCommand()
parseResponse(hex)
```

这样后期你换 UI，不动协议。
你换供应商 IC，只要 UUID 和协议没大改，UI 也不用重写。

---

# 第 5 步：UI 复刻时，不要完全照搬小程序结构

你有 HTML，这很好，但安卓 App 的页面组织最好按功能拆。

我建议安卓 App 至少有这几个页面：

## 1. 设备列表页

* 扫描
* 连接
* 显示设备名、RSSI、状态

## 2. 主控制页

* 放你真正给用户看的界面
* 根据你的小程序 UI 复刻

## 3. 设置页

* 蓝牙状态
* 当前连接设备
* UUID 信息
* 固件信息
* 调试开关

## 4. 隐藏调试页

* 发送原始 HEX
* 查看原始回包
* 导出日志

这个“隐藏调试页”非常值钱。以后出问题时，不用重新装第三方助手排查。

---

# 第 6 步：安卓工程怎么分目录

你哪怕不自己写代码，也可以按这个结构要求开发人员。

```text
app/
  ui/
    scan/
    control/
    settings/
    debug/

  ble/
    BleManager
    BleScanner
    BleConnection
    BleNotification

  protocol/
    CommandBuilder
    ResponseParser
    CrcUtil
    FrameCodec

  device/
    DeviceProfile
    DeviceController
    DeviceState

  data/
    LogRepository
    SettingsRepository
```

这样以后维护时很清楚：

* `ble` 只管蓝牙
* `protocol` 只管协议
* `ui` 只管界面
* `device` 只管业务控制

---

# 第 7 步：你现在最该盯的不是“页面完成度”，而是这些验收点

你找人做的时候，别只说“做个安卓 App”。

你应该直接给对方这套验收标准：

## 蓝牙通信验收

1. 能扫描到目标设备
2. 能连接成功
3. 能发现 `FFF0 / FFF1 / FFF3`
4. 能启用 `FFF3` 通知
5. 能向 `FFF1` 写入命令
6. 能收到设备回包
7. 能稳定连续发送和接收
8. 断开后能重连

## 协议验收

1. 能发送你指定的控制命令
2. 能正确解析回包
3. 支持 CRC 或校验
4. 支持分包/粘包处理
5. 错误数据不会导致界面卡死

## UI 验收

1. 主控制页和你的小程序风格一致
2. 状态能实时刷新
3. 操作结果有反馈
4. 有隐藏调试入口

## 工程验收

1. UUID 配置不能写死在页面里
2. 协议层单独封装
3. 日志可查看
4. 后期可增加其他 IC profile

---

# 第 8 步：后期适配不同 IC，要从现在就留口子

你前面已经说了，供应商不会给太多底层资料。这很正常。

所以后期适配思路不要依赖“知道芯片内部”，而要依赖“设备特征”。

做法是：

```js
const profiles = [
  {
    name: "ac632n",
    namePrefix: "AC632N",
    serviceUUID: "...FFF0...",
    writeUUID: "...FFF1...",
    notifyUUID: "...FFF3...",
    protocol: "default"
  },
  {
    name: "future_chip_a",
    namePrefix: "XXX",
    serviceUUID: "...",
    writeUUID: "...",
    notifyUUID: "...",
    protocol: "default"
  }
]
```

扫描到设备后自动匹配 profile。

这样以后换供应商，或者同供应商换模组，你只需要：

* 新增一个 profile
* 或微调协议层

不用把整个 App 推倒重来。

---

# 第 9 步：2.4G 在安卓 App 里先不要管

你这个阶段，手机端就把它理解成：

```text
手机通过 BLE 发命令给 IC
IC 或主控再去处理 2.4G
```

也就是说，安卓 App 当前只需要关心：

* 连接 BLE
* 发协议
* 收回包
* 更新 UI

2.4G 那部分不是你这一版的重点。

---

# 第 10 步：你现在可以怎么排期

按你现在的信息，我建议这样排。

## 第一阶段：3 到 5 天

目标：打通安卓 BLE 调试版

结果应该包括：

* 扫描设备
* 连接设备
* 确认服务和特征值
* `FFF1` 写
* `FFF3` 收
* 确认 write type
* 可以收发日志

## 第二阶段：3 到 7 天

目标：协议层封装

结果应该包括：

* 把常用命令封装成函数
* 解析回包
* 做 CRC
* 做异常处理
* 做日志缓存

## 第三阶段：5 到 10 天

目标：接 UI

结果应该包括：

* 根据你的小程序或 HTML 复刻主界面
* 让按钮、滑块、状态显示都接上真实设备
* 完成主要流程联调

## 第四阶段：3 到 5 天

目标：稳定性和发布

结果应该包括：

* 断线重连
* 蓝牙权限处理
* 后台恢复
* 多机型测试
* 生成安装包

---

# 你现在最适合做的两件事

## 第一件

把你们现在已经跑通的那几条命令整理出来，做成表：

```text
命令名称 | 发送 HEX | 预期回包 HEX | 说明
```

至少先整理 5 条：

* 读取状态
* 读取版本
* 开机
* 关机
* 一个参数设置

## 第二件

把你的小程序 UI 截图和你现有的 HTML 发来。

我下一步可以直接帮你整理出这三样东西：

1. **安卓 App 页面结构图**
2. **开发任务清单**
3. **通信层 + 协议层 + UI 层的项目骨架**

你现在这项目已经不再是“能不能做”的阶段了，而是“按什么顺序做最省事”的阶段。
按你现在的条件，先做安卓，是对的。
