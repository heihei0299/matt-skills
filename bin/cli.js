#!/usr/bin/env node
import { readdir, readFile, cp, stat, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import {
  PROPRIETARY_SKILLS,
  isDefaultProgrammingSkill,
  isDistributableProprietarySkill,
  isDistributableSkill,
  isRepoLocalSkill,
} from './skill-boundaries.js';

const SKILLS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.agents', 'skills');
const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');
const ENGINEERING_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'config', 'engineering.json');
const REQUIRED_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'config', 'required.json');
let ENGINEERING_SKILLS = null;
async function loadEngineeringSkills() {
  if (ENGINEERING_SKILLS) return ENGINEERING_SKILLS;
  try {
    const raw = await readFile(ENGINEERING_PATH, 'utf8');
    ENGINEERING_SKILLS = new Set(JSON.parse(raw));
  } catch {
    ENGINEERING_SKILLS = new Set(['ask-matt','code-review','codebase-design','diagnosing-bugs','domain-modeling','grill-with-docs','implement','improve-codebase-architecture','prototype','research','resolving-merge-conflicts','setup-matt-pocock-skills','tdd','to-spec','to-tickets','triage','wayfinder','wizard']);
  }
  return ENGINEERING_SKILLS;
}
let REQUIRED_SKILLS = null;
async function loadRequiredSkills() {
  if (REQUIRED_SKILLS) return REQUIRED_SKILLS;
  try {
    const raw = await readFile(REQUIRED_PATH, 'utf8');
    REQUIRED_SKILLS = new Set(JSON.parse(raw));
  } catch {
    REQUIRED_SKILLS = new Set(['grilling', 'grill-me', 'handoff']);
  }
  return REQUIRED_SKILLS;
}
function isProgrammingSkill(name, engineering, required) {
  return isDefaultProgrammingSkill(name, engineering, required);
}
function isProgrammingAll(name, engineering) {
  return isDistributableProprietarySkill(name) || engineering.has(name);
}
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const HELP_GLOBAL = `matt-skills — install and manage this skill collection

Usage:
  matt-skills init [options]                   Initialize a project: template + skills (.agents/skills)
  matt-skills sync [--all|--dry-run] [--dest <path>]   Sync existing project to latest template + skills
  matt-skills list [--all] [--json]            List available skills and their descriptions
  matt-skills install [options]                Install skills (interactive by default)
  matt-skills check [--all] [--json] [--upstream <url>] [--ref <ref>]
                                              Check if upstream skills are up to date (read-only)
  matt-skills --help | -h                     Show this help
  matt-skills --version | -v                  Show version
`;

const HELP_INIT = `matt-skills init [options] — Initialize a project: template + skills (.agents/skills)

Usage:
  matt-skills init [options]

Init options:
  --dest <path>   Target directory (default: current directory)
  --all           Include non-programming skills (productivity) and optional proprietary; default only core programming (engineering 18 + required 4 + default proprietary 4 → 26)
  --help, -h      Show this help
提示：已有 AGENTS.md 时普通 init 跳过；显式 init --all 刷新模板并覆盖全量 skills。

提示：matt-skills --help 查看全量
`;

const HELP_SYNC = `matt-skills sync — Sync existing project to latest template + skills

Usage:
  matt-skills sync [--all|--dry-run] [--dest <path>]

Sync options:
  --all           仅更新同名技能内容（存在则覆盖，不存在则新增）并更新 AGENTS.md
  --dry-run       预演：只比对不写盘
  --dest <path>   Target directory (default: current directory)
  --help, -h      Show this help

说明：默认不带 --all 仅增量同步默认技能（26）且 AGENTS.md 有定制则跳过；--all 时对同名技能 upsert 并强制更新 AGENTS.md。

提示：matt-skills --help 查看全量
`;

const HELP_LIST = `matt-skills list — List available skills

Usage:
  matt-skills list [--all] [--json]

List options:
  --all           List all skills (default only core programming 26)
  --json          Output as JSON
  --help, -h      Show this help

提示：matt-skills --help 查看全量
`;

