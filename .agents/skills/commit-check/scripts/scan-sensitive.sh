#!/usr/bin/env bash
# Deterministic candidate-file secret scan for commit-check.
# Match contents are never echoed, so detected credentials do not leak into output.
set -euo pipefail

if [[ $# -ne 1 || "$1" != "--files-from=-" ]]; then
  echo "usage: $0 --files-from=-" >&2
  exit 2
fi

fail_patterns='(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|secret|passwd|password)[[:space:]]*[=:][[:space:]]*[^[:space:]]{8,}|BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|Bearer[[:space:]]+[A-Za-z0-9._-]{16,}'
warn_patterns='(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key|passwd|password)'

mapfile -t files
if ((${#files[@]} == 0)); then
  echo "usage: $0 --files-from=-" >&2
  exit 2
fi

fail=0
warn=0
env_file=0
for file in "${files[@]}"; do
  case "$(basename -- "$file")" in
    .env|.env.*)
      fail=1
      env_file=1
      ;;
  esac
  [[ -f "$file" ]] || continue
  if grep -IqiE "$fail_patterns" -- "$file"; then
    fail=1
  fi
  if grep -IqiE "$warn_patterns" -- "$file"; then
    warn=1
  fi
done

if ((env_file)); then
  echo "❌ .env candidate file found — exclude it from the commit." >&2
fi
if ((fail)); then
  echo "❌ Possible structured secret found in candidate files — remove or redact it before staging." >&2
else
  echo "✅ No structured secrets in candidate files."
fi
if ((warn)); then
  echo "⚠ Sensitive keyword found in candidate files — classify it as a false positive before reporting ready to stage." >&2
fi

if ((fail)); then
  exit 1
fi
if ((warn)); then
  exit 3
fi
