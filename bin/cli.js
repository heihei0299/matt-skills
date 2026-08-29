#!/usr/bin/env node
import { readdir, readFile, cp, stat, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';

const SKILLS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.agents', 'skills');
const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');
const PROPRIETARY_SKILLS = new Set(['tdd-implement', 'grill-to-spec', 'diagnose-fix', 'commit-check', 'instance-test']);
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const HELP = `matt-skills — install and manage this skill collection

Usage:
  matt-skills init [options]                   Initialize a project: template + upstream skills
  matt-skills sync [options]                   Sync existing project to latest template + skills (backs up overwritten files to .bak)
  matt-skills list [--json]                    List available skills and their descriptions
  matt-skills install [options]                Install skills (interactive by default)
  matt-skills --help                          Show this help

Init options:
  --dest <path>   Target directory (default: current directory)
  --force         Overwrite existing files (backs up to .bak)
Sync options:
  --dest <path>   Target directory (default: current directory)
  --force         Overwrite without backup (default: backup to .bak)

Install options:
  --tools <a,b>   Install for the given tools (codex, pi, opencode, claude); skips tool selection
  --all           Install all skills; skips skill selection
  --force         Overwrite existing skills
  --global        Install to the user's global skill directories
  --project       Install to project skill directories (default)
  --dest <path>   Install everything into a single custom directory (overrides --tools)
`;

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

async function listSkills() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.endsWith('.bak')) continue;
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

async function backupIfExists(p) {
  if (!(await pathExists(p))) return null;
  const bak = `${p}.bak`;
  await cp(p, bak, { recursive: true, force: true });
  return bak;
}

async function ensureSkillsGitignore(skillsDir) {
  try {
    await mkdir(skillsDir, { recursive: true });
    const gi = path.join(skillsDir, '.gitignore');
    const content = '# matt-skills backup — pi skips .bak via explicit filter + this fallback\n*.bak\n*.bak/\n';
    if (await pathExists(gi)) {
      const cur = await readFile(gi, 'utf8');
      if (cur.includes('*.bak')) return;
      await writeFile(gi, cur.endsWith('\n') ? `${cur}${content}` : `${cur}\n${content}`);
    } else {
      await writeFile(gi, content);
    }
  } catch {}
}

const TOOLS = ['codex', 'pi', 'opencode', 'claude'];