const HELP_CHECK = `matt-skills check — Check if upstream skills are up to date (read-only)

Usage:
  matt-skills check [--all] [--json] [--upstream <url>] [--ref <ref>]

Check options:
  --all           Include non-programming and optional proprietary; default only core programming (26: engineering 18 + required 4 + default proprietary 4)
  --json          Output as JSON
  --upstream <url> Upstream repo URL (default: https://github.com/mattpocock/skills.git)
  --ref <ref>     Upstream ref (default: HEAD)
  --help, -h      Show this help

提示：matt-skills --help 查看全量
`;

const HELP_INSTALL = `matt-skills install — Install skills (interactive by default)

Usage:
  matt-skills install [options]

Install options:
  --tools <a,b>   Install for the given tools (codex, pi, opencode, claude); skips tool selection — 共享技能统一指向 .agents/skills，.pi/skills/.opencode/skills 仅用于项目自定义
  --all           Install all skills (default only core programming 26); skips skill selection
  --force         Overwrite existing skills
  --global        Install to the user's global skill directories
  --project       Install to project skill directories (default)
  --dest <path>   Install everything into a single custom directory (overrides --tools)
  --help, -h      Show this help

提示：matt-skills --help 查看全量
`;

const HELP = HELP_GLOBAL;

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    fields[m[1]] = value;
  }
  return fields;
}

async function listSkills({ onlyProgramming = false } = {}) {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills = [];
  let engineering = null;
  let required = null;
  if (onlyProgramming) engineering = await loadEngineeringSkills();
  if (onlyProgramming) required = await loadRequiredSkills();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.endsWith('.bak')) continue;
    if (entry.name === 'skill-creator') continue;
    if (isRepoLocalSkill(entry.name)) continue;
    if (onlyProgramming && !isProgrammingSkill(entry.name, engineering, required)) continue;
    let content;
    try {
      content = await readFile(path.join(SKILLS_DIR, entry.name, 'SKILL.md'), 'utf8');
    } catch {
      continue;
    }
    const { name, description } = parseFrontmatter(content);
    if (name && description) skills.push({ name, description });
  }
  return skills.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function shouldCopyTemplatePath(src) {
  const relative = path.relative(TEMPLATE_DIR, src);
  const parts = relative.split(path.sep);
  return !(parts[0] === '.agents' && parts[1] === 'skills' && isRepoLocalSkill(parts[2]));
}

const TOOLS = ['codex', 'pi', 'opencode', 'claude'];

// 统一源：共享技能全部在 .agents/skills，harness 的 .pi/skills/.opencode/skills 仅用于项目自定义
// 为兼容历史，pi/opencode/claude 的项目安装仍解析但统一指向 .agents/skills，并给出提示
const PROJECT_DIRS = {
  codex: '.agents/skills',
  pi: '.agents/skills',
  opencode: '.agents/skills',
  claude: '.agents/skills',
};

const GLOBAL_DIRS = {
  codex: '.codex/skills',
  pi: '.pi/agent/skills',
  opencode: '.config/opencode/skills',
  claude: '.claude/skills',
};

function toolDir(tool, global) {
  if (global) return path.join(os.homedir(), GLOBAL_DIRS[tool]);
  return path.resolve(process.cwd(), PROJECT_DIRS[tool]);
}

async function promptTools() {
  const res = await prompts({
    type: 'multiselect',
    name: 'tools',
    message: '选择要安装到的工具',
    choices: TOOLS.map((t) => ({ title: t, value: t })),
    instructions: '空格勾选，回车确认',
  });
  return Array.isArray(res?.tools) ? res.tools : [];
}

async function promptSkills(skills) {
  const res = await prompts({
    type: 'multiselect',
    name: 'skills',
    message: '选择要安装的技能',
    choices: skills.map((s) => ({ title: s.name, value: s.name })),
    instructions: '空格勾选，回车确认',
  });
  return Array.isArray(res?.skills) ? res.skills : [];
}

