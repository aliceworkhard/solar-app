# Verification Guide

## Local Web / TypeScript

工作目录：

`项目文件/android-mvp-capacitor`

常用命令：

```powershell
npm.cmd test
npm.cmd run build
```

通过标准：

- Vitest 全部通过。
- TypeScript 编译通过。
- Vite build 成功。

## Android Debug Build

工作目录：

`项目文件/android-mvp-capacitor/android`

命令：

```powershell
.\gradlew.bat :app:assembleDebug
```

当前阻塞：

- 终端环境可能缺 `JAVA_HOME`。
- 如果阻塞，记录阻塞原因，不要声称 APK 已验证。

## BLE True Device Verification

必须记录：

- 手机型号
- Android 版本
- 设备名
- 扫描首包耗时
- 连接到 `ready` 耗时
- 是否 fallback 扫描
- 写入方式
- TX HEX
- RX HEX
- UI 是否更新
- 失败原因

## Performance Acceptance

- 扫描 20 次，目标设备首次出现时间 P50 <= 2s。
- 扫描 20 次，目标设备首次出现时间 P90 <= 2.5s。
- 连接 20 次，点击到 `ready` P50 <= 3s。
- 连接 20 次，点击到 `ready` P90 <= 3.8s。

## Command Acceptance

- 读取状态执行 10 次。
- 读取版本执行 10 次。
- 开机执行 10 次。
- 关机执行 10 次。
- 设置参数执行 10 次。
- 普通命令不等待 BLE 回包。
- 若 notify 到达，则可被动解析并更新 UI。

## Regression Checklist

- 蓝牙关闭后重试。
- 权限拒绝后重试。
- App 后台返回。
- 设备断电重启后重连。
- 连续 30 分钟发送/接收。
- 快连失败后回退扫描。
