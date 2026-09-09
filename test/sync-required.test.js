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

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
}

function localUpstreamNames() {
  const prop = new Set(readJson('config/proprietary.json').all);
  return fs
    .readdirSync(path.join(REPO_ROOT, '.agents/skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.endsWith('.bak'))
    .map((e) => e.name)
    .filter((n) => !prop.has(n) && n !== '.git' && n !== 'skill-creator')
    .sort();
}

// 按真实上游布局造 fake 上游：engineering/ + productivity/ 双桶
function createBucketedUpstream({ modifySkill = null, modifyBucket = 'productivity' } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-upstream-buckets-'));
  const eng = path.join(tmp, 'skills/engineering');
  const prod = path.join(tmp, 'skills/productivity');
  fs.mkdirSync(eng, { recursive: true });
  fs.mkdirSync(prod, { recursive: true });
  const engineering = new Set(readJson('config/engineering.json'));
  for (const name of localUpstreamNames()) {
    const src = path.join(REPO_ROOT, '.agents/skills', name);
    const dest = path.join(engineering.has(name) ? eng : prod, name);
    fs.cpSync(src, dest, { recursive: true, force: true });
  }
  if (modifySkill) {
    const md = path.join(modifyBucket === 'engineering' ? eng : prod, modifySkill, 'SKILL.md');
    assert.ok(fs.existsSync(md), `fake upstream missing ${modifyBucket}/${modifySkill}`);
    fs.appendFileSync(md, '\n# modified for test\n');
  }
  spawnSync('git', ['init'], { cwd: tmp, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmp });
  spawnSync('git', ['config', 'user.name', 'test'], { cwd: tmp });
  spawnSync('git', ['add', '.'], { cwd: tmp });
  const commit = spawnSync('git', ['commit', '-m', 'init'], { cwd: tmp, encoding: 'utf8' });
  if (commit.status !== 0) throw new Error(`git commit failed: ${commit.stderr} ${commit.stdout}`);
  return tmp;
}

// 默认范围 = engineering + 独有所需（config/required.json）：grilling 在 productivity 桶但默认同步
test('check 默认覆盖独有所需：productivity 桶的 grilling 一致时无差异', () => {
  const required = readJson('config/required.json');
  assert.ok(required.includes('grilling'), 'config/required.json 应包含 grilling');
  const upstream = createBucketedUpstream();
  try {
    const t = runCli(['check', '--upstream', upstream]);
    assert.match(t.stdout, /上游 HEAD:/);
    assert.match(t.stdout, /默认.+engineering \+ 独有所需/, `mode hint 缺失:\n${t.stdout}`);
    assert.match(t.stdout, /已是最新，无差异/);
    assert.equal(t.status, 0, `expected exit 0, got ${t.status} stdout:\n${t.stdout}`);
    const j = runCli(['check', '--json', '--upstream', upstream]);
    const parsed = JSON.parse(j.stdout);
    assert.ok(parsed.result.same.includes('grilling'), 'grilling 应在默认一致列表中');
    assert.deepEqual(parsed.result.added, []);
    assert.deepEqual(parsed.result.updated, []);
    assert.deepEqual(parsed.result.removed, []);
    assert.equal(j.status, 0);
  } finally {
    fs.rmSync(upstream, { recursive: true, force: true });
  }
});

test('check 默认能发现独有所需的更新：productivity 桶的 grilling 变更即报更新', () => {
  const upstream = createBucketedUpstream({ modifySkill: 'grilling', modifyBucket: 'productivity' });
  try {
    const { status, stdout } = runCli(['check', '--upstream', upstream]);
    assert.match(stdout, /更新 \(1\):.*grilling/s, `应报告 grilling 更新:\n${stdout}`);
    assert.equal(status, 1, `expected exit 1, got ${status}`);
  } finally {
    fs.rmSync(upstream, { recursive: true, force: true });
  }
});

test('非独有所需的 productivity 默认不纳入：teach 变更默认无感、--all 才报', () => {
  const required = new Set(readJson('config/required.json'));
  assert.ok(!required.has('teach'), 'teach 不应在独有所需名单中');
  const upstream = createBucketedUpstream({ modifySkill: 'teach', modifyBucket: 'productivity' });
  try {
    const r1 = runCli(['check', '--upstream', upstream]);
    assert.equal(r1.status, 0, `默认应无差异，got ${r1.status} stdout:\n${r1.stdout}`);
    const r2 = runCli(['check', '--all', '--upstream', upstream]);
    assert.match(r2.stdout, /更新 \(1\):.*teach/s, `--all 应报告 teach 更新:\n${r2.stdout}`);
    assert.equal(r2.status, 1, `expected exit 1, got ${r2.status}`);
  } finally {
    fs.rmSync(upstream, { recursive: true, force: true });
  }
});
