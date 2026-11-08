#!/usr/bin/env bash
# Publishes the site: sends backend/, web/ and admin/ to the server, which builds and restarts them
# (see server-deploy.sh). GitHub Actions runs this on every push to main.
#
#   ./k8s/deploy.sh
#
# Only the source code is uploaded. Run by hand, it sends your local files, including anything
# uncommitted, and needs root access. GitHub's key is only allowed to start the deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

SERVER=${SERVER:-root@209.38.108.180}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/digitalocean_ed25519}

echo "Uploading the source…"
COPYFILE_DISABLE=1 tar -czf - \
  --exclude node_modules --exclude .next --exclude .venv --exclude venv \
  --exclude '.env' --exclude '.env.*' --exclude __pycache__ --exclude staticfiles \
  --exclude media --exclude private_media --exclude tsconfig.tsbuildinfo \
  backend web admin \
  | ssh -i "$SSH_KEY" -o BatchMode=yes "$SERVER" /usr/local/sbin/ppops-deploy
