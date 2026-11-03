#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput --verbosity 0

if [ "${SEED_ON_START:-false}" = "true" ]; then
  # Idempotent: loads company content (and demo data with SEED_ARGS=--demo).
  python manage.py seed ${SEED_ARGS:-}
fi

exec "$@"
