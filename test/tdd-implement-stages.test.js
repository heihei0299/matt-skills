import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression tests for the "AI stops prematurely mid-TDD-cycle" bug.
// Root cause: stage ③ never told the agent to keep executing within a turn,
// so the model ended its turn at "announce next step" points (red→green gap,
// seam→seam gap). Fix: a positive "回合连续性" rule + 3c says go immediately.
// These tests guard against a future refactor silently deleting that rule.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagesPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'stages.md');
const skillPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'SKILL.md');

const stages = readFileSync(stagesPath, 'utf8');
const skill = readFileSync(skillPath, 'utf8');

test('stage ③ has a turn-continuity rule (fix for premature stop)', () => {
  assert.match(stages, /回合连续性/);
  assert.match(stages, /在一个回合内串行完成/);
  // Positive phrasing, not a bare prohibition
  assert.match(stages, /每完成一个 seam 立即进入下一个/);
});

test('stage ③ has a chunking rule (fix for giant turns)', () => {
  assert.match(stages, /任务分解/);
  assert.match(stages, /Chunking/);
  assert.match(stages, /150 行/);
  assert.match(stages, /5 处/);
  assert.match(stages, /每批后立即 typecheck 验证/);
});

test('SKILL.md declares the skill as a long-horizon skill', () => {
  assert.match(skill, /长程任务/);
  assert.match(skill, /Long-Horizon Skill/);
  assert.match(skill, /CONTEXT\.md/);
  assert.match(skill, /skill-design\.md/);
  assert.match(skill, /Turn Continuity/);
  assert.match(skill, /Chunking/);
});
test('3c says move to the next seam immediately within the same turn', () => {
  assert.match(stages, /立即进入下一个 seam/);
});

test('stage ⑦ closes the loop: issue status + implementation summary', () => {
  assert.match(stages, /阶段 ⑦/);
  assert.match(stages, /Status:/);
  assert.match(stages, /resolved/);
  assert.match(stages, /实施总结/);
  assert.match(skill, /⑦ 收尾/);
  assert.match(skill, /实施总结/);
});

test('SKILL.md no longer mandates the Goal mode (removed)', () => {
  assert.doesNotMatch(skill, /Goal 模式/);
  assert.doesNotMatch(skill, /goal_complete/);
});
