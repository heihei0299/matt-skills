#!/usr/bin/env node
import { readdir, readFile, cp, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';

const SKILLS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.agents', 'skills');
const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');
// 独有技能不进 .agents/skills/（由 template/.opencode/skills 与 template/.pi/skills 镜像分发）。
const PROPRIETARY_SKILLS = new Set(['tdd-implement', 'grill-to-spec', 'diagnose-fix', 'commit-check']);
// Exit cleanly when the consumer closes the pipe early (e.g. `list | head`).
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const HELP = `matt-skills — install and manage this skill collection

Usage:
  matt-skills init [options]                   Initialize a project: template + upstream skills
  matt-skills list [--json]                    List available skills and their descriptions
  matt-skills install [options]                Install skills (interactive by default)
  matt-skills --help                          Show this help

Init options:
  --dest <path>   Target directory (default: current directory)
  --force         Overwrite existing files

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
    let content;
    try {
      content = await readFile(path.join(SKILLS_DIR, entry.name, 'SKILL.md'), 'utf8');
    } catch {
      continue; // directory without SKILL.md is not a skill
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

  // 1. Decide the target directories.
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

  // 2. Decide which skills to install.
  const selected = all ? skills.map((s) => s.name) : await promptSkills(skills);
  if (selected.length === 0) {
    process.stdout.write('未选择任何技能，未安装任何技能\n');
    return;
  }

  // 3. Copy per target and report a per-tool summary.
  for (const { tool, dir } of targets) {
    let installed = 0;
    let skipped = 0;
    for (const name of selected) {
      const dst = path.join(dir, name);
      if (!force && (await pathExists(dst))) {
        skipped++;
        continue;
      }
      await cp(path.join(SKILLS_DIR, name), dst, { recursive: true });
      installed++;
    }
    if (tool) process.stdout.write(`${tool}：已装 ${installed}、跳过 ${skipped}\n`);
    else process.stdout.write(`已装 ${installed}、跳过 ${skipped}\n`);
    process.stdout.write(`目标路径：${dir}\n`);
  }
}

async function initCommand({ dest, force }) {
  const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();

  // 1. Copy the template (AGENTS.md + .opencode/ + .pi/).
  const marker = path.join(target, 'AGENTS.md');
  if (!force && (await pathExists(marker))) {
    process.stdout.write('模板已存在（AGENTS.md），跳过；用 --force 覆盖\n');
  } else {
    await cp(TEMPLATE_DIR, target, { recursive: true, force });
    process.stdout.write('模板：已复制（AGENTS.md、.opencode/、.pi/）\n');
  }

  // 2. Copy upstream skills (everything except the proprietary ones) into .agents/skills/.
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const upstream = entries
    .filter((e) => e.isDirectory() && !PROPRIETARY_SKILLS.has(e.name))
    .map((e) => e.name)
    .sort();
  const skillsDir = path.join(target, '.agents', 'skills');
  let installed = 0;
  let skipped = 0;
  for (const name of upstream) {
    const dst = path.join(skillsDir, name);
    if (!force && (await pathExists(dst))) {
      skipped++;
      continue;
    }
    await cp(path.join(SKILLS_DIR, name), dst, { recursive: true });
    installed++;
  }
  process.stdout.write(`上游技能：已装 ${installed}、跳过 ${skipped}\n`);
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