const PROJECT_DIRS = {
  codex: '.agents/skills',
  pi: '.pi/skills',
  opencode: '.opencode/skills',
  claude: '.claude/skills',
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
  const skills = await listSkills();
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
  }
  const selected = all ? skills.map((s) => s.name) : await promptSkills(skills);
  if (selected.length === 0) {
    process.stdout.write('未选择任何技能，未安装任何技能\n');
    return;
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

async function initCommand({ dest, force }) {
  const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();
  const marker = path.join(target, 'AGENTS.md');
  if (!force && (await pathExists(marker))) {
    process.stdout.write('模板已存在（AGENTS.md），跳过；用 --force 覆盖（自动备份到 .bak）\n');
  } else {
    if (force && (await pathExists(marker))) {
      for (const name of ['AGENTS.md', '.opencode', '.pi']) {
        const cur = path.join(target, name);
        if (await pathExists(cur)) await backupIfExists(cur);
      }
      await cp(TEMPLATE_DIR, target, { recursive: true, force: true });
      process.stdout.write('模板：已备份到 .bak 并覆盖（AGENTS.md、.opencode/、.pi/）\n');
    } else {
      await cp(TEMPLATE_DIR, target, { recursive: true, force: true });
      process.stdout.write('模板：已复制（AGENTS.md、.opencode/、.pi/）\n');
    }
  }
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const upstream = entries
    .filter((e) => e.isDirectory() && !PROPRIETARY_SKILLS.has(e.name) && !e.name.endsWith('.bak'))
    .map((e) => e.name)
    .sort();
  const skillsDir = path.join(target, '.agents', 'skills');
  let installed = 0;
  let skipped = 0;
  let backedUp = 0;
  for (const name of upstream) {
    const src = path.join(SKILLS_DIR, name);
    const dst = path.join(skillsDir, name);
    if (src === dst) {
      skipped++;
      continue;
    }
    if (!force && (await pathExists(dst))) {
      skipped++;
      continue;
    }
    if (force && (await pathExists(dst))) {
      await backupIfExists(dst);
      backedUp++;
    }
    await cp(src, dst, { recursive: true, force: true });
    installed++;
  }
  if (force && backedUp > 0) {
    process.stdout.write(`上游技能：已装 ${installed}、跳过 ${skipped}、备份 ${backedUp} 到 .bak\n`);
  } else {
    process.stdout.write(`上游技能：已装 ${installed}、跳过 ${skipped}\n`);
  }
  await ensureSkillsGitignore(skillsDir);
  process.stdout.write(`目标路径：${target}\n`);
}

async function syncCommand({ dest, force }) {
  const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();
  const marker = path.join(target, 'AGENTS.md');
  const backup = !force;
  if (!(await pathExists(marker))) {
    process.stdout.write('未检测到现有项目（AGENTS.md 不存在），将执行全新初始化\n');
    await cp(TEMPLATE_DIR, target, { recursive: true, force: true });
    process.stdout.write('模板：已复制（AGENTS.md、.opencode/、.pi/）\n');
  } else {
    process.stdout.write('同步：检测到现有项目，将增量更新并备份被覆盖文件到 .bak\n');
    if (backup) {
      for (const name of ['AGENTS.md', '.opencode', '.pi']) {
        const cur = path.join(target, name);
        if (await pathExists(cur)) await backupIfExists(cur);
      }
    }
    await cp(TEMPLATE_DIR, target, { recursive: true, force: true });
    process.stdout.write(backup ? '模板：已备份并同步（AGENTS.md、.opencode/、.pi/）\n' : '模板：已覆盖（AGENTS.md、.opencode/、.pi/）\n');
  }
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const upstream = entries
    .filter((e) => e.isDirectory() && !PROPRIETARY_SKILLS.has(e.name) && !e.name.endsWith('.bak'))
    .map((e) => e.name)
    .sort();
  const skillsDir = path.join(target, '.agents', 'skills');
  let installed = 0;
  let updated = 0;
  let backedUp = 0;
  for (const name of upstream) {
    const src = path.join(SKILLS_DIR, name);
    const dst = path.join(skillsDir, name);
    if (src === dst) {
      updated++;
      continue;
    }
    const exists = await pathExists(dst);
    if (exists) {
      if (backup) {
        await backupIfExists(dst);
        backedUp++;
      }
      await cp(src, dst, { recursive: true, force: true });
      updated++;
    } else {
      await cp(src, dst, { recursive: true, force: true });
      installed++;
    }
  }
  if (backup) {
    process.stdout.write(`上游技能：新增 ${installed}、更新 ${updated}（已备份 ${backedUp} 到 .bak）\n`);
  } else {
    process.stdout.write(`上游技能：新增 ${installed}、更新 ${updated}\n`);
  }
  await ensureSkillsGitignore(skillsDir);
  process.stdout.write(`目标路径：${target}\n`);
}

function parseInitArgs(args) {
  let dest;
  let force = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') dest = args[++i];
    else if (arg.startsWith('--dest=')) dest = arg.slice('--dest='.length);
    else if (arg === '--force') force = true;
  }
  return { dest, force };
}

function parseInstallArgs(args) {
  let dest;
  let all = false;
  let force = false;
  let global = false;
  let toolsArg;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') dest = args[++i];
    else if (arg.startsWith('--dest=')) dest = arg.slice('--dest='.length);
    else if (arg === '--all') all = true;
    else if (arg === '--force') force = true;
    else if (arg === '--tools') toolsArg = args[++i];
    else if (arg.startsWith('--tools=')) toolsArg = arg.slice('--tools='.length);
    else if (arg === '--global') global = true;
    else if (arg === '--project') global = false;
  }
  const tools = toolsArg
    ? toolsArg.split(',').map((t) => t.trim()).filter(Boolean)
    : null;
  return { dest, all, force, global, tools };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    process.stdout.write(HELP);
    return;
  }
  const [command, ...rest] = args;
  if (command === 'list') {
    const skills = await listSkills();
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
    await syncCommand(parseInitArgs(rest));
    return;
  }
  if (command === 'install') {
    await installCommand(parseInstallArgs(rest));
    return;
  }
  process.stderr.write(HELP);
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});
