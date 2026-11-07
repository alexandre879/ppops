#!/usr/bin/env bash
# Deploys ppops to the DigitalOcean k3s server it shares with educational_system.
#
#   ./k8s/deploy.sh
#
# Only the source code is uploaded; the images are built on the server, so a deploy costs a few MB
# of upload. The server is set up once by educational_system's k8s/production/server-setup.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

SERVER=${SERVER:-root@209.38.108.180}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/digitalocean_ed25519}
# Baked into the admin's "View website" link; keep in step with k8s/config.yaml and k8s/ingress.yaml.
SITE_URL=${SITE_URL:-https://newhousemodern.shop}
SRC=/srv/build/ppops
remote() { ssh -i "$SSH_KEY" -o BatchMode=yes "$SERVER" "$@"; }
kc() { remote kubectl -n ppops "$@"; }

echo "Uploading the source…"
remote mkdir -p "$SRC"
rsync -az --delete -e "ssh -i $SSH_KEY -o BatchMode=yes" \
  --exclude .git --exclude node_modules --exclude .next --exclude .venv --exclude venv \
  --exclude '.env' --exclude '.env.*' --exclude __pycache__ --exclude staticfiles \
  --exclude media --exclude private_media --exclude tsconfig.tsbuildinfo \
  backend web admin k8s "$SERVER:$SRC/"

echo "Building the images on the server…"
remote "cd $SRC \
  && docker build -q -t ppops-backend:local backend \
  && docker build -q --target runner --build-arg API_PROXY_TARGET=http://backend:8000 -t ppops-web:local web \
  && docker build -q --target runner --build-arg API_PROXY_TARGET=http://backend:8000 \
       --build-arg NEXT_PUBLIC_SITE_URL=$SITE_URL --build-arg NEXT_PUBLIC_BASE_PATH=/admin -t ppops-admin:local admin"

remote kubectl apply -f "$SRC/k8s/namespace.yaml"

# Created once and kept: regenerating them would lock the app out of its database and sessions.
if ! kc get secret ppops-postgres >/dev/null 2>&1; then
  kc create secret generic ppops-postgres \
    --from-literal=POSTGRES_DB=newhousemodern \
    --from-literal=POSTGRES_USER=nhm \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 24)"
fi
if ! kc get secret ppops-secrets >/dev/null 2>&1; then
  kc create secret generic ppops-secrets --from-literal=DJANGO_SECRET_KEY="$(openssl rand -hex 48)"
fi

already_deployed=$(kc get deploy backend -o name 2>/dev/null || true)

# Deploys run unattended and apply migrations on start-up, so keep a dump from just before each
# one. Stops the deploy if the dump fails. Keeps the last 7; they hold customer data, hence umask.
if [ -n "$already_deployed" ]; then
  echo "Backing up the database…"
  remote 'set -eu; umask 077; mkdir -p /srv/backups/ppops
    file=/srv/backups/ppops/$(date -u +%Y%m%dT%H%M%SZ).dump
    kubectl -n ppops exec statefulset/postgres -- sh -c "pg_dump -Fc -U \$POSTGRES_USER \$POSTGRES_DB" > "$file"
    test -s "$file"
    ls -1t /srv/backups/ppops/*.dump | tail -n +8 | xargs -r rm --'
fi

remote kubectl apply -k "$SRC/k8s"
if [ -n "$already_deployed" ]; then
  # Same image tags, new contents: restart so the pods pick up the new images (and nginx its config).
  kc rollout restart deploy/backend deploy/web deploy/admin deploy/gateway
fi

kc rollout status statefulset/postgres --timeout=300s
kc rollout status deploy/backend --timeout=600s
kc rollout status deploy/web --timeout=300s
kc rollout status deploy/admin --timeout=300s
kc rollout status deploy/gateway --timeout=120s
remote docker image prune -f >/dev/null

echo
echo "Website: $SITE_URL"
echo "Admin:   $SITE_URL/admin"
