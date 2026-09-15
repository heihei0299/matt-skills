import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function directoryNames(relative) {
  return readdirSync(path.join(ROOT, relative), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.endsWith('.bak') && entry.name !== 'skill-creator' && entry.name !== '.git')
    .map((entry) => entry.name)
    .sort();
}

test('template snapshot contains no shared Skill mirror', () => {
  assert.ok(directoryNames('.agents/skills').length > 0);
  assert.equal(existsSync(path.join(ROOT, 'template/.agents')), false);
});


test('canonical tdd-implement delegates sensitive scan (no bundled script)', () => {
  assert.equal(existsSync(path.join(ROOT, '.agents/skills/tdd-implement/scripts/scan-sensitive.sh')), false);
  const content = readFileSync(
    path.join(ROOT, '.agents/skills/tdd-implement/SKILL.md'),
    'utf8',
  );
  assert.doesNotMatch(content, /tdd-implement\/scripts\/scan-sensitive\.sh/);
  assert.doesNotMatch(content, /commit-check\/scripts\/scan-sensitive\.sh/);
});
