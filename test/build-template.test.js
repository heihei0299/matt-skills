import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createBuilderFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'matt-skills-template-'));
  for (const name of ['scripts', 'bin', 'config', 'docs/agents']) {
    mkdirSync(path.join(root, name), { recursive: true });
  }
  cpSync(path.join(REPO_ROOT, 'scripts/build-template.js'), path.join(root, 'scripts/build-template.js'));
  cpSync(path.join(REPO_ROOT, 'bin/skill-boundaries.js'), path.join(root, 'bin/skill-boundaries.js'));
  cpSync(path.join(REPO_ROOT, 'config/template-AGENTS.md'), path.join(root, 'config/template-AGENTS.md'));
  cpSync(path.join(REPO_ROOT, 'config/proprietary.json'), path.join(root, 'config/proprietary.json'));
  cpSync(path.join(REPO_ROOT, 'CONTEXT.md'), path.join(root, 'CONTEXT.md'));
  cpSync(path.join(REPO_ROOT, 'docs/agents'), path.join(root, 'docs/agents'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'package.json'), path.join(root, 'package.json'));
  return root;
}

test('build-template creates the skeleton without a shared Skill source or mirror', () => {
  const root = createBuilderFixture();
  try {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/build-template.js')], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(path.join(root, 'template', '.agents')), false);
    assert.equal(existsSync(path.join(root, 'template', '.agents', 'skills')), false);
    assert.equal(existsSync(path.join(root, 'template', 'AGENTS.md')), true);
    assert.equal(existsSync(path.join(root, 'template', '.opencode', 'docs', 'agents')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
