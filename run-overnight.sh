#!/usr/bin/env bash
# Overnight runner for "Consultant in a Computer".
# Put this next to BUILD_PLAN.md in an empty project folder, then:
#   chmod +x run-overnight.sh && ./run-overnight.sh
# It keeps the Mac awake, runs Claude Code headless, and re-launches it after
# each run ends (including after a usage-limit pause) until the plan is done
# or HOURS have passed.

set -u
cd "$(dirname "$0")"

HOURS=${HOURS:-9}
END=$(( $(date +%s) + HOURS * 3600 ))

KICKOFF=$(cat <<'EOF'
You are building "Consultant in a Computer" unattended overnight.
Read BUILD_PLAN.md in full, then PROGRESS.md and DECISIONS.md if they exist.
Continue from the first milestone not marked DONE, following the operating
rules in section 2 exactly. Never ask questions; decide and log. Commit after
each milestone. Keep PROGRESS.md current so the next run can resume. If every
milestone is done or consciously skipped, write "STATUS: ALL_DONE" at the top
of PROGRESS.md and stop.
EOF
)

# Keep the Mac awake for as long as this script runs.
caffeinate -dimsu -w $$ &

run=0
while [ "$(date +%s)" -lt "$END" ]; do
  if grep -q "STATUS: ALL_DONE" PROGRESS.md 2>/dev/null; then
    echo "All milestones done — stopping. $(date)" | tee -a overnight.log
    break
  fi

  run=$((run + 1))
  start=$(date +%s)
  echo "===== Run $run started $(date) =====" | tee -a overnight.log

  claude -p "$KICKOFF" --dangerously-skip-permissions > last-run.log 2>&1
  cat last-run.log >> overnight.log

  took=$(( $(date +%s) - start ))
  echo "===== Run $run ended after ${took}s =====" | tee -a overnight.log

  if grep -qiE "usage limit|limit reached|rate limit|resets at|try again" last-run.log; then
    echo "Usage limit hit — waiting 20 minutes before retrying." | tee -a overnight.log
    sleep 1200
  elif [ "$took" -lt 120 ]; then
    # Ended suspiciously fast (error or nothing to do) — back off.
    echo "Run ended quickly — waiting 10 minutes." | tee -a overnight.log
    sleep 600
  else
    sleep 30
  fi
done

echo "Runner finished $(date). Check PROGRESS.md." | tee -a overnight.log
