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
  const projectTools = ['codex', 'pi', 'opencode', 'claude'];
  for (const tool of projectTools) {
    await t.test(`project ${tool}`, () => {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-project-'));
      try {
        const result = runCli(['install', '--tools', tool, '--all'], cwd);
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(listDirectories(path.join(cwd, '.agents/skills')), distributableNames);
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
