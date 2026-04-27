# T-002 MVP Command Retest Template

用途：正式验收时补齐 5 条 MVP 命令各 10 次逐条记录。当前 2026-04-27 只记录了可行性通过，暂不填写本表。

## Test Metadata

| Field | Value |
| --- | --- |
| 测试日期 |  |
| 测试人员 |  |
| App commit |  |
| 手机型号 | vivo X300 Pro / V2502A |
| Android 版本 | 16 |
| BLE 设备 | AC632N / 实测设备名待填 |
| 写入方式 | write |
| 备注 |  |

## Commands

| Command | Payload HEX | Expected |
| --- | --- | --- |
| 开/关 | `FF CE 06 00 0A 00 00 30 0D` | 写入成功；是否有 notify 待记录。 |
| 增加亮度 | `FF CE 06 00 0B 00 00 30 0E` | 写入成功；是否有 notify 待记录。 |
| 降低亮度 | `FF CE 06 00 0C 00 00 30 0F` | 写入成功；是否有 notify 待记录。 |
| 读参数 | `FF CE 06 00 0D 00 00 30 10` | 写入成功；如有 notify 记录原始回包。 |
| 读状态 | `FF CE 06 00 0E 00 00 30 11` | 写入成功；如有 `E1` notify 应更新可读状态。 |

## Samples

| # | Command | TX HEX | RX HEX | UI 是否更新 | 是否需要等待回包 | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |

## Result

- 普通命令是否出现假超时：待填写。
- 稳定 notify 的命令：待填写。
- 异常 notify 是否被拒绝更新状态：待填写。
