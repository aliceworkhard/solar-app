# Plan - Skill 白名单二次筛选与安装

## Request

用户提供以下 skill 相关仓库，希望判断哪些适合当前项目后续开发，加入白名单并安装：

- `https://github.com/ConardLi/web-design-skill`
- `https://github.com/ZhanlinCui/Agent-Skills-Hunter`
- `https://github.com/anthropics/skills`
- 同时复查 `https://github.com/openai/skills` 中已有白名单 skill 是否有需要补充或更新的内容。

## Current Facts

- 当前项目主线是 Android BLE 太阳能遥控器 MVP，重点是 BLE 真机验证、协议固化、2 页业务 UI、后续多 agent 协作。
- 当前已安装全局 skill：
  - `frontend-design`
  - `frontend-skill`
  - `playwright`
  - `systematic-debugging`
  - `test-driven-development`
  - `verification-before-completion`
  - `webapp-testing`
- 当前白名单文件：
  - `项目文件/skill白名单/README.md`
  - `项目文件/skill白名单/安装日志.md`
- 项目已有本地流程 skill：
  - `.codex/skills/plan-first-development/SKILL.md`
- `ConardLi/web-design-skill` 当前实际内容来自 `ConardLi/garden-skills`，包含：
  - `skills/web-design-engineer`
  - `skills/rag-skill`，其 frontmatter 名称为 `kb-retriever`
  - `skills/gpt-image-2`
- `Agent-Skills-Hunter` 的 `quality/` 目录当前包含：
  - `systematic-debugging`
  - `test-driven-development`
  - `verification-before-completion`
  - `requesting-code-review`
  - `receiving-code-review`
- `Agent-Skills-Hunter` 的 `planning/` 目录包含计划类 skill，但本项目已有更贴合的 `plan-first-development`，不建议重复安装。
- `anthropics/skills` 中当前对白名单最相关的 `frontend-design`、`webapp-testing` 已安装；`docx`、`xlsx`、`pptx` 等能力已有当前 Codex 插件覆盖，不建议重复安装。
- `openai/skills` 当前 `.curated` 目录包含 `playwright`、`security-best-practices`、`security-threat-model`、`gh-*`、`yeet` 等；其中 GitHub 类能力已通过当前 Codex GitHub plugin 提供，不建议重复安装。
- 当前 Windows 环境没有可用 Python：
  - `python` 指向 Microsoft Store alias，不可直接运行。
  - `py` 不存在。
  - 因此 `skill-installer` 的 Python helper scripts 不能作为第一安装方式。

## Proposed Scope

本次建议加入白名单并安装的 skill：

| Priority | Skill | Source | Path | Reason |
| --- | --- | --- | --- | --- |
| P1 | `kb-retriever` | `ConardLi/garden-skills` | `skills/rag-skill` | 后续协议、Excel、docs、`.agent` 资料会越来越多，适合让下一个 agent 快速按知识库方式检索项目资料。 |
| P1 | `web-design-engineer` | `ConardLi/garden-skills` | `skills/web-design-engineer` | 后续 `01_ui_pages`、两页 UI 收敛、视觉方案迭代会用到；比当前通用 frontend skill 更强调设计决策和 v0 预览。 |
| P1 | `gpt-image-2` | `ConardLi/garden-skills` | `skills/gpt-image-2` | 用户确认要求替换当前图片工作流；实际执行为新增并设为图片生成/提示词工作流首选，不覆盖系统 `.system/imagegen`。 |
| P1 | `requesting-code-review` | `ZhanlinCui/Agent-Skills-Hunter` | `quality/requesting-code-review` | 多 agent 或大改完成后，用于主动请求审查，减少 BLE/协议/UI 集成返工。 |
| P2 | `receiving-code-review` | `ZhanlinCui/Agent-Skills-Hunter` | `quality/receiving-code-review` | 后续若有 PR review 或外部反馈，用于系统化处理审查意见。 |
| P2 | `security-best-practices` | `openai/skills` | `skills/.curated/security-best-practices` | Android 权限、BLE、调试入口、发布前安全检查会用到；当前不是 BLE 联调硬门槛，但进入交付前有价值。 |

本次不建议安装：

