# Skill 白名单（后续开发）

更新时间：2026-04-27

本白名单基于以下仓库筛选：
- `https://github.com/openai/skills`
- `https://github.com/anthropics/skills`
- `https://github.com/ZhanlinCui/Agent-Skills-Hunter`
- `https://github.com/ConardLi/web-design-skill`

筛选原则：
- 优先支持你当前路线：`安卓优先 + BLE/协议调试 + HTML/Capacitor UI迭代`
- 优先能直接提升“开发效率、调试效率、验证质量”的技能
- 避免与当前已内置 `.system` 技能重复

## 安装白名单（按顺序）

| 顺序 | skill 名称 | 来源仓库 | 仓库路径 | 入选原因 | 安装状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | `frontend-skill` | `openai/skills` | `skills/.curated/frontend-skill` | 后续 UI 迭代与页面美化直接相关 | 已安装（2026-04-22） |
| 2 | `playwright` | `openai/skills` | `skills/.curated/playwright` | Web/Hybrid 页面自动化回归测试 | 已安装（2026-04-22） |
| 3 | `webapp-testing` | `anthropics/skills` | `skills/webapp-testing` | 本地 Web 应用联调、截图、日志、交互验证 | 已安装（2026-04-22） |
| 4 | `frontend-design` | `anthropics/skills` | `skills/frontend-design` | 构建更有辨识度的产品 UI 方案 | 已安装（2026-04-22） |
| 5 | `systematic-debugging` | `ZhanlinCui/Agent-Skills-Hunter` | `quality/systematic-debugging` | BLE/协议联调阶段可显著减少盲改 | 已安装（2026-04-22） |
| 6 | `verification-before-completion` | `ZhanlinCui/Agent-Skills-Hunter` | `quality/verification-before-completion` | 防止“未验证即完成”导致返工 | 已安装（2026-04-22） |
| 7 | `test-driven-development` | `ZhanlinCui/Agent-Skills-Hunter` | `quality/test-driven-development` | 协议解析与业务逻辑的稳定演进 | 已安装（2026-04-22） |
| 8 | `kb-retriever` | `ConardLi/garden-skills` | `skills/rag-skill` | 后续协议、Excel、docs、`.agent` 资料检索，便于新 agent 快速读项目知识库 | 已安装（2026-04-27） |
| 9 | `web-design-engineer` | `ConardLi/garden-skills` | `skills/web-design-engineer` | 后续 `01_ui_pages`、2 页 UI 收敛、视觉方案迭代 | 已安装（2026-04-27） |
| 10 | `gpt-image-2` | `ConardLi/garden-skills` | `skills/gpt-image-2` | 图片生成/编辑提示词工作流首选；配合宿主图像工具使用 | 已安装（2026-04-27） |
| 11 | `requesting-code-review` | `ZhanlinCui/Agent-Skills-Hunter` | `quality/requesting-code-review` | 多 agent 或大改完成后主动审查，减少集成返工 | 已安装（2026-04-27） |
| 12 | `receiving-code-review` | `ZhanlinCui/Agent-Skills-Hunter` | `quality/receiving-code-review` | 处理 PR review 或外部审查意见 | 已安装（2026-04-27） |
| 13 | `security-best-practices` | `openai/skills` | `skills/.curated/security-best-practices` | Android 权限、调试入口、发布前安全检查 | 已安装（2026-04-27） |

## 说明

- `openai/skills` 的 `.system` 类技能已内置，不重复安装。
- 若某 skill 已存在同名目录，安装脚本会拒绝覆盖，需手动确认是否替换。
- `gpt-image-2` 不覆盖系统内置 `.system/imagegen`；后者仍是 Codex 宿主出图工具入口，前者作为本项目图片生成/提示词工作流首选。
