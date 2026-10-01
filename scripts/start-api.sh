#!/bin/bash
# Start the VOLTMAXHUB API detached from the calling shell, so it survives the
# parent terminal/session exiting. Logs to /tmp/voltmaxhub-api.log
set -u
cd "$(dirname "$0")/.."
LOG=/tmp/voltmaxhub-api.log
PIDFILE=/tmp/voltmaxhub-api.pid

# Load .env so KYC_ENCRYPTION_KEY and friends are present.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

if [ -f "$PIDFILE" ] && kill -0 "$(cat $PIDFILE)" 2>/dev/null; then
  echo "already running (pid $(cat $PIDFILE))"
  exit 0
fi

: > "$LOG"
setsid nohup node server/index.js >>"$LOG" 2>&1 < /dev/null &
echo $! > "$PIDFILE"
sleep 6

if kill -0 "$(cat $PIDFILE)" 2>/dev/null; then
  echo "started (pid $(cat $PIDFILE))"
else
  echo "FAILED TO START — last log lines:"
  tail -25 "$LOG"
  exit 1
fi