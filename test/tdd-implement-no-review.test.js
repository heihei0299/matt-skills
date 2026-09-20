import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const skill = read('.agents/skills/tdd-implement/SKILL.md');
const orchestration = read('.agents/skills/tdd-implement/references/orchestration.md');
const finalize = read('.agents/skills/tdd-implement/references/finalize.md');
const issueLoop = orchestration.match(/```text\nfor each dependency layer:[\s\S]*?```/)?.[0] ?? '';

test('issue execution has no review or reviewer dispatch', () => {
  assert.notEqual(issueLoop, '');
  assert.match(issueLoop, /Red-Green[\s\S]*Verify[\s\S]*Record[\s\S]*Finalize/);
  assert.doesNotMatch(issueLoop, /Review|code-review|Finding Fix/);
  assert.match(orchestration, /Issue loop 不调用 `code-review`/);
});

test('verified issue writes minimal evidence and then resolves', () => {
  assert.match(skill, /Acceptance:/);
  assert.match(skill, /TDD:/);
  assert.match(skill, /Verify:/);
  assert.match(skill, /Rulings:/);
  assert.match(finalize, /issue 已 `resolved`/);
});

test('batch work is limited to one state sync commit', () => {
  assert.match(orchestration, /Batch State Sync/);
  assert.match(orchestration, /最多创建 1 个 batch state-sync commit/);
  assert.doesNotMatch(orchestration, /Batch Review|Finding Fix|batch_review_head|full_review_done/);
});
