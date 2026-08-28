---
name: instance-test
disable-model-invocation: true
description: "Verify project meets expected goals by running prompt instances in isolated temp projects"
---

# Instance Test

Run **instance** prompts to verify project meets expected goals via actual functional tests. Each **instance** is a prompt + expected files/behavior, executed in an isolated temp directory — no mocks, no stubs.

## Steps

### 1. Gather instances

Collect the **instance** set to run:

- User-provided instances (prompt + expected), or
- Project defaults for this repo: `init` fresh, `init` skip, `init --force` backup, `sync` backup, `list` — see `instances.md` if present, otherwise derive from `README` expected behavior.

Completion: instance list is fixed (prompt, expected outcome, verification command) — no instance is added mid-run.

### 2. Run instances

For each **instance** in order:

1. `mktemp -d` isolated dir.
2. Execute the prompt's command (`node bin/cli.js init --dest <dir>` or `npx @heihei0299/matt-skills init` for remote) — capture stdout/stderr and exit code.
3. Snapshot result files (`AGENTS.md`, `.opencode/`, `.pi/`, `.agents/skills/`) and `.bak` when expected.

Do not run instances in parallel — one **instance** at a time, so failures are isolated and artifacts do not collide.

Completion: every **instance** has a run dir with captured output and file snapshot.

### 3. Evaluate

Compare each **instance**'s actual vs expected:

- File existence/content (`test -f`, `grep -q`, `diff` against template).
- Stdout contains expected phrases (e.g. `模板：已复制`, `已备份`).
- Exit code `0` and no unhandled errors.

Mark `PASS`/`FAIL` per **instance** with evidence (file path, stdout line, or diff).

Completion: every **instance** has a `PASS` or `FAIL` with evidence — no unevaluated instance.

### 4. Report

Summarize in conversation:

- `PASS m/n` with per-instance evidence.
- Failures list the gap (expected vs actual) and the run dir for reproduction.
- Clean up temp dirs unless `--keep` is requested.

Do not write a report file (`report-*.md`) — output stays in conversation. Keep temp dirs only on failure for debugging.

## References

- Instance definitions (if any): `references/instances.md` — auto-loaded only when present, not required.
- Project expected behavior: `README` + `bin/cli.js` HELP.
