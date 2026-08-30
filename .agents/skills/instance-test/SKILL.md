---
name: instance-test
disable-model-invocation: true
description: "matt-skills 专属功能测试示范（由 scaffold-functional-test 从 spec 生成）— 验证 sync 合并 update 后的行为；仅显式调用"
---

# Instance Test — matt-skills 专属示范

本 skill 是 **matt-skills 专属**的功能测试示范，由 `scaffold-functional-test` 从 `.scratch/sync-merge-update/spec.md` 生成（见 `references/instances.md` 头部 `spec hash` + `generatedAt`）。它是生成器产出形态的示例，不随 Template Snapshot 分发，仅保留于 Workspace。旧通用执行器文案已废弃。

兼容别名：`instance-test` 保留原名以兼容历史调用，实际为 `matt-functional-test` 的示范实现。

## Steps

### 1. Gather instances

实例集已由生成器按**受控扩展模型**落盘于 `references/instances.md`（头部含 `spec hash` + `generatedAt`，每实例含**溯源** `spec.md` 章节/行号，`<!-- manual -->` 段受保护）。

执行前校验指纹：若当前 spec 的 `spec hash` 与 `references/instances.md` 头部不一致，提示「spec 已变更，建议重跑 scaffold-functional-test」但不自动覆盖，需用户显式确认才 regenerate（AI 先给 diff 建议）。

每实例声明：`prompt/command/expected files/content/expected stdout phrases/expected exit code` 必选，`setup/env/timeout/type/teardown` 可选，默认 `type: cli`。

完成：实例清单已固定（含溯源与指纹），`<!-- manual -->` 段未被覆盖。

### 2. Run instances

For each **instance** in order:

1. `mktemp -d` 隔离目录（或项目支持的 `git worktree` / `--dest`），单线程串行，不并行。
2. 执行实例的 `command` 与可选 `setup`，捕获 stdout/stderr 与 exit code。
3. 快照 `expected` 声明的文件与副作用。

一个 **instance** 一次，失败不阻断后续，产物不碰撞。

完成：每实例均有独立 run dir 与捕获输出。

### 3. Evaluate

对比每实例的 actual vs expected：

- 文件存在性/内容（`test -f`/`grep -q`/`diff`）
- Stdout/stderr 含预期短语
- Exit code 一致
- 扩展字段（`env`/`timeout`/`type`）行为符合声明

标记 `PASS`/`FAIL`，附 `expected vs actual` diff 与 run dir 证据。

完成：每实例均有 `PASS` 或 `FAIL` 且含证据。

### 4. Report

对话内汇总：

- `PASS m/n` + per-instance evidence
- 失败项列出 gap（expected vs actual）与 run dir 复现路径
- 成功默认清理临时目录、失败默认保留；`--keep` 保留全部；`--report` 显式开启才落盘报告文件

不以文件刷屏——默认输出在对话，报告文件仅显式开启才写。

## 实例来源

- 源 spec：`.scratch/sync-merge-update/spec.md`（`spec hash` 见 `references/instances.md` 头部）
- 推导策略：混合推导（验收标准锚点 + 需求/接口/边界补充），每实例含溯源，无溯源视为幻觉
- 手工段：`<!-- manual -->` 保护

## 引用

- 生成器：`scaffold-functional-test`（读 spec 产出本 skill）
- 领域术语：`CONTEXT.md`
- 技能设计：`docs/agents/skill-design.md`
