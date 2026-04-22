# Skill 白名单（后续开发）

更新时间：2026-04-22

本白名单基于以下仓库筛选：
- `https://github.com/openai/skills`
- `https://github.com/anthropics/skills`
- `https://github.com/ZhanlinCui/Agent-Skills-Hunter`

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

## 说明

- `openai/skills` 的 `.system` 类技能已内置，不重复安装。
- 若某 skill 已存在同名目录，安装脚本会拒绝覆盖，需手动确认是否替换。
