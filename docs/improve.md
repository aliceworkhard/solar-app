你现在遇到的本质问题是：**日志和 TODO 同时承担了“当前上下文、历史记录、决策依据、任务管理、回溯索引”这些职责**，所以越写越大，AI 每次读起来就很吃力。

比较好的做法不是删除历史，而是把它们拆成几层：**当前层、摘要层、归档层、索引层**。

---

## 推荐结构：让 AI 默认只读“小文件”

可以把原来的两个大 MD 拆成下面这种结构：

```text
.agent/
  AI_CONTEXT.md              # 当前项目状态，AI 每次优先读
  TODO.md                    # 只放当前未完成/阻塞/待确认事项
  CHANGE_INDEX.md            # 历史变更索引，不写细节，只写摘要和链接

  logs/
    2026-04-26-session-01.md # 每次修改的详细日志
    2026-04-26-session-02.md

  archive/
    todo-2026-04.md          # 已完成/废弃/旧 TODO 归档
    milestone-M01.md         # 每轮大修改后的阶段总结
    milestone-M02.md

  decisions/
    ADR-001-auth-structure.md
    ADR-002-agent-memory-design.md
```

AI 每次工作时的读取顺序应该是：

```text
1. 读 .agent/AI_CONTEXT.md
2. 读 .agent/TODO.md
3. 如需了解历史，先读 .agent/CHANGE_INDEX.md
4. 只有在必要时，才定向读取某个 log、archive 或 decision 文件
```

这样 AI 不需要每次吞几千行历史，只需要读几十到几百行当前上下文。

---

## 1. TODO.md 只保留“当前仍然有行动价值”的内容

你的 TODO 文件不应该长期保留所有历史任务。它应该更像一个“当前作战面板”。

建议控制在 **50 到 150 行以内**。

示例：

```md
# TODO

> 本文件只保留当前需要处理的任务。
> 已完成、废弃、历史任务请移动到 archive/todo-YYYY-MM.md。
> 如果任务涉及历史背景，请通过 task id 或 milestone id 链接到 CHANGE_INDEX.md。

## Now

- [ ] T-104 修复 agent 在多轮编辑后重复读取旧 TODO 的问题
  - 优先级：高
  - 涉及文件：src/agent/context.ts, src/agent/planner.ts
  - 背景：见 CHANGE_INDEX.md#M06
  - 验收标准：
    - AI 启动时只读取 AI_CONTEXT.md 和 TODO.md
    - 历史日志只在需要时检索

- [ ] T-105 给日志系统增加自动归档规则
  - 优先级：中
  - 涉及文件：scripts/maintain-memory.ts

## Next

- [ ] T-106 增加 milestone summary 自动生成

## Blocked

- [ ] T-097 等待确认：是否废弃旧的 long-log.md 结构

## Recently Done

> 这里只保留最近 3 到 5 个完成项，更多放 archive。

- [x] T-101 拆分旧 TODO.md 为当前 TODO 和 archive
- [x] T-102 创建 CHANGE_INDEX.md
```

重点是：**已完成的任务不要长期留在 TODO.md**。
最多保留最近几个完成项，方便 AI 知道刚刚做过什么。

---

## 2. 旧 TODO 不删除，而是归档成“摘要”

旧 TODO 的价值不是每一条都要保留原样，而是要保留：

* 做过什么；
* 为什么做；
* 最终状态是什么；
* 涉及哪些文件；
* 是否有坑、未解决问题、后续风险。

例如归档文件：

```md
# TODO Archive - 2026-04

## T-087 重构 prompt loader

状态：完成  
完成时间：2026-04-18  
相关 milestone：M04  
相关日志：logs/2026-04-18-session-02.md  
涉及文件：

- src/prompt/loader.ts
- src/prompt/schema.ts
- tests/prompt-loader.test.ts

摘要：

本轮将 prompt loader 从硬编码字符串改为 schema-based 配置加载。
主要目的是减少 agent 初始化时的重复上下文。

保留注意事项：

- schema.ts 中的 defaultPrompt 不要再次内联到 loader.ts。
- 后续如果增加多 agent 类型，应优先扩展 schema，而不是复制 loader。
```

