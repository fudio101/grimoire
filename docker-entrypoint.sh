#!/bin/sh
set -e

# On first run, copy template DB (with schema) to data volume
if [ ! -f "$DATABASE_URL" ]; then
  cp /app/template.db "$DATABASE_URL"
fi

exec "$@"