| Skill / Area | Reason |
| --- | --- |
| 覆盖或删除 `.system/imagegen` | 系统内置 `imagegen` 是宿主工具入口，不应覆盖或删除；`gpt-image-2` 只作为新增首选工作流安装。 |
| `Agent-Skills-Hunter/planning/*` | 本项目已有更贴合的 `plan-first-development` 与 `.agent` 流程，重复安装会造成规则冲突。 |
| `anthropics/frontend-design`、`anthropics/webapp-testing` | 已安装。 |
| `anthropics/docx/xlsx/pptx` | 当前 Codex 已启用 Documents / Spreadsheets / Presentations 插件，重复价值不高。 |
| `openai/gh-*`、`openai/yeet` | 当前 Codex 已启用 GitHub plugin，已有 `github:*` 技能。 |
| `openai/playwright-interactive` | 当前已有 `playwright`、`webapp-testing`、Browser Use plugin，先不叠加。 |
| `openai/frontend-skill` 更新替换 | 本地已安装；当前 OpenAI curated API 列表未确认到同名目录，不做覆盖或删除，避免破坏现有 UI 工作流。 |

## Proposed Changes

| Area | File / Location | Change |
| --- | --- | --- |
| Plan | `.agent/plans/2026-04-27-skill-whitelist-review.md` | 记录本次筛选、安装策略、风险和验收口径。 |
| TODO | `todo.md` | 新增 `T-013 Skill 白名单二次筛选与安装`，状态为 `Proposed`。 |
| Approval | `.agent/approvals/2026-04-27-skill-whitelist-review.md` | 用户确认后再写入审批记录。 |
| Whitelist | `项目文件/skill白名单/README.md` | 确认后新增推荐 skill，标注优先级、来源、路径、安装状态。 |
| Install log | `项目文件/skill白名单/安装日志.md` | 安装后追加每个 skill 的安装记录、结果、目标目录。 |
| Global skills | `C:\Users\SJGK8\.codex\skills\...` | 确认后安装新增 skill；不覆盖已有同名 skill。 |
| Session log | `.agent/logs/YYYY-MM-DD-session-N.md` | 安装完成后记录执行摘要与验证结果。 |

## Install Strategy After Approval

1. 先写 `.agent/approvals/2026-04-27-skill-whitelist-review.md`。
2. 因 Python 不可用，不优先使用 `skill-installer` 的 Python helper scripts。
3. 优先使用 `curl.exe` 下载 GitHub zip/tarball 或 raw 内容到临时目录。
4. 若下载失败，则用 `git clone --depth 1` 或 sparse checkout 重试。
5. 复制每个 skill 目录到 `C:\Users\SJGK8\.codex\skills\<skill-name>`：
   - `skills/rag-skill` 安装目标建议命名为 `kb-retriever`，与 frontmatter `name` 保持一致。
   - `skills/gpt-image-2` 安装为 `gpt-image-2`，不覆盖 `.system/imagegen`。
   - 其他目录按 skill 名称安装。
6. 每个目录必须包含 `SKILL.md`，并校验 frontmatter `name`。
7. 更新白名单与安装日志。
8. 提醒用户重启 Codex 以加载新 skill。

## TODO Updates

| Task | Priority | Status | Acceptance |
| --- | --- | --- | --- |
| T-013 Skill 白名单二次筛选与安装 | P1 | Approved | 白名单新增推荐 skill；全局 skill 目录安装完成；`SKILL.md` frontmatter 校验通过；安装日志记录完整；未覆盖已有 skill；告知需要重启 Codex。 |

## Risks

- GitHub 网络可能不稳定，`curl` 或 `git clone` 可能超时，需要重试或换安装方式。
- 新 skill 过多会增加下一次 agent 的选择噪声，因此本次只推荐 5 个，不做全量安装。
- `kb-retriever` 默认假设知识库目录为 `knowledge/`，本项目需要在使用时明确指定 `.agent/`、`docs/`、`项目文件/` 或协议目录，否则可能误判。
- `web-design-engineer` 规则较强，会要求先声明设计系统；实际 UI 修改仍必须服从本项目 `plan-first-development`。
- 安装后当前会话不一定立刻显示在 skills 列表中，通常需要重启 Codex。

## Verification

确认后执行：

- 检查 `C:\Users\SJGK8\.codex\skills\<skill>\SKILL.md` 是否存在。
- 读取每个新增 `SKILL.md` 的 frontmatter，确认 `name` 与白名单一致。
- 检查 `项目文件/skill白名单/README.md` 新增条目。
- 检查 `项目文件/skill白名单/安装日志.md` 新增记录。
- 不需要运行 `npm.cmd test` 或 `npm.cmd run build`，因为本次不改业务代码。

## Rollback

- 若安装失败：删除本次新建的对应 `C:\Users\SJGK8\.codex\skills\<skill>` 目录。
- 若白名单记录错误：回滚本次追加的白名单和安装日志行。
- 不动已安装旧 skill。

## Approval Gate

等待用户确认后再执行白名单修改与 skill 安装。
