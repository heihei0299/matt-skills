import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const skill = read('.agents/skills/tdd-implement/SKILL.md');
const orchestration = read('.agents/skills/tdd-implement/references/orchestration.md');
const review = read('.agents/skills/tdd-implement/references/review.md');
const finalize = read('.agents/skills/tdd-implement/references/finalize.md');

test('tdd-implement exposes separate issue and batch lifecycles', () => {
  assert.match(skill, /Issue lifecycle:[\s\S]*`Red-Green → Verify → Record`/);
  assert.match(skill, /Batch lifecycle:[\s\S]*`Batch Review → Finding Fix → Finalize → State Sync`/);
  assert.doesNotMatch(skill, /`Red-Green → Verify → Review → Finalize`/);
  assert.doesNotMatch(skill, /每个 issue 最多调用 1 次 `code-review`/);
});

test('one batch review replaces per-issue review', () => {
  assert.match(review, /batch_base/);
  assert.match(review, /batch_review_head/);
  assert.match(review, /full_review_done/);
  assert.match(review, /code-review calls = 1/);
  assert.match(review, /per-issue review = 0/);
  assert.match(review, /incremental review = 0/);
  assert.match(review, /fixed point = `batch_base`/);
  assert.match(review, /review target = `batch_review_head`/);
  assert.match(review, /diff = `batch_base\.\.\.batch_review_head`/);
  assert.match(review, /evidence = execution ledger/);
});

test('behavioral findings use a RED to GREEN fix pass', () => {
  assert.match(review, /Behavioral finding/);
  assert.match(review, /write reproducing test/);
  assert.match(review, /RED/);
  assert.match(review, /minimal fix/);
  assert.match(review, /GREEN/);
  assert.match(review, /affected verification/);
  assert.doesNotMatch(review, /修复阶段不得返回 Red-Green/);
  assert.match(review, /最多一个 finding-fix commit/);
  assert.match(review, /修复后不得再次调用 `code-review`/);
});

test('Finalize follows batch review and finding fix', () => {
  assert.match(orchestration, /Batch Review[\s\S]*Finding Fix[\s\S]*Finalize completed issues[\s\S]*Batch State Sync/);
  assert.match(finalize, /verified_pending_review → resolved/);
  assert.match(finalize, /最多 1 个 batch state-sync commit/);
  assert.match(finalize, /不属于任何单个 issue 的 `issue_base\.\.\.issue_head` 范围/);
});

test('normal execution stays in the current session', () => {
  assert.match(skill, /正常 Red-Green \/ Verify 执行由当前 session 原生完成/);
  assert.match(skill, /子代理只用于证据不足、证据冲突、复杂诊断等异常升级/);
  assert.match(skill, /常规独立 Review 只发生在 batch 末尾/);
});

test('multi-issue orchestration carries the final issue HEAD forward', () => {
  assert.match(orchestration, /issue_base = HEAD[\s\S]*Red-Green[\s\S]*Verify[\s\S]*Record Evidence[\s\S]*issue_head = HEAD/);
  assert.match(orchestration, /下一个 issue 以当前 `issue_head` 作为新的 `issue_base`/);
  assert.match(orchestration, /单 issue 也使用同一套 batch lifecycle，等价于 batch size = 1/);
});

test('dependency failures remain fail-closed', () => {
  assert.match(orchestration, /字段无法解析、依赖节点不存在或出现环时/);
  assert.match(orchestration, /不降级为无依赖/);
});