这样旧任务没有丢，但 AI 不需要每次看到完整原始列表。

---

## 3. 日志不要写成“大流水账”，而要写成“每次修改一篇短日志”

不要维护一个无限增长的 `log.md`。

建议每次大修改单独一个文件：

```text
logs/
  2026-04-26-session-01.md
  2026-04-26-session-02.md
  2026-04-27-session-01.md
```

每个日志文件只记录结构化信息：

```md
# 2026-04-26 Session 01

## Goal

优化 agent 项目的上下文记忆结构，避免 TODO 和 log 文件过大。

## Changed

- 新增 `.agent/AI_CONTEXT.md`
- 新增 `.agent/CHANGE_INDEX.md`
- 将旧 `TODO.md` 中已完成任务移动到 `archive/todo-2026-04.md`
- 修改 agent 启动规则：默认只读取 AI_CONTEXT.md 和 TODO.md

## Files touched

- .agent/AI_CONTEXT.md
- .agent/TODO.md
- .agent/CHANGE_INDEX.md
- .agent/archive/todo-2026-04.md

## Decisions

- TODO.md 不再保存长期历史。
- 详细日志按 session 分文件保存。
- 历史回溯先通过 CHANGE_INDEX.md，再定向打开具体日志。

## Follow-ups

- T-105 增加自动归档脚本
- T-106 增加 milestone summary 自动生成

## Risks / Notes

- 旧 TODO 中部分任务没有明确完成状态，归档时标记为 unknown。
```

这样日志可以无限增长，但 AI 不需要全部读。

---

## 4. 加一个 CHANGE_INDEX.md，当作历史入口

这是非常关键的一步。

不要让 AI 在几千行日志里找东西，而是给它一个索引。

示例：

```md
# Change Index

## M01 - 初始化 agent 项目结构

日期：2026-04-01  
摘要：创建基础 agent runner、prompt loader、tool calling 框架。  
相关日志：

- logs/2026-04-01-session-01.md
- logs/2026-04-01-session-02.md

关键文件：

- src/agent/runner.ts
- src/tools/index.ts

注意事项：

- runner.ts 是主入口，不要把 tool 逻辑写回 runner。

---

## M06 - 拆分 TODO 和日志记忆系统

日期：2026-04-26  
摘要：将原来的大 TODO.md 和 log.md 拆分为 current context、active TODO、change index、session logs、archive。  
相关日志：

- logs/2026-04-26-session-01.md

关键文件：

- .agent/AI_CONTEXT.md
- .agent/TODO.md
- .agent/CHANGE_INDEX.md

后续任务：

- T-105 自动归档脚本
- T-106 milestone summary 生成器
```

以后 AI 想查历史，不是读所有日志，而是：

```text
先读 CHANGE_INDEX.md
找到相关 milestone
再读对应日志
```

---

## 5. AI_CONTEXT.md 是最重要的文件

这个文件应该是 AI 每次开始工作时必读的“当前项目状态”。

它不记录流水账，只记录当前真实状态。

示例：

