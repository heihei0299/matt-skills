import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');

// Template files that must land in the target project root.
const TEMPLATE_FILES = [
  'AGENTS.md',
  'PROJECT.md',
  '.agents/skills/tdd-implement/SKILL.md',
  '.agents/skills/diagnose-fix/SKILL.md',
  '.agents/skills/grilling/SKILL.md',
  '.opencode/CONTEXT.md',
  '.opencode/commands/issue-audit.md',
  '.opencode/docs/agents/runtime-discipline.md',
  '.pi/prompts/issue-audit.md',
  '.pi/skills/.gitkeep',
  '.opencode/skills/.gitkeep',
];

const PROJECT_SKILL_DIRS = ['.agents/skills', '.pi/skills', '.opencode/skills', '.claude/skills'];

function runCli(args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function createCliFixture() {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-source-'));
  for (const name of ['.agents', 'bin', 'config', 'template']) {
    fs.cpSync(path.join(REPO_ROOT, name), path.join(source, name), { recursive: true });
  }
  fs.cpSync(path.join(REPO_ROOT, 'package.json'), path.join(source, 'package.json'));
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(source, 'node_modules'), 'dir');
  return source;
}

test('`init` assembles skills from the canonical source, not the template mirror', () => {
  const source = createCliFixture();
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const mirror = path.join(source, 'template', '.agents', 'skills', 'tdd-implement');
    fs.mkdirSync(mirror, { recursive: true });
    fs.writeFileSync(path.join(mirror, 'SKILL.md'), 'TEMPLATE MIRROR ONLY');

    const result = spawnSync(process.execPath, [path.join(source, 'bin', 'cli.js'), 'init', '--dest', dest], {
      cwd: source,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'tdd-implement', 'SKILL.md'), 'utf8'),
      fs.readFileSync(path.join(source, '.agents', 'skills', 'tdd-implement', 'SKILL.md'), 'utf8'),
    );
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --all` can refresh the workspace root without copying skills onto themselves', () => {
  const source = createCliFixture();
  try {
    const result = spawnSync(process.execPath, [path.join(source, 'bin', 'cli.js'), 'init', '--all'], {
      cwd: source,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
  }
});

test('`init --all` includes every distributable source skill directory', () => {
  const source = createCliFixture();
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const skillDir = path.join(source, '.agents', 'skills', 'fixture-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'not listable yet');

    const result = spawnSync(process.execPath, [path.join(source, 'bin', 'cli.js'), 'init', '--all', '--dest', dest], {
      cwd: source,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'fixture-skill', 'SKILL.md'), 'utf8'),
      'not listable yet',
    );
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` copies the default programming template into the target', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板：已(复制|备份)/);
    assert.match(stdout, /技能：已装/);
    for (const rel of TEMPLATE_FILES) {
      assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
    }
    // 独有所需 grilling/grill-me/handoff/show-me 默认安装，其余 productivity 默认不装
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/grilling/SKILL.md')), '独有所需 grilling should be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/teach/SKILL.md')), 'productivity teach should NOT be installed by default');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --all` copies all distributable skills', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    for (const rel of TEMPLATE_FILES) {
      assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` copies default programming skills into all project directories', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    for (const skillsDir of PROJECT_SKILL_DIRS) {
      for (const name of ['tdd-implement', 'diagnose-fix']) {
        assert.ok(
          fs.existsSync(path.join(dest, skillsDir, name, 'SKILL.md')),
          `${name} should land in ${skillsDir}`,
        );
      }
      assert.ok(fs.existsSync(path.join(dest, skillsDir, 'grill-to-spec', 'SKILL.md')), `${skillsDir}/grill-to-spec should be installed by default`);
      assert.ok(!fs.existsSync(path.join(dest, skillsDir, 'ci-guard', 'SKILL.md')), `${skillsDir}/ci-guard should NOT be installed by default`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --all` refreshes an existing target', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--all', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'STALE AGENTS');
    fs.mkdirSync(path.join(dest, '.agents', 'skills', 'ci-guard'), { recursive: true });
    fs.writeFileSync(path.join(dest, '.agents', 'skills', 'ci-guard', 'SKILL.md'), 'STALE SKILL');
    const { status, stdout, stderr } = runCli(['init', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板：已复制/);
    assert.equal(
      fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'),
      fs.readFileSync(path.join(REPO_ROOT, 'template', 'AGENTS.md'), 'utf8'),
    );
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'ci-guard', 'SKILL.md'), 'utf8'),
      'STALE SKILL',
    );
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` on an already-initialized project skips without overwriting', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL EDIT');
    fs.writeFileSync(path.join(dest, '.agents', 'skills', 'tdd', 'SKILL.md'), 'LOCAL EDIT');
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板已存在（AGENTS.md），跳过/);
    // 模板已存在时不再打印新增计数，而是跳过
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'LOCAL EDIT');
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'tdd', 'SKILL.md'), 'utf8'),
      'LOCAL EDIT',
    );
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --force` is rejected (no hard overwrite)', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL EDIT');
    const { status, stderr } = runCli(['init', '--dest', dest, '--force']);
    assert.equal(status, 1);
    assert.match(stderr, /unknown option '--force'/);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'LOCAL EDIT');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --force --all` is rejected', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    const { status, stderr } = runCli(['init', '--all', '--dest', dest, '--force']);
    assert.equal(status, 1);
    assert.match(stderr, /unknown option '--force'/);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` without --dest targets the current working directory (programming)', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['init'], cwd);
    assert.equal(status, 0, stderr);
    assert.ok(fs.existsSync(path.join(cwd, 'AGENTS.md')));
    for (const skillsDir of PROJECT_SKILL_DIRS) {
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'tdd-implement', 'SKILL.md')));
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'diagnose-fix', 'SKILL.md')));
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'grill-to-spec', 'SKILL.md')), `${skillsDir}/grill-to-spec should be installed by default`);
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'grilling', 'SKILL.md')), `${skillsDir}/grilling should be installed by default`);
    }
    assert.match(stdout, new RegExp(`目标路径：${cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
