import path from 'node:path';
import prompts from 'prompts';
import { isDistributableSkill } from '../skills/boundaries.js';
import { listSkillNames, listSkills, SKILLS_DIR } from '../skills/discovery.js';
import { TOOLS, copySkills, toolDir } from '../project/skills.js';

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
    else if (arg === '--help' || arg === '-h') {}
    else if (arg.startsWith('-')) throw new Error(`unknown option '${arg}' for command 'install'`);
    else throw new Error(`unknown argument '${arg}' for command 'install'`);
  }
  const tools = toolsArg
    ? toolsArg.split(',').map((t) => t.trim()).filter(Boolean)
    : null;
  return { dest, all, force, global, tools };
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

export async function runInstall(args) {
  await installCommand(parseInstallArgs(args));
}
