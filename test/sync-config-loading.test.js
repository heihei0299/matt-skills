import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-sync-config-'));
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.cpSync(path.join(REPO_ROOT, 'bin/skill-boundaries.js'), path.join(root, 'bin/skill-boundaries.js'));
  fs.cpSync(path.join(REPO_ROOT, 'bin/skill-config.js'), path.join(root, 'bin/skill-config.js'));
  fs.cpSync(path.join(REPO_ROOT, 'scripts/sync-upstream.js'), path.join(root, 'scripts/sync-upstream.js'));
  fs.cpSync(path.join(REPO_ROOT, 'config'), path.join(root, 'config'), { recursive: true });
  fs.cpSync(path.join(REPO_ROOT, '.agents/skills/tdd'), path.join(root, '.agents/skills/tdd'), { recursive: true });
  return root;
}

function createUpstream() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-fake-upstream-'));
  const skill = path.join(root, 'skills/engineering/tdd');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), fs.readFileSync(path.join(REPO_ROOT, '.agents/skills/tdd/SKILL.md')));
  for (const args of [['init'], ['config', 'user.email', 'test@example.com'], ['config', 'user.name', 'test'], ['add', '.'], ['commit', '-m', 'fixture']]) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  return root;
}

test('sync-upstream check fails when required config is missing', () => {
  const root = createFixture();
  const upstream = createUpstream();
  try {
    fs.rmSync(path.join(root, 'config/required.json'));
    const tmpDir = path.join(root, 'upstream-tmp');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/sync-upstream.js'),
      '--check',
      '--upstream',
      upstream,
      '--tmp',
      tmpDir,
    ], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unable to read required skill config/);
    assert.equal(fs.existsSync(tmpDir), false, 'invalid local config must fail before upstream fetch');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(upstream, { recursive: true, force: true });
  }
});
