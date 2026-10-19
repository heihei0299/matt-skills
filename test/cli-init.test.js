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
  '.agents/skills/initialize-project/SKILL.md',
  '.agents/skills/grill-with-docs/SKILL.md',
  '.agents/skills/grilling/SKILL.md',
  '.agents/skills/to-spec/SKILL.md',
  '.agents/skills/to-tickets/SKILL.md',
];

const HARNESS_TEMPLATE_FILES = [
  '.opencode/CONTEXT.md',
  '.opencode/docs/agents/runtime-discipline.md',
  '.pi/skills/.gitkeep',
  '.opencode/skills/.gitkeep',
];

const PROJECT_SKILL_DIRS = ['.agents/skills'];
const HARNESS_SKILL_DIRS = ['.pi/skills', '.opencode/skills', '.claude/skills'];

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
    const mirror = path.join(source, 'template', '.agents', 'skills', 'grill-with-docs');
    fs.mkdirSync(mirror, { recursive: true });
    fs.writeFileSync(path.join(mirror, 'SKILL.md'), 'TEMPLATE MIRROR ONLY');

    const result = spawnSync(process.execPath, [path.join(source, 'bin', 'cli.js'), 'init', '--dest', dest], {
      cwd: source,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'grill-with-docs', 'SKILL.md'), 'utf8'),
      fs.readFileSync(path.join(source, '.agents', 'skills', 'grill-with-docs', 'SKILL.md'), 'utf8'),
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

