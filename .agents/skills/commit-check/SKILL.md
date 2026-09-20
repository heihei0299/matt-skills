---
name: commit-check
description: "显式调用的提交前检查器：审查任务范围、候选变更、敏感信息、证据和 commit message。"
disable-model-invocation: true
---

# Commit Check

用户显式调用 `/commit-check` 后运行本技能。它只检查和报告，不执行提交动作。

## 边界

- 不 stage、不 commit、不自动修复或清理工作区。
- 不运行 tests/build/typecheck，不做 code review。
- 不要求工作区干净；staged、unstaged 和 untracked 的无关改动必须被识别并排除。
- 不包含任何仓库专属路径、模板、CLI 或同步检查。

## 检查顺序

### 1. Task basis

确认当前任务依据，按优先级使用：

1. 当前 Ticket；
2. 当前 Spec；
3. 明确的用户请求。

没有任务依据，或依据不足以判断范围和验收标准时，报告 blocker，不继续假装检查通过。

### 2. Candidate commits

读取当前工作区状态和变更：

```bash
git branch --show-current
git status --short
git diff --cached --name-status
git diff --name-status
git ls-files --others --exclude-standard
```

根据 Task basis 将变更分为：

- **task-owned candidates**：属于当前任务、可被纳入候选 commit 的路径；
- **excluded changes**：任务外、无法归属或不应混入本次提交的路径。

候选必须覆盖 staged、unstaged 和 untracked 的当前状态。不得使用 `git add .`；输出逐路径 staging plan。

默认一个任务生成一个连贯的 candidate commit。只有存在独立回滚边界时才拆分，并为每组列出文件、分组理由和建议 message。候选为空、范围不清或包含任务外文件时阻塞。

### 3. Validation evidence

只验证现有证据，不主动重跑 tests、build 或 typecheck。接受：

- 当前 session 中与候选变更对应的真实命令结果；
- handoff 中可追溯的验证记录。

证据必须覆盖 Spec/Ticket 或用户请求的验收标准，并关联当前候选快照。证据产生后只要 staged、unstaged 或 untracked diff 发生变化，就视为失效；缺失或失效时阻塞。

### 4. Review evidence

只检查现有 review 证据，不做 code review。必须能确认候选变更已经完成所需的独立审查；存在未解决的 blocker 或无法确认审查范围时阻塞。

### 5. Sensitive-data scan

只扫描 task-owned candidates，先将候选路径逐行传给确定性脚本：

```bash
printf '%s\n' <candidate-paths> | bash .agents/skills/commit-check/scripts/scan-sensitive.sh --files-from=-
```

以下情况必须作为 blocker：

- 候选路径的文件名是 `.env` 或 `.env.*`；
- 高置信的 secret、token、private-key material，包括结构化凭据赋值、private-key block 和长 Bearer token。

普通 prose 中单独出现 `secret` 或 `token` 不自动告警。复合凭据标识符等可疑关键词若无法直接判定，脚本返回 unresolved warning；必须明确检查并判定为 false positive 后才能输出 `ready to stage`，否则同时列入 Warnings 和 Blockers。脚本不打印匹配内容。

### 6. Protected branch, acceptance, and message

- 在 `main`、`master`、`develop` 或 `trunk` 上默认阻塞；只有用户明确授权在受保护分支操作时例外。
- 验收标准必须已完成；需要本人主观验收时，未确认前保持 blocked。
- 每个 proposed message 必须匹配 `^(feat|fix|docs|chore|refactor|test)(\([^)]+\))?: .+`，即 `<type>(<scope>): <subject>`；scope 可省略。
- subject 描述结果；body 只在需要解释动机、风险或验收证据时添加。
- proposed message 不符合格式必须作为 blocker；空 diff、生成物或意外大文件也必须阻塞。

## 固定输出

严格按以下 sections 输出：

```text
Task basis
Candidate commits
  - files
  - proposed message
  - reason for grouping
Excluded changes
Validation evidence
Review evidence
Sensitive-data scan
Warnings
Blockers
Result: ready to stage | blocked
```

`ready to stage` 只表示检查通过并给出 staging plan；它不表示已经 stage 或 commit。