async function installCommand({ dest, all, force, tools, global }) {
  const onlyProgramming = !all;
  const engineering = onlyProgramming ? await loadEngineeringSkills() : null;
  const required = onlyProgramming ? await loadRequiredSkills() : null;
  const skillsAll = await listSkills({ onlyProgramming: false });
  const skills = onlyProgramming ? skillsAll.filter(s => isProgrammingSkill(s.name, engineering, required)) : skillsAll;
  let targets;
  if (dest) {
    targets = [{ tool: null, dir: path.resolve(process.cwd(), dest) }];
  } else {
    const selectedTools = tools
      ? tools.filter((t) => TOOLS.includes(t))
      : await promptTools();
    if (selectedTools.length === 0) {
      process.stdout.write('未选择任何工具，未安装任何技能\n');
      return;
    }
    // 共享技能统一源提示：pi/opencode 的项目目录已改为 .agents/skills
    const needsHint = selectedTools.some((t) => t === 'pi' || t === 'opencode');
    if (needsHint && !global) {
      process.stdout.write('提示：共享技能统一在 .agents/skills，.pi/skills/.opencode/skills 仅用于项目自定义技能\n');
    }
    targets = selectedTools.map((tool) => ({ tool, dir: toolDir(tool, global) }));
    // 去重：多个工具可能映射到同一目录（如 pi/opencode/codex 都指向 .agents/skills），合并去重避免重复计数
    const seen = new Map();
    for (const t of targets) {
      if (!seen.has(t.dir)) seen.set(t.dir, t);
    }
    targets = [...seen.values()];
  }
  const selected = all ? skills.map((s) => s.name) : await promptSkills(skills);
  if (selected.length === 0) {
    process.stdout.write('未选择任何技能，未安装任何技能\n');
    return;
  }
  const knownDistributable = new Set(skills.map((skill) => skill.name));
  for (const name of selected) {
    if (!isDistributableSkill(name, knownDistributable)) {
      throw new Error(`${name} is repository-local or unavailable and cannot be distributed`);
    }
  }
  for (const { tool, dir } of targets) {
    let installed = 0;
    let skipped = 0;
    for (const name of selected) {
      const dst = path.join(dir, name);
      if (!force && (await pathExists(dst))) {
        skipped++;
        continue;
      }
      await cp(path.join(SKILLS_DIR, name), dst, { recursive: true, force: true });
      installed++;
    }
    if (tool) process.stdout.write(`${tool}：已装 ${installed}、跳过 ${skipped}\n`);
    else process.stdout.write(`已装 ${installed}、跳过 ${skipped}\n`);
    process.stdout.write(`目标路径：${dir}\n`);
  }
}

