#!/bin/sh
# Runs every time the api container starts:
#   1. wait for the database and apply migrations
#   2. load the NAOS inspection file, if there is one (safe to repeat)
#   3. start the API
set -eu

cd "${APP_DIR:-/app}"

echo "[entrypoint] applying database migrations"
tries=0
until python -m alembic upgrade head; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "[entrypoint] database is not reachable, giving up" >&2
    exit 1
  fi
  echo "[entrypoint] database not ready yet, retrying in 2s ($tries/30)"
  sleep 2
done

if [ "${AUTO_IMPORT:-true}" = "true" ]; then
  data_dir="${NAOS_DATA_DIR:-/data}"
  inspection_file=$(find "$data_dir" -maxdepth 1 \( -name '*.gdb.zip' -o -name '*.gdb' \) 2>/dev/null | sort | head -n 1)
  if [ -n "$inspection_file" ]; then
    year="${NAOS_SEASON_YEAR:-2026}"
    echo "[entrypoint] importing $inspection_file (season $year)"
    # a failed import is reported but does not stop the API from starting
    if ! python -m app.cli.import_naos "$inspection_file" --year "$year"; then
      echo "[entrypoint] WARNING: the import failed, see the messages above" >&2
    fi
  else
    echo "[entrypoint] no .gdb.zip file found in $data_dir, skipping the import"
  fi
else
  echo "[entrypoint] AUTO_IMPORT is off, skipping the import"
fi

exec "$@"
