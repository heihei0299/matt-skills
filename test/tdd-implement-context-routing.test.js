import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const skill = readFileSync(root('.agents/skills/tdd-implement/SKILL.md'), 'utf8');

const refs = ['orchestration.md', 'verify.md', 'finalize.md'];

test('tdd-implement routes only execution, verification and finalization references', () => {
  for (const ref of refs) {
    assert.ok(existsSync(root(`.agents/skills/tdd-implement/references/${ref}`)), `${ref} must exist`);
    assert.match(skill, new RegExp(`references/${ref.replace('.', '\\\\.')}`));
  }
  assert.match(skill, /### ① Red-Green/);
  assert.match(skill, /### ② Verify/);
  assert.match(skill, /### ③ Record/);
  assert.match(skill, /### ④ Finalize/);
  assert.match(skill, /## Batch State Sync/);
  assert.doesNotMatch(skill, /references\/review\.md/);
  assert.doesNotMatch(skill, /### Batch Review|### Finding Fix/);
});

test('obsolete stage and review references are not distributed', () => {
  for (const ref of ['contract.md', 'red-green.md', 'stages.md', 'review.md']) {
    assert.equal(existsSync(root(`.agents/skills/tdd-implement/references/${ref}`)), false);
  }
});
