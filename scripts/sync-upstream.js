#!/usr/bin/env node
import { cp, readdir, readFile, rm, stat, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_SKILLS_DIR = path.join(ROOT, '.agents', 'skills');
const PROPRIETARY_PATH = path.join(ROOT, 'config', 'proprietary.json');
const ENGINEERING_PATH = path.join(ROOT, 'config', 'engineering.json');
const UPSTREAM_URL = 'https://github.com/mattpocock/skills.git';

// 重命名映射：上游已重命名，本地旧名需迁移
const RENAMES = {
  'writing-great-skills': 'writing-for-agents',
};

async function loadProprietary() {
  try {
    const raw = await readFile(PROPRIETARY_PATH, 'utf8');
    return new Set(JSON.parse(raw));
  } catch {
    return new Set(['ci-guard', 'tdd-implement', 'grill-to-spec', 'diagnose-fix', 'commit-check', 'scaffold-functional-test']);
  }
}

async function loadEngineering() {
  try {
    const raw = await readFile(ENGINEERING_PATH, 'utf8');
    return new Set(JSON.parse(raw));
  } catch {
    return new Set(['ask-matt','code-review','codebase-design','diagnosing-bugs','domain-modeling','grill-with-docs','implement','improve-codebase-architecture','prototype','research','resolving-merge-conflicts','setup-matt-pocock-skills','tdd','to-spec','to-tickets','triage','wayfinder','wizard']);
  }
}

async function hashFile(filePath) {
  const buf = await readFile(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

async function hashDir(dir) {
  // 对 SKILL.md 做 hash，用于比对；若无 SKILL.md 则对目录内所有文件联合 hash
  const skillMd = path.join(dir, 'SKILL.md');
  try {
    await stat(skillMd);
    return await hashFile(skillMd);
  } catch {
    return null;
  }
}

async function listSkills(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.endsWith('.bak')) continue;
    if (e.name === '.git') continue;
    out.push(e.name);
  }
  return out.sort();
}

async function fetchUpstream({ tmpDir, upstreamUrl = UPSTREAM_URL, ref = 'HEAD' } = {}) {
  const dest = tmpDir || path.join(os.tmpdir(), `matt-skills-upstream-${Date.now()}`);
  await rm(dest, { recursive: true, force: true });
  await mkdir(path.dirname(dest), { recursive: true });
  const clone = spawnSync('git', ['clone', '--depth', '1', upstreamUrl, dest], { encoding: 'utf8' });
  if (clone.status !== 0) {
    throw new Error(`git clone 失败: ${clone.stderr || clone.stdout}`);
  }
  if (ref && ref !== 'HEAD') {
    const co = spawnSync('git', ['-C', dest, 'checkout', ref], { encoding: 'utf8' });
    if (co.status !== 0) throw new Error(`git checkout ${ref} 失败: ${co.stderr}`);
  }
  const rev = spawnSync('git', ['-C', dest, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const head = rev.stdout ? rev.stdout.trim() : 'unknown';
  return { dest, head };
}

async function collectUpstreamSkills(upstreamRoot) {
  const map = new Map(); // name -> { dir, hash }
  for (const bucket of ['engineering', 'productivity']) {
    const bucketDir = path.join(upstreamRoot, 'skills', bucket);
    let entries = [];
    try {
      entries = await readdir(bucketDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const skillDir = path.join(bucketDir, e.name);
      const h = await hashDir(skillDir);
      if (h) map.set(e.name, { dir: skillDir, hash: h, bucket });
    }
  }
  return map;
}

async function collectLocalSkills(proprietary) {
  const map = new Map();
  const names = await listSkills(LOCAL_SKILLS_DIR);
  for (const name of names) {
    if (name === 'skill-creator') continue; // 本地符号链接，不纳入上游比对
    if (proprietary.has(name)) continue;
    const dir = path.join(LOCAL_SKILLS_DIR, name);
    const h = await hashDir(dir);
    map.set(name, { dir, hash: h });
  }
  return map;
}

export async function compare({ upstreamUrl, tmpDir, ref, onlyProgramming = true } = {}) {
  const proprietary = await loadProprietary();
  const engineering = await loadEngineering();
  const fetched = await fetchUpstream({ tmpDir, upstreamUrl, ref });
  const upstreamRoot = fetched.dest;
  const upstreamMapFull = await collectUpstreamSkills(upstreamRoot);
  const localMapFull = await collectLocalSkills(proprietary);
  // 编程子集：engineering 桶即编程（默认），--all 则含 productivity
  const upstreamMap = onlyProgramming
    ? new Map([...upstreamMapFull.entries()].filter(([, v]) => v.bucket === 'engineering'))
    : upstreamMapFull;
  const localMap = localMapFull;
  const isEngineering = (name) => engineering.has(name);

  const added = [];
  const updated = [];
  const same = [];
  const removed = [];
  const renamed = [];

  // 检测重命名：本地旧名存在且上游新名存在，且本地旧名不在上游
  for (const [oldName, newName] of Object.entries(RENAMES)) {
    if (onlyProgramming) {
      if (localMap.has(oldName) && upstreamMap.has(newName) && !upstreamMap.has(oldName)) {
        renamed.push({ from: oldName, to: newName });
      }
    } else {
      if (localMap.has(oldName) && upstreamMapFull.has(newName) && !upstreamMapFull.has(oldName)) {
        renamed.push({ from: oldName, to: newName });
      }
    }
  }
  const renamedFrom = new Set(renamed.map((r) => r.from));
  const renamedTo = new Set(renamed.map((r) => r.to));

  for (const [name, u] of upstreamMap.entries()) {
    if (renamedTo.has(name)) continue;
    const local = localMap.get(name);
    if (!local) added.push(name);
    else if (local.hash !== u.hash) updated.push(name);
    else same.push(name);
  }
  for (const r of renamed) {
    const u = upstreamMap.get(r.to) || upstreamMapFull.get(r.to);
    const local = localMap.get(r.from);
    if (local && u && local.hash !== u.hash) updated.push(`${r.from}→${r.to}`);
    else if (!local) added.push(r.to);
    else same.push(`${r.from}→${r.to}`);
  }

  for (const name of localMap.keys()) {
    if (renamedFrom.has(name)) continue;
    if (upstreamMap.has(name) || renamedTo.has(name)) continue;
    // 编程模式下仅报告 engineering 本地技能的删除；productivity/instance-test 等跳过
    if (onlyProgramming && !isEngineering(name)) continue;
    // 全量模式下所有本地非独有且不在上游的都视为 removed
    removed.push(name);
  }

  const localCount = onlyProgramming
    ? [...localMap.keys()].filter(isEngineering).length
    : localMap.size;
  return {
    head: fetched.head,
    dest: fetched.dest,
    upstreamMap,
    upstreamMapFull,
    localMap,
    localMapFull,
    proprietary: [...proprietary],
    engineering: [...engineering],
    onlyProgramming,
    result: { added: added.sort(), updated: updated.sort(), same: same.sort(), removed: removed.sort(), renamed },
    counts: { upstream: upstreamMap.size, local: localCount, upstreamFull: upstreamMapFull.size, localFull: localMapFull.size },
  };
}

export async function applySync({ upstreamUrl, tmpDir, ref, dryRun = false, force = false, onlyProgramming = true } = {}) {
  const proprietary = await loadProprietary();
  const cmp = await compare({ upstreamUrl, tmpDir, ref, onlyProgramming });
  const { dest, head, upstreamMap, upstreamMapFull, result } = cmp;
  const effectiveMap = onlyProgramming ? upstreamMap : upstreamMapFull;
  const actions = [];

  if (dryRun) {
    return { ...cmp, actions, dryRun: true };
  }

  // 处理重命名
  for (const r of result.renamed) {
    const src = effectiveMap.get(r.to)?.dir || upstreamMapFull.get(r.to)?.dir;
    if (!src) continue;
    const dst = path.join(LOCAL_SKILLS_DIR, r.to);
    const oldDst = path.join(LOCAL_SKILLS_DIR, r.from);
    await rm(oldDst, { recursive: true, force: true });
    await rm(dst, { recursive: true, force: true });
    await cp(src, dst, { recursive: true, force: true });
    actions.push(`rename ${r.from} → ${r.to}`);
  }

  for (const name of result.added) {
    if (result.renamed.some((r) => r.to === name)) continue;
    const src = effectiveMap.get(name)?.dir || upstreamMapFull.get(name)?.dir;
    if (!src) continue;
    const dst = path.join(LOCAL_SKILLS_DIR, name);
    await cp(src, dst, { recursive: true, force: true });
    actions.push(`add ${name}`);
  }

  for (const name of result.updated) {
    if (name.includes('→')) continue;
    const src = effectiveMap.get(name)?.dir || upstreamMapFull.get(name)?.dir;
    if (!src) continue;
    const dst = path.join(LOCAL_SKILLS_DIR, name);
    await rm(dst, { recursive: true, force: true });
    await cp(src, dst, { recursive: true, force: true });
    actions.push(`update ${name}`);
  }

  for (const name of result.removed) {
    const dst = path.join(LOCAL_SKILLS_DIR, name);
    await rm(dst, { recursive: true, force: true });
    actions.push(`remove ${name}`);
  }

  // 清理临时目录
  await rm(dest, { recursive: true, force: true });

  return { ...cmp, dest: null, actions, head };
}
function formatTable(cmp) {
  const { result, counts, head, onlyProgramming } = cmp;
  const lines = [];
  lines.push(`上游 HEAD: ${head}`);
  const modeHint = onlyProgramming ? '（仅编程，engineering）' : '（全量，含 productivity）';
  lines.push(`本地非独有: ${counts.local}  上游: ${counts.upstream} ${modeHint}`);
  lines.push('');
  const totalDiff = result.added.length + result.updated.length + result.removed.length + result.renamed.length;
  if (totalDiff === 0) {
    lines.push('✅ 已是最新，无差异');
  } else {
    if (result.added.length) lines.push(`新增 (${result.added.length}): ${result.added.join(', ')}`);
    if (result.updated.length) lines.push(`更新 (${result.updated.length}): ${result.updated.join(', ')}`);
    if (result.renamed.length) lines.push(`重命名 (${result.renamed.length}): ${result.renamed.map((r) => `${r.from}→${r.to}`).join(', ')}`);
    if (result.removed.length) lines.push(`删除 (${result.removed.length}): ${result.removed.join(', ')}`);
    if (result.same.length) lines.push(`一致 (${result.same.length}): ${result.same.join(', ')}`);
  }
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {
    json: args.includes('--json'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    check: args.includes('--check'),
    apply: args.includes('--apply') || args.includes('--update'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    all: args.includes('--all'),
  };
  const onlyProgramming = !opts.all;
  const upstreamIdx = args.indexOf('--upstream');
  const upstreamUrl = upstreamIdx !== -1 ? args[upstreamIdx + 1] : undefined;
  const refIdx = args.indexOf('--ref');
  const ref = refIdx !== -1 ? args[refIdx + 1] : undefined;
  const tmpIdx = args.indexOf('--tmp');
  const tmpDir = tmpIdx !== -1 ? args[tmpIdx + 1] : undefined;
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    process.stdout.write(`sync-upstream — 对比/同步 mattpocock/skills 上游技能

Usage:
  node scripts/sync-upstream.js --check [--all] [--json] [--upstream <url>] [--ref <ref>]
  node scripts/sync-upstream.js --apply [--all] [--dry-run] [--force] [--upstream <url>] [--ref <ref>]

Options:
  --check     只对比，不改动文件（默认）
  --apply     应用同步（覆盖 .agents/skills 非独有技能）
  --all       包含非编程技能（productivity）；默认仅同步编程相关（engineering）
  --dry-run   演练模式，不写文件
  --json      以 JSON 输出结果
  --upstream  上游仓库 URL（默认 https://github.com/mattpocock/skills.git）
  --ref       上游 ref（默认 HEAD）
  --tmp       指定临时目录（默认 os.tmpdir() 下随机）
  --force     强制覆盖（apply 时默认即覆盖，此标志保留兼容）
  --verbose   详细输出
`);
    return;
  }

  if (opts.apply) {
    const res = await applySync({ upstreamUrl, tmpDir, ref, dryRun: opts.dryRun, force: opts.force, onlyProgramming });
    if (opts.json) {
      process.stdout.write(JSON.stringify({ head: res.head, result: res.result, actions: res.actions, dryRun: opts.dryRun, onlyProgramming }, null, 2) + '\n');
    } else {
      process.stdout.write(formatTable(res) + '\n');
      if (res.actions.length) {
        process.stdout.write(`\n已执行 ${res.actions.length} 项:\n`);
        for (const a of res.actions) process.stdout.write(`  - ${a}\n`);
      }
      if (opts.dryRun) process.stdout.write('\n(dry-run，未写文件)\n');
    }
    const hasDiff = res.result.added.length + res.result.updated.length + res.result.removed.length + res.result.renamed.length > 0;
    if (opts.check && hasDiff) process.exitCode = 1;
    return;
  }

  // 默认 --check
  const cmp = await compare({ upstreamUrl, tmpDir, ref, onlyProgramming });
  if (opts.json) {
    process.stdout.write(JSON.stringify({ head: cmp.head, counts: cmp.counts, result: cmp.result, onlyProgramming }, null, 2) + '\n');
  } else {
    process.stdout.write(formatTable(cmp) + '\n');
  }
  const hasDiff = cmp.result.added.length + cmp.result.updated.length + cmp.result.removed.length + cmp.result.renamed.length > 0;
  // 清理临时目录
  await rm(cmp.dest, { recursive: true, force: true });
  if (hasDiff) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('sync-upstream.js')) {
  main().catch((e) => {
    process.stderr.write(`error: ${e.message}\n`);
    process.exitCode = 1;
  });
}
