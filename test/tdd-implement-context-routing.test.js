import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const skill = readFileSync(root('.agents/skills/tdd-implement/SKILL.md'), 'utf8');

const refs = ['orchestration.md', 'verify.md', 'finalize.md'];
const finalizeRef = 'finalize.md';

test('tdd-implement routes each stage to a focused reference', () => {
  for (const ref of [...refs, finalizeRef]) {
    assert.ok(existsSync(root(`.agents/skills/tdd-implement/references/${ref}`)), `${ref} must exist`);
    assert.ok(existsSync(root(`template/.agents/skills/tdd-implement/references/${ref}`)), `template ${ref} must exist`);
    assert.match(skill, new RegExp(`references/${ref.replace('.', '\\.')}`));
  }
  assert.match(skill, /## Finalize/);
  assert.match(skill, /references\/finalize\.md/);
  assert.match(skill, /references\/verify\.md/);
  assert.doesNotMatch(skill, /references\/(contract|red-green|stages)\.md/);
});

test('focused references stay mirrored exactly', () => {
  for (const ref of [...refs, finalizeRef]) {
    const workspace = readFileSync(root(`.agents/skills/tdd-implement/references/${ref}`), 'utf8');
    const template = readFileSync(root(`template/.agents/skills/tdd-implement/references/${ref}`), 'utf8');
    assert.equal(template, workspace, `${ref} mirror must stay exact`);
  }
});

test('obsolete stage references are no longer distributed', () => {
  for (const ref of ['contract.md', 'red-green.md', 'stages.md']) {
    assert.equal(existsSync(root(`.agents/skills/tdd-implement/references/${ref}`)), false);
    assert.equal(existsSync(root(`template/.agents/skills/tdd-implement/references/${ref}`)), false);
  }
});
