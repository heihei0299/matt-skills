import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const skill = read('.agents/skills/tdd-implement/SKILL.md');
const orchestration = read('.agents/skills/tdd-implement/references/orchestration.md');
const verify = read('.agents/skills/tdd-implement/references/verify.md');
const finalize = read('.agents/skills/tdd-implement/references/finalize.md');

const refs = ['orchestration.md', 'verify.md', 'finalize.md'];

test('tdd-implement exposes the current two-stage delivery lifecycle', () => {
  assert.match(skill, /name: tdd-implement/);
  assert.match(skill, /spec\/task/);
  assert.match(skill, /test-first\/TDD/);
  assert.match(skill, /### ① Red-Green/);
  assert.match(skill, /### ② Verify/);
  assert.doesNotMatch(skill, /### ③/);
  assert.match(skill, /## Finalize/);
});

test('current references define the issue delivery contract', () => {
  assert.match(skill, /\[orchestration\.md\]\(references\/orchestration\.md\)/);
  assert.match(skill, /\[verify\.md\]\(references\/verify\.md\)/);
  assert.match(skill, /\[finalize\.md\]\(references\/finalize\.md\)/);
  assert.match(orchestration, /每个 issue 仍按 `Red-Green → Verify → Finalize` 独立完成/);
  assert.match(verify, /当前 issue 的必要验证通过/);
  assert.match(finalize, /仅在 Verify 通过后执行/);
});

test('Finalize updates progress before closing acceptance', () => {
  assert.match(finalize, /3\. 更新 progress\/tracker[\s\S]*4\. 将 Acceptance Criteria 标记完成/);
  assert.doesNotMatch(finalize, /3\. 将 Acceptance Criteria 标记完成[\s\S]*4\. 更新 progress\/tracker/);
});

test('tdd-implement avoids obsolete stage and commit-check coupling', () => {
  assert.doesNotMatch(skill, /references\/(contract|red-green|stages)\.md/);
  assert.doesNotMatch(skill, /commit-check|scan-sensitive\.sh/);
  assert.doesNotMatch(orchestration, /commit-check|scan-sensitive\.sh/);
});
