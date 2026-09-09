import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const skill = readFileSync(root('.agents/skills/diagnose-fix/SKILL.md'), 'utf8');
const anti = readFileSync(root('.agents/skills/diagnose-fix/references/anti-patterns.md'), 'utf8');

test('diagnose-fix connects diagnosis, protected fix, and regression without phase-number coupling', () => {
  assert.match(skill, /diagnosing-bugs/);
  assert.match(skill, /修复前的诊断活动/);
  assert.match(skill, /不要依赖固定 Phase 编号/);
  assert.match(skill, /tdd/);
  assert.match(skill, /③ 回归收尾/);
  assert.ok(skill.split(/\r?\n/).length < 70, 'wrapper should stay concise');
});

test('functional bugs still require a failing regression test at a correct seam', () => {
  assert.match(skill, /功能 bug/);
  assert.match(skill, /正确的公共 seam/);
  assert.match(skill, /遵循 `tdd` 要求获得用户确认/);
  assert.match(skill, /失败回归测试/);
  assert.match(skill, /不得写修复代码/);
  assert.match(skill, /本身就是 finding/);
  assert.match(skill, /不进入 `tdd-implement` 的长流程/);
});

test('performance regressions may use measured red evidence instead of fake unit tests', () => {
  assert.match(skill, /性能回归/);
  assert.match(skill, /benchmark/);
  assert.match(skill, /timing harness/);
  assert.match(skill, /query-count/);
  assert.match(skill, /profiler-derived threshold/);
  assert.match(skill, /red-capable regression evidence/);
  assert.match(skill, /不为满足形式强造/);
  assert.match(anti, /不为性能问题强造/);
  assert.match(anti, /可靠测量边界/);
});

test('diagnose-fix preserves continuity and upstream cleanup ownership', () => {
  assert.match(skill, /一个回合内连续推进/);
  assert.match(skill, /重跑阶段 ① 的原始/);
  assert.match(skill, /清理.*探针/);
  assert.match(skill, /anti-patterns\.md/);
  assert.match(anti, /不绕过 red-capable regression evidence/);
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
