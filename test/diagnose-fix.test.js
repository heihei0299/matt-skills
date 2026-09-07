import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const skill = readFileSync(root('.agents/skills/diagnose-fix/SKILL.md'), 'utf8');
const anti = readFileSync(root('.agents/skills/diagnose-fix/references/anti-patterns.md'), 'utf8');

test('diagnose-fix connects diagnosis, TDD fix, and regression', () => {
  assert.match(skill, /diagnosing-bugs/);
  assert.match(skill, /Phase 1–4/);
  assert.match(skill, /tdd/);
  assert.match(skill, /③ 回归收尾/);
  assert.ok(skill.split(/\r?\n/).length < 60, 'wrapper should stay concise');
});

test('diagnose-fix keeps its hard gates without copying upstream semantics', () => {
  assert.match(skill, /正确的公共 seam/);
  assert.match(skill, /遵循 `tdd` 要求获得用户确认/);
  assert.match(skill, /失败回归测试/);
  assert.match(skill, /不得写任何修复代码/);
  assert.match(skill, /本身就是 finding/);
  assert.doesNotMatch(skill, /不设 seams 确认步骤/);
  assert.match(skill, /不进入 `tdd-implement` 的长流程/);
  assert.doesNotMatch(skill, /断言值来自独立来源/);
  assert.doesNotMatch(skill, /垂直切片逐条推进/);
});

test('diagnose-fix preserves continuity and upstream cleanup ownership', () => {
  assert.match(skill, /一个回合内连续推进/);
  assert.match(skill, /重跑阶段 ① 的原始/);
  assert.match(skill, /清理.*探针/);
  assert.match(skill, /anti-patterns\.md/);
  assert.match(anti, /不绕过测试直接改代码/);
  assert.match(anti, /不遗留探针/);
});

test('diagnose-fix template mirror stays exact', () => {
  assert.equal(
    readFileSync(root('template/.agents/skills/diagnose-fix/SKILL.md'), 'utf8'),
    skill,
  );
  assert.equal(
    readFileSync(root('template/.agents/skills/diagnose-fix/references/anti-patterns.md'), 'utf8'),
    anti,
  );
});