```md
# AI Context

## Project Purpose

这是一个 agent 项目，目标是让 AI 能够在多轮修改中稳定维护代码、任务和历史记录。

## Current Architecture

- `src/agent/runner.ts` 是 agent 主执行入口。
- `src/agent/planner.ts` 负责生成修改计划。
- `src/agent/context.ts` 负责读取上下文文件。
- `.agent/TODO.md` 只保存当前任务。
- `.agent/CHANGE_INDEX.md` 是历史索引。
- `.agent/logs/` 保存详细 session 日志。

## Current Rules

1. 启动时默认只读取：
   - `.agent/AI_CONTEXT.md`
   - `.agent/TODO.md`

2. 不要默认读取完整 logs。
3. 如果任务涉及历史原因，先查 `.agent/CHANGE_INDEX.md`。
4. 完成任务后：
   - 更新 TODO.md
   - 追加 session log
   - 必要时更新 AI_CONTEXT.md
   - 必要时更新 CHANGE_INDEX.md

## Important Decisions

- TODO.md 不是历史数据库。
- logs 是详细记录，但不是默认上下文。
- Git commit 是代码变化的最终来源，日志只记录语义摘要。

## Current Open Problems

- 旧 TODO 归档还没有自动化。
- 日志过长时还没有自动生成 milestone summary。
```

这个文件要保持短，建议 **不超过 200 行**，最好 50 到 100 行。

---

## 6. 用 Git 承担“精确历史”，MD 只承担“语义历史”

很多人会把日志写得特别长，是因为想记录所有更改细节。其实这部分应该交给 Git。

日志不应该复制代码 diff，也不应该详细描述每一行改动。

推荐：

```md
## Git

Commit: abc1234
Summary: split agent memory files into context, todo, logs, archive
```

或者：

```md
相关 commit：

- abc1234 拆分 agent 记忆结构
- bcd2345 增加 CHANGE_INDEX.md
- cde3456 迁移旧 TODO 到 archive
```

Git 负责：

* 哪些文件被改了；
* 哪些代码行变化了；
* 能不能回滚；
* 具体 diff。

MD 负责：

* 为什么改；
* 改完后当前状态是什么；
* 后续要注意什么；
* 哪些坑不要再踩。

这能大幅减少日志体积。

---

## 7. 对“大修改”使用 milestone summary

你提到大概会有 20 次大修改。那就不要让 AI 读 20 次完整日志，而是每次大修改结束后生成一个 milestone summary。

例如：

```md
# Milestone M06 - Memory File Refactor

日期：2026-04-26

## 背景

原来的 TODO.md 和 log.md 在多轮修改后变得过大，导致 AI 每次读取上下文困难。

## 本轮目标

将项目记忆拆成 current context、active TODO、change index、session logs、archive。

## 最终结果

- 新增 AI_CONTEXT.md
- TODO.md 缩减为当前任务列表
- 历史 TODO 移动到 archive
- 日志改为按 session 分文件
- CHANGE_INDEX.md 作为历史入口

## 关键决策

- AI 默认不读 logs 全文。
- TODO 中不长期保留 done 项。
- 旧任务不删除，只归档并摘要化。

## 后续风险

- 如果 AI_CONTEXT.md 不及时更新，可能产生错误上下文。
- 如果 CHANGE_INDEX.md 不维护，历史查找会变困难。

## 后续任务

- T-105 自动归档脚本
- T-106 自动生成 milestone summary
```

20 次大修改就对应 20 个 milestone summary。
AI 要理解历史时，读 20 个摘要就够了，而不是读几千行日志。

---

## 8. 给 AI 一条明确的维护规则

你可以在项目根目录放一个 `AGENTS.md` 或 `.agent/RULES.md`，明确告诉 AI 怎么处理这些文件。

示例：

```md
# Agent Memory Rules

每次开始任务时：

1. 先读 `.agent/AI_CONTEXT.md`
2. 再读 `.agent/TODO.md`
3. 除非任务需要历史背景，否则不要读取 `.agent/logs/` 下的完整日志
4. 如果需要历史背景，先读 `.agent/CHANGE_INDEX.md`
5. 根据 CHANGE_INDEX.md 定位到具体 milestone 或 session log

每次完成任务后：

1. 更新 `.agent/TODO.md`
   - 移除已完成任务
   - 新增后续任务
   - 保持 TODO.md 简短

2. 新增一份 `.agent/logs/YYYY-MM-DD-session-N.md`

3. 如有重要架构变化，更新 `.agent/AI_CONTEXT.md`

4. 如有阶段性变化，更新 `.agent/CHANGE_INDEX.md`

5. 已完成或废弃的旧 TODO 移动到 `.agent/archive/`
```