async function initCommand({ dest, all }) {
  const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();
  const marker = path.join(target, 'AGENTS.md');
  const onlyProgramming = !all;
  if (await pathExists(marker) && !all) {
    process.stdout.write('模板已存在（AGENTS.md），跳过\n');
  } else {
    await cp(TEMPLATE_DIR, target, {
      recursive: true,
      force: true,
      filter: shouldCopyTemplatePath,
    });
    process.stdout.write('模板：已复制（AGENTS.md、.agents/skills、.opencode/、.pi/）\n');
    // 默认范围（engineering + 独有所需 + 默认独有），--all 才保留其余 productivity
    if (onlyProgramming && path.resolve(target) !== path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))) {
      const engineering = await loadEngineeringSkills();
      const required = await loadRequiredSkills();
      const skillsDirFilter = path.join(target, '.agents', 'skills');
      try {
        const entries = await readdir(skillsDirFilter, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          if (e.name.endsWith('.bak') || e.name === '.git' || e.name === 'skill-creator') continue;
          if (!isProgrammingSkill(e.name, engineering, required)) {
            await rm(path.join(skillsDirFilter, e.name), { recursive: true, force: true });
          }
        }
      } catch {}
    }
  }
  // 统计（区分编程 vs 全量）
  const skillsDir = path.join(target, '.agents', 'skills');
  let installed = 0;
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    installed = entries.filter((e) => e.isDirectory() && !e.name.endsWith('.bak') && e.name !== '.git' && e.name !== 'skill-creator').length;
  } catch {}
  const allSkillsFull = await listSkills({ onlyProgramming: false });
  const engineeringForStats = await loadEngineeringSkills();
  const requiredForStats = await loadRequiredSkills();
  const programmingCount = allSkillsFull.filter(s => isProgrammingSkill(s.name, engineeringForStats, requiredForStats)).length;
  const upstreamFull = allSkillsFull.filter((s) => !PROPRIETARY_SKILLS.has(s.name)).length;
  const upstreamProg = allSkillsFull.filter((s) => !PROPRIETARY_SKILLS.has(s.name) && (engineeringForStats.has(s.name) || requiredForStats.has(s.name))).length;
  const displayTotal = onlyProgramming ? programmingCount : allSkillsFull.length;
  const displayUpstream = onlyProgramming ? upstreamProg : upstreamFull;
  if (path.resolve(skillsDir) === path.resolve(SKILLS_DIR)) {
    process.stdout.write(`技能：已装 ${installed}、跳过 0（全量 ${allSkillsFull.length}，含上游 ${upstreamFull}；编程 ${programmingCount}，含上游 ${upstreamProg}）\n`);
  } else {
    if (onlyProgramming) {
      process.stdout.write(`技能：已装 ${installed}（编程 ${displayTotal}，含上游 ${displayUpstream}；全量 ${allSkillsFull.length}，含上游 ${upstreamFull}）\n`);
    } else {
      process.stdout.write(`技能：已装 ${installed}（全量 ${displayTotal}，含上游 ${displayUpstream}）\n`);
    }
  }
  process.stdout.write(`目标路径：${target}\n`);
}
async function syncCommand({ dest, all, dryRun, json, upstreamUrl, ref }) {
  const onlyProgramming = !all;
  if (dryRun) {
    const { compare } = await import('../scripts/sync-upstream.js');
    const cmp = await compare({ upstreamUrl, ref, onlyProgramming });
    if (json) {
      process.stdout.write(JSON.stringify({ head: cmp.head, counts: cmp.counts, result: cmp.result, onlyProgramming }, null, 2) + '\n');
    } else {
      const modeHint = onlyProgramming ? '（默认：engineering + 独有所需）' : '（全量）';
      const lines = [];
      lines.push(`上游 HEAD: ${cmp.head}`);
      lines.push(`本地非独有: ${cmp.counts.local}  上游: ${cmp.counts.upstream} ${modeHint}`);
      lines.push('');
      const totalDiff = cmp.result.added.length + cmp.result.updated.length + cmp.result.removed.length + cmp.result.renamed.length;
      if (totalDiff === 0) lines.push('✅ 已是最新，无差异');
      else {
        if (cmp.result.added.length) lines.push(`新增 (${cmp.result.added.length}): ${cmp.result.added.join(', ')}`);
        if (cmp.result.updated.length) lines.push(`更新 (${cmp.result.updated.length}): ${cmp.result.updated.join(', ')}`);
        if (cmp.result.renamed.length) lines.push(`重命名 (${cmp.result.renamed.length}): ${cmp.result.renamed.map((r) => `${r.from}→${r.to}`).join(', ')}`);
        if (cmp.result.removed.length) lines.push(`删除 (${cmp.result.removed.length}): ${cmp.result.removed.join(', ')}`);
        if (cmp.result.same.length) lines.push(`一致 (${cmp.result.same.length}): ${cmp.result.same.join(', ')}`);
      }
      process.stdout.write(lines.join('\n') + '\n');
    }
    const { rm } = await import('node:fs/promises');
    await rm(cmp.dest, { recursive: true, force: true });
    const totalDiff = cmp.result.added.length + cmp.result.updated.length + cmp.result.removed.length + cmp.result.renamed.length;
    if (totalDiff > 0) process.exitCode = 1;
    return;
  }

  const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();
  const marker = path.join(target, 'AGENTS.md');
  // 模板同步：默认模式下过滤 skills，仅同步默认子集
  async function copyTemplateFiltered() {
    if (!onlyProgramming) {
      await cp(TEMPLATE_DIR, target, { recursive: true, force: true });
      return;
    }
    // 默认范围：分别复制非 skills 部分，skills 由后续 allSkills 循环处理
    await cp(path.join(TEMPLATE_DIR, 'AGENTS.md'), path.join(target, 'AGENTS.md'), { force: true });
    await cp(path.join(TEMPLATE_DIR, '.opencode'), path.join(target, '.opencode'), { recursive: true, force: true });
    await cp(path.join(TEMPLATE_DIR, '.pi'), path.join(target, '.pi'), { recursive: true, force: true });
    // .agents/skills 不通过模板拷贝，留给后续按 allSkills 精确同步
    await mkdir(path.join(target, '.agents', 'skills'), { recursive: true });
    // 若 .agents 下有非 skills 文件（未来扩展），也拷贝但排除 skills
    try {
      const agEntries = await readdir(path.join(TEMPLATE_DIR, '.agents'), { withFileTypes: true });
      for (const e of agEntries) {
        if (e.name === 'skills') continue;
        const src = path.join(TEMPLATE_DIR, '.agents', e.name);
        const dst = path.join(target, '.agents', e.name);
        await cp(src, dst, { recursive: true, force: true });
      }
    } catch {}
  }
  if (!(await pathExists(marker))) {
    process.stdout.write('未检测到现有项目（AGENTS.md 不存在），将执行全新初始化\n');
    if (onlyProgramming) await copyTemplateFiltered();
    else await cp(TEMPLATE_DIR, target, { recursive: true, force: true });
    process.stdout.write('模板：已复制（AGENTS.md、.agents/skills、.opencode/、.pi/）\n');
  } else {
    process.stdout.write('同步：检测到现有项目，将增量更新\n');
    let skipAgents = false;
    // --all 时强制更新 AGENTS.md，不跳过
    if (!all) {
      try {
        const content = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
        if (content.includes('tdd-implement')) skipAgents = true;
      } catch {}
    }
    if (skipAgents) {
      if (onlyProgramming) {
        await cp(path.join(TEMPLATE_DIR, '.opencode'), path.join(target, '.opencode'), { recursive: true, force: true });
        await cp(path.join(TEMPLATE_DIR, '.pi'), path.join(target, '.pi'), { recursive: true, force: true });
        // .agents 跳过 AGENTS.md 定制，skills 由后续处理
        try {
          const agEntries = await readdir(path.join(TEMPLATE_DIR, '.agents'), { withFileTypes: true });
          for (const e of agEntries) {
            if (e.name === 'skills') continue;
            await cp(path.join(TEMPLATE_DIR, '.agents', e.name), path.join(target, '.agents', e.name), { recursive: true, force: true });
          }
        } catch {}
      } else {
        await cp(path.join(TEMPLATE_DIR, '.agents'), path.join(target, '.agents'), { recursive: true, force: true });
        await cp(path.join(TEMPLATE_DIR, '.opencode'), path.join(target, '.opencode'), { recursive: true, force: true });
        await cp(path.join(TEMPLATE_DIR, '.pi'), path.join(target, '.pi'), { recursive: true, force: true });
      }
      process.stdout.write('模板：已同步（AGENTS.md 跳过，已含定制）\n');
    } else {
      if (onlyProgramming) await copyTemplateFiltered();
      else await cp(TEMPLATE_DIR, target, { recursive: true, force: true });
      process.stdout.write('模板：已同步（AGENTS.md、.agents/skills、.opencode/、.pi/）\n');
    }
  }
  // 技能同步：--all 仅更新同名技能内容，存在则覆盖，不存在则新增，并更新 AGENTS.md（由上一步已处理）；默认范围 26，--all 时按全量同名集合处理，不删多余
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const allNames = entries.filter((e) => e.isDirectory() && !e.name.endsWith('.bak') && e.name !== 'skill-creator' && e.name !== '.git').map((e) => e.name);
  let allSkills = allNames.sort();
  if (onlyProgramming) {
    const engineering = await loadEngineeringSkills();
    const required = await loadRequiredSkills();
    allSkills = allSkills.filter(n => isProgrammingSkill(n, engineering, required));
  }
  const skillsDir = path.join(target, '.agents', 'skills');
  await mkdir(skillsDir, { recursive: true });
  let installed = 0;
  let updated = 0;
  for (const name of allSkills) {
    const src = path.join(SKILLS_DIR, name);
    const dst = path.join(skillsDir, name);
    if (path.resolve(src) === path.resolve(dst)) {
      updated++;
      continue;
    }
    const exists = await pathExists(dst);
    if (exists) {
      await rm(dst, { recursive: true, force: true });
      await cp(src, dst, { recursive: true, force: true });
      updated++;
    } else {
      await cp(src, dst, { recursive: true, force: true });
      installed++;
    }
  }
  // 旧镜像自动清理：.pi/skills 与 .opencode/skills 中残留的共享技能一律删除，保留项目自定义
  // 仅清理当前全量/编程集合中的技能，避免误删自定义
  for (const harness of ['.pi/skills', '.opencode/skills']) {
    const dir = path.join(target, harness);
    if (!(await pathExists(dir))) continue;
    let hsEntries = [];
    try { hsEntries = await readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of hsEntries) {
      if (!e.isDirectory()) continue;
      if (e.name === '.git' || e.name.endsWith('.bak')) continue;
      if (e.name === '.gitkeep' || e.name === 'README.md') continue;
      if (allSkills.includes(e.name) || PROPRIETARY_SKILLS.has(e.name)) {
        await rm(path.join(dir, e.name), { recursive: true, force: true });
      }
    }
  }
  // 清理过时的 .pi/settings.json 指向
  try {
    const piSettings = path.join(target, '.pi/settings.json');
    if (await pathExists(piSettings)) {
      const txt = await readFile(piSettings, 'utf8');
      if (txt.includes('.opencode/skills') || txt.includes('../.opencode')) {
        const { writeFile } = await import('node:fs/promises');
        await writeFile(piSettings, '{}\n');
      }
    }
  } catch {}
  const modeLabel = onlyProgramming ? '编程' : '全量';
  process.stdout.write(`技能：新增 ${installed}、更新 ${updated}（${modeLabel} ${allSkills.length}）\n`);
  process.stdout.write(`目标路径：${target}\n`);
}

