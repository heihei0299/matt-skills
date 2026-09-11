import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(path.join(ROOT, 'config/proprietary.json'), 'utf8'));
const repoLocal = new Set(config.repoLocal);

function directoryNames(relative) {
  return readdirSync(path.join(ROOT, relative), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.endsWith('.bak') && entry.name !== 'skill-creator' && entry.name !== '.git')
    .map((entry) => entry.name)
    .sort();
}

test('template skill snapshot contains distributable skills and excludes repo-local skills', () => {
  const workspace = directoryNames('.agents/skills');
  const template = directoryNames('template/.agents/skills');
  for (const name of config.all) {
    assert.equal(existsSync(path.join(ROOT, '.agents/skills', name)), true);
  }
  assert.deepEqual(template, workspace.filter((name) => !repoLocal.has(name)));
  for (const name of repoLocal) {
    assert.equal(existsSync(path.join(ROOT, 'template/.agents/skills', name)), false);
  }
});

test('template excludes repo-local command while workspace keeps it', () => {
  assert.equal(existsSync(path.join(ROOT, '.opencode/commands/commit-check.md')), true);
  assert.equal(existsSync(path.join(ROOT, 'template/.opencode/commands/commit-check.md')), false);
  const workspaceCommands = readdirSync(path.join(ROOT, '.opencode/commands')).filter((name) => name !== 'commit-check.md').sort();
  const templateCommands = readdirSync(path.join(ROOT, 'template/.opencode/commands')).sort();
  assert.deepEqual(templateCommands, workspaceCommands);
});

test('distributed tdd-implement delegates sensitive scan (no bundled script)', () => {
  assert.equal(existsSync(path.join(ROOT, '.agents/skills/tdd-implement/scripts/scan-sensitive.sh')), false);
  assert.equal(existsSync(path.join(ROOT, 'template/.agents/skills/tdd-implement/scripts/scan-sensitive.sh')), false);
  const content = readFileSync(
    path.join(ROOT, 'template/.agents/skills/tdd-implement/references/stages.md'),
    'utf8',
  );
  assert.doesNotMatch(content, /tdd-implement\/scripts\/scan-sensitive\.sh/);
  assert.doesNotMatch(content, /commit-check\/scripts\/scan-sensitive\.sh/);
});
