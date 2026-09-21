import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { PROPRIETARY_SKILLS, isRepoLocalSkill } from '../skills/boundaries.js';
import { listSkillNames, listSkills, SKILLS_DIR } from '../skills/discovery.js';
import { pathExists } from '../project/filesystem.js';
import { copyTemplate } from '../project/template.js';
import { distributeProjectSkills, PROJECT_SKILLS_DIR } from '../project/skills.js';

export function parseInitArgs(args) {
  let dest;
  let all = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new Error(`unknown option '--dest' requires a value`);
      dest = args[++i];
    } else if (arg.startsWith('--dest=')) dest = arg.slice('--dest='.length);
    else if (arg === '--all') all = true;
    else if (arg === '--help' || arg === '-h') {}
    else if (arg.startsWith('-')) throw new Error(`unknown option '${arg}' for command 'init'`);
    else throw new Error(`unknown argument '${arg}' for command 'init'`);
  }
  return { dest, all };
}

export async function runInit(args) {
  const { dest, all } = parseInitArgs(args);
  const target = dest ? path.resolve(process.cwd(), dest) : process.cwd();
  const marker = path.join(target, 'AGENTS.md');
  const onlyProgramming = !all;
  if (await pathExists(marker)) {
    process.stdout.write('模板已存在（AGENTS.md），跳过\n');
  } else {
    await copyTemplate(target, { includeHarness: all });
    const selectedSkills = await listSkillNames({ onlyProgramming });
    await distributeProjectSkills({ target, sourceDir: SKILLS_DIR, skillNames: selectedSkills });
    process.stdout.write(`模板：已复制（AGENTS.md、skills：${PROJECT_SKILLS_DIR}）\n`);
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
