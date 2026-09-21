# CLI 模块化重构执行计划

## 目标

将 `bin/cli.js` 从多职责实现文件收缩为 CLI composition root，在不改变现有 CLI 行为、分发语义、模板边界和用户接口的前提下，提高 matt-skills 的可维护性。

基线：`3fd19853c7f746e8f55641d522a6366bbd1500c9`

## 不变量

本轮只做结构重构，不做功能重设计：

- `.agents/skills/` 继续作为 Workspace canonical skill source。
- `template/` 继续只是生成的 Target Repository skeleton，不建立 shared-skill mirror。
- 不修改 default / all 分发语义。
- 不修改 proprietary / distributable / repo-local 分类。
- 不修改 CLI 参数、输出格式或用户可观察行为。
- 不修改 `.agents/skills/` 内容。
- 不重构 `scripts/sync-upstream.js`。
- 不引入 TypeScript、CLI framework、DI 或 Clean Architecture。
- 不顺手重排整个 `test/`。

## 目标结构

```text
bin/
├── cli.js
├── commands/
│   ├── init.js
│   ├── sync.js
│   ├── install.js
│   ├── list.js
│   └── check.js
├── project/
│   ├── agents.js
│   ├── filesystem.js
│   ├── template.js
│   └── skills.js
└── skills/
    ├── config.js
    ├── boundaries.js
    ├── selection.js
    └── discovery.js
```

最终 `bin/cli.js` 只负责 argv 解析、help/version、command dispatch、顶层 error boundary、exit code。

---

## Issue 1 — 抽离 Project Primitives

### 修改

新增：

- `bin/project/agents.js`
- `bin/project/filesystem.js`

从 `bin/cli.js` 移出 AGENTS managed-block 与通用文件系统/安全路径逻辑，包括当前对应的：

- `AGENTS_MANAGED_START`
- `AGENTS_MANAGED_END`
- `findManagedBlock`
- `mergeManagedAgents`
- `syncManagedAgents`
- `pathExists`
- realpath / safe-path 相关 helper

### 约束

- 只移动职责，不改变算法。
- 不改变 managed block 格式。
- 不改变备份、force、dry-run、安全检查行为。
- command orchestration 暂时仍留在 `cli.js`。

### 验证

运行与 AGENTS/sync/path safety 直接相关的现有测试。

至少覆盖：

```bash
node --test test/cli-sync-default.test.js
node --test test/cli-sync-apply-safe.test.js
node --test test/cli-sync-force-hard.test.js
```

如实际测试文件名发生变化，以仓库中对应现有测试为准，不为了匹配本文档重命名测试。

### 完成条件

- `cli.js` 不再实现 AGENTS managed-block 算法。
- `cli.js` 不再实现通用 filesystem/path-safety primitive。
- 对应现有测试通过。
- code-review 一次。
- 一个交付 commit。

---

## Issue 2 — 收拢 Skill Domain

### 修改

形成：

```text
bin/skills/
├── config.js
├── boundaries.js
├── selection.js
└── discovery.js
```

迁移现有：

- `bin/skill-config.js` → `bin/skills/config.js`
- `bin/skill-boundaries.js` → `bin/skills/boundaries.js`
- `bin/skill-selection.js` → `bin/skills/selection.js`

从 `cli.js` 抽离 skill discovery / metadata 读取逻辑，例如：

- `parseFrontmatter`
- available skill discovery
- skill-name listing
- skill metadata/listing helpers

放入 `bin/skills/discovery.js`。

### 约束

保持以下边界：

```text
config/*.json     = policy facts
bin/skills/*.js   = skill policy / selection implementation
.agents/skills/   = canonical skill content
```

不得合并 Distribution Selection 与 Upstream Sync Scope。

### 验证

至少覆盖：

```bash
node --test test/skill-selection.test.js
node --test test/distribution-boundaries.test.js
node --test test/proprietary-boundaries.test.js
node --test test/default-distribution.test.js
```

### 完成条件

- skill policy/discovery 不再散落于 `cli.js`。
- selection 结果与重构前完全一致。
- proprietary classification invariant 保持。
- code-review 一次。
- 一个交付 commit。

---

## Issue 3 — 抽离 Project Distribution Mechanism

