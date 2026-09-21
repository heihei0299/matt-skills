import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { applySync, compare } from '../scripts/sync-upstream.js';

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function writeSkill(root, name, files) {
  const dir = path.join(root, 'skills', 'engineering', name);
  fs.mkdirSync(dir, { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(dir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

function writeLocalSkill(root, name, files) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(dir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

function createRefFixture() {
  const root = tempDir('matt-skills-ref-upstream-');
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'test']);
  writeSkill(root, 'test-skill', {
    'SKILL.md': 'base\n',
    'references/details.md': 'base auxiliary\n',
  });
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  const base = git(root, ['rev-parse', 'HEAD']);
  git(root, ['tag', 'release']);
  git(root, ['checkout', '-b', 'feature']);
  fs.writeFileSync(path.join(root, 'skills/engineering/test-skill/references/details.md'), 'feature auxiliary\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'feature']);
  const feature = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', 'main']);
  return { root, base, feature };
}

function createApplyFixture() {
  const upstream = tempDir('matt-skills-apply-upstream-');
  const local = tempDir('matt-skills-apply-local-');
  git(upstream, ['init', '-b', 'main']);
  git(upstream, ['config', 'user.email', 'test@example.com']);
  git(upstream, ['config', 'user.name', 'test']);
  writeSkill(upstream, 'test-a', { 'SKILL.md': 'new a\n' });
  writeSkill(upstream, 'test-b', { 'SKILL.md': 'new b\n' });
  git(upstream, ['add', '.']);
  git(upstream, ['commit', '-m', 'upstream']);
  writeLocalSkill(local, 'test-a', { 'SKILL.md': 'old a\n' });
  writeLocalSkill(local, 'test-b', { 'SKILL.md': 'old b\n' });
  writeLocalSkill(local, 'obsolete', { 'SKILL.md': 'remove me\n' });
  return { upstream, local };
}

async function compareAt({ root, localSkillsDir, ref }) {
  const tmpDir = path.join(os.tmpdir(), `matt-skills-ref-clone-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  try {
    const result = await compare({
      upstreamUrl: `file://${root}`,
      localSkillsDir,
      onlyProgramming: false,
      ref,
      tmpDir,
    });
    assert.equal(fs.existsSync(tmpDir), true);
    return result;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

test('sync-upstream --ref resolves default branch, branch, tag, and commit SHA', async () => {
  const fixture = createRefFixture();
  const local = tempDir('matt-skills-ref-local-');
  writeLocalSkill(local, 'test-skill', {
    'SKILL.md': 'base\n',
    'references/details.md': 'base auxiliary\n',
  });
  try {
    const defaultRef = await compareAt({ ...fixture, localSkillsDir: local });
    const branchRef = await compareAt({ ...fixture, localSkillsDir: local, ref: 'feature' });
    const tagRef = await compareAt({ ...fixture, localSkillsDir: local, ref: 'release' });
    const shaRef = await compareAt({ ...fixture, localSkillsDir: local, ref: fixture.feature });
    assert.equal(defaultRef.head, fixture.base);
    assert.equal(branchRef.head, fixture.feature);
    assert.equal(tagRef.head, fixture.base);
    assert.equal(shaRef.head, fixture.feature);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
    fs.rmSync(local, { recursive: true, force: true });
  }
});

test('sync-upstream reports invalid refs and removes the failed clone', async () => {
  const fixture = createRefFixture();
  const local = tempDir('matt-skills-ref-local-');
  const tmpDir = path.join(os.tmpdir(), `matt-skills-invalid-ref-${Date.now()}`);
  writeLocalSkill(local, 'test-skill', { 'SKILL.md': 'base\n' });
  try {
    await assert.rejects(
      compare({
        upstreamUrl: `file://${fixture.root}`,
        localSkillsDir: local,
        onlyProgramming: false,
        ref: 'missing-ref',
        tmpDir,
      }),
      /git fetch missing-ref 失败/,
    );
    assert.equal(fs.existsSync(tmpDir), false);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
    fs.rmSync(local, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('sync-upstream detects auxiliary-file-only skill changes', async () => {
  const fixture = createRefFixture();
  const local = tempDir('matt-skills-hash-local-');
  writeLocalSkill(local, 'test-skill', {
    'SKILL.md': 'base\n',
    'references/details.md': 'base auxiliary\n',
  });
  try {
    const result = await compareAt({ ...fixture, localSkillsDir: local, ref: 'feature' });
    assert.ok(result.result.updated.includes('test-skill'));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
    fs.rmSync(local, { recursive: true, force: true });
  }
});

test('applySync leaves the live skill tree unchanged when staging fails', async () => {
  const fixture = createApplyFixture();
  try {
    await assert.rejects(
      applySync({
        upstreamUrl: `file://${fixture.upstream}`,
        localSkillsDir: fixture.local,
        onlyProgramming: false,
        failAfter: 1,
        tmpDir: path.join(os.tmpdir(), `matt-skills-apply-fail-${Date.now()}`),
      }),
      /注入同步失败/,
    );
    assert.equal(fs.readFileSync(path.join(fixture.local, 'test-a/SKILL.md'), 'utf8'), 'old a\n');
    assert.equal(fs.readFileSync(path.join(fixture.local, 'test-b/SKILL.md'), 'utf8'), 'old b\n');
    assert.equal(fs.existsSync(path.join(fixture.local, 'obsolete/SKILL.md')), true);
    assert.deepEqual(fs.readdirSync(path.dirname(fixture.local)).filter((name) => name.startsWith('.matt-skills-sync-')), []);

    const result = await applySync({
      upstreamUrl: `file://${fixture.upstream}`,
      localSkillsDir: fixture.local,
      onlyProgramming: false,
      tmpDir: path.join(os.tmpdir(), `matt-skills-apply-success-${Date.now()}`),
    });
    assert.deepEqual(result.actions, ['update test-a', 'update test-b', 'remove obsolete']);
    assert.equal(fs.readFileSync(path.join(fixture.local, 'test-a/SKILL.md'), 'utf8'), 'new a\n');
    assert.equal(fs.readFileSync(path.join(fixture.local, 'test-b/SKILL.md'), 'utf8'), 'new b\n');
    assert.equal(fs.existsSync(path.join(fixture.local, 'obsolete')), false);
  } finally {
    fs.rmSync(fixture.upstream, { recursive: true, force: true });
    fs.rmSync(fixture.local, { recursive: true, force: true });
  }
});
