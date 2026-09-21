#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCheck } from './commands/check.js';
import { runInit } from './commands/init.js';
import { runInstall } from './commands/install.js';
import { runList } from './commands/list.js';
import { runSync } from './commands/sync.js';
import { PROJECT_SKILLS_DIR } from './project/skills.js';

process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const HELP_GLOBAL = `matt-skills — install and manage this skill collection

Usage:
  matt-skills init [options]                   Initialize a project: template + skills (${PROJECT_SKILLS_DIR})
  matt-skills sync [--all|--dry-run|--refresh-agents] [--dest <path>]   Sync existing project to latest template + skills
  matt-skills list [--all] [--json]            List available skills and their descriptions
  matt-skills install [options]                Install skills (interactive by default)
  matt-skills check [--all] [--json] [--upstream <url>] [--ref <ref>]
                                              Check if upstream skills are up to date (read-only)
  matt-skills --help | -h                     Show this help
  matt-skills --version | -v                  Show version
`;

const HELP_INIT = `matt-skills init [options] — Initialize a project: template + skills (${PROJECT_SKILLS_DIR})

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
  项目 skills：${PROJECT_SKILLS_DIR}

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
    await runList(rest);
    return;
  }
  if (command === 'init') {
    await runInit(rest);
    return;
  }
  if (command === 'sync') {
    await runSync(rest);
    return;
  }
  if (command === 'install') {
    await runInstall(rest);
    return;
  }
  if (command === 'check') {
    await runCheck(rest);
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
