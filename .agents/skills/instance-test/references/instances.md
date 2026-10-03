# Instances for matt-skills — sync 行为功能测试（由 scaffold-functional-test 生成）

> 源 spec：`.scratch/sync-merge-update/spec.md`
> spec hash: `062a76fc872d`  # .scratch/sync-merge-update/spec.md 的 sha256 前 12 位
> generatedAt: 2026-05-11
> 推导策略：混合推导（验收标准锚点 + 需求/行为补充），每实例含溯源，无溯源视为幻觉

本文件由 `scaffold-functional-test` 按**受控扩展模型**生成：必选 `prompt/command/expected files/content/expected stdout phrases/expected exit code`，可选 `setup/env/timeout/type/teardown`，默认 `type: cli`。执行语义：`mktemp -d` 隔离、单线程串行、`PASS m/n` 汇总、证据含 `expected vs actual` diff + `run dir`。

执行前校验：对比当前 `.scratch/sync-merge-update/spec.md` 的 hash 与本文件头部 `spec hash`，不一致时提示「spec 已变更，建议重跑 scaffold-functional-test」但不自动覆盖。

---

## 1. sync 默认 check（无参不写盘）

- Prompt: 验证 `matt-skills sync` 无参等价 check，打印表且不改 AGENTS.md
- 溯源: spec.md — 需求/行为「`matt-skills sync` 无参：等价 `check`」+ 验收标准「`sync` 无参在已定制的 `pi-switch` 仓库上不改 `AGENTS.md`」
- type: cli
- setup: `node bin/cli.js init --dest <tmp>` 后手工改 `AGENTS.md` 加入 `tdd-implement` 定制行
- Command: `node bin/cli.js sync --dest <tmp>`（无参）
- Expected:
  - `git diff HEAD -- AGENTS.md` 为空（`AGENTS.md` 未被覆盖）
  - stdout 含 `上游 HEAD` 与 `新增/更新/删除/一致` 表头
  - stdout 含 `--json` 可解析提示或表格行
  - exit 0 或 1（有差异时 exit 1，判 exit code 符合 check 语义）
- Expected files/content: `AGENTS.md` 保留定制行，无 `AGENTS.md.bak` 新增
- Expected stdout phrases: `上游 HEAD`, `一致`
- Expected exit code: 1（有差异时）/ 0（无差异时）— 按实现定义，测试以实际 check 语义为准

## 2. sync --apply 安全增量（AGENTS.md 跳过、上游强制覆盖不删）

- Prompt: 验证 `sync --apply` 为安全增量，`AGENTS.md` 定制跳过、上游技能被覆盖但 remove 列表不删
- 溯源: spec.md — 需求/行为「`sync --apply`：安全增量写盘。`AGENTS.md` 若含独有路由则跳过；上游技能 `rm+cp force` 覆盖，跳过 `PROPRIETARY`，不执行 `remove`」+ 验收标准「`sync --apply` 后上游技能被强制更新为上游 `HEAD`，`remove` 列表的技能仍保留」
- type: cli
- setup: 在 `<tmp>` 放置旧版上游技能 `test-skill` 过期文件，并手工改 `AGENTS.md`
- Command: `node bin/cli.js sync --apply --dest <tmp>`
- Expected:
  - `AGENTS.md` 仍含定制行（未被模板覆盖）
  - 上游技能文件已更新为上游 HEAD 内容（`diff` 无旧版残留）
  - `remove` 列表中的技能目录仍存在（未被删除）
- Expected files/content: `AGENTS.md` 定制行存在；`test-skill` 被覆盖为新版；无 `AGENTS.md.bak`（安全档不备份）或按实现保留但不覆盖
- Expected stdout phrases: `已同步` 或 `已更新` 或 `同步`
- Expected exit code: 0
- timeout: 30000

## 3. sync --force 硬盖（AGENTS.md 备份后覆盖、全量 add/update/remove）

- Prompt: 验证 `sync --force` 硬盖，`AGENTS.md` 备份后被模板覆盖、技能与模板全量同步含删除
- 溯源: spec.md — 需求/行为「`sync --force`：硬盖。`AGENTS.md` 先 `backupIfExists → .bak` 再 `cp -r force`；技能与模板均 `add/update/remove` 全做」+ 验收标准「`sync --force` 后 `AGENTS.md` 变为模板且 `AGENTS.md.bak` 存在，`remove` 列表的技能被删除」
- type: cli
- setup: 在 `<tmp>` 放置 `AGENTS.md` 定制行 + 一个上游已删的本地技能 `obsolete-skill/`
- Command: `node bin/cli.js sync --force --dest <tmp>`
- Expected:
  - `AGENTS.md` 已被模板覆盖（定制行消失，与 `template/AGENTS.md` 一致）
  - `AGENTS.md.bak` 存在且含定制行备份
  - `obsolete-skill/` 已被删除
- Expected files/content: `AGENTS.md` 内容等于 `template/AGENTS.md`；`AGENTS.md.bak` 存在
- Expected stdout phrases: `已覆盖` 或 `硬盖`
- Expected exit code: 0

## 4. update 已合并到 sync --apply（删除分支、提示已合并）

- Prompt: 验证 `matt-skills update` 已删除，执行后报错提示已合并到 `sync --apply`，且 `--help` 不再列 `update`
- 溯源: spec.md — 需求/行为「`matt-skills update`：删除该分支，`main` 中 `command === 'update'` 改为 `stderr: 'update 已合并到 sync --apply'` 且 `exit 1`，`--help` 不再列 `update`」+ 验收标准「`matt-skills update` 执行后报错提示已合并，`--help` 无 `update`」
- type: cli
- Command: `node bin/cli.js update 2>&1; echo "exit:$?"` 与 `node bin/cli.js --help`
- Expected:
  - `update` 命令 stdout/stderr 含 `已合并到 sync --apply` 且 exit 1
  - `--help` 输出不含独立的 `update` 子命令行（不匹配 `^\s*update`）
- Expected stdout phrases: `已合并到 sync --apply`
- Expected exit code: 1（`update` 分支）
- env: {}

<!-- manual -->
<!-- 以下为人工定制实例保护段：由开发者手写，scaffold-functional-test 重生成时不覆盖此段以上的内容。如需新增手工实例，请在此段后追加。 -->
