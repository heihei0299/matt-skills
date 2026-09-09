import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { applySync } from '../scripts/sync-upstream.js';

function createFakeUpstream() {
  const root = fsTemp('matt-skills-upstream-');
  const skill = path.join(root, 'skills/engineering/test-skill');
  mkdirSync(skill, { recursive: true });
  writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: test-skill\ndescription: test\n---\n');
  for (const args of [['init'], ['config', 'user.email', 'test@test.com'], ['config', 'user.name', 'test']]) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  assert.equal(spawnSync('git', ['add', '.'], { cwd: root }).status, 0);
  assert.equal(spawnSync('git', ['commit', '-m', 'fixture'], { cwd: root, encoding: 'utf8' }).status, 0);
  return root;
}

function fsTemp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('direct upstream applySync dry-run removes its temporary clone', async () => {
  const upstream = createFakeUpstream();
  const tempClone = path.join(os.tmpdir(), `matt-skills-dry-run-${Date.now()}`);
  try {
    const result = await applySync({ upstreamUrl: upstream, tmpDir: tempClone, dryRun: true });
    assert.equal(result.dryRun, true);
    assert.equal(existsSync(tempClone), false);
  } finally {
    rmSync(upstream, { recursive: true, force: true });
    rmSync(tempClone, { recursive: true, force: true });
  }
});
