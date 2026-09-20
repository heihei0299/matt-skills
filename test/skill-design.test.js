import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Guard the policy migration artifacts: deprecated compatibility docs must stay
// non-normative while ADRs, routing, and the landed diagnosis remain intact.
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(dir, 'docs', 'agents', 'skill-design.md');
const contextPath = path.join(dir, 'CONTEXT.md');
const adrPath = path.join(dir, 'docs', 'adr', '0001-turn-continuity-rule.md');
const agentsPath = path.join(dir, 'AGENTS.md');
const runtimePath = path.join(dir, 'docs', 'agents', 'runtime-discipline.md');
const diagnosisPath = path.join(dir, 'pi', 'DIAGNOSIS-tdd-implement-stuck.md');

const spec = readFileSync(specPath, 'utf8');
const context = readFileSync(contextPath, 'utf8');
const adr = readFileSync(adrPath, 'utf8');
const agents = readFileSync(agentsPath, 'utf8');
const runtime = readFileSync(runtimePath, 'utf8');
const diagnosis = readFileSync(diagnosisPath, 'utf8');

test('skill-design.md remains a deprecated compatibility pointer', () => {
  assert.match(spec, /# Skill Design — Deprecated/);
  assert.match(spec, /not\** a normative rule source/i);
  assert.match(spec, /active `AGENTS\.md`/);
  assert.match(spec, /`CONTEXT\.md`/);
  assert.match(spec, /skill's `SKILL\.md`/);
  assert.doesNotMatch(spec, /Turn Continuity|Chunking|Git History Preservation|BASE_HEAD/);
});

test('CONTEXT.md remains repository vocabulary only', () => {
  assert.match(context, /Repository vocabulary for this project/);
  assert.match(context, /## Repository/);
  assert.match(context, /\*\*Workspace\*\*/);
  assert.doesNotMatch(context, /## Skill Design|Turn Continuity|Chunking|Git History Preservation|BASE_HEAD/);
});

test('ADR 0001 records the historical turn-continuity decision', () => {
  assert.match(adr, /Turn Continuity/);
  assert.match(adr, /`\/goal`/);
});

test('runtime-discipline.md delegates policy to its owners', () => {
  assert.match(runtime, /only general execution discipline/i);
  assert.match(runtime, /active project `AGENTS\.md`/);
  assert.match(runtime, /a skill owns only its own lifecycle/);
  assert.match(runtime, /TDD semantics belong/);
  assert.doesNotMatch(runtime, /BASE_HEAD|Turn Continuity|Chunking|Git History Preservation/);
});

test('AGENTS.md is the router: points at the runtime discipline entry points', () => {
  assert.match(agents, /## 路由/);
  assert.match(agents, /## Context \/ CodeGraph/);
  assert.match(agents, /codegraph explore/);
  // Quantitative thresholds belong in the owning discipline files, not here.
  assert.doesNotMatch(agents, /150 行/);
});

test('diagnosis report is marked as landed', () => {
  assert.match(diagnosis, /已修复 \+ 已落地/);
  assert.match(diagnosis, /### 落地状态/);
});

test('ADR 0003 records the git-history-preservation decision', () => {
  const adr3 = readFileSync(path.join(dir, 'docs', 'adr', '0003-git-history-preservation.md'), 'utf8');
  assert.match(adr3, /BASE_HEAD/);
  assert.match(adr3, /merge-base --is-ancestor/);
  assert.match(adr3, /git reset --hard|reset --hard/);
});

test('runtime-discipline.md leaves git history policy to AGENTS.md', () => {
  assert.match(runtime, /Git policy come from the active `AGENTS\.md`/);
  assert.doesNotMatch(runtime, /BASE_HEAD|merge-base --is-ancestor|git reset --hard|git checkout \.|git clean -fd|stash push --include-untracked/);
});

