# matt-skills

面向所有者本人的 Agent 代理开发工作流。仓库中的 Skills、文档和规则服务于个人工作；`template/` 与 CLI 是把这套能力部署到其他仓库的机制，外部复用只是副产品。

## 个人工作流

```text
需求对齐 → Spec → 用户确认的 executable tickets → 行为变更默认 TDD → code-review → 验收
```

简单任务、机械修改和明确不改变行为的文档修改可直接做最小修改。

- `PROJECT.md`：定位、范围、主链和文档职责。
- `AGENTS.md`：读取顺序、任务路由和不可绕过边界。
- `CONTEXT.md`：稳定领域词汇与边界，不承载实现细节。
- Spec：记录已对齐的需求、方案、决策和范围。
- ADR：记录需要长期保留的不可逆或反直觉决策及权衡。
- Tracker：承载用户确认后的 executable tickets、阻塞关系和状态。
- Skills：执行工作程序；上游 Skills 保持原义，wrapper 只做组合与路由。
- `commit-check`：显式提交前检查器，输出 `ready to stage` 或阻塞项；不 stage、commit，也不重跑验证。

## 部署机制

`Workspace` 是个人工作流的事实源。`template/` 是由 Workspace 生成的部署快照，CLI 将选定的共享 Skills 和项目骨架组装到目标仓库；模板和 CLI 不反过来定义个人工作流。

```text
template/
├── AGENTS.md
├── PROJECT.md
├── .opencode/
└── .pi/
```

共享 Skills 位于 Workspace 的 `.agents/skills/`。`init`、`install` 和 `sync` 将可分发 Skills 部署到目标仓库；repo-local Skills 只服务本仓库维护，不对外分发。

## CLI

环境要求：Node.js `>=18`、npm 和 Git。

```sh
npx @heihei0299/matt-skills list [--all] [--json]
npx @heihei0299/matt-skills install [--all] [--tools <list>] [--global] [--dest <dir>]
npx @heihei0299/matt-skills init [--all] [--dest <dir>]
npx @heihei0299/matt-skills sync [--all] [--dry-run] [--refresh-agents] [--dest <dir>]
npx @heihei0299/matt-skills check [--all] [--json] [--upstream <url>] [--ref <ref>]
```

非独有 Skills 来自 `mattpocock/skills`；同步用于维护 Workspace 的上游副本，不改变上游 Skill 的原义。`commit-check` 是本仓库可分发的 proprietary Skill；`ci-guard` 是 repo-local Skill，不会分发到目标项目。

## 开发与发布

模板由 `scripts/build-template.js` 生成；发布通过版本 tag 触发。实现本仓库维护改动时，遵循根目录 `AGENTS.md` 的个人工作流和验证边界。

MIT
