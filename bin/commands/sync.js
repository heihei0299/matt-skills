import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REPO_LOCAL_SKILLS } from '../skills/boundaries.js';
import { listSkillNames, SKILLS_DIR } from '../skills/discovery.js';
import { copyDryRunInputs, compareDryRunTrees, formatTargetComparison, syncTemplate } from '../project/template.js';
import { syncProjectSkills } from '../project/skills.js';

const PROJECT_SKILL_DIRS = '.agents/skills';

export function parseSyncArgs(args) {
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
    else if (arg === '--help' || arg === '-h') {}
    else if (arg === '--apply') {}
    else if (arg.startsWith('-')) throw new Error(`unknown option '${arg}' for command 'sync'`);
    else throw new Error(`unknown argument '${arg}' for command 'sync'`);
  }
  return { dest, all, dryRun, json, refreshAgents };
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

export async function runSync(args) {
  await syncCommand(parseSyncArgs(args));
}