function parseInitArgs(args) {
  let dest;
  let all = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new Error(`unknown option '--dest' requires a value`);
      dest = args[++i];
    } else if (arg.startsWith('--dest=')) dest = arg.slice('--dest='.length);
    else if (arg === '--all') all = true;
    else if (arg === '--help' || arg === '-h') {} // handled at main level, ignore here
    else if (arg.startsWith('-')) throw new Error(`unknown option '${arg}' for command 'init'`);
    else throw new Error(`unknown argument '${arg}' for command 'init'`);
  }
  return { dest, all };
}

function parseSyncArgs(args) {
  let dest;
  let all = false;
  let dryRun = false;
  let json = false;
  let upstreamUrl;
  let ref;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new Error(`unknown option '--dest' requires a value`);
      dest = args[++i];
    } else if (arg.startsWith('--dest=')) dest = arg.slice('--dest='.length);
    else if (arg === '--all') all = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--json') json = true;
    else if (arg === '--upstream') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new Error(`unknown option '--upstream' requires a value`);
      upstreamUrl = args[++i];
    } else if (arg.startsWith('--upstream=')) upstreamUrl = arg.slice('--upstream='.length);
    else if (arg === '--ref') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new Error(`unknown option '--ref' requires a value`);
      ref = args[++i];
    } else if (arg.startsWith('--ref=')) ref = arg.slice('--ref='.length);
    else if (arg === '--help' || arg === '-h') {} // handled at main
    else if (arg === '--apply') {} // deprecated alias, same as default safe incremental
    else if (arg.startsWith('-')) throw new Error(`unknown option '${arg}' for command 'sync'`);
    else throw new Error(`unknown argument '${arg}' for command 'sync'`);
  }
  return { dest, all, dryRun, json, upstreamUrl, ref };
}

