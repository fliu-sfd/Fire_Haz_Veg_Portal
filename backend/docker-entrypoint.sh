#!/bin/sh
# Runs every time the api container starts:
#   1. wait for the database, then apply migrations once (a failed migration stops here)
#   2. load the NAOS inspection file, if there is one (safe to repeat)
#   3. start the API
set -eu

cd "${APP_DIR:-/app}"

python -m app.cli.wait_for_db

echo "[entrypoint] applying database migrations"
python -m alembic upgrade head

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
