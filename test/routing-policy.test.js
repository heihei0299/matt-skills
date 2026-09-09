import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const routeSection = (content) => content.slice(content.indexOf('## 行为路由'), content.indexOf('## 分文件'));

const agents = read('AGENTS.md');
const templateAgents = read('template/AGENTS.md');


test('simple low-risk changes use the direct route and commit per request', () => {
  for (const content of [agents, templateAgents]) {
    const route = routeSection(content);
    assert.match(route, /简单低风险直接执行/);
    assert.match(route, /理解现状 → 最小修改 → 相关验证/);
    assert.match(route, /按一个用户请求执行一次 `git commit`/);
  }
});

test('behavior routing keeps only the five automatic intent branches', () => {
  for (const content of [agents, templateAgents]) {
    const route = routeSection(content);
    assert.match(route, /## 行为路由/);
    assert.match(route, /理解\/定位 → `codegraph explore`/);
    assert.match(route, /调研\/原型 → `research` \/ `prototype`/);
    assert.match(route, /修改\/实现 → .*`tdd-implement`.*`tdd`.*`diagnose-fix`/);
    assert.match(route, /审查\/设计 → `code-review` \/ `grilling` \/ `domain-modeling`/);
    assert.match(route, /无法归类 → 直接澄清/);

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
      assert.doesNotMatch(route, new RegExp(`\\`${manualSkill}\\``));
    }
    assert.doesNotMatch(route, /`implement`/);
    assert.doesNotMatch(route, /显式触发|可选（需 `--all`）/);
  }
});
