import { listSkills } from '../skills/discovery.js';

export async function runList(args) {
  for (const arg of args) {
    if (arg === '--all' || arg === '--json' || arg === '--help' || arg === '-h') continue;
    if (arg.startsWith('-')) {
      process.stderr.write(`error: unknown option '${arg}' for command 'list'\n`);
      process.stderr.write(`Run 'matt-skills list --help' for usage.\n`);
      process.exitCode = 2;
      return;
    }
    process.stderr.write(`error: unknown argument '${arg}' for command 'list'\n`);
    process.stderr.write(`Run 'matt-skills list --help' for usage.\n`);
    process.exitCode = 2;
    return;
  }
  const onlyProgramming = !args.includes('--all');
  const skills = await listSkills({ onlyProgramming });
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(skills, null, 2)}\n`);
  } else {
    for (const skill of skills) {
      process.stdout.write(`${skill.name} — ${skill.description}\n`);
    }
  }
}