这条规则很重要。否则 AI 很容易又开始把所有东西堆回 TODO.md 或 log.md。

---

## 9. 区分哪些内容必须保留，哪些可以压缩

建议你按下面标准处理。

### 必须保留在当前上下文里的内容

这些应该进入 `AI_CONTEXT.md`：

```text
当前架构
当前文件职责
当前约定
不能违反的规则
尚未解决的关键问题
重要设计决策
```

### 必须保留在 TODO.md 里的内容

```text
当前正在做的任务
下一个要做的任务
阻塞项
需要用户确认的事项
最近几个完成项
```

### 应该归档的内容

```text
已经完成的 TODO
已经废弃的方案
旧的尝试过程
详细修改流水账
临时想法
过期的调试记录
```

### 应该进入 decisions/ 的内容

```text
为什么选择 A 而不是 B
某个架构方向的理由
会影响后续开发的长期约定
不可轻易推翻的设计原则
```

---

## 10. 可以加一个“定期压缩”流程

每次完成 3 到 5 次大修改后，让 AI 做一次记忆维护。

可以直接用这个 prompt：

```text
请对 .agent 目录做一次记忆维护：

1. 读取 AI_CONTEXT.md、TODO.md、CHANGE_INDEX.md。
2. 检查 TODO.md 是否过长。
3. 将已完成、废弃、过期的 TODO 移动到 archive/todo-YYYY-MM.md。
4. 为最近几次 session logs 生成一个 milestone summary。
5. 更新 CHANGE_INDEX.md。
6. 更新 AI_CONTEXT.md，使其反映当前真实项目状态。
7. 不要删除详细日志，只做归档、摘要和索引。
8. 最终保证：
   - AI_CONTEXT.md 不超过 200 行
   - TODO.md 不超过 150 行
   - CHANGE_INDEX.md 可以作为历史入口
```

这相当于给项目做“上下文清理”。

---

## 11. 最实用的最终方案

如果你不想搞太复杂，我建议至少保留这 5 个文件/目录：

```text
.agent/AI_CONTEXT.md
.agent/TODO.md
.agent/CHANGE_INDEX.md
.agent/logs/
.agent/archive/
```

它们的职责是：

| 文件                | 作用           | AI 是否默认读取 |
| ----------------- | ------------ | --------- |
| `AI_CONTEXT.md`   | 当前项目状态、架构、规则 | 是         |
| `TODO.md`         | 当前任务         | 是         |
| `CHANGE_INDEX.md` | 历史索引         | 需要历史时读取   |
| `logs/`           | 详细修改日志       | 只在必要时读取   |
| `archive/`        | 旧 TODO、阶段总结  | 只在必要时读取   |

这个结构能解决你的核心问题：

```text
不是删除历史，
而是让历史从“默认上下文”变成“可检索归档”。
```

---

## 我最推荐的工作流

每次 AI 完成一次修改后，只做这几件事：

```text
1. 更新 TODO.md
   - 当前任务完成则移除
   - 新任务加入 Now 或 Next
   - 旧任务归档

2. 新增一份短 session log
   - 改了什么
   - 为什么改
   - 涉及哪些文件
   - 后续还有什么

3. 如果项目状态变化，更新 AI_CONTEXT.md

4. 如果是大修改，更新 CHANGE_INDEX.md 或生成 milestone summary

5. 不把完整历史塞回 TODO.md
```

一句话总结：

**TODO.md 是当前战术面板，AI_CONTEXT.md 是当前世界观，CHANGE_INDEX.md 是历史目录，logs/archive 是冷存储。AI 默认只读前两个，需要时再通过索引查历史。**
