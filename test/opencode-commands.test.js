import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Guard the opencode commands for the explicitly-invoked skills. AGENTS.md
// lists nine skills as "显式触发（须用户 / 发起）" — each must ship as a
// .opencode/commands/<name>.md so opencode users can invoke them via /name.
// pi needs no commands (its skills auto-discover; issue-audit ships separately
// as a .pi/prompts/ template).

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const EXPLICIT_SKILLS = [
  'grill-to-spec',
  'wayfinder',
  'to-spec',
  'to-tickets',
  'triage',
  'improve-codebase-architecture',
  'teach',
  'handoff',
  'writing-great-skills',
];

function readDirRecursive(dirPath) {
  const out = [];
  for (const entry of readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    if (statSync(full).isDirectory()) out.push(...readDirRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

test('every explicitly-invoked skill has an opencode command (workspace + template)', () => {
  for (const skill of EXPLICIT_SKILLS) {
    const wsFile = root(path.join('.opencode/commands', `${skill}.md`));
    const tmplFile = root(path.join('template/.opencode/commands', `${skill}.md`));
    assert.ok(statSync(wsFile).isFile(), `missing opencode command for ${skill}`);
    const ws = readFileSync(wsFile, 'utf8');
    const tmpl = readFileSync(tmplFile, 'utf8');
    assert.equal(tmpl, ws, `template command for ${skill} out of sync`);
    // command shape: description frontmatter + body naming the skill + $ARGUMENTS passthrough
    assert.match(ws, /^description: /m, `${skill} command needs a description`);
    assert.match(ws, /技能/, `${skill} command should mention loading the skill`);
    assert.match(ws, /\$ARGUMENTS/, `${skill} command should pass through arguments`);
  }
});

test('template commands dir carries exactly the explicit-skill commands + issue-audit', () => {
  const expected = [...EXPLICIT_SKILLS, 'issue-audit'].map((n) => `${n}.md`).sort();
  const tmpl = readdirSync(root('template/.opencode/commands')).sort();
  assert.deepEqual(tmpl, expected);
});

test('issue-audit keeps its subagent delegation; explicit-skill commands are main-agent', () => {
  const issueAudit = readFileSync(root('.opencode/commands/issue-audit.md'), 'utf8');
  assert.match(issueAudit, /^agent: /m);
  assert.match(issueAudit, /^subtask: /m);
  for (const skill of EXPLICIT_SKILLS) {
    const cmd = readFileSync(root(path.join('.opencode/commands', `${skill}.md`)), 'utf8');
    assert.doesNotMatch(cmd, /^agent: /m, `${skill} command must not delegate to a subagent`);
    assert.doesNotMatch(cmd, /^subtask: /m, `${skill} command must not be a subtask`);
  }
});
