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

function readProprietary() {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config/proprietary.json'), 'utf8'));
}

function upstreamSkillNames() {
  const all = fs.readdirSync(path.join(REPO_ROOT, '.agents/skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.endsWith('.bak'))
    .map((e) => e.name);
  const prop = new Set(readProprietary());
  return all.filter((n) => !prop.has(n) && n !== '.git' && n !== 'skill-creator').sort();
}

function createFakeUpstream({ extraSkill = null, modifySkill = null } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-upstream-'));
  const eng = path.join(tmp, 'skills/engineering');
  const prod = path.join(tmp, 'skills/productivity');
  fs.mkdirSync(eng, { recursive: true });
  fs.mkdirSync(prod, { recursive: true });
  const ups = upstreamSkillNames();
  for (const name of ups) {
    const src = path.join(REPO_ROOT, '.agents/skills', name);
    const dest = path.join(eng, name);
    fs.cpSync(src, dest, { recursive: true, force: true });
    if (modifySkill && name === modifySkill) {
      const md = path.join(dest, 'SKILL.md');
      if (fs.existsSync(md)) fs.appendFileSync(md, '\n# modified for test\n');
    }
  }
  if (extraSkill) {
    const dest = path.join(eng, extraSkill);
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'SKILL.md'), `---\nname: ${extraSkill}\ndescription: extra\n---\n# ${extraSkill}\n`);
  }
  // git init
  spawnSync('git', ['init'], { cwd: tmp, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmp });
  spawnSync('git', ['config', 'user.name', 'test'], { cwd: tmp });
  spawnSync('git', ['add', '.'], { cwd: tmp });
  const commit = spawnSync('git', ['commit', '-m', 'init'], { cwd: tmp, encoding: 'utf8' });
  if (commit.status !== 0) throw new Error(`git commit failed: ${commit.stderr} ${commit.stdout}`);
  return tmp;
}

function createDestWithCustomAgents(content = 'LOCAL EDIT tdd-implement') {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  fs.writeFileSync(path.join(dest, 'AGENTS.md'), content);
  return dest;
}

// Seam 1: sync --dry-run 只对比不写盘，打印表格，exitCode 语义，--json 可解析（sync 默认已改为安全增量）
test('sync --dry-run 不写盘，仅打印对比表格（不产生 git diff）', () => {
  const dest = createDestWithCustomAgents('LOCAL EDIT tdd-implement');
  const upstream = createFakeUpstream();
  try {
    const { status, stdout, stderr } = runCli(['sync', '--dry-run', '--dest', dest, '--upstream', upstream]);
    // 应该打印上游 HEAD 与本地非独有对比表
    assert.match(stdout, /上游 HEAD:/, 'missing 上游 HEAD');
    assert.match(stdout, /本地非独有:/, `stdout:\n${stdout}\nstderr:\n${stderr}`);
    // 不应执行写盘提示
    assert.doesNotMatch(stdout, /模板：已/, 'sync --dry-run 不应写盘');
    assert.doesNotMatch(stdout, /上游技能：新增/, 'sync --dry-run 不应打印“上游技能：新增”');
    // AGENTS.md 不应被改动
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'LOCAL EDIT tdd-implement');
    assert.ok(!fs.existsSync(path.join(dest, 'AGENTS.md.bak')), '.bak 不应产生');
    // 无差异时 exit 0
    assert.equal(status, 0, `expected exit 0 for no diff, got ${status} stdout:${stdout} stderr:${stderr}`);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.rmSync(upstream, { recursive: true, force: true });
  }
});

test('sync --dry-run 有差异时 exit 1 且打印新增/更新等分类', () => {
  const dest = createDestWithCustomAgents('LOCAL EDIT tdd-implement');
  const upstream = createFakeUpstream({ extraSkill: 'extra-sync-test-skill' });
  try {
    const { status, stdout } = runCli(['sync', '--dry-run', '--dest', dest, '--upstream', upstream]);
    assert.match(stdout, /上游 HEAD:/);
    assert.match(stdout, /新增 \(1\):.*extra-sync-test-skill/s);
    assert.equal(status, 1, `expected exit 1 when diff exists, got ${status}`);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'LOCAL EDIT tdd-implement');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.rmSync(upstream, { recursive: true, force: true });
  }
});

test('sync --dry-run --json 可解析，包含 head/counts/result 且 exitCode 语义保持', () => {
  const dest = createDestWithCustomAgents('LOCAL EDIT tdd-implement');
  const upstreamWithDiff = createFakeUpstream({ extraSkill: 'extra-json-skill' });
  const upstreamNoDiff = createFakeUpstream();
  try {
    const r1 = runCli(['sync', '--dry-run', '--json', '--dest', dest, '--upstream', upstreamWithDiff]);
    const j1 = JSON.parse(r1.stdout);
    assert.ok(typeof j1.head === 'string' && j1.head.length >= 7, 'head should be git sha');
    assert.ok(j1.counts && typeof j1.counts.local === 'number' && typeof j1.counts.upstream === 'number');
    assert.ok(j1.result && Array.isArray(j1.result.added) && Array.isArray(j1.result.updated));
    assert.equal(r1.status, 1, 'json diff should exit 1');

    const r2 = runCli(['sync', '--dry-run', '--json', '--dest', dest, '--upstream', upstreamNoDiff]);
    const j2 = JSON.parse(r2.stdout);
    assert.ok(j2.head);
    assert.equal(r2.status, 0, 'json no diff should exit 0');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.rmSync(upstreamWithDiff, { recursive: true, force: true });
    fs.rmSync(upstreamNoDiff, { recursive: true, force: true });
  }
});

test('sync --help 与 HELP 包含 --all/--force/--dry-run 说明（--apply 已退役）', () => {
  const { stdout } = runCli(['--help']);
  assert.match(stdout, /sync.*--all.*--force.*--dry-run/s, 'HELP sync usage should mention --all|--force|--dry-run');
  assert.doesNotMatch(stdout, /--apply/, 'HELP should not contain deprecated --apply');
  const { stdout: syncHelp } = runCli(['sync', '--help']);
  assert.match(syncHelp, /--dry-run/, 'sync --help should mention --dry-run');
  assert.match(syncHelp, /--all.*范围/, 'sync help should explain --all');
  assert.match(syncHelp, /--force.*力度/, 'sync help should explain --force');
});
