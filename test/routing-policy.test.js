import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const routeSection = (content) => content;

const agents = read('AGENTS.md');
const templateAgents = read('template/AGENTS.md');


test('simple low-risk changes use the direct route and commit per request', () => {
  for (const content of [agents, templateAgents]) {
    const route = routeSection(content);
    assert.match(route, /简单修改 → 直接实现/);
    assert.match(route, /定位 → 实现 → 验证 → 修正/);
    assert.match(route, /每个用户请求最多一次 commit/);
  }
});

test('behavior routing lists the current intent branches', () => {
  for (const content of [agents, templateAgents]) {
    const route = routeSection(content);
    assert.match(route, /## 路由/);
    assert.match(route, /理解 \/ 定位 \/ 调用链 → `codegraph explore`/);
    assert.match(route, /外部调研 \/ 方案比较 → `research`/);
    assert.match(route, /原型 \/ PoC → `prototype`/);
    assert.match(route, /简单修改 → 直接实现/);
    assert.match(route, /TDD \/ 集成测试 → `tdd`/);
    assert.match(route, /代码审查 → `code-review`/);
    assert.match(route, /设计质询 → `grilling`/);
    assert.match(route, /领域建模 → `domain-modeling`/);
    assert.match(route, /无法归类 → `ask-matt`/);

    for (const manualSkill of [
      'commit-check',
      'to-spec',
      'to-tickets',
      'triage',
      'teach',
      'handoff',
      'wayfinder',
      'grill-to-spec',
    ]) {
      assert.doesNotMatch(route, new RegExp('`' + manualSkill + '`'));
    }
    assert.doesNotMatch(route, /`implement`/);
    assert.doesNotMatch(route, /显式触发|可选（需 `--all`）/);
  }
  assert.match(agents, /bug \/ 异常 \/ 性能 → `diagnose-fix`/);
  assert.doesNotMatch(templateAgents, /bug \/ 异常 \/ 性能 → `diagnose-fix`/);
});
