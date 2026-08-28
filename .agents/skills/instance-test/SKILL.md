---
name: instance-test
disable-model-invocation: true
description: "Verify project meets expected goals by running prompt instances in isolated temp dirs"
---

# Instance Test

Run **instance** prompts to verify project meets expected goals via actual functional tests. Each **instance** is a prompt + expected outcome, executed in an isolated temp dir — no mocks, no stubs.

## Steps

### 1. Gather instances

Collect the **instance** set to run:

- User-provided instances (prompt, command, expected files/stdout/exit code), or
- Derived from `spec.md`/`README` acceptance criteria — extract each verifiable behavior as one instance, then confirm the list with the user before running.

Each **instance** must declare: command to run, expected files/content, expected stdout phrases, expected exit code.

Completion: instance list is fixed (prompt, expected outcome, verification command) — no instance is added mid-run.

### 2. Run instances

For each **instance** in order:

1. `mktemp -d` isolated dir (or `git worktree` / `--dest` if the project supports it).
2. Execute the instance's command — capture stdout/stderr and exit code.
3. Snapshot result files and side effects declared in expected.

Do not run instances in parallel — one **instance** at a time, so failures are isolated and artifacts do not collide.

Completion: every **instance** has a run dir with captured output and file snapshot.

### 3. Evaluate

Compare each **instance**'s actual vs expected:

- File existence/content (`test -f`, `grep -q`, `diff`).
- Stdout/stderr contains expected phrases.
- Exit code matches expected.

Mark `PASS`/`FAIL` per **instance** with evidence (file path, stdout line, or diff).

Completion: every **instance** has a `PASS` or `FAIL` with evidence — no unevaluated instance.

### 4. Report

Summarize in conversation:

- `PASS m/n` with per-instance evidence.
- Failures list the gap (expected vs actual) and the run dir for reproduction.
- Clean up temp dirs unless `--keep` is requested.

Do not write a report file (`report-*.md`) — output stays in conversation. Keep temp dirs only on failure for debugging.

## References

- Instance definitions (if any): `references/instances.md` — example set, auto-loaded only when present, not required.
- Project expected behavior: `spec.md`/`README`/`--help` — the source of truth for what to verify.
