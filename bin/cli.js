#!/usr/bin/env node
import { readdir, readFile, rm, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import {
  PROPRIETARY_SKILLS,
  isDistributableSkill,
  isRepoLocalSkill,
  REPO_LOCAL_SKILLS,
} from './skills/boundaries.js';
import { listSkillNames, listSkills, SKILLS_DIR } from './skills/discovery.js';
import { pathExists } from './project/filesystem.js';
import {
  copyDryRunInputs,
  compareDryRunTrees,
  copyTemplate,
  formatTargetComparison,
  syncTemplate,
} from './project/template.js';
import {
  TOOLS,
  copySkills,
  distributeProjectSkills,
  syncProjectSkills,
  toolDir,
} from './project/skills.js';

process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const PROJECT_SKILL_DIRS = '.agents/skills';

const HELP_GLOBAL = `matt-skills — install and manage this skill collection

Usage:
  matt-skills init [options]                   Initialize a project: template + skills (${PROJECT_SKILL_DIRS})
  matt-skills sync [--all|--dry-run|--refresh-agents] [--dest <path>]   Sync existing project to latest template + skills
  matt-skills list [--all] [--json]            List available skills and their descriptions
  matt-skills install [options]                Install skills (interactive by default)
  matt-skills check [--all] [--json] [--upstream <url>] [--ref <ref>]
                                              Check if upstream skills are up to date (read-only)
  matt-skills --help | -h                     Show this help
  matt-skills --version | -v                  Show version
`;

const HELP_INIT = `matt-skills init [options] — Initialize a project: template + skills (${PROJECT_SKILL_DIRS})

Usage:
  matt-skills init [options]

Init options:
  --dest <path>   Target directory (default: current directory)
  --all           Include all distributable skills; default only default workflow skills
  --help, -h      Show this help
提示：已有 AGENTS.md 时 init 始终跳过；需要更新已有项目请使用 sync。

提示：matt-skills --help 查看全量
`;

const HELP_SYNC = `matt-skills sync — Sync existing project to latest template + skills

Usage:
  matt-skills sync [--all|--dry-run|--refresh-agents] [--dest <path>]

Sync options:
  --all              同步全部可分发技能；不改变 AGENTS.md 刷新策略
  --refresh-agents   显式刷新 AGENTS.md；无受管区块时先备份为 AGENTS.md.bak
  --dry-run          预演目标项目变化，只比对不写盘
  --json             仅与 --dry-run 一起使用，输出机器可读结果
  --dest <path>      Target directory (default: current directory)
  --help, -h         Show this help
  项目 skills：${PROJECT_SKILL_DIRS}

说明：默认同步默认 workflow skill 并保留现有 AGENTS.md；--all 只扩大技能范围。
      --refresh-agents 与 --all、--dry-run 可组合；上游检查请使用 check。

提示：matt-skills --help 查看全量
`;

const HELP_LIST = `matt-skills list — List available skills

Usage:
  matt-skills list [--all] [--json]

List options:
  --all           List all distributable skills (default only default workflow skills)
  --json          Output as JSON
  --help, -h      Show this help

提示：matt-skills --help 查看全量
`;

const HELP_CHECK = `matt-skills check — Check if upstream skills are up to date (read-only)

Usage:
  matt-skills check [--all] [--json] [--upstream <url>] [--ref <ref>]

Check options:
  --all           Include the full upstream comparison scope; default engineering + required upstream skills (proprietary excluded)
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
  --tools <a,b>   Install for the given tools (codex, pi, opencode, claude); skips tool selection
  --all           Install all distributable skills (default only default workflow); skips skill selection
  --force         Overwrite existing skills
  --global        Install to the user's global skill directories
  --project       Install to project skill directories (default)
  --dest <path>   Install everything into a single custom directory (overrides --tools)
  --help, -h      Show this help

提示：matt-skills --help 查看全量
`;

const HELP = HELP_GLOBAL;

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
    type: 'autocompleteMultiselect',
    name: 'skills',
    message: '选择要安装的技能',
    choices: skills.map((s) => ({ title: s.name, value: s.name })),
    instructions: '输入过滤，空格勾选，回车确认',
    onRender() {
      if (this.inputValue && this.filteredOptions.length === 0) {
        this.filteredOptions = [{ title: '没有匹配的技能', value: '__no-match__', disabled: true }];
        this.cursor = 0;
      }
    },
  });
  return Array.isArray(res?.skills) ? res.skills : [];
}

