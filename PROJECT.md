# Personal Workflow

## 定位

本仓库是所有者本人使用的 Agent 代理开发工作流。`matt-skills`、模板和 CLI 是这套工作流的工作区与部署机制；外部仓库复用是副产品，不是本仓库的首要受众。

## 主链

```text
需求对齐 → 已接受 Spec 版本化到 `docs/specs/<slug>.md` → 用户确认的 executable tickets → 行为变更默认 TDD → code-review → 验收
```

简单任务、机械修改和明确不改变行为的文档修改可直接做最小修改，不强行进入完整主链。

`commit-check` 是显式的最终检查器：只输出 `ready to stage` 或阻塞项，不负责 stage、commit，也不重跑已经完成的验证。

## 文档与工作对象职责

| 对象 | 职责 |
|---|---|
| `PROJECT.md` | 本仓库定位、范围、主链和文档职责 |
| `AGENTS.md` | Agent 的读取顺序、路由和不可绕过边界 |
| `CONTEXT.md` | 个人工作流的稳定词汇与边界；只做 glossary |
| Spec | 需求对齐后的问题、方案、用户结果、决策和范围；接受后版本化到目标仓库 `docs/specs/<slug>.md` |
| ADR | 需要长期保留的不可逆或反直觉决策及权衡 |
| Tracker | 用户确认后可执行 tickets、阻塞关系和状态 |
| Skills | 可调用的工作程序；上游 skill 原义保持不变，wrapper 只负责组合与路由 |

## 范围边界

- 先解决需求和验收，再决定代码改动；不从实现细节反推未确认的需求。
- 上游 `to-spec` 原义保持不变；个人路由层负责立即持久化已接受的 Spec，之后发布的 tracker/ticket 引用该版本化文件。没有已接受 Spec 时不创建空的 `docs/specs` 目录。
- 行为变更默认使用 TDD；Review 由 `code-review` 负责，验收回到 Spec 和 tickets。
- 不因模板、CLI 或外部复用需要改变个人工作流的事实源。
- 不自动 stage 或 commit；提交由用户在 `commit-check` 输出 `ready to stage` 后决定。
