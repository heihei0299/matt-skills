import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const skill = read('.agents/skills/tdd-implement/SKILL.md');
const orchestration = read('.agents/skills/tdd-implement/references/orchestration.md');
const finalize = read('.agents/skills/tdd-implement/references/finalize.md');

test('tdd-implement has no automatic review stage', () => {
  assert.match(skill, /`Red-Green → Verify → Record → Finalize`/);
  assert.doesNotMatch(skill, /Batch Review → Finding Fix/);
  assert.match(skill, /`code-review` 是独立能力，不属于 `tdd-implement` 的自动生命周期/);
  assert.match(skill, /`tdd-implement` 不自动调用 `code-review`/);
});

test('Record forms one delivery commit and evidence ledger', () => {
  assert.match(skill, /当前 issue 唯一的 delivery commit/);
  assert.match(skill, /设置 `issue_head = HEAD`/);
  assert.match(skill, /\.scratch\/tdd-implement\//);
  assert.match(skill, /不保存完整测试输出/);
});

test('Finalize follows verification and evidence without review', () => {
  assert.match(finalize, /Red-Green、Verify、delivery commit 和 Evidence Record/);
  assert.match(finalize, /`issue_head` 仍指向 delivery commit/);
  assert.match(finalize, /不改变 `issue_head`/);
  assert.match(finalize, /issue 已 `resolved`/);
  assert.doesNotMatch(finalize, /batch Review|finding-fix|full_review_done|batch_review_head/);
  assert.doesNotMatch(finalize, /Batch State Sync|batch state-sync/);
});

test('normal execution stays in the current session', () => {
  assert.match(skill, /正常 Red-Green \/ Verify 由当前 session 原生完成/);
  assert.match(skill, /子代理只用于证据不足、证据冲突、复杂诊断等异常升级/);
});

test('multi-issue orchestration completes issue before advancing', () => {
  assert.match(orchestration, /issue_base = HEAD[\s\S]*Red-Green[\s\S]*Verify[\s\S]*Record \(delivery commit 后设置 issue_head = HEAD\)[\s\S]*Finalize/);
  assert.match(orchestration, /下一个 issue 以当前 `issue_head` 作为新的 `issue_base`/);
});

test('dependency failures remain fail-closed', () => {
  assert.match(orchestration, /字段无法解析、依赖节点不存在或出现环时/);
  assert.match(orchestration, /不降级为无依赖/);
});
