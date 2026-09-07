import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');

const agents = read('AGENTS.md');
const templateAgents = read('template/AGENTS.md');
const skill = read('.agents/skills/tdd-implement/SKILL.md');
const templateSkill = read('template/.agents/skills/tdd-implement/SKILL.md');

test('simple low-risk changes use the direct route and commit per request', () => {
  for (const content of [agents, templateAgents]) {
    assert.match(content, /简单、低风险修改 → 直接执行/);
    assert.match(content, /理解现状 → 最小修改 → 相关验证/);
    assert.match(content, /按一个用户请求执行一次 `git commit`/);
    assert.doesNotMatch(content, /提交前 → commit-check/);
  }
});

test('tdd-implement is reachable only through explicit user invocation', () => {
  for (const content of [agents, templateAgents]) {
    assert.match(content, /用户显式 `\/tdd-implement` → tdd-implement/);
    assert.match(content, /明确要求 test-first\/TDD 但未显式调用时，提示用户显式调用/);
  }

  for (const content of [skill, templateSkill]) {
    assert.match(content, /^disable-model-invocation:\s*true$/m);
    assert.match(content, /完成已确认的 spec\/ticket 的 test-first\/TDD 交付闭环/);
    assert.doesNotMatch(content, /^description:\s*"Use when/m);
  }
});
