# Git history must only be appended — stash/clean must not drop commits

A tdd-implement run left a `refs/stash` with `stash push --include-untracked` and later `stash pop/drop` plus an incentive to reach `git status` clean via destructive git commands. In an eval workspace with independent copies per run, any `reset --hard`, `checkout .`, `clean -fd`, `stash --include-untracked`, `push --force` or `rebase -i` that moves `HEAD` backward silently drops commits and is indistinguishable from data loss.

We decided every git-touching skill must record `BASE_HEAD=$(git rev-parse HEAD)` at stage entry and verify `git merge-base --is-ancestor $BASE_HEAD HEAD` at every stage exit and before any commit; failure blocks the flow and triggers `git reflog` recovery. "Directory clean" may only be achieved by deleting the skill's own temporary artifacts (`[DEBUG-...]`, one-off scripts, untracked probe files) — never by git-level destructive commands. The banned list (`reset --hard`, `checkout .`, `clean -fd`, `stash --include-untracked`, `push --force`, `rebase -i`) requires explicit user confirmation.

Trade-offs: adding a mandatory ancestor check to every stage exit (cheap, local git query) and a stricter "clean" definition; gaining an invariant that history is append-only and recoverable, guarded by `docs/agents/skill-design.md` Rule 4 and `CONTEXT.md` Git History Preservation.
