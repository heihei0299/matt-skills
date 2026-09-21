import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');

const agents = read('AGENTS.md');
const templateAgents = read('template/AGENTS.md');

const manualSkills = [
  'commit-check',
  'triage',
  'teach',
  'handoff',
  'wayfinder',
  'grill-to-spec',
];

function assertNoManualRoutes(content) {
  for (const skill of manualSkills) {
    assert.doesNotMatch(content, new RegExp('`' + skill + '`'));
  }
  assert.doesNotMatch(content, /`implement`/);
  assert.doesNotMatch(content, /显式触发|可选（需 `--all`）/);
}

test('workspace keeps its direct route', () => {
  assert.match(agents, /简单修改 → 直接实现/);
  assert.match(agents, /定位 → 实现 → 验证 → 修正/);
});

test('template keeps its independent workflow', () => {
  assert.match(templateAgents, /## Workflow/);
  assert.match(templateAgents, /## Validation/);
  assert.match(templateAgents, /## Git/);
  assert.match(templateAgents, /每个独立 issue\/spec 对应一个 commit；不得按实现、测试、review 等阶段拆分。/);
  assert.match(templateAgents, /仅在本次改动完成并通过相关验证后提交。checkpoint 例外，但须明确标注未完成或未通过的验证。/);
  assert.match(templateAgents, /commit 前检查 `git diff` 和 `git status`；只 stage 本次任务改动，不覆盖、回滚或提交用户及其他任务的既有修改。/);
  assert.match(templateAgents, /`commit` 不授权 `push` 或发布；远程写入须单独授权。/);
  assert.match(templateAgents, /commit 后报告 hash、验证命令及结果。/);
  assert.match(templateAgents, /## Security/);
  assertNoManualRoutes(templateAgents);
});

test('context guidance is compact and evidence-first', () => {
  for (const content of [agents, templateAgents]) {
    assert.match(content, /## Context \/ CodeGraph/);
    assert.doesNotMatch(content, /## Progressive discovery|## Evidence reuse|## Codegraph query discipline/);
    assert.match(content, /有 issue\/spec 时先读当前 issue；否则从用户问题和最相关 symbol\/path 开始。/);
    assert.match(content, /只按当前未决问题逐步扩展上下文；README\/package\/tests\/docs 按需读取。/);
    assert.match(content, /当前上下文已有充分且未过时的证据时，不做等价重复读取。/);
    assert.match(content, /当当前上下文不足、需要新增代码理解证据时，优先使用 `codegraph explore`；结果充分后不再 broad grep\/read。/);
    assert.doesNotMatch(content, /仓库内代码理解首先使用/);
  }
});

test('workspace and template expose their intended routing branches', () => {
  assert.match(agents, /## 路由/);
  assert.match(agents, /需要新增代码理解证据的理解 \/ 定位 \/ 调用链 → `codegraph explore`/);
  assert.doesNotMatch(agents, /^\* 理解 \/ 定位 \/ 调用链 → `codegraph explore`$/m);
  assert.match(agents, /外部调研 \/ 方案比较 → `research`/);
  assert.match(agents, /原型 \/ PoC → `prototype`/);
  assert.match(agents, /简单修改 → 直接实现/);
  assert.match(agents, /TDD \/ 集成测试 → `tdd`/);
  assert.match(agents, /代码审查 → `code-review`/);
  assert.match(agents, /设计质询 → `grilling`/);
  assert.match(agents, /领域建模 → `domain-modeling`/);
  assert.match(agents, /无法归类 → `ask-matt`/);
  assertNoManualRoutes(agents);

  assert.match(templateAgents, /## Workflow/);
  assert.match(templateAgents, /需要新增证据的代码理解 \/ 定位 \/ 调用链 \/ 依赖关系 \/ 数据流 → `codegraph explore`/);
  assert.doesNotMatch(templateAgents, /^\* 代码理解 \/ 定位 \/ 调用链 \/ 依赖关系 \/ 数据流 → `codegraph explore`$/m);
  assert.match(templateAgents, /目标项目首次初始化或刷新项目上下文 → `initialize-project`/);
  assert.match(templateAgents, /首次使用 spec \/ tickets 流程，需要配置 issue tracker 和领域文档 → `setup-matt-pocock-skills`/);
  assert.match(templateAgents, /模糊需求、设计讨论并同步 ADR \/ glossary → `grill-with-docs`/);
  assert.match(templateAgents, /已有共识，需要发布 spec → `to-spec`/);
  assert.match(templateAgents, /已有 spec \/ 计划，需要拆分可执行 tickets → `to-tickets`/);
  assert.match(templateAgents, /未命中 skill 时直接执行/);
  assert.doesNotMatch(templateAgents, /research|prototype|code-review|grill-to-spec|tdd-implement|implement|tdd|grilling|domain-modeling|ask-matt/);
  assertNoManualRoutes(templateAgents);

  assert.match(agents, /bug \/ 异常 \/ 性能 → `diagnose-fix`/);
  assert.doesNotMatch(templateAgents, /bug \/ 异常 \/ 性能 → `diagnose-fix`/);
});
