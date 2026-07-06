#!/usr/bin/env bash
# Detect drift in the td CLI surface documented by skills/todoist/SKILL.md.
# Usage: check-td-drift.sh [check|update]
set -euo pipefail
cd "$(dirname "$0")/.."
SNAP_DIR="tests/td-help"
# "" snapshots root `td --help` — global flags (-q/--quiet, --json guidance)
# appear only there.
CMDS=(
  "" "task" "task add" "task quickadd" "task list" "task update"
  "task complete" "task delete" "task move" "task reschedule" "task view"
  "project list" "section list" "label list" "filter list" "filter create"
  "today" "inbox" "upcoming" "completed list"
  "auth status" "auth login" "doctor" "update"
)
command -v td >/dev/null || { echo "td not installed: npm install -g @doist/todoist-cli" >&2; exit 1; }
mode="${1:-check}"
mkdir -p "$SNAP_DIR"
status=0
if [[ "$mode" == "update" ]]; then
  td --version > "$SNAP_DIR/.td-version"
  echo "updated $SNAP_DIR/.td-version ($(cat "$SNAP_DIR/.td-version"))"
fi
for cmd in "${CMDS[@]}"; do
  name="${cmd// /_}"
  [[ -z "$name" ]] && name="td"
  snap="$SNAP_DIR/$name.txt"
  out="$(td $cmd --help 2>&1 | sed -E 's/[0-9]+\.[0-9]+\.[0-9]+/X.Y.Z/g')"
  if [[ "$mode" == "update" ]]; then
    printf '%s\n' "$out" > "$snap"
    echo "updated $snap"
  elif [[ ! -f "$snap" ]]; then
    echo "MISSING snapshot $snap — run: bash scripts/check-td-drift.sh update" >&2
    status=1
  elif ! printf '%s\n' "$out" | diff -u "$snap" - ; then
    echo "DRIFT in 'td $cmd --help' — review skills/todoist/SKILL.md, then run update mode" >&2
    status=1
  fi
done
[[ "$mode" == "check" && $status -eq 0 ]] && echo "no drift"
exit $status
