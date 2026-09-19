import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

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
    const skill = path.join(dest, '.agents', 'skills', 'tdd', 'SKILL.md');
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
    fs.rmSync(path.join(dest, '.agents', 'skills', 'tdd'), { recursive: true, force: true });
    const result = runCli(['sync', '--dry-run', '--json', '--dest', dest]);
    const json = JSON.parse(result.stdout);
    assert.equal(result.status, 1);
    assert.equal(json.target, dest);
    assert.equal(json.onlyProgramming, true);
    assert.equal(json.refreshAgents, false);
    assert.ok(json.result.updated.includes('.agents/skills'));
    assert.equal(fs.existsSync(path.join(dest, '.agents', 'skills', 'tdd')), false);
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
