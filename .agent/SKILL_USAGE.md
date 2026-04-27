# Skill Usage For This Project

本文件说明当前项目中已安装 skill 的推荐使用边界。若与 `AGENTS.md` 或 `.codex/skills/plan-first-development/SKILL.md` 冲突，以项目规则和 plan-first 流程为准。

## Priority Rules

1. `plan-first-development` 永远优先：涉及修改、实现、优化、协议、UI、构建、发布或文档结构调整，先写 plan 和 TODO，等确认再改。
2. `kb-retriever` 用于查本地知识：协议、Excel 转出的 Markdown、`.agent`、`docs`、`项目文件`。
3. `systematic-debugging` 用于 bug、异常、测试失败和真机问题定位。
4. `test-driven-development` 用于新增协议解析、业务逻辑或可测试行为。
5. `verification-before-completion` 用于声明完成、提交或交付前验证。

## UI And Assets

- `web-design-engineer`：用于 `T-011` UI 收敛、视觉方案、页面结构、移动端交互。
- `frontend-design` / `frontend-skill`：可辅助前端实现，但不得覆盖本项目现有设计约束。
- `gpt-image-2`：图片生成/编辑提示词工作流首选；不覆盖系统 `.system/imagegen`，宿主出图能力仍由系统工具提供。

## Review And Release

- `requesting-code-review`：大改、跨模块改动或准备合并前使用。
- `receiving-code-review`：处理 PR review 或外部审查意见时使用。
- `security-best-practices`：发布前、安全检查、权限/调试入口/敏感数据检查时使用。

## Do Not Use As Shortcut

- skill 不能跳过 plan-first。
- skill 不能越过 `.agent/OWNERSHIP.md` 的写入边界。
- UI skill 不能直接修改 BLE 或协议层。
- 知识检索 skill 不能替代真机测试结论。
