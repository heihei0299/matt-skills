import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Commands are workspace-only harness conveniences. The distributed template
// carries only the basic framework; skills are discovered from .agents/skills.

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
  'writing-for-agents',
  'commit-check',
];

test('workspace commands stay local and are not projected into the template', () => {
  for (const skill of EXPLICIT_SKILLS) {
    const wsFile = root(path.join('.opencode/commands', `${skill}.md`));
    assert.ok(statSync(wsFile).isFile(), `missing workspace command for ${skill}`);
    const ws = readFileSync(wsFile, 'utf8');
    assert.match(ws, /^description: /m, `${skill} command needs a description`);
    assert.match(ws, /技能/, `${skill} command should mention loading the skill`);
    assert.match(ws, /\$ARGUMENTS/, `${skill} command should pass through arguments`);
  }
  assert.equal(existsSync(root('template/.opencode/commands')), false);
  assert.equal(existsSync(root('template/.opencode/agents')), false);
  assert.equal(existsSync(root('template/.pi/agents')), false);
  assert.equal(existsSync(root('template/.pi/prompts')), false);
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
