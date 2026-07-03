#!/usr/bin/env bash
# Command-output logger for the bring-up fleet (logging layer A).
# Run every deploy / omnibus / replay / probe through this so its FULL output and
# exit code land in a numbered, timestamped log — the evidence trail for diagnosis
# and for upstream bug reports. (Do not trust exit codes alone; the log has the
# real output.) Generic version of the per-net dlog.sh from the devnet-4/5/6 runs.
#
# Usage:
#   dlog.sh <NN-step.log> pod   <run.js args...>   # exec ./bin/run.js inside cli-pod
#   dlog.sh <NN-step.log> local <command...>       # run the command locally in the repo
#
# Env overrides: REPO, DEVNET_NAME, LOGDIR, NS (cli-pod namespace), DEPLOY.
set -o pipefail

REPO="${REPO:-$(cd "$(dirname "$0")/../.." && pwd)}"
DEVNET_NAME="${DEVNET_NAME:-$(grep -E '^DEVNET_NAME=' "$REPO/.env" 2>/dev/null | cut -d= -f2)}"
LOGDIR="${LOGDIR:-$REPO/artifacts/${DEVNET_NAME:-devnet}}"
NS="${NS:-core-devnets-sandbox}"
DEPLOY="${DEPLOY:-deployment/cli-pod}"

mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/$1"; shift
MODE="$1"; shift
ts() { date '+%Y-%m-%d %H:%M:%S'; }

if [ "$MODE" = "pod" ]; then
  {
    echo "=== $(ts) [pod] ./bin/run.js $* ==="
    kubectl exec "$DEPLOY" -n "$NS" -- ./bin/run.js "$@"
    echo "=== $(ts) exit=$? ==="
  } 2>&1 | tee -a "$LOGFILE"
else
  {
    echo "=== $(ts) [local] $* ==="
    ( cd "$REPO" && "$@" )
    echo "=== $(ts) exit=$? ==="
  } 2>&1 | tee -a "$LOGFILE"
fi
