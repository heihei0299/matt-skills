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

test('workspace keeps its direct route', () => {
  assert.match(agents, /简单修改 → 直接实现/);
  assert.match(agents, /定位 → 实现 → 验证 → 修正/);
});

test('template keeps its independent workflow', () => {
  assert.match(templateAgents, /## Workflow/);
  assert.match(templateAgents, /## Validation/);
  assert.match(templateAgents, /行为修改 \/ 功能实现 \/ bug 修复 \/ 逻辑调整 → `tdd`/);
  assert.match(templateAgents, /## Git/);
  assert.match(templateAgents, /## Security/);
  assertNoManualRoutes(templateAgents);
});

test('progressive discovery demand-loads repository context', () => {
  for (const content of [agents, templateAgents]) {
    assert.match(content, /## Progressive discovery/);
    assert.match(content, /current issue\/spec|当前 issue\/spec/i);
    assert.match(content, /README\.md/);
    assert.match(content, /package\.json/);
    assert.match(content, /all tests|全部测试/i);
    assert.match(content, /architecture docs|架构文档/i);
    assert.match(content, /only when.*directly needed|只在.*直接需要/i);
    assert.match(content, /unresolved question|未决问题/i);
    assert.match(content, /direct dependencies|直接依赖/i);
  }
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
  assert.match(templateAgents, /代码理解 \/ 定位 \/ 调用链 \/ 依赖关系 \/ 数据流 → `codegraph explore`/);
  assert.match(templateAgents, /行为修改 \/ 功能实现 \/ bug 修复 \/ 逻辑调整 → `tdd`/);
  assert.match(templateAgents, /多来源调研 \/ 方案比较 \/ 技术选型 \/ 最佳实践 \/ 外部实现 → `research`/);
  assert.match(templateAgents, /未命中 skill 时直接执行/);
  assert.doesNotMatch(templateAgents, /prototype|code-review|grilling|domain-modeling|ask-matt/);
  assertNoManualRoutes(templateAgents);

  assert.match(agents, /bug \/ 异常 \/ 性能 → `diagnose-fix`/);
  assert.doesNotMatch(templateAgents, /bug \/ 异常 \/ 性能 → `diagnose-fix`/);
});
