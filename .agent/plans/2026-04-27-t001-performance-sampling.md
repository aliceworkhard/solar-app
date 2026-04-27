# Plan - T-001 BLE performance sampling

## Request

按 `.agent/tasks/active/T-001-performance-sampling.md` 执行 T-001，补齐 20 次 Android 真机 BLE 扫描/连接性能采样。

## Current Facts

- 当前项目 Android 优先，BLE 已能收发，UUID 为 `FFF0/FFF1/FFF2`，写入方式固定 `write`。
- `todo.md` 中 T-001 为 P0，验收要求记录扫描首包耗时、连接到 `ready` 耗时、fallback、失败原因，并计算 P50/P90。
- `.agent/VERIFICATION.md` 要求扫描 P50 <= 2s、P90 <= 2.5s；连接到 `ready` P50 <= 3s、P90 <= 3.8s。
- `项目文件/通信参数确认表.md` 已有 20 次采样模板，但当前还没有样本数据。
- 当前工作树已有用户或历史未提交改动，尤其包括协议 Excel、业务源码和 `项目文件/通信参数确认表.md`；本任务不得回滚或覆盖这些改动。
- 我当前无法直接操作 Android 真机和太阳能遥控器 BLE 设备，因此真实采样需要用户在本机/真机侧执行，或提供采样数据后由我整理计算。

## Proposed Scope

- 以 QA Agent 口径执行 T-001 的记录与汇总部分。
- 建立 T-001 采样记录报告，字段覆盖手机型号、Android 版本、设备名、扫描首包耗时、连接到 `ready` 耗时、fallback、失败原因和备注。
- 如果用户提供 20 次样本，计算扫描和连接耗时的 P50/P90，并同步写入 `项目文件/通信参数确认表.md` 或 `.agent/reports/`。
- 完成后更新 `todo.md`、新增 session log，并按任务包要求写 `.agent/handoffs/YYYY-MM-DD-BLE-T-001.md`。

## Out Of Scope

- 不修改协议命令实现。
- 不修改 UI 布局或交互。
- 不修改 Android 原生 BLE 插件。
- 不修改或覆盖 `底层协议/新遥控器数据下载与控制协议.xlsx`。
- 不声称完成真机验收，除非已有真实 20 次采样数据。

## Proposed Changes

| Area | File | Change |
| --- | --- | --- |
| Plan | `.agent/plans/2026-04-27-t001-performance-sampling.md` | 记录本方案和审批边界。 |
| TODO | `todo.md` | 标注 T-001 为 Proposed/等待审批，并保留 P0 与验收标准。 |
| Report | `.agent/reports/2026-04-27-t001-performance-sampling.md` | 审批后新增或更新采样报告与 P50/P90 汇总。 |
| Verification doc | `项目文件/通信参数确认表.md` | 审批后仅在有真实数据时补入 20 次采样结果和结论。 |
| Handoff | `.agent/handoffs/2026-04-27-BLE-T-001.md` | 完成或阻塞时写明下一位 agent 可接手信息。 |
| Log | `.agent/logs/YYYY-MM-DD-session-N.md` | 实施后记录目标、改动、验证和风险。 |

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-001 补齐 20 次真机性能采样 | P0 | Proposed | 记录 20 次扫描首包耗时、连接到 `ready` 耗时、fallback、失败原因，并计算 P50/P90；无真机数据时标记 Blocked，不伪造结果。 |

## Risks

- 当前环境不能直接采集 BLE 真机数据，T-001 可能只能推进到模板、报告和计算流程准备状态。
- `项目文件/通信参数确认表.md` 已在工作树中有未提交改动，实施时必须基于现有内容追加，不覆盖原有修改。
- 样本如果来自不同手机或不同设备，会影响 P50/P90 结论，采样必须使用同一台 Android 真机和同一 BLE 设备。

## Verification

- 审批后先检查 `git -c core.quotepath=false status --short`，确认只触及批准范围。
- 如果收到 20 次真实样本，按数值计算扫描首包耗时和连接到 `ready` 耗时的 P50/P90。
- 核对 `.agent/VERIFICATION.md` 中性能验收线：扫描 P50/P90、连接 P50/P90。
- 文档类改动完成后复读相关文件，确认表格字段齐全、无乱码、无伪造样本。

## Rollback

- 如需回退，仅移除本次新增的 T-001 report/handoff/log，并撤销 `todo.md` 与 `项目文件/通信参数确认表.md` 中本次追加的小段内容。
- 不使用 `git reset --hard` 或 `git checkout --` 回滚用户改动。

## Approval Gate

等待用户明确确认后再写 `.agent/approvals/` 并实施。确认前不修改业务代码、协议、UI、Android 原生文件、构建配置或源协议文件。