### 修改

新增/完善：

- `bin/project/template.js`
- `bin/project/skills.js`

将 target-project 相关 mechanism 从 `cli.js` 抽离，包括：

- template → target 同步
- canonical skills → target 分发
- project skill target resolution
- legacy skill directory cleanup/migration
- 与 project distribution 直接相关的 dry-run filesystem comparison

数据流保持：

```text
.agents/skills/
      │
      ▼
bin/project/skills.js
      │
      ▼
Target .agents/skills/
```

### 约束

禁止重新建立：

- `.pi/skills` shared mirror
- `.opencode/skills` shared mirror
- 其他持久 shared-skill mirror

`template/` 仍只承载 skeleton。

### 验证

至少覆盖：

```bash
node --test test/cli-init.test.js
node --test test/cli-sync-default.test.js
node --test test/cli-sync-apply-safe.test.js
node --test test/template-distribution-boundaries.test.js
```

并运行与 legacy cleanup / distribution target 直接相关的现有测试。

### 完成条件

- `cli.js` 不再直接实现 template/skill 文件分发。
- init/sync 结果与基线一致。
- skeleton-only 默认分发不被破坏。
- code-review 一次。
- 一个交付 commit。

---

## Issue 4 — Command Orchestration 模块化

### 修改

新增：

```text
bin/commands/
├── init.js
├── sync.js
├── install.js
├── list.js
└── check.js
```

每个 command 负责 use-case orchestration，不重新实现底层 mechanism。

目标依赖方向：

```text
CLI arguments
      ↓
bin/commands/*
      ↓
skills policy + project mechanism
      ↓
result
```

例如 sync command 应组合已有能力，而不是自己操作 managed block、skill discovery 和文件复制。

### 约束

- 不改变 command 参数。
- 不改变默认值。
- 不改变 stdout/stderr 文案。
- 不改变 exit code。
- 不改变 dry-run 语义。
- 不为了“统一”而制造抽象 command 基类。

### 验证

按 command 分别执行现有 CLI 测试，覆盖 init、sync、install、list、check。

### 完成条件

- 五个 command 的 orchestration 从 `cli.js` 移出。
- command 层没有复制 project/skills 层的实现。
- CLI observable behavior 保持。
- code-review 一次。
- 一个交付 commit。

---

## Issue 5 — 收缩 cli.js 并做最终回归

### 修改

将 `bin/cli.js` 收缩为 composition root：

```text
argv
 ↓
parse
 ↓
dispatch
 ├─ init
 ├─ sync
 ├─ install
 ├─ list
 └─ check
 ↓
output / exit
```

允许保留：

- argv parsing
- help/version
- command dispatch
- top-level error handling
- process exit semantics

不得继续保留：

- filesystem implementation
- skill discovery implementation
- AGENTS merge implementation
- template synchronization implementation
- skill distribution implementation

不设机械行数目标；以职责边界作为验收标准。

### 最终验证

在获得项目规则要求的验证授权后执行：

```bash
npm test
npm run build:template
git diff --exit-code template/
```

若本轮没有修改模板源，`build:template` 不应产生实质 template diff。

同时检查：

```bash
git diff
git status
```

确认没有无关文件进入改动。

### 完成条件

- `cli.js` 成为薄 composition root。
- 全量现有测试通过。
- template projection 保持稳定。
- 没有 CLI observable behavior 变化。
- 最终 code-review 一次。
- 一个交付 commit。

---

## 每个 Issue 的执行协议

严格按以下循环执行：

```text
确认当前行为与相关测试
        ↓
实施当前 Issue
        ↓
仅运行当前 Issue 所需的局部验证
        ↓
执行一次 code-review
        ↓
修复该 review 发现的问题
        ↓
检查 git diff / git status
        ↓
提交一个 commit
        ↓
进入下一 Issue
```

不要在一个 Issue 内重复启动全量 review；后续修改只处理该 Issue review 的增量反馈。

不要把多个 Issue 合并成一个大 commit。

## 停止条件

Issue 5 完成后停止架构拆分。

本轮不继续拆 `scripts/sync-upstream.js`、test hierarchy 或 config architecture。只有它们未来形成独立、可证明的维护热点时，再建立新的重构任务。