test('`init` copies the default workflow template into the target', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板：已(复制|备份)/);
    assert.match(stdout, /技能：已装/);
    for (const rel of TEMPLATE_FILES) {
      assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
    }
    for (const rel of ['.opencode/commands', '.opencode/agents', '.pi/agents', '.pi/prompts', '.codex']) {
      assert.equal(fs.existsSync(path.join(dest, rel)), false, `${rel} should not be distributed`);
    }
    assert.equal(fs.existsSync(path.join(dest, '.opencode')), false, '.opencode should not be distributed by default');
    assert.equal(fs.existsSync(path.join(dest, '.pi')), false, '.pi should not be distributed by default');
    // 默认安装工作流闭包，不安装 grill-me 或其它未纳入默认集合的 skill。
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/domain-modeling/SKILL.md')), 'domain-modeling should be installed by default');
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/grill-with-docs/SKILL.md')), 'grill-with-docs should be installed by default');
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/grilling/SKILL.md')), 'grilling should be installed by default');
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/initialize-project/SKILL.md')), 'initialize-project should be installed by default');
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/setup-matt-pocock-skills/SKILL.md')), 'setup-matt-pocock-skills should be installed by default');
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/tdd/SKILL.md')), 'tdd should be installed by default');
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/diagnosing-bugs/SKILL.md')), 'diagnosing-bugs should be installed by default');
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/to-spec/SKILL.md')), 'to-spec should be installed by default');
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/to-tickets/SKILL.md')), 'to-tickets should be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/code-review/SKILL.md')), 'code-review should NOT be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/grill-to-spec/SKILL.md')), 'grill-to-spec should NOT be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/tdd-implement/SKILL.md')), 'tdd-implement should NOT be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/wayfinder/SKILL.md')), 'wayfinder should NOT be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/handoff/SKILL.md')), 'handoff should NOT be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/implement/SKILL.md')), 'implement should NOT be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/grill-me/SKILL.md')), 'grill-me should NOT be installed by default');
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
    for (const rel of HARNESS_TEMPLATE_FILES) {
      assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` copies shared skills only into .agents/skills', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    for (const skillsDir of PROJECT_SKILL_DIRS) {
      for (const name of ['initialize-project', 'grill-with-docs']) {
        assert.ok(
          fs.existsSync(path.join(dest, skillsDir, name, 'SKILL.md')),
          `${name} should land in ${skillsDir}`,
        );
      }
      assert.ok(fs.existsSync(path.join(dest, skillsDir, 'to-spec', 'SKILL.md')), `${skillsDir}/to-spec should be installed by default`);
      assert.ok(fs.existsSync(path.join(dest, skillsDir, 'tdd', 'SKILL.md')), `${skillsDir}/tdd should be installed by default`);
      assert.ok(fs.existsSync(path.join(dest, skillsDir, 'diagnosing-bugs', 'SKILL.md')), `${skillsDir}/diagnosing-bugs should be installed by default`);
      assert.ok(!fs.existsSync(path.join(dest, skillsDir, 'grill-to-spec', 'SKILL.md')), `${skillsDir}/grill-to-spec should NOT be installed by default`);
      assert.ok(!fs.existsSync(path.join(dest, skillsDir, 'tdd-implement', 'SKILL.md')), `${skillsDir}/tdd-implement should NOT be installed by default`);
      assert.ok(!fs.existsSync(path.join(dest, skillsDir, 'ci-guard', 'SKILL.md')), `${skillsDir}/ci-guard should NOT be installed by default`);
    }
    const sharedSkills = fs.readdirSync(path.join(dest, '.agents/skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    for (const skillsDir of HARNESS_SKILL_DIRS) {
      const duplicates = sharedSkills.filter((name) => fs.existsSync(path.join(dest, skillsDir, name, 'SKILL.md')));
      assert.deepEqual(duplicates, [], `shared skills should not be duplicated into ${skillsDir}`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --all` preserves project policy and repo-local skills while reinstalling managed skills', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--all', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'STALE AGENTS');
    fs.mkdirSync(path.join(dest, '.agents', 'skills', 'ci-guard'), { recursive: true });
    fs.writeFileSync(path.join(dest, '.agents', 'skills', 'ci-guard', 'SKILL.md'), 'STALE SKILL');
    const { status, stdout, stderr } = runCli(['init', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /AGENTS\.md.*保留/);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'STALE AGENTS');
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'ci-guard', 'SKILL.md'), 'utf8'),
      'STALE SKILL',
    );
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` reinstalls managed skills without overwriting project policy or project-local skills', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL EDIT');
    fs.writeFileSync(path.join(dest, '.agents', 'skills', 'grill-with-docs', 'SKILL.md'), 'LOCAL EDIT');
    fs.mkdirSync(path.join(dest, '.agents/skills/project-only'));
    fs.writeFileSync(path.join(dest, '.agents/skills/project-only/SKILL.md'), 'project content');
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /AGENTS\.md.*保留/);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'LOCAL EDIT');
    assert.equal(fs.readFileSync(path.join(dest, '.agents/skills/project-only/SKILL.md'), 'utf8'), 'project content');
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'grill-with-docs', 'SKILL.md'), 'utf8'),
      fs.readFileSync(path.join(REPO_ROOT, '.agents/skills/grill-with-docs/SKILL.md'), 'utf8'),
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
    assert.equal(status, 2);
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
    assert.equal(status, 2);
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
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'initialize-project', 'SKILL.md')));
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'grill-with-docs', 'SKILL.md')));
      assert.ok(!fs.existsSync(path.join(cwd, skillsDir, 'wayfinder', 'SKILL.md')));
      assert.ok(!fs.existsSync(path.join(cwd, skillsDir, 'handoff', 'SKILL.md')));
      assert.ok(!fs.existsSync(path.join(cwd, skillsDir, 'implement', 'SKILL.md')));
      assert.ok(!fs.existsSync(path.join(cwd, skillsDir, 'code-review', 'SKILL.md')));
      assert.ok(!fs.existsSync(path.join(cwd, skillsDir, 'grill-to-spec', 'SKILL.md')), `${skillsDir}/grill-to-spec should NOT be installed by default`);
      assert.ok(!fs.existsSync(path.join(cwd, skillsDir, 'tdd-implement', 'SKILL.md')), `${skillsDir}/tdd-implement should NOT be installed by default`);
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'tdd', 'SKILL.md')), `${skillsDir}/tdd should be installed by default`);
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'diagnosing-bugs', 'SKILL.md')), `${skillsDir}/diagnosing-bugs should be installed by default`);
      assert.ok(fs.existsSync(path.join(cwd, skillsDir, 'grilling', 'SKILL.md')), `${skillsDir}/grilling should be installed by default`);
    }
    assert.equal(fs.existsSync(path.join(cwd, '.opencode')), false, '.opencode should not be distributed by default');
    assert.equal(fs.existsSync(path.join(cwd, '.pi')), false, '.pi should not be distributed by default');
    for (const skillsDir of HARNESS_SKILL_DIRS) {
      assert.ok(!fs.existsSync(path.join(cwd, skillsDir, 'tdd-implement', 'SKILL.md')));
    }
    assert.match(stdout, new RegExp(`目标路径：${cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});