async function installCommand({ dest, all, force, tools, global }) {
  const onlyProgramming = !all;
  const skillNames = await listSkillNames({ onlyProgramming });
  const skills = await listSkills({ onlyProgramming });
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
    targets = selectedTools.map((tool) => ({ tool, dir: toolDir(tool, global) }));
    // 去重：保留对自定义 PROJECT_DIRS 映射的兼容。
    const seen = new Map();
    for (const t of targets) {
      if (!seen.has(t.dir)) seen.set(t.dir, t);
    }
    targets = [...seen.values()];
  }
  const selected = all ? skillNames : await promptSkills(skills);
  if (selected.length === 0) {
    process.stdout.write('未选择任何技能，未安装任何技能\n');
    return;
  }
  const knownDistributable = new Set(skillNames);
  for (const name of selected) {
    if (!isDistributableSkill(name, knownDistributable)) {
      throw new Error(`${name} is repository-local or unavailable and cannot be distributed`);
    }
  }
  for (const { tool, dir } of targets) {
    const { installed, skipped } = await copySkills({
      sourceDir: SKILLS_DIR,
      targetDir: dir,
      skillNames: selected,
      force,
    });
    if (tool) process.stdout.write(`${tool}：已装 ${installed}、跳过 ${skipped}\n`);
    else process.stdout.write(`已装 ${installed}、跳过 ${skipped}\n`);
    process.stdout.write(`目标路径：${dir}\n`);
  }
}

