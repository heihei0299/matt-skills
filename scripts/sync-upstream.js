#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readdir, readFile, readlink, rename, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { PROPRIETARY_SKILLS } from '../bin/skills/boundaries.js';
import { loadSkillSet } from '../bin/skills/config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_SKILLS_DIR = path.join(ROOT, '.agents', 'skills');
const ENGINEERING_PATH = path.join(ROOT, 'config', 'engineering.json');
const REQUIRED_PATH = path.join(ROOT, 'config', 'required.json');
const UPSTREAM_URL = 'https://github.com/mattpocock/skills.git';

// 重命名映射：上游已重命名，本地旧名需迁移
const RENAMES = {
  'writing-great-skills': 'writing-for-agents',
};

async function loadProprietary() {
  return new Set(PROPRIETARY_SKILLS);
}

async function loadEngineering() {
  return loadSkillSet(ENGINEERING_PATH, 'engineering');
}
async function loadRequired() {
  return loadSkillSet(REQUIRED_PATH, 'required');
}

async function hashDir(dir) {
  const files = [];

  async function collect(current, relative = '') {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      const entryRelative = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await collect(entryPath, entryRelative);
      else if (entry.isFile()) files.push({ path: entryPath, relative: entryRelative, type: 'file' });
      else if (entry.isSymbolicLink()) files.push({ path: entryPath, relative: entryRelative, type: 'symlink' });
    }
  }

  await collect(dir);
  files.sort((a, b) => (a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0));

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(`${file.type}\0${file.relative}\0`);
    hash.update(file.type === 'symlink' ? await readlink(file.path) : await readFile(file.path));
    hash.update('\0');
  }
  return hash.digest('hex');
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
  try {
    const clone = spawnSync('git', ['clone', '--depth', '1', upstreamUrl, dest], { encoding: 'utf8' });
    if (clone.status !== 0) {
      throw new Error(`git clone 失败: ${clone.stderr || clone.stdout || clone.error?.message || 'unknown error'}`);
    }
    if (ref && ref !== 'HEAD') {
      const fetched = spawnSync('git', ['-C', dest, 'fetch', '--depth', '1', 'origin', ref], { encoding: 'utf8' });
      if (fetched.status !== 0) {
        throw new Error(`git fetch ${ref} 失败: ${fetched.stderr || fetched.stdout || fetched.error?.message || 'unknown error'}`);
      }
      const co = spawnSync('git', ['-C', dest, 'checkout', '--detach', 'FETCH_HEAD'], { encoding: 'utf8' });
      if (co.status !== 0) {
        throw new Error(`git checkout ${ref} 失败: ${co.stderr || co.stdout || co.error?.message || 'unknown error'}`);
      }
    }
    const rev = spawnSync('git', ['-C', dest, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    if (rev.status !== 0) {
      throw new Error(`git rev-parse 失败: ${rev.stderr || rev.stdout || rev.error?.message || 'unknown error'}`);
    }
    return { dest, head: rev.stdout.trim() || 'unknown' };
  } catch (error) {
    await rm(dest, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
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

async function collectLocalSkills(proprietary, localSkillsDir = LOCAL_SKILLS_DIR) {
  const map = new Map();
  const names = await listSkills(localSkillsDir);
  for (const name of names) {
    if (name === 'skill-creator') continue; // 本地符号链接，不纳入上游比对
    if (proprietary.has(name)) continue;
    const dir = path.join(localSkillsDir, name);
    const h = await hashDir(dir);
    map.set(name, { dir, hash: h });
  }
  return map;
}

export async function compare({ upstreamUrl, tmpDir, ref, onlyProgramming = true, localSkillsDir = LOCAL_SKILLS_DIR } = {}) {
  const proprietary = await loadProprietary();
  const engineering = await loadEngineering();
  const required = await loadRequired();
  const fetched = await fetchUpstream({ tmpDir, upstreamUrl, ref });
  const upstreamRoot = fetched.dest;
  const upstreamMapFull = await collectUpstreamSkills(upstreamRoot);
  const localMapFull = await collectLocalSkills(proprietary, localSkillsDir);
  // 默认范围：engineering 桶（编程）+ 独有所需（config/required.json，如 grill-to-spec 经 grill-with-docs 所需的 grilling）；--all 则含全部 productivity
  const upstreamMap = onlyProgramming
    ? new Map([...upstreamMapFull.entries()].filter(([name, v]) => v.bucket === 'engineering' || required.has(name)))
    : upstreamMapFull;
  const localMap = localMapFull;
  const isEngineering = (name) => engineering.has(name);
  const isDefault = (name) => engineering.has(name) || required.has(name);

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
    // 默认模式下仅报告默认范围（engineering + 独有所需）内本地技能的删除；其余 productivity/instance-test 等跳过
    if (onlyProgramming && !isDefault(name)) continue;
    // 全量模式下所有本地非独有且不在上游的都视为 removed
    removed.push(name);
  }

  const localCount = onlyProgramming
    ? [...localMap.keys()].filter((n) => isDefault(n)).length
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
    required: [...required],
    onlyProgramming,
    result: { added: added.sort(), updated: updated.sort(), same: same.sort(), removed: removed.sort(), renamed },
    counts: { upstream: upstreamMap.size, local: localCount, upstreamFull: upstreamMapFull.size, localFull: localMapFull.size },
  };
}

async function verifyStagedSkills({ stageDir, effectiveMap, upstreamMapFull, result }) {
  const sourceFor = (name) => effectiveMap.get(name) || upstreamMapFull.get(name);
  const expected = new Set([
    ...result.renamed.map((r) => r.to),
    ...result.added.filter((name) => !result.renamed.some((r) => r.to === name)),
    ...result.updated.filter((name) => !name.includes('→')),
  ]);

  for (const name of expected) {
    const source = sourceFor(name);
    const staged = path.join(stageDir, name);
    if (!source || await hashDir(staged) !== source.hash) {
      throw new Error(`同步暂存校验失败: ${name}`);
    }
  }
  for (const name of [...result.removed, ...result.renamed.map((r) => r.from)]) {
    try {
      await stat(path.join(stageDir, name));
      throw new Error(`同步暂存校验失败: ${name} 应被删除`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

async function commitStagedSkills(localSkillsDir, stageDir) {
  const parent = path.dirname(localSkillsDir);
  const backupDir = await mkdtemp(path.join(parent, '.matt-skills-sync-backup-'));
  await rm(backupDir, { recursive: true, force: true });
  let originalMoved = false;
  let stageMoved = false;

  try {
    await rename(localSkillsDir, backupDir);
    originalMoved = true;
    await rename(stageDir, localSkillsDir);
    stageMoved = true;
  } catch (error) {
    try {
      if (stageMoved) await rename(localSkillsDir, stageDir);
      if (originalMoved) await rename(backupDir, localSkillsDir);
    } catch (rollbackError) {
      throw new Error(`同步失败且回滚失败: ${rollbackError.message}; 原始错误: ${error.message}`);
    }
    await rm(backupDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }

  await rm(backupDir, { recursive: true, force: true });
}

export async function applySync({ upstreamUrl, tmpDir, ref, dryRun = false, force = false, onlyProgramming = true, localSkillsDir = LOCAL_SKILLS_DIR, failAfter = null } = {}) {
  const cmp = await compare({ upstreamUrl, tmpDir, ref, onlyProgramming, localSkillsDir });
  const { dest, head, upstreamMap, upstreamMapFull, result } = cmp;
  const effectiveMap = onlyProgramming ? upstreamMap : upstreamMapFull;
  const actions = [];
  let stageDir = null;

  try {
    if (dryRun) return { ...cmp, dest: null, actions, dryRun: true };
    const hasDiff = result.added.length + result.updated.length + result.removed.length + result.renamed.length > 0;
    if (!hasDiff) return { ...cmp, dest: null, actions, head };

    const stagePrefix = path.join(path.dirname(localSkillsDir), '.matt-skills-sync-stage-');
    stageDir = await mkdtemp(stagePrefix);
    await rm(stageDir, { recursive: true, force: true });
    await cp(localSkillsDir, stageDir, { recursive: true, force: true });
    let successfulOperations = 0;
    const stageOperation = async (operation) => {
      if (Number.isInteger(failAfter) && failAfter >= 0 && successfulOperations >= failAfter) {
        throw new Error(`注入同步失败（已完成 ${successfulOperations} 个暂存操作）`);
      }
      const value = await operation();
      successfulOperations++;
      return value;
    };
    const sourceFor = (name) => effectiveMap.get(name)?.dir || upstreamMapFull.get(name)?.dir;

    // 处理重命名
    for (const r of result.renamed) {
      const src = sourceFor(r.to);
      if (!src) continue;
      await stageOperation(() => rm(path.join(stageDir, r.from), { recursive: true, force: true }));
      await stageOperation(() => rm(path.join(stageDir, r.to), { recursive: true, force: true }));
      await stageOperation(() => cp(src, path.join(stageDir, r.to), { recursive: true, force: true }));
      actions.push(`rename ${r.from} → ${r.to}`);
    }

    for (const name of result.added) {
      if (result.renamed.some((r) => r.to === name)) continue;
      const src = sourceFor(name);
      if (!src) continue;
      await stageOperation(() => cp(src, path.join(stageDir, name), { recursive: true, force: true }));
      actions.push(`add ${name}`);
    }

    for (const name of result.updated) {
      if (name.includes('→')) continue;
      const src = sourceFor(name);
      if (!src) continue;
      await stageOperation(() => rm(path.join(stageDir, name), { recursive: true, force: true }));
      await stageOperation(() => cp(src, path.join(stageDir, name), { recursive: true, force: true }));
      actions.push(`update ${name}`);
    }

    for (const name of result.removed) {
      await stageOperation(() => rm(path.join(stageDir, name), { recursive: true, force: true }));
      actions.push(`remove ${name}`);
    }

    await verifyStagedSkills({ stageDir, effectiveMap, upstreamMapFull, result });
    await commitStagedSkills(localSkillsDir, stageDir);
    stageDir = null;
    return { ...cmp, dest: null, actions, head };
  } finally {
    await rm(dest, { recursive: true, force: true }).catch(() => {});
    if (stageDir) await rm(stageDir, { recursive: true, force: true }).catch(() => {});
  }
}
export function formatComparison(cmp) {
  const { result, counts, head, onlyProgramming } = cmp;
  const lines = [];
  lines.push(`上游 HEAD: ${head}`);
  const modeHint = onlyProgramming ? '（默认，engineering + 独有所需）' : '（全量，含 productivity）';
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
  --all       包含全部非编程技能（productivity）；默认同步编程相关（engineering）+ 独有所需（config/required.json）
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
      process.stdout.write(formatComparison(res) + '\n');
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
    process.stdout.write(formatComparison(cmp) + '\n');
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
