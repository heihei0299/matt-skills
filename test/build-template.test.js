import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The builder reads only these repository sources. Copying them wholesale keeps
// the fixture correct when a source file is added, renamed, or reworded.
const BUILDER_SOURCES = ['scripts', 'config', 'docs/agents', 'AGENTS.md', 'CONTEXT.md'];

function createBuilderFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'matt-skills-template-'));
  for (const name of BUILDER_SOURCES) {
    cpSync(path.join(REPO_ROOT, name), path.join(root, name), { recursive: true });
  }
  return root;
}

function runBuilder(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts/build-template.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

function listFiles(relative, base = REPO_ROOT) {
  const files = [];
  for (const entry of readdirSync(path.join(base, relative), { withFileTypes: true })) {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(next, base));
    else files.push(next);
  }
  return files.sort();
}

test('build-template needs no workspace-only harness sources', () => {
  const root = createBuilderFixture();
  try {
    const result = runBuilder(root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('build-template creates the skeleton without a shared Skill source or mirror', () => {
  const root = createBuilderFixture();
  try {
    const result = runBuilder(root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(path.join(root, 'template', '.agents')), false);
    for (const rel of ['.opencode/commands', '.opencode/agents', '.pi/agents', '.pi/prompts', '.codex']) {
      assert.equal(existsSync(path.join(root, 'template', rel)), false, `${rel} should not be projected`);
    }
    assert.equal(existsSync(path.join(root, 'template', '.opencode', 'docs', 'agents')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('build-template projects the workspace AGENTS.md unchanged', () => {
  const root = createBuilderFixture();
  try {
    const result = runBuilder(root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(path.join(root, 'template', 'AGENTS.md'), 'utf8'),
      readFileSync(path.join(root, 'AGENTS.md'), 'utf8'),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('committed template/ matches a fresh build', () => {
  const root = createBuilderFixture();
  try {
    const result = runBuilder(root);
    assert.equal(result.status, 0, result.stderr);
    const built = listFiles('template', root);
    const committed = listFiles('template');
    assert.deepEqual(built, committed, 'template/ file set drifted; run npm run build:template');
    for (const relative of built) {
      assert.equal(
        readFileSync(path.join(root, relative), 'utf8'),
        readFileSync(path.join(REPO_ROOT, relative), 'utf8'),
        `${relative} is stale; run npm run build:template`,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
