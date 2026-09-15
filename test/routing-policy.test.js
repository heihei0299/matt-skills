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
  'to-spec',
  'to-tickets',
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

test('workspace keeps the direct route and commit policy', () => {
  assert.match(agents, /简单修改 → 直接实现/);
  assert.match(agents, /定位 → 实现 → 验证 → 修正/);
  assert.match(agents, /每个用户请求最多一次 commit/);
});

test('template uses its independent workflow and commit policy', () => {
  assert.match(templateAgents, /## Workflow/);
  assert.match(templateAgents, /## Development/);
  assert.match(templateAgents, /默认使用 `tdd`/);
  assert.match(templateAgents, /## Git/);
  assert.match(templateAgents, /同一请求最多一个 commit/);
  assertNoManualRoutes(templateAgents);
});

test('workspace and template expose their intended routing branches', () => {
  assert.match(agents, /## 路由/);
  assert.match(agents, /理解 \/ 定位 \/ 调用链 → `codegraph explore`/);
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
  assert.match(templateAgents, /理解 \/ 定位 \/ 调用链 → `codegraph explore`/);
  assert.match(templateAgents, /多来源调研 \/ 方案比较 \/ 技术选型 → `research`/);
  assert.match(templateAgents, /原型 \/ PoC → `prototype`/);
  assert.match(templateAgents, /代码审查 → `code-review`/);
  assert.match(templateAgents, /设计质询 → `grilling`/);
  assert.match(templateAgents, /领域建模 → `domain-modeling`/);
  assert.match(templateAgents, /无法归类 → `ask-matt`/);
  assertNoManualRoutes(templateAgents);

  assert.match(agents, /bug \/ 异常 \/ 性能 → `diagnose-fix`/);
  assert.doesNotMatch(templateAgents, /bug \/ 异常 \/ 性能 → `diagnose-fix`/);
});
