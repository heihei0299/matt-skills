import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const ROOT = path.resolve(path.dirname(CLI), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/proprietary.json'), 'utf8'));
const engineering = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'config/engineering.json'), 'utf8')));
const required = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'config/required.json'), 'utf8')));
const sourceNames = fs.readdirSync(path.join(ROOT, '.agents/skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.endsWith('.bak') && entry.name !== 'skill-creator' && entry.name !== '.git')
  .map((entry) => entry.name)
  .sort();
const repoLocal = new Set(config.repoLocal);
const distributableNames = sourceNames.filter((name) => !repoLocal.has(name));
const defaultNames = sourceNames.filter((name) => (
  config.default.includes(name) || engineering.has(name) || required.has(name)
));

function runCli(args, cwd = ROOT, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function namesFromText(stdout) {
  return stdout.trim().split('\n').filter(Boolean).map((line) => line.split(' — ')[0]).sort();
}

function namesFromJson(stdout) {
  return JSON.parse(stdout).map((skill) => skill.name).sort();
}

function listDirectories(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test('default list exposes only default programming skills', () => {
  const text = runCli(['list']);
  assert.equal(text.status, 0, text.stderr);
  assert.deepEqual(namesFromText(text.stdout), defaultNames);
  assert.equal(defaultNames.includes('ci-guard'), false);
  assert.equal(defaultNames.includes('commit-check'), false);

  const json = runCli(['list', '--json']);
  assert.equal(json.status, 0, json.stderr);
  assert.deepEqual(namesFromJson(json.stdout), defaultNames);
});

test('list --all exposes all distributable skills and no repo-local skills', () => {
  const text = runCli(['list', '--all']);
  assert.equal(text.status, 0, text.stderr);
  assert.deepEqual(namesFromText(text.stdout), distributableNames);

  const json = runCli(['list', '--all', '--json']);
  assert.equal(json.status, 0, json.stderr);
  assert.deepEqual(namesFromJson(json.stdout), distributableNames);
  assert.equal(json.stdout.includes('ci-guard'), false);
  assert.equal(json.stdout.includes('commit-check'), false);
});

test('list uses canonical Skill directory names when frontmatter differs', () => {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-source-'));
  try {
    for (const name of ['.agents', 'bin', 'config']) {
      fs.cpSync(path.join(ROOT, name), path.join(source, name), { recursive: true });
    }
    fs.cpSync(path.join(ROOT, 'package.json'), path.join(source, 'package.json'));
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(source, 'node_modules'), 'dir');
    const skillFile = path.join(source, '.agents', 'skills', 'tdd-implement', 'SKILL.md');
    fs.writeFileSync(
      skillFile,
      fs.readFileSync(skillFile, 'utf8').replace(/^name: tdd-implement$/m, 'name: renamed-skill'),
    );

    const result = spawnSync(process.execPath, [path.join(source, 'bin', 'cli.js'), 'list', '--all'], {
      cwd: source,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^tdd-implement —/m);
    assert.doesNotMatch(result.stdout, /^renamed-skill —/m);
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
  }
});

test('install --all --dest copies only distributable skills', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-distribution-'));
  try {
    const result = runCli(['install', '--all', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(listDirectories(dest), distributableNames);
    assert.equal(fs.existsSync(path.join(dest, 'ci-guard')), false);
    assert.equal(fs.existsSync(path.join(dest, 'commit-check')), false);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('init default and --all distribute only the appropriate skill sets', () => {
  const defaultDest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-default-'));
  const allDest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-all-'));
  try {
    const defaultResult = runCli(['init', '--dest', defaultDest]);
    assert.equal(defaultResult.status, 0, defaultResult.stderr);
    assert.deepEqual(listDirectories(path.join(defaultDest, '.agents/skills')), defaultNames);

    const allResult = runCli(['init', '--all', '--dest', allDest]);
    assert.equal(allResult.status, 0, allResult.stderr);
    assert.deepEqual(listDirectories(path.join(allDest, '.agents/skills')), distributableNames);
    assert.equal(fs.existsSync(path.join(allDest, '.agents/skills/ci-guard')), false);
    assert.equal(fs.existsSync(path.join(allDest, '.agents/skills/commit-check')), false);
  } finally {
    fs.rmSync(defaultDest, { recursive: true, force: true });
    fs.rmSync(allDest, { recursive: true, force: true });
  }
});

test('init --all preserves existing repo-local skill sentinels', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-preserve-'));
  try {
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL AGENTS');
    for (const name of ['ci-guard', 'commit-check']) {
      const dir = path.join(dest, '.agents/skills', name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), `USER CUSTOM ${name}`);
    }

    const result = runCli(['init', '--all', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    for (const name of ['ci-guard', 'commit-check']) {
      assert.equal(
        fs.readFileSync(path.join(dest, '.agents/skills', name, 'SKILL.md'), 'utf8'),
        `USER CUSTOM ${name}`,
      );
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('install --all never distributes repo-local skills to project or global targets', async (t) => {
  const projectDirs = {
    codex: '.agents/skills',
    pi: '.agents/skills',
    opencode: '.agents/skills',
    claude: '.agents/skills',
  };
  for (const [tool, rel] of Object.entries(projectDirs)) {
    await t.test(`project ${tool}`, () => {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-project-'));
      try {
        const result = runCli(['install', '--tools', tool, '--all'], cwd);
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(listDirectories(path.join(cwd, rel)), distributableNames);
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    });
  }

  for (const [tool, rel] of Object.entries({
    codex: '.codex/skills',
    pi: '.pi/agent/skills',
    opencode: '.config/opencode/skills',
    claude: '.claude/skills',
  })) {
    await t.test(`global ${tool}`, () => {
      const home = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-home-'));
      try {
        const result = runCli(['install', '--tools', tool, '--all', '--global'], ROOT, { HOME: home });
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(listDirectories(path.join(home, rel)), distributableNames);
      } finally {
        fs.rmSync(home, { recursive: true, force: true });
      }
    });
  }
});

test('sync default and --all do not add repo-local skills', () => {
  const projectDirs = ['.agents/skills'];
  for (const args of [['sync'], ['sync', '--all']]) {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-sync-boundary-'));
    try {
      const result = runCli([...args, '--dest', dest]);
      assert.equal(result.status, 0, result.stderr);
      for (const rel of projectDirs) {
        assert.equal(fs.existsSync(path.join(dest, rel, 'ci-guard')), false);
        assert.equal(fs.existsSync(path.join(dest, rel, 'commit-check')), false);
      }
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  }
});

test('sync updates shared skills from the canonical source', () => {
  const projectDirs = ['.agents/skills'];
  for (const args of [['sync'], ['sync', '--all']]) {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-sync-update-'));
    const projectLocalSkill = path.join(dest, '.pi/skills/project-local-skill/SKILL.md');
    try {
      for (const rel of projectDirs) {
        const sharedSkill = path.join(dest, rel, 'tdd-implement/SKILL.md');
        fs.mkdirSync(path.dirname(sharedSkill), { recursive: true });
        fs.writeFileSync(sharedSkill, 'STALE SHARED COPY');
      }
      fs.mkdirSync(path.dirname(projectLocalSkill), { recursive: true });
      fs.writeFileSync(projectLocalSkill, 'PROJECT-LOCAL COPY');

      const result = runCli([...args, '--dest', dest]);
      assert.equal(result.status, 0, result.stderr);
      for (const rel of projectDirs) {
        assert.equal(
          fs.readFileSync(path.join(dest, rel, 'tdd-implement/SKILL.md'), 'utf8'),
          fs.readFileSync(path.join(ROOT, '.agents/skills/tdd-implement/SKILL.md'), 'utf8'),
        );
      }
      assert.equal(fs.readFileSync(projectLocalSkill, 'utf8'), 'PROJECT-LOCAL COPY');
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  }
});

test('sync legacy cleanup does not follow symlinks or discard permission-only changes', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-sync-symlink-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-sync-outside-'));
  const sourceRoot = path.join(ROOT, '.agents/skills');
  try {
    const legacyRoot = path.join(dest, '.claude/skills');
    const outsideRoot = path.join(outside, 'skills');
    fs.mkdirSync(outsideRoot, { recursive: true });
    fs.cpSync(path.join(sourceRoot, 'tdd-implement'), path.join(outsideRoot, 'tdd-implement'), { recursive: true });
    fs.mkdirSync(path.dirname(legacyRoot), { recursive: true });
    fs.symlinkSync(outsideRoot, legacyRoot, 'dir');

    const childMirror = path.join(dest, '.pi/skills/diagnose-fix');
    fs.cpSync(path.join(sourceRoot, 'diagnose-fix'), childMirror, { recursive: true });
    const outsideFile = path.join(outside, 'diagnose-fix-SKILL.md');
    fs.copyFileSync(path.join(sourceRoot, 'diagnose-fix/SKILL.md'), outsideFile);
    fs.rmSync(path.join(childMirror, 'SKILL.md'));
    fs.symlinkSync(outsideFile, path.join(childMirror, 'SKILL.md'));

    const permissionMirror = path.join(dest, '.opencode/skills/show-me');
    fs.cpSync(path.join(sourceRoot, 'show-me'), permissionMirror, { recursive: true });
    fs.chmodSync(path.join(permissionMirror, 'SKILL.md'), 0o600);

    const result = runCli(['sync', '--all', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.lstatSync(legacyRoot).isSymbolicLink(), true);
    assert.equal(fs.existsSync(path.join(outsideRoot, 'tdd-implement/SKILL.md')), true);
    assert.equal(fs.lstatSync(path.join(childMirror, 'SKILL.md')).isSymbolicLink(), true);
    assert.equal(fs.existsSync(outsideFile), true);
    assert.equal(fs.existsSync(permissionMirror), true);
    assert.equal(fs.statSync(path.join(permissionMirror, 'SKILL.md')).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('sync cleanup errors do not fail after canonical files are written', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-sync-error-'));
  const unreadable = path.join(dest, '.pi/skills/tdd-implement/SKILL.md');
  try {
    fs.cpSync(path.join(ROOT, '.agents/skills/tdd-implement'), path.dirname(unreadable), { recursive: true });
    fs.chmodSync(unreadable, 0);
    const result = runCli(['sync', '--all', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(path.join(dest, '.agents/skills/tdd-implement/SKILL.md')), true);
    assert.equal(fs.existsSync(path.dirname(unreadable)), true);
  } finally {
    try { fs.chmodSync(unreadable, 0o644); } catch {}
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync preserves repo-local and project-local skills', () => {
  for (const args of [['sync'], ['sync', '--all']]) {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-sync-preserve-'));
    try {
      fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL AGENTS');
      for (const [harness, name] of [
        ['.agents/skills', 'commit-check'],
        ['.pi/skills', 'commit-check'],
        ['.opencode/skills', 'ci-guard'],
        ['.claude/skills', 'claude-project-local-skill'],
      ]) {
        const dir = path.join(dest, harness, name);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'SKILL.md'), `USER CUSTOM ${name}`);
      }
      const sharedMirror = path.join(dest, '.pi/skills/project-local-skill');
      fs.mkdirSync(sharedMirror, { recursive: true });
      fs.writeFileSync(path.join(sharedMirror, 'SKILL.md'), 'LEGACY SHARED MIRROR');
      const exactLegacyMirror = path.join(dest, '.pi/skills/tdd-implement');
      fs.cpSync(path.join(ROOT, '.agents/skills/tdd-implement'), exactLegacyMirror, { recursive: true });
      const modifiedLegacyMirror = path.join(dest, '.opencode/skills/diagnose-fix');
      fs.cpSync(path.join(ROOT, '.agents/skills/diagnose-fix'), modifiedLegacyMirror, { recursive: true });
      fs.appendFileSync(path.join(modifiedLegacyMirror, 'SKILL.md'), '\nLOCAL MODIFICATION');

      const result = runCli([...args, '--dest', dest]);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /不再分发|已保留/);
      assert.equal(fs.existsSync(sharedMirror), true);
      assert.equal(fs.readFileSync(path.join(sharedMirror, 'SKILL.md'), 'utf8'), 'LEGACY SHARED MIRROR');
      assert.equal(fs.existsSync(exactLegacyMirror), false, 'exact legacy shared mirror should be cleaned');
      assert.equal(fs.existsSync(modifiedLegacyMirror), true, 'modified legacy copy should be preserved');
      for (const [harness, name] of [
        ['.agents/skills', 'commit-check'],
        ['.pi/skills', 'commit-check'],
        ['.opencode/skills', 'ci-guard'],
      ]) {
        assert.match(result.stdout, new RegExp(`${harness.replace('/', '\\/')}\\/${name}`));
      }
      for (const [harness, name] of [
        ['.agents/skills', 'commit-check'],
        ['.pi/skills', 'commit-check'],
        ['.opencode/skills', 'ci-guard'],
        ['.claude/skills', 'claude-project-local-skill'],
      ]) {
        assert.equal(
          fs.readFileSync(path.join(dest, harness, name, 'SKILL.md'), 'utf8'),
          `USER CUSTOM ${name}`,
        );
      }
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  }
});
