#!/usr/bin/env bash
# Deterministic staged-diff secret scan for the tdd-implement deliver gate.
# Only ADDED lines are inspected: removing a leaked secret must never be blocked.
# Match contents are never echoed, so detected credentials do not leak into agent/log output.
# FAIL: structured assignments and private-key blocks.
# WARN: bare keywords that may legitimately appear in documentation.
set -euo pipefail

if [[ $# -gt 1 || ( $# -eq 1 && "$1" != "--staged-only" ) ]]; then
  echo "usage: $0 [--staged-only]" >&2
  exit 2
fi

fail_patterns='(api[_-]?key|secret|token|passwd|password)[[:space:]]*[=:][[:space:]]*[^[:space:]]{8,}|BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY'
warn_patterns='(api[_-]?key|secret|token|passwd|password|\.env)'

# Strip diff metadata and deletions. The scanner cares only about content that the
# commit would introduce, not secrets that the commit is removing.
added_lines=$(
  git diff --cached --unified=0 --no-color \
    | awk '/^\+\+\+ / { next } /^\+/ { print substr($0, 2) }'
)

fail=0

if grep -qiE "$fail_patterns" <<< "$added_lines"; then
  echo "❌ Possible structured secret found in ADDED staged content — remove or redact it before committing." >&2
  fail=1
else
  echo "✅ No structured secrets in added staged content."
fi

if grep -qiE "$warn_patterns" <<< "$added_lines"; then
  echo "⚠  Sensitive keyword found in ADDED staged content — inspect the staged diff manually." >&2
fi

exit "$fail"
