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

// Seam 1: AGENTS.md 备份硬盖 — --force 先 backupIfExists 到 .bak 再 cp -r force
test('sync --force 硬盖：AGENTS.md 备份到 .bak 且被模板覆盖', () => {
  const custom = 'LOCAL EDIT tdd-implement custom routing\nunique-line-12345';
  const dest = createDestWithCustomAgents(custom);
  try {
    const { status, stdout } = runCli(['sync', '--force', '--dest', dest]);
    assert.equal(status, 0, `exit 0 expected got ${status} stdout:${stdout}`);
    // .bak 存在且内容为原始定制
    const bakPath = path.join(dest, 'AGENTS.md.bak');
    assert.ok(fs.existsSync(bakPath), '.bak 应存在');
    assert.equal(fs.readFileSync(bakPath, 'utf8'), custom, '.bak 内容应为原始定制');
    // AGENTS.md 变为模板
    const after = fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8');
    const template = fs.readFileSync(path.join(REPO_ROOT, 'template/AGENTS.md'), 'utf8');
    assert.equal(after, template, 'AGENTS.md 应被模板覆盖');
    assert.match(stdout, /已覆盖/, '输出应含"已覆盖"');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --force 即使含 tdd-implement 也不跳过（对比 --apply 跳过）', () => {
  const custom = 'LOCAL EDIT tdd-implement\nkeep me';
  const destForce = createDestWithCustomAgents(custom);
  const destApply = createDestWithCustomAgents(custom);
  try {
    runCli(['sync', '--force', '--dest', destForce]);
    const afterForce = fs.readFileSync(path.join(destForce, 'AGENTS.md'), 'utf8');
    const template = fs.readFileSync(path.join(REPO_ROOT, 'template/AGENTS.md'), 'utf8');
    assert.equal(afterForce, template, '--force 应覆盖含 tdd-implement 的 AGENTS.md');
    assert.ok(fs.existsSync(path.join(destForce, 'AGENTS.md.bak')), '--force 应产生 .bak');

    runCli(['sync', '--apply', '--dest', destApply]);
    const afterApply = fs.readFileSync(path.join(destApply, 'AGENTS.md'), 'utf8');
    assert.equal(afterApply, custom, '--apply 应跳过含 tdd-implement 的 AGENTS.md');
    assert.ok(!fs.existsSync(path.join(destApply, 'AGENTS.md.bak')), '--apply 跳过时不应产生 .bak');
  } finally {
    fs.rmSync(destForce, { recursive: true, force: true });
    fs.rmSync(destApply, { recursive: true, force: true });
  }
});

// Seam 2: 技能 remove 全做 — 上游已删的本地技能被 rm 删除
test('sync --force 删除 remove 列表技能（本地多余非独有技能被 rm）', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  const extraSkill = 'local-extra-not-upstream';
  const extraDir = path.join(dest, '.agents/skills', extraSkill);
  try {
    fs.mkdirSync(extraDir, { recursive: true });
    fs.writeFileSync(path.join(extraDir, 'SKILL.md'), '---\nname: local-extra-not-upstream\ndescription: extra\n---\n# extra');
    assert.ok(fs.existsSync(extraDir));

    const { status } = runCli(['sync', '--force', '--dest', dest]);
    assert.equal(status, 0);
    assert.ok(!fs.existsSync(extraDir), 'remove 列表的技能在 --force 下应被删除');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --force 更新 PROPRIETARY 且保留 .bak/.git 不误删', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  const propSkill = 'tdd-implement';
  const propDir = path.join(dest, '.agents/skills', propSkill);
  const bakSkill = path.join(dest, '.agents/skills', 'some-skill.bak');
  const gitDir = path.join(dest, '.agents/skills', '.git');
  const extraSkill = 'local-extra-keep-check';
  try {
    fs.cpSync(path.join(REPO_ROOT, '.agents/skills', propSkill), propDir, { recursive: true, force: true });
    fs.writeFileSync(path.join(propDir, 'SKILL.md'), 'LOCAL PROPRIETARY EDIT');
    const beforeProp = fs.readFileSync(path.join(propDir, 'SKILL.md'), 'utf8');
    const srcProp = fs.readFileSync(path.join(REPO_ROOT, '.agents/skills', propSkill, 'SKILL.md'), 'utf8');

    fs.mkdirSync(bakSkill, { recursive: true });
    fs.writeFileSync(path.join(bakSkill, 'SKILL.md'), 'bak');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'config'), 'git');

    fs.mkdirSync(path.join(dest, '.agents/skills', extraSkill), { recursive: true });
    fs.writeFileSync(path.join(dest, '.agents/skills', extraSkill, 'SKILL.md'), 'extra');

    const { status } = runCli(['sync', '--force', '--dest', dest]);
    assert.equal(status, 0);
    // PROPRIETARY 随全量同步更新（目录保留，内容更新为最新）
    assert.ok(fs.existsSync(propDir), 'PROPRIETARY 技能目录应保留');
    assert.equal(fs.readFileSync(path.join(propDir, 'SKILL.md'), 'utf8'), srcProp, 'PROPRIETARY 应被更新为最新');
    assert.notEqual(fs.readFileSync(path.join(propDir, 'SKILL.md'), 'utf8'), beforeProp, '不应保留旧编辑');
    // .bak 保留
    assert.ok(fs.existsSync(bakSkill), '.bak 目录应保留');
    // .git 保留
    assert.ok(fs.existsSync(gitDir), '.git 应保留');
    // 非独有 extra 被删
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills', extraSkill)), '非独有 extra 应被删除');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --force 上游技能强制覆盖 rm+cp（额外文件被清理）', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  const ups = upstreamSkillNames();
  const skillName = ups[0];
  const skillDir = path.join(dest, '.agents/skills', skillName);
  try {
    fs.cpSync(path.join(REPO_ROOT, '.agents/skills', skillName), skillDir, { recursive: true, force: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'LOCAL MODIFIED CONTENT');
    const extraFile = path.join(skillDir, 'EXTRA_SHOULD_BE_REMOVED.md');
    fs.writeFileSync(extraFile, 'extra');
    assert.ok(fs.existsSync(extraFile));

    const { status } = runCli(['sync', '--force', '--dest', dest]);
    assert.equal(status, 0);
    const afterContent = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const srcContent = fs.readFileSync(path.join(REPO_ROOT, '.agents/skills', skillName, 'SKILL.md'), 'utf8');
    assert.equal(afterContent, srcContent, 'SKILL.md 应被强制覆盖为上游内容');
    assert.ok(!fs.existsSync(extraFile), 'rm+cp 应删除技能目录内多余文件');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

// Seam 3: template/.opencode/.pi 硬盖 — add/update 全做，模板文件被更新
test('sync --force 模板硬盖：.opencode/.pi 文件被更新为模板', () => {
  const dest = createDestWithCustomAgents('LOCAL tdd-implement');
  try {
    const templateOpencode = path.join(REPO_ROOT, 'template/.opencode/CONTEXT.md');
    const destContext = path.join(dest, '.opencode/CONTEXT.md');
    const templatePiFile = path.join(REPO_ROOT, 'template/.pi/prompts/issue-audit.md');
    const destPi = path.join(dest, '.pi/prompts/issue-audit.md');
    if (fs.existsSync(templateOpencode)) {
      fs.mkdirSync(path.dirname(destContext), { recursive: true });
      fs.writeFileSync(destContext, 'OLD CONTENT');
    }
    if (fs.existsSync(templatePiFile)) {
      fs.mkdirSync(path.dirname(destPi), { recursive: true });
      fs.writeFileSync(destPi, 'OLD PI CONTENT');
    }

    const { status } = runCli(['sync', '--force', '--dest', dest]);
    assert.equal(status, 0);

    if (fs.existsSync(templateOpencode)) {
      const expected = fs.readFileSync(templateOpencode, 'utf8');
      const actual = fs.readFileSync(destContext, 'utf8');
      assert.equal(actual, expected, '.opencode/CONTEXT.md 应被硬盖为模板');
    }
    if (fs.existsSync(templatePiFile)) {
      const expected = fs.readFileSync(templatePiFile, 'utf8');
      const actual = fs.readFileSync(destPi, 'utf8');
      assert.equal(actual, expected, '.pi/prompts/issue-audit.md 应被硬盖为模板');
    }
    // AGENTS.md 硬盖已在 seam1 验证，此处额外确认 .opencode/.pi 目录同步后 AGENTS 也已覆盖
    const afterAgents = fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8');
    const templateAgents = fs.readFileSync(path.join(REPO_ROOT, 'template/AGENTS.md'), 'utf8');
    assert.equal(afterAgents, templateAgents);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('sync --force 与 --apply 差异：--force 删除多余技能，--apply 保留', () => {
  const destForce = createDestWithCustomAgents('LOCAL tdd-implement');
  const destApply = createDestWithCustomAgents('LOCAL tdd-implement');
  const extra = 'local-extra-compare';
  for (const d of [destForce, destApply]) {
    const p = path.join(d, '.agents/skills', extra);
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(path.join(p, 'SKILL.md'), 'extra');
  }
  try {
    runCli(['sync', '--force', '--dest', destForce]);
    runCli(['sync', '--apply', '--dest', destApply]);
    assert.ok(!fs.existsSync(path.join(destForce, '.agents/skills', extra)), '--force 应删除多余技能');
    assert.ok(fs.existsSync(path.join(destApply, '.agents/skills', extra)), '--apply 应保留多余技能');
  } finally {
    fs.rmSync(destForce, { recursive: true, force: true });
    fs.rmSync(destApply, { recursive: true, force: true });
  }
});