function parseInstallArgs(args) {
  let dest;
  let all = false;
  let force = false;
  let global = false;
  let toolsArg;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new Error(`unknown option '--dest' requires a value`);
      dest = args[++i];
    } else if (arg.startsWith('--dest=')) dest = arg.slice('--dest='.length);
    else if (arg === '--all') all = true;
    else if (arg === '--force') force = true;
    else if (arg === '--tools') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new Error(`unknown option '--tools' requires a value`);
      toolsArg = args[++i];
    } else if (arg.startsWith('--tools=')) toolsArg = arg.slice('--tools='.length);
    else if (arg === '--global') global = true;
    else if (arg === '--project') global = false;
    else if (arg === '--help' || arg === '-h') {} // handled at main
    else if (arg.startsWith('-')) throw new Error(`unknown option '${arg}' for command 'install'`);
    else throw new Error(`unknown argument '${arg}' for command 'install'`);
  }
  const tools = toolsArg
    ? toolsArg.split(',').map((t) => t.trim()).filter(Boolean)
    : null;
  return { dest, all, force, global, tools };
}

async function checkCommand(args) {
  const { compare } = await import('../scripts/sync-upstream.js');
  const json = args.includes('--json');
  const onlyProgramming = !args.includes('--all');
  const upstreamIdx = args.indexOf('--upstream');
  const upstreamEq = args.find((x) => x.startsWith('--upstream='));
  const upstreamUrl = upstreamIdx !== -1 ? args[upstreamIdx + 1] : (upstreamEq ? upstreamEq.slice('--upstream='.length) : undefined);
  const refIdx = args.indexOf('--ref');
  const refEq = args.find((x) => x.startsWith('--ref='));
  const ref = refIdx !== -1 ? args[refIdx + 1] : (refEq ? refEq.slice('--ref='.length) : undefined);
  const cmp = await compare({ upstreamUrl, ref, onlyProgramming });
  if (json) {
    process.stdout.write(JSON.stringify({ head: cmp.head, counts: cmp.counts, result: cmp.result, onlyProgramming }, null, 2) + '\n');
  } else {
    const lines = [];
    lines.push(`上游 HEAD: ${cmp.head}`);
    const modeHint = onlyProgramming ? '（默认：engineering + 独有所需）' : '（全量）';
    lines.push(`本地非独有: ${cmp.counts.local}  上游: ${cmp.counts.upstream} ${modeHint}`);
    lines.push('');
    const totalDiff = cmp.result.added.length + cmp.result.updated.length + cmp.result.removed.length + cmp.result.renamed.length;
    if (totalDiff === 0) {
      lines.push('✅ 已是最新，无差异');
    } else {
      if (cmp.result.added.length) lines.push(`新增 (${cmp.result.added.length}): ${cmp.result.added.join(', ')}`);
      if (cmp.result.updated.length) lines.push(`更新 (${cmp.result.updated.length}): ${cmp.result.updated.join(', ')}`);
      if (cmp.result.renamed.length) lines.push(`重命名 (${cmp.result.renamed.length}): ${cmp.result.renamed.map((r) => `${r.from}→${r.to}`).join(', ')}`);
      if (cmp.result.removed.length) lines.push(`删除 (${cmp.result.removed.length}): ${cmp.result.removed.join(', ')}`);
      if (cmp.result.same.length) lines.push(`一致 (${cmp.result.same.length}): ${cmp.result.same.join(', ')}`);
    }
    process.stdout.write(lines.join('\n') + '\n');
  }
  const { rm } = await import('node:fs/promises');
  await rm(cmp.dest, { recursive: true, force: true });
  const hasDiff = cmp.result.added.length + cmp.result.updated.length + cmp.result.removed.length + cmp.result.renamed.length > 0;
  if (hasDiff) process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  // -v/--version highest priority, anywhere
  if (args.includes('-v') || args.includes('--version')) {
    try {
      const pkgRaw = await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgRaw);
      process.stdout.write(`${pkg.version}\n`);
    } catch {
      process.stdout.write('unknown\n');
    }
    return;
  }
  // -h/--help suffix handling (global vs per-command)
  if (args.includes('-h') || args.includes('--help')) {
    const known = ['init', 'sync', 'list', 'install', 'check'];
    const first = args[0];
    const cmd = known.includes(first) ? first : null;
    if (cmd === 'init') { process.stdout.write(HELP_INIT); return; }
    if (cmd === 'sync') { process.stdout.write(HELP_SYNC); return; }
    if (cmd === 'list') { process.stdout.write(HELP_LIST); return; }
    if (cmd === 'check') { process.stdout.write(HELP_CHECK); return; }
    if (cmd === 'install') { process.stdout.write(HELP_INSTALL); return; }
    process.stdout.write(HELP_GLOBAL);
    return;
  }
  if (args.length === 0) {
    process.stdout.write(HELP_GLOBAL);
    return;
  }
  const [command, ...rest] = args;
  const knownCommands = new Set(['list', 'init', 'sync', 'install', 'check', 'update']);
  if (!knownCommands.has(command)) {
    process.stderr.write(`error: unknown command '${command}'\n`);
    process.stderr.write(`Run 'matt-skills --help' for usage.\n`);
    process.exitCode = 1;
    return;
  }
  if (command === 'list') {
    // list strict: only --all/--json/--help allowed, rest handled via parse but we keep simple
    for (const a of rest) {
      if (a === '--all' || a === '--json' || a === '--help' || a === '-h') continue;
      if (a.startsWith('-')) { process.stderr.write(`error: unknown option '${a}' for command 'list'\n`); process.stderr.write(`Run 'matt-skills list --help' for usage.\n`); process.exitCode = 1; return; }
      process.stderr.write(`error: unknown argument '${a}' for command 'list'\n`); process.stderr.write(`Run 'matt-skills list --help' for usage.\n`); process.exitCode = 1; return;
    }
    const onlyProgramming = !rest.includes('--all');
    const skills = await listSkills({ onlyProgramming });
    if (rest.includes('--json')) {
      process.stdout.write(`${JSON.stringify(skills, null, 2)}\n`);
    } else {
      for (const skill of skills) {
        process.stdout.write(`${skill.name} — ${skill.description}\n`);
      }
    }
    return;
  }
  if (command === 'init') {
    await initCommand(parseInitArgs(rest));
    return;
  }
  if (command === 'sync') {
    await syncCommand(parseSyncArgs(rest));
    return;
  }
  if (command === 'install') {
    await installCommand(parseInstallArgs(rest));
    return;
  }
  if (command === 'check') {
    // check strict: allow --all/--json/--upstream/--ref/--help
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i];
      if (a === '--all' || a === '--json' || a === '--help' || a === '-h') continue;
      if (a === '--upstream' || a === '--ref') { i++; continue; }
      if (a.startsWith('--upstream=') || a.startsWith('--ref=')) continue;
      if (a.startsWith('-')) { process.stderr.write(`error: unknown option '${a}' for command 'check'\n`); process.stderr.write(`Run 'matt-skills check --help' for usage.\n`); process.exitCode = 1; return; }
      process.stderr.write(`error: unknown argument '${a}' for command 'check'\n`); process.stderr.write(`Run 'matt-skills check --help' for usage.\n`); process.exitCode = 1; return;
    }
    await checkCommand(rest);
    return;
  }
  if (command === 'update') {
    process.stderr.write('update 已合并到 sync（默认即增量同步）\n');
    process.exitCode = 1;
    return;
  }
}
main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});
