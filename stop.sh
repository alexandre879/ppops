#!/usr/bin/env bash
# Stops the development stack started by ./start.sh. The database and uploaded files are
# kept in Docker volumes and come back on the next ./start.sh.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running, so the project is already stopped."
  exit 0
fi

docker compose -f docker-compose.dev.yml down
echo "Project stopped. Your data is kept; run ./start.sh to start it again."
