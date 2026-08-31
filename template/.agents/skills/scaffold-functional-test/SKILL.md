---
name: scaffold-functional-test
disable-model-invocation: false
description: "Scaffold a repo-specific functional-test skill from spec — use when the user wants to generate a customized functional-test suite/skill from a spec/README/help; not for running tests (use instance-test) nor for TDD (use tdd-implement)"
---

# Scaffold Functional Test

从本仓库的 spec 自动脚手架出**仓库专属的功能测试 skill**。本技能为**非 Long-Horizon 轻量 skill**（一次性 scaffold，不做多 seam 红绿循环），一次性完成「读 spec → 推导实例 → 落盘 skill → 自验证」闭环。术语定义见 `CONTEXT.md`。

## 产出物

- 定制 skill 目录：`.agents/skills/<repo>-functional-test/`（含 `SKILL.md` + `references/instances.md` + 可选 `scripts/run.sh`）
- 指纹：`spec hash` + `generatedAt` 写入生成物头部，用于后续执行前校验
- 保护：`<!-- manual -->` 标记段不被覆盖

生成物纳入 git，可回归复用，不进入 `template/` 再分发（生成器本身才随 Template Snapshot 分发）。

## Steps

### ① 采集 Spec

解析用户传入的 spec 路径，默认 `.scratch/<feature>/spec.md`。

- 若 spec 存在：读取 `CONTEXT.md`/`docs/adr/` 相关术语与决策，提取待覆盖行为清单（以验收标准为锚点）。
- 若 spec 不存在：回退到 `README` + `--help` 输出倒推行为清单，但必须进入 Step ② 的清单确认关卡，不静默臆测。

完成：待覆盖行为清单已固定，无未澄清歧义。

### ② 推导实例

按混合推导策略生成实例草案：

- 以验收标准为锚点，需求/接口/边界为补充，可为 spec 未显式写的隐含行为（如 `--help` 文案、错误码、幂等性）补实例，但每条实例必须标注**溯源**（spec 章节/行号或 `README/--help` 来源），无溯源的实例视为幻觉需删除。
- 每实例声明**受控扩展模型**：必选 `prompt/command/expected files/content/expected stdout phrases/expected exit code`，可选 `setup/env/timeout/type/teardown`，默认 `type: cli`。
- **强制门禁**：实例清单必须与用户确认后才进入 Step ③；无确认不落盘。

完成：实例清单已获用户确认，每实例含溯源与完整四元组。

### ③ 脚手架落盘

按受控扩展模型写入定制 skill 目录：

- `SKILL.md`：执行语义（见下节「执行语义」）
- `references/instances.md`：实例集（含溯源、必选+可选字段、头部 `spec hash` + `generatedAt`）
- 不覆盖 `<!-- manual -->` 保护段；覆盖式更新需经用户确认；重生成时先给出 diff 建议，用户确认后才应用。

完成：定制 skill 目录已落盘，指纹正确，人工段受保护。

### ④ 自验证

落盘后立即按实例执行语义串行执行一轮实例集作自验证：

- `mktemp -d` 隔离（或项目支持的 `git worktree` / `--dest`），单线程串行，不并行。
- 每实例捕获 stdout/stderr 与 exit code，按 `test -f`/`grep -q`/`diff` 对比判定 `PASS`/`FAIL`，单 FAIL 不阻断后续。
- 对话内输出 `PASS m/n` + per-instance evidence（`expected vs actual diff` + `run dir`），失败不回滚生成物但给出 gap 供迭代 `regenerate`。
- 成功默认清理临时目录、失败默认保留（`--keep` 保留全部）；`--report` 显式开启才落盘报告文件。

完成：自验证已执行，对话内汇总完成，证据可复现。

## 执行语义（生成物复用）

生成物本身的执行语义与 `instance-test` 一致：`mktemp -d` 串行、`PASS m/n` 汇总、证据含 `expected vs actual diff` + `run dir`。执行前校验 `spec hash` 指纹：若当前 spec 已变更，提示「spec 已变更，建议重跑 scaffold-functional-test」但不自动覆盖，需用户显式确认才 regenerate。

## 不做什么

- 不替代 `tdd`/`tdd-implement` 的红绿循环与 `commit-check` 门禁
- 不自动织入每次 `tdd-implement` 或 `commit-check`；仅 `tdd-implement --with-functional` 显式 opt-in
- 不支持并行执行与 `docker` 隔离
- 不处理超出混合推导锚点范围的源码静态分析隐式行为挖掘

## 引用

- 领域术语：`CONTEXT.md`
- 技能设计规则：`docs/agents/skill-design.md`
- 示范产物：`.agents/skills/instance-test/`（本仓库专属，见其 SKILL.md）
- Issue tracker：`docs/agents/issue-tracker.md`