test('init installs selected skills into a repository with pre-existing project rules', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-existing-'));
  try {
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'Project policy stays byte-for-byte.\n');
    const result = runCli(['init', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'Project policy stays byte-for-byte.\n');
    for (const name of ['tdd', 'codebase-design', 'grill-with-docs', 'grilling', 'domain-modeling']) {
      assert.ok(fs.existsSync(path.join(dest, '.agents/skills', name, 'SKILL.md')), `${name} must be installed`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});


test('init retries an interrupted skill copy while preserving the project policy', () => {
  const source = createCliFixture();
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-interrupted-'));
  try {
    const preload = path.join(source, 'fail-copy.cjs');
    fs.writeFileSync(preload, `
      const fs = require('node:fs/promises');
      const cp = fs.cp;
      fs.cp = async (from, ...args) => {
        if (require('node:path').basename(String(from)) === 'grilling') throw new Error('injected skill copy failure');
        return cp(from, ...args);
      };
      require('node:module').syncBuiltinESMExports();
    `);
    const cli = path.join(source, 'bin/cli.js');
    const failed = spawnSync(process.execPath, ['--require', preload, cli, 'init', '--dest', dest], { cwd: source, encoding: 'utf8' });
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /injected skill copy failure/);
    const policy = fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8');
    const retried = spawnSync(process.execPath, [cli, 'init', '--dest', dest], { cwd: source, encoding: 'utf8' });
    assert.equal(retried.status, 0, retried.stderr);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), policy);
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/grilling/SKILL.md')));
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('init preserves existing project documents even when AGENTS.md is absent', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-docs-'));
  try {
    fs.writeFileSync(path.join(dest, 'PROJECT.md'), 'project-owned facts\n');
    const result = runCli(['init', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(dest, 'PROJECT.md'), 'utf8'), 'project-owned facts\n');
    assert.ok(fs.existsSync(path.join(dest, 'AGENTS.md')));
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});


test('init retries a partial template copy instead of treating AGENTS.md as complete setup', () => {
  const source = createCliFixture();
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-template-retry-'));
  try {
    const preload = path.join(source, 'fail-template.cjs');
    fs.writeFileSync(preload, `
      const fs = require('node:fs/promises');
      const path = require('node:path');
      const cp = fs.cp;
      fs.cp = async (from, to, ...args) => {
        if (path.basename(String(from)) === 'template') {
          await fs.mkdir(to, { recursive: true });
          await fs.copyFile(path.join(from, 'AGENTS.md'), path.join(to, 'AGENTS.md'));
          throw new Error('injected template copy failure');
        }
        return cp(from, to, ...args);
      };
      require('node:module').syncBuiltinESMExports();
    `);
    const cli = path.join(source, 'bin/cli.js');
    const args = [cli, 'init', '--all', '--dest', dest];
    const failed = spawnSync(process.execPath, ['--require', preload, ...args], { cwd: source, encoding: 'utf8' });
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /injected template copy failure/);
    const policy = fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8');
    const retried = spawnSync(process.execPath, args, { cwd: source, encoding: 'utf8' });
    assert.equal(retried.status, 0, retried.stderr);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), policy);
    for (const relative of ['PROJECT.md', '.pi/CONTEXT.md', '.opencode/CONTEXT.md', '.agents/skills/grilling/SKILL.md']) {
      assert.ok(fs.existsSync(path.join(dest, relative)), `${relative} must be completed on retry`);
    }
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  }
});
