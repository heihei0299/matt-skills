import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { syncProjectSkills } from '../bin/project/skills.js';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');

function runCli(args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function createTarget() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
}

test('sync 默认初始化不分发 .pi 与 .opencode', () => {
  const dest = createTarget();
  try {
    const result = runCli(['sync', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(dest, 'AGENTS.md')));
    assert.equal(fs.existsSync(path.join(dest, '.pi')), false);
    assert.equal(fs.existsSync(path.join(dest, '.opencode')), false);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --all 初始化仍分发 .pi 与 .opencode', () => {
  const dest = createTarget();
  try {
    const result = runCli(['sync', '--all', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(dest, '.pi')));
    assert.ok(fs.existsSync(path.join(dest, '.opencode')));
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --dry-run 预演目标项目，不写盘也不访问上游', () => {
  const dest = createTarget();
  try {
    const init = runCli(['init', '--all', '--dest', dest]);
    assert.equal(init.status, 0, init.stderr);
    const beforeAgents = fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8');
    const result = runCli(['sync', '--all', '--dry-run', '--dest', dest]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /目标:/);
    assert.match(result.stdout, /无需更新/);
    assert.doesNotMatch(result.stdout, /上游 HEAD/);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), beforeAgents);
    assert.equal(fs.existsSync(path.join(dest, 'AGENTS.md.bak')), false);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --dry-run 有目标差异时 exit 1 并保留目标不变', () => {
  const dest = createTarget();
  try {
    const init = runCli(['init', '--dest', dest]);
    assert.equal(init.status, 0, init.stderr);
    const skill = path.join(dest, '.agents', 'skills', 'grill-with-docs', 'SKILL.md');
    fs.appendFileSync(skill, '\nLOCAL DRY-RUN EDIT\n');
    const result = runCli(['sync', '--dry-run', '--dest', dest]);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /更新 \(.*\):.*\.agents\/skills/s);
    assert.match(fs.readFileSync(skill, 'utf8'), /LOCAL DRY-RUN EDIT/);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --dry-run --json 输出目标差异 JSON', () => {
  const dest = createTarget();
  try {
    const init = runCli(['init', '--dest', dest]);
    assert.equal(init.status, 0, init.stderr);
    fs.rmSync(path.join(dest, '.agents', 'skills', 'grill-with-docs'), { recursive: true, force: true });
    const result = runCli(['sync', '--dry-run', '--json', '--dest', dest]);
    const json = JSON.parse(result.stdout);
    assert.equal(result.status, 1);
    assert.equal(json.target, dest);
    assert.equal(json.onlyProgramming, true);
    assert.equal(json.refreshAgents, false);
    assert.ok(json.result.updated.includes('.agents/skills'));
    assert.equal(fs.existsSync(path.join(dest, '.agents', 'skills', 'grill-with-docs')), false);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --refresh-agents --dry-run 报告 AGENTS.md 和备份变化但不写盘', () => {
  const dest = createTarget();
  const custom = 'LOCAL AGENTS\n';
  try {
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), custom);
    const result = runCli(['sync', '--dry-run', '--json', '--refresh-agents', '--dest', dest]);
    const json = JSON.parse(result.stdout);
    assert.equal(result.status, 1);
    assert.equal(json.refreshAgents, true);
    assert.ok(json.result.updated.includes('AGENTS.md'));
    assert.ok(json.result.added.includes('AGENTS.md.bak'));
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), custom);
    assert.equal(fs.existsSync(path.join(dest, 'AGENTS.md.bak')), false);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('普通 sync --json 明确拒绝，不能静默输出人类文本', () => {
  const dest = createTarget();
  try {
    const result = runCli(['sync', '--json', '--dest', dest]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--json 仅支持 sync --dry-run/);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --help 说明范围、刷新和 JSON 规则', () => {
  const { stdout } = runCli(['sync', '--help']);
  assert.match(stdout, /--all.*不改变 AGENTS\.md 刷新策略/s);
  assert.match(stdout, /--refresh-agents/);
  assert.match(stdout, /--dry-run/);
  assert.match(stdout, /--json.*--dry-run/s);
  assert.doesNotMatch(stdout, /--force/);
  assert.doesNotMatch(stdout, /--upstream/);
});


test('skill distribution does not migrate harness configuration', async () => {
  const dest = createTarget();
  try {
    const sourceDir = path.join(dest, 'source');
    fs.mkdirSync(sourceDir);
    fs.mkdirSync(path.join(dest, '.pi'));
    const settingsFile = path.join(dest, '.pi/settings.json');
    const original = JSON.stringify({ skills: ['../.opencode/skills'], defaultModel: 'user-model' });
    fs.writeFileSync(settingsFile, original);
    await syncProjectSkills({ target: dest, sourceDir, skillNames: [], distributableSkillNames: [], repoLocalSkills: new Set() });
    assert.equal(fs.readFileSync(settingsFile, 'utf8'), original);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

for (const [label, original, expected, warning] of [
  ['legacy references', JSON.stringify({ skills: ['../.opencode/skills', '.opencode/skills', './custom'], defaultModel: 'user-model', custom: true }), { skills: ['./custom'], defaultModel: 'user-model', custom: true }, false],
  ['unrelated text', JSON.stringify({ note: '../.opencode', skills: ['./custom'] }), null, false],
  ['malformed JSON', '{ "skills": ["../.opencode/skills"]', null, true],
  ['unparseable contents', 'DO_NOT_ECHO', null, true],
  ['ambiguous skills', JSON.stringify({ skills: '../.opencode/skills', custom: true }), null, true],
]) {
  test(`sync preserves project settings: ${label}`, () => {
    const dest = createTarget();
    try {
      fs.mkdirSync(path.join(dest, '.pi'));
      const settingsFile = path.join(dest, '.pi/settings.json');
      fs.writeFileSync(settingsFile, original);
      fs.chmodSync(settingsFile, 0o660);
      const result = runCli(['sync', '--all', '--dest', dest]);
      assert.equal(result.status, 0, result.stderr);
      const actual = fs.readFileSync(settingsFile, 'utf8');
      assert.equal(fs.statSync(settingsFile).mode & 0o777, 0o660);
      if (expected) assert.deepEqual(JSON.parse(actual), expected);
      else assert.equal(actual, original);
      assert.doesNotMatch(result.stderr, /DO_NOT_ECHO/);
      if (warning) assert.match(result.stderr, /settings\.json/);
      else assert.equal(result.stderr, '');
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });
}

test('sync does not follow a settings symlink when migrating legacy references', () => {
  const dest = createTarget();
  try {
    fs.mkdirSync(path.join(dest, '.pi'));
    const outside = path.join(dest, 'unrelated.json');
    const original = JSON.stringify({ skills: ['../.opencode/skills'], custom: true });
    fs.writeFileSync(outside, original);
    fs.symlinkSync(outside, path.join(dest, '.pi/settings.json'));
    const result = runCli(['sync', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(outside, 'utf8'), original);
    assert.match(result.stderr, /settings\.json/);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('dry-run previews settings migration without writing project settings', () => {
  const dest = createTarget();
  try {
    assert.equal(runCli(['init', '--dest', dest]).status, 0);
    fs.mkdirSync(path.join(dest, '.pi'));
    const settingsFile = path.join(dest, '.pi/settings.json');
    const original = JSON.stringify({ skills: ['../.opencode/skills'], custom: true });
    fs.writeFileSync(settingsFile, original);
    const result = runCli(['sync', '--dry-run', '--json', '--dest', dest]);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(JSON.parse(result.stdout).result.updated.includes('.pi'));
    assert.equal(fs.readFileSync(settingsFile, 'utf8'), original);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});


test('a failed settings write preserves the original settings and permissions', () => {
  const dest = createTarget();
  try {
    fs.mkdirSync(path.join(dest, '.pi'));
    const settingsFile = path.join(dest, '.pi/settings.json');
    const original = JSON.stringify({ skills: ['../.opencode/skills'], custom: true });
    fs.writeFileSync(settingsFile, original, { mode: 0o600 });
    const preload = path.join(dest, 'fail-write.cjs');
    fs.writeFileSync(preload, `
      const fs = require('node:fs/promises');
      const writeFile = fs.writeFile;
      fs.writeFile = async (file, ...args) => {
        if (require('node:path').basename(String(file)) === 'settings.json') {
          await writeFile(file, 'partial');
          throw new Error('injected settings write failure');
        }
        return writeFile(file, ...args);
      };
      require('node:module').syncBuiltinESMExports();
    `);
    const result = spawnSync(process.execPath, ['--require', preload, CLI, 'sync', '--dest', dest], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /injected settings write failure/);
    assert.equal(fs.readFileSync(settingsFile, 'utf8'), original);
    assert.equal(fs.statSync(settingsFile).mode & 0o777, 0o600);
    assert.deepEqual(fs.readdirSync(path.join(dest, '.pi')), ['settings.json']);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});
