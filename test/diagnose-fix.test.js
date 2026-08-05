import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Guard diagnose-fix: the orchestration skill that makes the FIX phase of bug
// diagnosis go through TDD. Root cause it prevents: pi sessions diagnosing a
// bug with diagnosing-bugs skipped the regression test in Phase 5 (weak
// "but only if there is a correct seam" phrasing + no tdd-skill reference),
// so the model edited code directly without tests. diagnose-fix hard-gates
// the fix behind a failing test and carries its own turn-continuity rule.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = path.join(dir, '.agents', 'skills', 'diagnose-fix', 'SKILL.md');
const skill = readFileSync(skillPath, 'utf8');

test('frontmatter triggers on diagnose/debug and promises a TDD fix', () => {
  assert.match(skill, /name: diagnose-fix/);
  assert.match(skill, /diagnose\/debug/);
  assert.match(skill, /TDD/);
});

test('references diagnosing-bugs as the diagnosis source of truth', () => {
  assert.match(skill, /\[diagnosing-bugs\]\(\.agents\/skills\/diagnosing-bugs\/SKILL\.md\)/);
  assert.match(skill, /Phase 1-4/);
});

test('references the tdd skill as the sole source of fix semantics', () => {
  assert.match(skill, /\[tdd 技能\]\(\.agents\/skills\/tdd\/SKILL\.md\)/);
  assert.match(skill, /唯一事实源/);
  assert.match(skill, /不重写/);
});

test('hard gate: no fix code before a failing regression test', () => {
  assert.match(skill, /写任何修复代码之前/);
  assert.match(skill, /失败/);
  assert.match(skill, /回归测试/);
  assert.match(skill, /先运行看它红/);
});

test('no escape hatch: no "but only if" / skip-the-test wording', () => {
  assert.doesNotMatch(skill, /but only if/i);
  assert.doesNotMatch(skill, /可跳过测试/);
  assert.doesNotMatch(skill, /跳过测试/);
  assert.match(skill, /不得/);
});

test('no-seam case is itself a finding, not a license to skip tests', () => {
  assert.match(skill, /本身即 finding/);
  assert.match(skill, /不得/);
  assert.match(skill, /绕过测试直接改代码/);
});

test('carries a turn-continuity rule (skill-design Rule 1)', () => {
  assert.match(skill, /回合连续性/);
  assert.match(skill, /一个回合内串行完成/);
  assert.match(skill, /不等用户/);
  assert.match(skill, /出口条件/);
  assert.match(skill, /预告下一步后立即执行/);
});

test('declares itself a long-horizon skill with glossary/spec refs', () => {
  assert.match(skill, /长程任务/);
  assert.match(skill, /Long-Horizon Skill/);
  assert.match(skill, /CONTEXT\.md/);
  assert.match(skill, /skill-design\.md/);
});

test('stays lightweight: no tdd-implement heavy machinery', () => {
  assert.doesNotMatch(skill, /todo 状态机/);
  assert.doesNotMatch(skill, /T1-R/);
  assert.doesNotMatch(skill, /seams 确认清单/);
  assert.doesNotMatch(skill, /commit 门禁/);
  assert.doesNotMatch(skill, /typecheck 门禁/);
  assert.match(skill, /轻量声明/);
  assert.match(skill, /直走红-绿/);
});

test('does not re-implement the red-green semantics of the tdd skill', () => {
  assert.doesNotMatch(skill, /断言值来自独立来源/);
  assert.doesNotMatch(skill, /垂直切片逐条推进/);
  assert.doesNotMatch(skill, /重构留到 code review/);
  assert.doesNotMatch(skill, /只写刚好能让当前测试通过的最小代码/);
});

test('closes with regression verification + cleanup + hypothesis writeup', () => {
  assert.match(skill, /回归验证/);
  assert.match(skill, /原始反馈回路/);
  assert.match(skill, /\[DEBUG-/);
  assert.match(skill, /commit \/ PR 消息/);
  assert.match(skill, /验证正确的假设/);
});
