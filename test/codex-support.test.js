import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SMOKE = path.join(REPO_ROOT, 'scripts', 'codex-smoke.js');
const CLI = path.join(REPO_ROOT, 'bin', 'cli.js');
const PACKAGE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const README = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');

function runSmoke(env = {}) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.CODEX_E2E;
  return spawnSync(process.execPath, [SMOKE], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...cleanEnv, ...env },
  });
}

function runCli(args, cwd, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function withFakeCodex(source, callback) {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-fake-codex-'));
  const codex = path.join(binDir, 'codex');
  fs.writeFileSync(codex, `#!${process.execPath}\n${source}\n`, { mode: 0o755 });
  try {
    return callback(`${binDir}:${process.env.PATH || ''}`);
  } finally {
    fs.rmSync(binDir, { recursive: true, force: true });
  }
}

test('codex smoke without opt-in reports SKIP and exits 0', () => {
  const result = runSmoke();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SKIP/);
});

test('package exposes and publishes the Codex smoke entrypoint', () => {
  assert.equal(PACKAGE.scripts['codex:smoke'], 'node scripts/codex-smoke.js');
  assert.ok(PACKAGE.files.includes('scripts/codex-smoke.js'));
});

test('README defines the Codex CLI support boundary and smoke command', () => {
  assert.match(README, /^## Codex CLI 支持$/m);
  assert.match(README, /\.agents\/skills\/.*唯一共享源/);
  assert.match(README, /npm run codex:smoke/);
  assert.match(README, /CODEX_E2E=1 npm run codex:smoke/);
  assert.match(README, /Codex Cloud/);
  assert.match(README, /\.codex\/skills/);
});

test('opt-in smoke reports FAIL_ENV when Codex is unavailable', () => {
  const result = runSmoke({ CODEX_E2E: '1', PATH: path.join(REPO_ROOT, 'missing-codex-bin') });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /FAIL_ENV/);
  assert.match(result.stdout, /codex.*(not found|unavailable|不可用|未找到)/i);
});

test('opt-in smoke passes with a real Codex CLI when enabled', {
  skip: process.env.CODEX_E2E !== '1',
}, () => {
  const result = runSmoke({ CODEX_E2E: '1' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS/);
  assert.match(result.stdout, /AGENTS\.md and codex-probe skill sentinels verified/);
});

test('template keeps Codex on the shared project skill source', () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'template', 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'template', '.agents', 'skills', 'tdd-implement', 'SKILL.md')));
  assert.equal(fs.existsSync(path.join(REPO_ROOT, 'template', '.codex')), false);
});

test('Codex is an accepted target with shared project/global mappings and skill metadata', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-codex-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-codex-home-'));
  try {
    const projectResult = runCli(['install', '--tools', 'codex', '--all'], project);
    assert.equal(projectResult.status, 0, projectResult.stderr);
    assert.ok(fs.existsSync(path.join(project, '.agents', 'skills', 'tdd-implement', 'SKILL.md')));
    assert.equal(fs.existsSync(path.join(project, '.codex', 'skills')), false);

    const globalResult = runCli(['install', '--global', '--tools', 'codex', '--all'], project, { HOME: home });
    assert.equal(globalResult.status, 0, globalResult.stderr);
    assert.ok(fs.existsSync(path.join(home, '.codex', 'skills', 'tdd-implement', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(REPO_ROOT, '.agents', 'skills', 'tdd-implement', 'agents', 'openai.yaml')));
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('opt-in smoke reports FAIL_CONTRACT when Codex omits sentinels', () => {
  withFakeCodex([
    "if (process.argv.includes('--version')) console.log('codex-cli fake');",
    "else { console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'no markers' } })); console.log(JSON.stringify({ type: 'turn.completed' })); }",
  ].join('\n'), (pathValue) => {
    const result = runSmoke({ CODEX_E2E: '1', PATH: pathValue });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL_CONTRACT/);
    assert.match(result.stdout, /AGENTS\.md sentinel/);
    assert.match(result.stdout, /skill sentinel/);
  });
});

test('smoke cannot pass from sentinels echoed by the prompt alone', () => {
  withFakeCodex([
    "if (process.argv.includes('--version')) console.log('codex-cli fake');",
    "else {",
    "  const prompt = process.argv.slice(2).join(' ');",
    "  const text = prompt.includes('MATT_CODEX_') ? 'MATT_CODEX_AGENTS_SENTINEL=agents-loaded MATT_CODEX_SKILL_SENTINEL=skill-loaded' : 'no markers';",
    "  console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text } }));",
    "  console.log(JSON.stringify({ type: 'turn.completed' }));",
    "}",
  ].join('\n'), (pathValue) => {
    const result = runSmoke({ CODEX_E2E: '1', PATH: pathValue });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL_CONTRACT/);
  });
});

test('smoke rejects an incomplete Codex event stream', () => {
  withFakeCodex([
    "if (process.argv.includes('--version')) console.log('codex-cli fake');",
    "else console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'MATT_CODEX_AGENTS_SENTINEL=agents-loaded MATT_CODEX_SKILL_SENTINEL=skill-loaded' } }));",
  ].join('\n'), (pathValue) => {
    const result = runSmoke({ CODEX_E2E: '1', PATH: pathValue });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL_ENV/);
  });
});

