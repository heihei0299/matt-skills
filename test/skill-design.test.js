import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Guard tests for the "three preventive measures" landed from
// DIAGNOSIS-tdd-implement-stuck.md section 8. They protect every artifact
// produced when turning the diagnosis into repo rules: the skill-design spec,
// the CONTEXT.md glossary, the ADR, the AGENTS.md runtime discipline, and the
// diagnosis report's "landed" marker. Any of them deleted or broken → red.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(dir, 'docs', 'agents', 'skill-design.md');
const contextPath = path.join(dir, 'CONTEXT.md');
const adrPath = path.join(dir, 'docs', 'adr', '0001-turn-continuity-rule.md');
const agentsPath = path.join(dir, 'AGENTS.md');
const runtimePath = path.join(dir, 'docs', 'agents', 'runtime-discipline.md');
const diagnosisPath = path.join(dir, 'DIAGNOSIS-tdd-implement-stuck.md');

const spec = readFileSync(specPath, 'utf8');
const context = readFileSync(contextPath, 'utf8');
const adr = readFileSync(adrPath, 'utf8');
const agents = readFileSync(agentsPath, 'utf8');
const runtime = readFileSync(runtimePath, 'utf8');
const diagnosis = readFileSync(diagnosisPath, 'utf8');

test('skill-design.md exists and carries all three rules', () => {
  assert.match(spec, /Turn Continuity/i);
  assert.match(spec, /within one turn/);
  // Rule 1 is positive phrasing with an exit condition, not a bare prohibition
  assert.match(spec, /exit condition/);
  assert.match(spec, /cannot rely on the harness `\/goal`/);
  // Rule 2: model selection
  assert.match(spec, /flash-class models/i);
  assert.match(spec, /stronger model/i);
  // Rule 3: chunking with quantitative thresholds
  assert.match(spec, /150 lines/);
  assert.match(spec, /5 `replace`/);
});

test('CONTEXT.md glossary holds the three design terms', () => {
  assert.match(context, /\*\*Turn Continuity\*\*/);
  assert.match(context, /回合连续性/);
  assert.match(context, /\*\*Chunking\*\*/);
  assert.match(context, /拆小步/);
  assert.match(context, /\*\*Long-Horizon Skill\*\*/);
  assert.match(context, /长程多阶段技能/);
});

test('ADR 0001 records the turn-continuity decision', () => {
  assert.match(adr, /Turn Continuity/);
  assert.match(adr, /`\/goal`/);
});

test('runtime-discipline.md carries the runtime discipline (rules 2 & 3)', () => {
  assert.match(runtime, /运行纪律/);
  assert.match(runtime, /模型选择/);
  assert.match(runtime, /flash/);
  assert.match(runtime, /拆小步执行/);
  assert.match(runtime, /150 行/);
  assert.match(runtime, /5 处/);
  // and points at the skill-design spec
  assert.match(runtime, /docs\/agents\/skill-design\.md/);
});

test('AGENTS.md is the router: points at the discipline files, carries no rule detail', () => {
  assert.match(agents, /docs\/agents\/skill-design\.md/);
  assert.match(agents, /docs\/agents\/runtime-discipline\.md/);
  // thresholds live in the split file, not the main config
  assert.doesNotMatch(agents, /150 行/);
});

test('diagnosis report is marked as landed', () => {
  assert.match(diagnosis, /已修复 \+ 已落地/);
  assert.match(diagnosis, /### 落地状态/);
});
