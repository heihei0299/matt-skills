# CLI 模块化重构 Review 修复计划

Review 基线：`a639035d2f72c74abd2e76e94f23b7ee932d384a`

审查范围：从计划提交 `b715efc` 到当前分支 HEAD 的 5 个重构 commit。

## Review 结论

当前重构的主体方向正确：`cli.js` 已收缩为 composition root，command / project / skills 三层已经形成，原有 distribution / template / upstream-sync 语义没有在结构上被重新设计。

未发现需要回滚本轮架构的高严重度问题。

需要补两个小而明确的维护性修复，然后停止继续拆分。

---

## Finding 1 — 项目 skill 目录常量出现新的多点重复

严重度：Medium

当前同一个事实 `.agents/skills` 分散存在于：

- `bin/cli.js` 的 `PROJECT_SKILL_DIRS`
- `bin/commands/init.js` 的 `PROJECT_SKILL_DIRS`
- `bin/commands/sync.js` 的 `PROJECT_SKILL_DIRS`
- `bin/project/skills.js` 的 `PROJECT_DIRS`

这与本次重构希望形成的单一职责边界冲突。真正负责 project skill target 的模块已经是 `bin/project/skills.js`，因此其他模块不应再各自维护相同路径字面量。

### 修复

在 `bin/project/skills.js` 暴露一个 canonical workspace skill path，例如：

```js
export const PROJECT_SKILLS_DIR = '.agents/skills';

export const PROJECT_DIRS = {
  codex: PROJECT_SKILLS_DIR,
  pi: PROJECT_SKILLS_DIR,
  opencode: PROJECT_SKILLS_DIR,
  claude: PROJECT_SKILLS_DIR,
};
```

然后：

- `bin/cli.js`
- `bin/commands/init.js`
- `bin/commands/sync.js`

统一 import `PROJECT_SKILLS_DIR`，删除本地重复常量。

不要引入新的 config 文件，也不要为了一个字符串建立额外 abstraction layer。

### 验证

运行覆盖 help / init / sync / distribution 的现有测试。

重点确认：

- help 输出完全不变；
- init 输出完全不变；
- sync 输出完全不变；
- project target 仍为 `.agents/skills`。

### 完成条件

仓库运行时代码中 project canonical skill path 只有一个事实来源。

---

## Finding 2 — 新架构边界没有回归保护

严重度：Medium

本轮最大的交付价值不是文件移动本身，而是以下边界：

```text
cli.js
  ↓
commands/
  ↓
project/ + skills/
```

以及：

```text
.agents/skills = canonical content
template/      = skeleton only
```

现有测试对行为和 distribution boundary 的保护较强，但本轮没有新增针对 CLI 模块化边界的最小回归检查。未来修改很容易再次把 filesystem、template 或 skill discovery implementation 塞回 `cli.js`，而行为测试仍然全部通过。

### 修复

增加一个轻量静态 architecture regression test，例如：

`test/cli-architecture.test.js`

只保护稳定、明确的边界，不检查行数，不做脆弱的源码快照。

建议断言：

1. `bin/cli.js` 从五个 `bin/commands/*.js` 入口 dispatch。
2. `bin/cli.js` 不直接 import `node:fs/promises` 中除读取 package version 所需能力之外的 project mutation API。
3. `bin/cli.js` 不直接 import `bin/project/template.js`、`bin/project/agents.js`、`bin/project/filesystem.js`、`bin/skills/discovery.js`。
4. command 模块存在且 project / skills implementation 不再定义于 `cli.js`。

不要：

- 用 cli.js 最大行数作为测试；
- snapshot 整个文件；
- 限制内部函数名称；
- 建立复杂 dependency graph 工具；
- 顺手重排整个 test 目录。

测试目标只是防止 God Module 回归。

### 验证

```bash
node --test test/cli-architecture.test.js
```

随后按项目授权规则执行现有相关回归测试。

### 完成条件

未来有人重新把 project/skill implementation 塞回 `cli.js` 时，测试能够明确失败。

---

## 执行顺序

```text
Finding 1
  ↓
Finding 2
  ↓
相关回归
  ↓
code-review
  ↓
一个修复 commit
```

这两个 finding 属于同一个“完成 CLI 模块化边界”的修复单元，可以合并为一个 commit，不再拆成新的架构阶段。

## 明确不做

本轮 review 不要求：

- 再拆 `commands/*.js`
- 重构 argument parser
- 抽象 stdout/stderr
- 重构 `scripts/sync-upstream.js`
- 重排 `test/`
- 引入 TypeScript
- 引入 CLI framework
- 引入 dependency injection
- 修改 CLI 行为或文案
- 修改 distribution policy

修复完成并通过回归后，本轮 CLI 架构重构应结束，进入稳定维护。
