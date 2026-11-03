#!/usr/bin/env bash
# Freezes the development stack started by ./start.sh: the apps stop using CPU but stay in
# memory, and ./start.sh resumes them instantly where they left off. To shut them down
# completely use ./stop.sh (it works on a paused project too).
set -euo pipefail
cd "$(dirname "$0")"

compose() { docker compose -f docker-compose.dev.yml "$@"; }

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running, so there is nothing to pause."
  exit 0
fi

# Only the running services: pausing one that is already paused is an error.
running=$(compose ps --status running --services)
if [ -z "$running" ]; then
  if [ -n "$(compose ps --status paused -q)" ]; then
    echo "The project is already paused. Run ./start.sh to resume it."
  else
    echo "The project isn't running, so there is nothing to pause."
  fi
  exit 0
fi

# shellcheck disable=SC2086 # one service name per word
compose pause $running
echo "Project paused. Run ./start.sh to resume it, or ./stop.sh to shut it down."
