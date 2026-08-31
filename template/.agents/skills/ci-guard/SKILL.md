---
name: ci-guard
description: "Guard the GitHub Actions release pipeline: orchestrate workflow flow, enforce pre-release verification, and self-correct after publish. Use when CI is flaky/failing, when setting up or editing .github/workflows/ci.yml, or before tagging a release to npm."
---

# CI Guard

**guard** 为领衔词的发布门禁技能：以一次**可复现的失败**为起点，把 `verify → build → publish` 编排成不可绕过的门，把**预发布校验**做成硬门槛，把**发布后自纠**做成闭环。本技能沉淀自 `heihei0299/pi-switch` 23 次运行中 14 次失败的复盘（见 `.scratch/research/ci-actions-调研.md`）——不替代 `diagnose-fix` 的通用诊断，只收敛 CI/发布这一条链。

## 何时用

- Actions 持续红 / 偶发红（尤其是 `verify` 单点红而 `publish` 仍绿）
- 新建或改动 `.github/workflows/ci.yml`、调整 `cargo test` / `clippy` / `rustfmt` 参数
- 打 tag 前、发 npm 前、或发布后需要自检/回滚

## 三段式门禁

```
① 编排 flows → ② 预发布 gate → ③ 发布后自纠
```

每段有**完成条件**（可验证），未满足不进入下一段。

---

### ① 编排 flows —— 让工作流不可被绕过

**做**：
- `on`：`push.tags: ["v*"]` **必须**同时配 `push.branches: [main]`（或 `master`）+ `pull_request.branches: [main]` + `workflow_dispatch`。否则直推 `main` 的修复（如 `2d68f62`）无法被 CI 验证，tag 才暴露问题
- `jobs` 依赖：`publish.needs: [build, verify]`，**禁止** `needs: build` 单依赖。门禁失效的直接原因就是 `verify` 红仍发包
- `permissions` 最小化：`verify`/`build` 只需 `contents: read`，仅 `publish` 保留 `contents: write` + `packages: write`（或 `id-token: write` 若用 OIDC）
- `concurrency`：`group: ci-${{ github.ref }}` + `cancel-in-progress: true`，避免同分支并行互踩

**完成条件**：
- [ ] `git diff HEAD -- .github/workflows/ci.yml` 显示 `on.push.branches` 存在
- [ ] `publish.needs` 包含 `verify`
- [ ] `workflow_dispatch` 可手动触发全量

---

### ② 预发布 gate —— 测试 GitHub Action 流程

本段是**硬门槛**，顺序固定：`action lint → workflow dry-run → dispatch 验证`，任一步红即阻断 `publish`。

**action lint**：
- `actionlint` 校验 `.github/workflows/ci.yml` 语法与 `on/needs/permissions` 完整性
- `yamllint` 检查缩进与重复键

**workflow dry-run**：
- `act --dry-run` 或 `gh workflow view` 模拟 `verify/build/publish` 三 job 依赖与 `if` 条件
- 校验 `publish.needs` 含 `verify` 且 `workflow_dispatch` 可手动触发

**dispatch 验证**：
- 通过 `gh workflow run ci.yml --ref main -f dry_run=true` 触发试运行，观察 `verify` 日志与产物上传
- 失败即阻断 `publish`，日志留存于 Actions

**完成条件**：
- [ ] `actionlint` 0 error
- [ ] `act --dry-run` 三 job 依赖正确
- [ ] `workflow_dispatch` 试运行通过

---

### ③ 发布后自纠 —— 发出去的包自己负责

**发布时**：
- `npm publish --access public` 仅在 `if: startsWith(github.ref, 'refs/tags/v')` 且 `needs` 全绿时执行
- 发布前 `actions/download-artifact` 校验 `if-no-files-found: error`，发布后 `npm view <pkg>@<version> version` 回读确认

**自纠**：
- 失败即 **阻断**：`verify` 红 → `publish` 不执行（由 `needs` 保证）；`publish` 自身失败（`409 already exists` / `401`）→ 工作流整体 `failure`，不静默
- 发布后 30s 内 `curl https://registry.npmjs.org/<pkg>/<version>` 校验可用；失败则 `gh issue create --title "chore(release): vX.Y.Z 发布后自检失败" --body "run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"` 并 `gh release delete vX.Y.Z --yes`（或 `npm unpublish <pkg>@<version>` 在 72h 内）
- `workflow_dispatch` 支持 `inputs.rollback_version` 手动回滚

**完成条件**：
- [ ] `npm view` 回读与 tag 一致
- [ ] 失败路径有 issue/通知（非静默）
- [ ] `git tag` 与 `package.json version` 一致（`scripts/release.sh` 或 `npm version` 保证）

---

## 反模式

- **单依赖 publish**：`needs: build` 是本仓 7 次带病发布的根因
- **仅 tag 触发**：`push.branches` 缺失导致主干修复无 CI
- **静默发布**：`publish` 失败不建 issue / 不删 tag，下次 `409` 叠加
- **`-A clippy::all`**：掩盖真实告警

## 引用

- 调研：`.scratch/research/ci-actions-调研.md`（23 次运行全量、`proxy.rs:115` vs `config.rs:460` 对比）
- 修复：`2d68f62 fix(ci): gate publish on verify and serialize Rust tests`
- 关联技能：`diagnose-fix`（通用诊断）、`commit-check`（提交前门禁）、`tdd`（测试隔离后的回归）

