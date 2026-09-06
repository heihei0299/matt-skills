import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: REPO_ROOT, encoding: 'utf8' });
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

function createDestWithCustomAgents(content = 'LOCAL EDIT tdd-implement custom routing') {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  fs.writeFileSync(path.join(dest, 'AGENTS.md'), content);
  fs.mkdirSync(path.join(dest, '.agents/skills'), { recursive: true });
  fs.mkdirSync(path.join(dest, '.opencode'), { recursive: true });
  fs.mkdirSync(path.join(dest, '.pi'), { recursive: true });
  return dest;
}

// --force 已移除，统一验证拒绝
test('sync --force 已移除：报 unknown option', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  try {
    const { status, stderr } = runCli(['sync', '--force', '--dest', dest]);
    assert.equal(status, 1);
    assert.match(stderr, /unknown option '--force'/);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --all --force 同样拒绝', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  try {
    const { status, stderr } = runCli(['sync', '--all', '--force', '--dest', dest]);
    assert.equal(status, 1);
    assert.match(stderr, /unknown option '--force'/);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

// --all 强制更新 AGENTS.md，即使含 tdd-implement 也不跳过，且不产生 .bak
test('sync --all 强制更新 AGENTS.md（即使含 tdd-implement）且不产生 .bak', () => {
  const custom = 'LOCAL EDIT tdd-implement custom routing\nunique-line-12345';
  const dest = createDestWithCustomAgents(custom);
  try {
    const { status } = runCli(['sync', '--all', '--dest', dest]);
    assert.equal(status, 0);
    const bakPath = path.join(dest, 'AGENTS.md.bak');
    assert.ok(!fs.existsSync(bakPath), '.bak 不应产生（已移除硬盖）');
    const after = fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8');
    const template = fs.readFileSync(path.join(REPO_ROOT, 'template/AGENTS.md'), 'utf8');
    assert.equal(after, template, '--all 应覆盖含 tdd-implement 的 AGENTS.md');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync 默认（无 --all）含 tdd-implement 时跳过 AGENTS.md', () => {
  const custom = 'LOCAL EDIT tdd-implement\nkeep me';
  const dest = createDestWithCustomAgents(custom);
  try {
    runCli(['sync', '--dest', dest]);
    const after = fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8');
    assert.equal(after, custom, '默认应跳过含 tdd-implement 的 AGENTS.md');
    assert.ok(!fs.existsSync(path.join(dest, 'AGENTS.md.bak')));
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

// --all 仅同名 upsert，不删多余
test('sync --all 仅同名 upsert：不删多余技能', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  const extraSkill = 'local-extra-not-upstream';
  const extraDir = path.join(dest, '.agents/skills', extraSkill);
  try {
    fs.mkdirSync(extraDir, { recursive: true });
    fs.writeFileSync(path.join(extraDir, 'SKILL.md'), '---\nname: local-extra-not-upstream\ndescription: extra\n---\n# extra');
    const { status } = runCli(['sync', '--all', '--dest', dest]);
    assert.equal(status, 0);
    assert.ok(fs.existsSync(extraDir), '--all 不应删除多余技能');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync 默认也不删多余技能', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  const extra = 'local-extra-compare-default';
  const p = path.join(dest, '.agents/skills', extra);
  try {
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(path.join(p, 'SKILL.md'), 'extra');
    runCli(['sync', '--dest', dest]);
    assert.ok(fs.existsSync(p), '默认也不应删除多余技能');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

// --all 同名技能存在则覆盖，不存在则新增
test('sync --all 同名技能存在则覆盖，不存在则新增（额外文件被清理）', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  const ups = upstreamSkillNames();
  const skillName = ups[0];
  const skillDir = path.join(dest, '.agents/skills', skillName);
  try {
    fs.cpSync(path.join(REPO_ROOT, '.agents/skills', skillName), skillDir, { recursive: true, force: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'LOCAL MODIFIED CONTENT');
    const extraFile = path.join(skillDir, 'EXTRA_SHOULD_BE_REMOVED.md');
    fs.writeFileSync(extraFile, 'extra');
    const { status } = runCli(['sync', '--all', '--dest', dest]);
    assert.equal(status, 0);
    const afterContent = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const srcContent = fs.readFileSync(path.join(REPO_ROOT, '.agents/skills', skillName, 'SKILL.md'), 'utf8');
    assert.equal(afterContent, srcContent, '同名技能应被覆盖为模板内容');
    assert.ok(!fs.existsSync(extraFile), 'rm+cp 应清理技能目录内多余文件');
    // 验证不存在的同名技能会新增：选一个模板中存在但 dest 中不存在的技能
    const anotherSkill = ups[1];
    const anotherDir = path.join(dest, '.agents/skills', anotherSkill);
    // 确保不存在
    if (fs.existsSync(anotherDir)) fs.rmSync(anotherDir, { recursive: true, force: true });
    assert.ok(!fs.existsSync(anotherDir));
    runCli(['sync', '--all', '--dest', dest]);
    assert.ok(fs.existsSync(anotherDir), '不存在的同名技能应被新增');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --all 更新 PROPRIETARY 且保留 .bak/.git 不误删', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  const propSkill = 'tdd-implement';
  const propDir = path.join(dest, '.agents/skills', propSkill);
  const bakSkill = path.join(dest, '.agents/skills', 'some-skill.bak');
  const gitDir = path.join(dest, '.agents/skills', '.git');
  try {
    fs.cpSync(path.join(REPO_ROOT, '.agents/skills', propSkill), propDir, { recursive: true, force: true });
    fs.writeFileSync(path.join(propDir, 'SKILL.md'), 'LOCAL PROPRIETARY EDIT');
    const srcProp = fs.readFileSync(path.join(REPO_ROOT, '.agents/skills', propSkill, 'SKILL.md'), 'utf8');
    fs.mkdirSync(bakSkill, { recursive: true });
    fs.writeFileSync(path.join(bakSkill, 'SKILL.md'), 'bak');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'config'), 'git');
    const { status } = runCli(['sync', '--all', '--dest', dest]);
    assert.equal(status, 0);
    assert.ok(fs.existsSync(propDir));
    assert.equal(fs.readFileSync(path.join(propDir, 'SKILL.md'), 'utf8'), srcProp);
    assert.ok(fs.existsSync(bakSkill), '.bak 目录应保留');
    assert.ok(fs.existsSync(gitDir), '.git 应保留');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});
