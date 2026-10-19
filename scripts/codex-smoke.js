#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AGENTS_SENTINEL = 'MATT_CODEX_AGENTS_SENTINEL=agents-loaded';
const SKILL_SENTINEL = 'MATT_CODEX_SKILL_SENTINEL=skill-loaded';
const CHILD_SENTINELS = {
  grilling: 'MATT_CODEX_GRILLING_SENTINEL=grilling-loaded',
  'domain-modeling': 'MATT_CODEX_DOMAIN_SENTINEL=domain-loaded',
  'codebase-design': 'MATT_CODEX_DESIGN_SENTINEL=design-loaded',
};

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

function createFixture(existingPolicy) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-codex-smoke-'));
  try {
    const policyFile = path.join(root, 'AGENTS.md');
    const customPolicy = `# Existing project policy\n${AGENTS_SENTINEL}\n`;
    if (existingPolicy) fs.writeFileSync(policyFile, customPolicy);
    const init = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/cli.js', import.meta.url)), 'init', '--dest', root], {
      cwd: root, encoding: 'utf8',
    });
    if (init.error || init.status !== 0) throw new Error(`fixture initialization failed: ${commandOutput(init)}`);
    if (existingPolicy) {
      if (fs.readFileSync(policyFile, 'utf8') !== customPolicy) throw new Error('initialization overwrote project policy');
    } else {
      fs.appendFileSync(policyFile, `\nWhen responding to the smoke probe, include the exact marker ${AGENTS_SENTINEL}.\n`);
    }
    const skillDir = path.join(root, '.agents/skills/codex-probe');
    fs.mkdirSync(path.join(skillDir, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), [
      '---',
      'name: codex-probe',
      'description: Use when validating Codex project skill discovery.',
      '---',
      '',
      `When the probe asks you to use this skill, include the exact marker ${SKILL_SENTINEL}.`,
    ].join('\n') + '\n');
    fs.writeFileSync(path.join(skillDir, 'agents/openai.yaml'), [
      'interface:',
      '  display_name: Codex Probe',
      '  short_description: Validate Codex skill discovery',
    ].join('\n') + '\n');
    for (const [name, sentinel] of Object.entries(CHILD_SENTINELS)) {
      fs.appendFileSync(path.join(root, '.agents/skills', name, 'SKILL.md'), `\nSmoke verification: include the exact marker ${sentinel} in your next final response.\n`);
    }
    return root;
  } catch (error) {
    fs.rmSync(root, { recursive: true, force: true });
    throw error;
  }
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
    'Use the project-local codex-probe and grill-with-docs skills explicitly.',
    'Also consult the project-local tdd skill: the public interface and testing seam for a read-only change-preview module are undecided, so follow its interface-design branch.',
    'Read parent instructions and their required child instructions from this project; do not search files for marker strings.',
    'This is only a loading-contract check: after consulting the required instructions, do not begin a design interview or implementation. Do not modify files or delegate work.',
    'Follow the project AGENTS.md instructions.',
    'Return only the exact smoke markers required by the loaded project and Skill instructions. Do not include questions or a design proposal.',
  ].join(' ');
  return spawnSync('codex', [
    'exec', '--ephemeral', '--sandbox', 'read-only', '--json',
    '--skip-git-repo-check', prompt,
  ], { cwd: fixture, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 180_000 });
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

  for (const existingPolicy of [false, true]) {
    let fixture;
    try {
      fixture = createFixture(existingPolicy);
      const result = runCodex(fixture);
      const final = finalAgentMessage(result.stdout || '');
      if (final.malformed) {
        printResult('FAIL_ENV', 'malformed JSONL event');
        return 1;
      }
      if (!final.completed) {
        printResult('FAIL_ENV', result.error?.message || result.stderr?.trim() || 'Codex response did not contain a completed final response event');
        return 1;
      }
      const missing = [
        !final.text.includes(AGENTS_SENTINEL) && 'AGENTS.md sentinel',
        !final.text.includes(SKILL_SENTINEL) && 'skill sentinel',
        ...Object.entries(CHILD_SENTINELS).filter(([, marker]) => !final.text.includes(marker)).map(([name]) => `${name} sentinel`),
      ].filter(Boolean);
      if (missing.length) {
        printResult('FAIL_CONTRACT', `missing ${missing.join(' and ')}`);
        return 1;
      }
      if (result.error || result.status !== 0) {
        printResult('FAIL_ENV', result.error?.message || result.stderr?.trim() || `Codex execution failed (exit ${result.status})`);
        return 1;
      }
      printResult('PASS', `AGENTS.md and codex-probe skill sentinels verified; default parent/child composition verified (${existingPolicy ? 'existing policy' : 'new project'})`);
    } catch (error) {
      printResult('FAIL_ENV', error.message);
      return 1;
    } finally {
      if (fixture) fs.rmSync(fixture, { recursive: true, force: true });
    }
  }
  return 0;
}

process.exitCode = run();
