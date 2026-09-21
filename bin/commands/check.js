import { rm } from 'node:fs/promises';

export async function runCheck(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all' || arg === '--json' || arg === '--help' || arg === '-h') continue;
    if (arg === '--upstream' || arg === '--ref') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        process.stderr.write(`error: option '${arg}' for command 'check' requires a value\n`);
        process.stderr.write(`Run 'matt-skills check --help' for usage.\n`);
        process.exitCode = 2;
        return;
      }
      i++;
      continue;
    }
    if (arg.startsWith('--upstream=') || arg.startsWith('--ref=')) continue;
    if (arg.startsWith('-')) {
      process.stderr.write(`error: unknown option '${arg}' for command 'check'\n`);
      process.stderr.write(`Run 'matt-skills check --help' for usage.\n`);
      process.exitCode = 2;
      return;
    }
    process.stderr.write(`error: unknown argument '${arg}' for command 'check'\n`);
    process.stderr.write(`Run 'matt-skills check --help' for usage.\n`);
    process.exitCode = 2;
    return;
  }

  const { compare, formatComparison } = await import('../../scripts/sync-upstream.js');
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
  await rm(cmp.dest, { recursive: true, force: true });
  const hasDiff = cmp.result.added.length + cmp.result.updated.length + cmp.result.removed.length + cmp.result.renamed.length > 0;
  if (hasDiff) process.exitCode = 1;
}
