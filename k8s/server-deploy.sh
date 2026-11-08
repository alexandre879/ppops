#!/usr/bin/env bash
# The server's half of a deploy. Installed by hand as /usr/local/sbin/ppops-deploy (root, 755).
#
# GitHub's deploy key can run this and nothing else, so it takes no arguments and reads only a
# source archive from stdin. It builds the images and restarts the app, and never applies k8s/ from
# the upload: a manifest could mount the server's disk into a pod, which would hand the whole server
# and the other app on it to anyone who can push to the repo. k8s/full-deploy.sh applies those.
set -euo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
umask 022

SRC=/srv/build/ppops
BACKUPS=/srv/backups/ppops
SITE_URL=https://newhousemodern.shop
MAX_UPLOAD_BYTES=$((300 * 1024 * 1024))

exec 9>/run/ppops-deploy.lock
flock -n 9 || { echo "Another deploy is already running." >&2; exit 1; }

incoming=$(mktemp -d /srv/build/.ppops-incoming.XXXXXX)
trap 'rm -rf "$incoming"' EXIT

echo "Receiving the source…"
head -c "$MAX_UPLOAD_BYTES" | tar -xzf - -C "$incoming" --no-same-owner --no-same-permissions
for dir in backend web admin; do
  if [ ! -d "$incoming/$dir" ] || [ -L "$incoming/$dir" ]; then
    echo "The upload has no $dir/ folder." >&2
    exit 1
  fi
done

# Built before anything else changes, so a failed build leaves the live site as it was.
echo "Building the images on the server…"
docker build -q -t ppops-backend:local "$incoming/backend"
docker build -q --target runner --build-arg API_PROXY_TARGET=http://backend:8000 \
  -t ppops-web:local "$incoming/web"
docker build -q --target runner --build-arg API_PROXY_TARGET=http://backend:8000 \
  --build-arg NEXT_PUBLIC_SITE_URL="$SITE_URL" --build-arg NEXT_PUBLIC_BASE_PATH=/admin \
  -t ppops-admin:local "$incoming/admin"

# Deploys run unattended and apply migrations on start-up, so keep a dump from just before each
# one. Stops the deploy if the dump fails. Keeps the last 7; they hold customer data, hence umask.
echo "Backing up the database…"
(
  umask 077
  mkdir -p "$BACKUPS"
  file="$BACKUPS/$(date -u +%Y%m%dT%H%M%SZ).dump"
  kubectl -n ppops exec statefulset/postgres -- sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$file"
  test -s "$file"
)
ls -1t "$BACKUPS"/*Z.dump | tail -n +8 | xargs -r rm --

for dir in backend web admin; do
  rsync -a --delete "$incoming/$dir/" "$SRC/$dir/"
done

# Same image tags, new contents: restart so the pods pick up the new images.
echo "Restarting the site…"
kubectl -n ppops rollout restart deploy/backend deploy/web deploy/admin deploy/gateway
kubectl -n ppops rollout status deploy/backend --timeout=600s
kubectl -n ppops rollout status deploy/web --timeout=300s
kubectl -n ppops rollout status deploy/admin --timeout=300s
kubectl -n ppops rollout status deploy/gateway --timeout=120s
docker image prune -f >/dev/null

echo "Website: $SITE_URL"