test('smoke classifies a completed contract failure separately from environment failure', () => {
  withFakeCodex([
    "if (process.argv.includes('--version')) console.log('codex-cli fake');",
    "else {",
    "  console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'no markers' } }));",
    "  console.log(JSON.stringify({ type: 'turn.completed' }));",
    "  process.exitCode = 7;",
    "}",
  ].join('\n'), (pathValue) => {
    const result = runSmoke({ CODEX_E2E: '1', PATH: pathValue });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL_CONTRACT/);
  });
});

test('Codex static contract includes skill metadata and template instructions', () => {
  const skill = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'tdd-implement', 'SKILL.md'), 'utf8');
  const metadata = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'tdd-implement', 'agents', 'openai.yaml'), 'utf8');
  const templateAgents = fs.readFileSync(path.join(REPO_ROOT, 'template', 'AGENTS.md'), 'utf8');
  assert.match(skill, /name: tdd-implement/);
  assert.match(metadata, /interface:/);
  assert.match(metadata, /display_name:/);
  assert.match(metadata, /short_description:/);
  assert.match(templateAgents, /## 路由|行为路由|AGENTS\.md/);
});

test('smoke classifies malformed JSONL as FAIL_ENV', () => {
  withFakeCodex([
    "if (process.argv.includes('--version')) console.log('codex-cli fake');",
    "else {",
    "  console.log('{malformed-json');",
    "  console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'MATT_CODEX_AGENTS_SENTINEL=agents-loaded MATT_CODEX_SKILL_SENTINEL=skill-loaded' } }));",
    "  console.log(JSON.stringify({ type: 'turn.completed' }));",
    "}",
  ].join('\n'), (pathValue) => {
    const result = runSmoke({ CODEX_E2E: '1', PATH: pathValue });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL_ENV/);
    assert.match(result.stdout, /malformed|JSONL/i);
  });
});

test('smoke ignores progress items and checks the final agent response', () => {
  withFakeCodex([
    "if (process.argv.includes('--version')) console.log('codex-cli fake');",
    "else {",
    "  console.log(JSON.stringify({ type: 'item.completed', item: { type: 'reasoning', text: 'MATT_CODEX_AGENTS_SENTINEL=agents-loaded MATT_CODEX_SKILL_SENTINEL=skill-loaded' } }));",
    "  console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'no markers' } }));",
    "  console.log(JSON.stringify({ type: 'turn.completed' }));",
    "}",
  ].join('\n'), (pathValue) => {
    const result = runSmoke({ CODEX_E2E: '1', PATH: pathValue });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL_CONTRACT/);
  });
});

test('smoke rejects agent messages after turn completion', () => {
  withFakeCodex([
    "if (process.argv.includes('--version')) console.log('codex-cli fake');",
    "else {",
    "  console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'no markers' } }));",
    "  console.log(JSON.stringify({ type: 'turn.completed' }));",
    "  console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'MATT_CODEX_AGENTS_SENTINEL=agents-loaded MATT_CODEX_SKILL_SENTINEL=skill-loaded' } }));",
    "}",
  ].join('\n'), (pathValue) => {
    const result = runSmoke({ CODEX_E2E: '1', PATH: pathValue });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL_ENV/);
  });
});
