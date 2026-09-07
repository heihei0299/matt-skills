#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const AGENTS_SENTINEL = 'MATT_CODEX_AGENTS_SENTINEL=agents-loaded';
const SKILL_SENTINEL = 'MATT_CODEX_SKILL_SENTINEL=skill-loaded';

function printResult(kind, message = '') {
  process.stdout.write(`${kind}${message ? `: ${message}` : ''}\n`);
}

function commandOutput(result) {
  return [result.stdout, result.stderr, result.error?.message]
    .filter(Boolean)
    .join('\n')
    .trim();
}

function detectCodex() {
  const result = spawnSync('codex', ['--version'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    return { ok: false, reason: `Codex CLI unavailable: ${commandOutput(result) || 'codex was not found'}` };
  }
  return { ok: true, version: commandOutput(result).split(/\r?\n/, 1)[0] };
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-codex-smoke-'));
  const skillDir = path.join(root, '.agents', 'skills', 'codex-probe');
  fs.mkdirSync(path.join(skillDir, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), [
    '# Codex smoke fixture',
    '',
    `When responding to the smoke probe, include the exact marker ${AGENTS_SENTINEL}.`,
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), [
    '---',
    'name: codex-probe',
    'description: Use when validating Codex project skill discovery.',
    '---',
    '',
    `When the probe asks you to use this skill, include the exact marker ${SKILL_SENTINEL}.`,
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(skillDir, 'agents', 'openai.yaml'), [
    'interface:',
    '  display_name: Codex Probe',
    '  short_description: Validate Codex skill discovery',
  ].join('\n') + '\n');
  return root;
}

function finalAgentMessage(stdout) {
  const events = [];
  let malformed = false;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      malformed = true;
    }
  }
  const turnCompleted = events.at(-1)?.type === 'turn.completed';
  let text = '';
  let agentMessageIndex = -1;
  events.forEach((event, index) => {
    if (event?.item?.type === 'agent_message' && typeof event.item.text === 'string') {
      text = event.item.text;
      agentMessageIndex = index;
    }
  });
  return {
    text,
    completed: turnCompleted && agentMessageIndex >= 0 && agentMessageIndex < events.length - 1,
    malformed,
  };
}

function runCodex(fixture) {
  const prompt = [
    'Run the Codex support probe.',
    'Use the codex-probe skill explicitly if it is available.',
    'Follow the project AGENTS.md instructions.',
    'In the final response state the exact markers required by the discovered project instructions, and do not modify files.',
  ].join(' ');
  return spawnSync('codex', [
    'exec', '--ephemeral', '--sandbox', 'read-only', '--json',
    '--skip-git-repo-check', prompt,
  ], { cwd: fixture, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function run() {
  if (process.env.CODEX_E2E !== '1') {
    printResult('SKIP', 'set CODEX_E2E=1 to run the real Codex smoke test');
    return 0;
  }

  const detected = detectCodex();
  if (!detected.ok) {
    printResult('FAIL_ENV', detected.reason);
    return 1;
  }
  process.stdout.write(`Codex version: ${detected.version}\n`);

  let fixture;
  try {
    fixture = createFixture();
    const result = runCodex(fixture);
    const final = finalAgentMessage(result.stdout || '');
    if (final.malformed) {
      printResult('FAIL_ENV', 'malformed JSONL event');
      return 1;
    }
    if (!final.completed) {
      printResult('FAIL_ENV', commandOutput(result) || 'Codex response did not contain a completed final response event');
      return 1;
    }
    const missing = [
      !final.text.includes(AGENTS_SENTINEL) && 'AGENTS.md sentinel',
      !final.text.includes(SKILL_SENTINEL) && 'skill sentinel',
    ].filter(Boolean);
    if (missing.length) {
      printResult('FAIL_CONTRACT', `missing ${missing.join(' and ')}`);
      return 1;
    }
    if (result.error || result.status !== 0) {
      printResult('FAIL_ENV', commandOutput(result) || 'Codex execution failed');
      return 1;
    }
    printResult('PASS', 'AGENTS.md and codex-probe skill sentinels verified');
    return 0;
  } finally {
    if (fixture) fs.rmSync(fixture, { recursive: true, force: true });
  }
}

process.exitCode = run();