async function initCommand({ dest, all }) {
  const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();
  const marker = path.join(target, 'AGENTS.md');
  const onlyProgramming = !all;
  if (await pathExists(marker)) {
    process.stdout.write('模板已存在（AGENTS.md），跳过\n');
  } else {
    await copyTemplate(target);
    const selectedSkills = await listSkillNames({ onlyProgramming });
    await distributeProjectSkills({ target, sourceDir: SKILLS_DIR, skillNames: selectedSkills });
    process.stdout.write(`模板：已复制（AGENTS.md、skills：${PROJECT_SKILL_DIRS}）\n`);
  }
  // 统计（区分编程 vs 全量）
  const skillsDir = path.join(target, '.agents', 'skills');
  let installed = 0;
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    installed = entries.filter((e) => e.isDirectory() && !e.name.endsWith('.bak') && e.name !== '.git' && e.name !== 'skill-creator' && !isRepoLocalSkill(e.name)).length;
  } catch {}
  const allSkillsFull = await listSkills({ onlyProgramming: false });
  const defaultSkills = await listSkills({ onlyProgramming: true });
  const defaultCount = defaultSkills.length;
  const upstreamFull = allSkillsFull.filter((s) => !PROPRIETARY_SKILLS.has(s.name)).length;
  const upstreamDefault = defaultSkills.filter((s) => !PROPRIETARY_SKILLS.has(s.name)).length;
  const displayTotal = onlyProgramming ? defaultCount : allSkillsFull.length;
  const displayUpstream = onlyProgramming ? upstreamDefault : upstreamFull;
  if (path.resolve(skillsDir) === path.resolve(SKILLS_DIR)) {
    process.stdout.write(`技能：已装 ${installed}、跳过 0（可分发 ${allSkillsFull.length}，含上游 ${upstreamFull}；默认 workflow ${defaultCount}，含上游 ${upstreamDefault}）\n`);
  } else {
    if (onlyProgramming) {
      process.stdout.write(`技能：已装 ${installed}（默认 workflow ${displayTotal}，含上游 ${displayUpstream}；可分发 ${allSkillsFull.length}，含上游 ${upstreamFull}）\n`);
    } else {
      process.stdout.write(`技能：已装 ${installed}（可分发 ${displayTotal}，含上游 ${displayUpstream}）\n`);
    }
  }
  process.stdout.write(`目标路径：${target}\n`);
}
async function syncCommand({ dest, all, dryRun, json, refreshAgents, quiet = false }) {
  const onlyProgramming = !all;
  const output = (text) => {
    if (!quiet) process.stdout.write(text);
  };
  if (!dryRun && json) throw new Error('--json 仅支持 sync --dry-run');
  if (dryRun) {
    const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();
    const stage = await mkdtemp(path.join(os.tmpdir(), 'matt-skills-sync-dry-run-'));
    try {
      await copyDryRunInputs(target, stage);
      await syncCommand({ dest: stage, all, dryRun: false, json: false, refreshAgents, quiet: true });
      const result = await compareDryRunTrees(target, stage);
      const payload = { target, result, onlyProgramming, refreshAgents };
      if (json) output(`${JSON.stringify(payload, null, 2)}\n`);
      else output(`${formatTargetComparison(payload)}\n`);
      const totalDiff = result.added.length + result.updated.length + result.removed.length;
      if (totalDiff > 0) process.exitCode = 1;
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
    return;
  }

  const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();
  const template = await syncTemplate({ target, refreshAgents });
  if (template.initialized) {
    output('未检测到现有项目（AGENTS.md 不存在），将执行全新初始化\n');
    output(`模板：已复制（AGENTS.md、skills：${PROJECT_SKILL_DIRS}）\n`);
  } else {
    output('同步：检测到现有项目，将增量更新\n');
    if (template.agentsRefreshed && template.agentsRefreshMode === 'managed') {
      output(`模板：已同步（AGENTS.md 受管区块已刷新、skills：${PROJECT_SKILL_DIRS}，项目自定义内容已保留）\n`);
    } else if (template.agentsRefreshed) {
      output(`模板：已同步（AGENTS.md 已刷新，旧文件备份为 AGENTS.md.bak、skills：${PROJECT_SKILL_DIRS}）\n`);
    } else if (template.agentsManaged) {
      output(`模板：已同步（AGENTS.md 受管区块已更新、skills：${PROJECT_SKILL_DIRS}，项目自定义内容已保留）\n`);
    } else {
      output(`模板：已同步（AGENTS.md 未受管、skills：${PROJECT_SKILL_DIRS}，已原样保留）\n`);
    }
  }
  // --all 只扩大技能范围；同名覆盖、不存在新增，不删除目标中的额外技能。
  const allSkills = await listSkillNames({ onlyProgramming });
  const result = await syncProjectSkills({
    target,
    sourceDir: SKILLS_DIR,
    skillNames: allSkills,
    distributableSkillNames: (await listSkillNames({ onlyProgramming: false })).filter((name) => !REPO_LOCAL_SKILLS.has(name)),
    repoLocalSkills: REPO_LOCAL_SKILLS,
  });
  if (result.cleanedLegacy.length) {
    output(`迁移清理：${result.cleanedLegacy.join(', ')} 旧共享副本已移除\n`);
  }
  if (result.preservedRepoLocal.length) {
    output(`迁移提示：${result.preservedRepoLocal.join(', ')} 已不再分发，现有副本已保留\n`);
  }
  const modeLabel = onlyProgramming ? '默认 workflow' : '全部可分发';
  output(`技能：新增 ${result.installed}、更新 ${result.updated}（${modeLabel} ${allSkills.length}）\n`);
  output(`目标路径：${target}\n`);
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
  let refreshAgents = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new Error(`unknown option '--dest' requires a value`);
      dest = args[++i];
    } else if (arg.startsWith('--dest=')) dest = arg.slice('--dest='.length);
    else if (arg === '--all') all = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--json') json = true;
    else if (arg === '--refresh-agents') refreshAgents = true;
    else if (arg === '--help' || arg === '-h') {} // handled at main
    else if (arg === '--apply') {} // deprecated alias, same as default safe incremental
    else if (arg.startsWith('-')) throw new Error(`unknown option '${arg}' for command 'sync'`);
    else throw new Error(`unknown argument '${arg}' for command 'sync'`);
  }
  return { dest, all, dryRun, json, refreshAgents };
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
  const { compare, formatComparison } = await import('../scripts/sync-upstream.js');
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
    process.stdout.write(formatComparison(cmp) + '\n');
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
    process.exitCode = 2;
    return;
  }
  if (command === 'list') {
    // list strict: only --all/--json/--help allowed, rest handled via parse but we keep simple
    for (const a of rest) {
      if (a === '--all' || a === '--json' || a === '--help' || a === '-h') continue;
      if (a.startsWith('-')) { process.stderr.write(`error: unknown option '${a}' for command 'list'\n`); process.stderr.write(`Run 'matt-skills list --help' for usage.\n`); process.exitCode = 2; return; }
      process.stderr.write(`error: unknown argument '${a}' for command 'list'\n`); process.stderr.write(`Run 'matt-skills list --help' for usage.\n`); process.exitCode = 2; return;
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
      if (a === '--upstream' || a === '--ref') {
        if (i + 1 >= rest.length || rest[i + 1].startsWith('-')) {
          process.stderr.write(`error: option '${a}' for command 'check' requires a value\n`);
          process.stderr.write(`Run 'matt-skills check --help' for usage.\n`);
          process.exitCode = 2;
          return;
        }
        i++;
        continue;
      }
      if (a.startsWith('--upstream=') || a.startsWith('--ref=')) continue;
      if (a.startsWith('-')) { process.stderr.write(`error: unknown option '${a}' for command 'check'\n`); process.stderr.write(`Run 'matt-skills check --help' for usage.\n`); process.exitCode = 2; return; }
      process.stderr.write(`error: unknown argument '${a}' for command 'check'\n`); process.stderr.write(`Run 'matt-skills check --help' for usage.\n`); process.exitCode = 2; return;
    }
    await checkCommand(rest);
    return;
  }
  if (command === 'update') {
    process.stderr.write('update 已合并到 sync（默认即增量同步）\n');
    process.exitCode = 2;
    return;
  }
}
main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 2;
});
