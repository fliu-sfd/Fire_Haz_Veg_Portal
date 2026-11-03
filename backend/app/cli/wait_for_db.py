"""Wait until the database accepts connections. The Docker entrypoint runs this first.

    python -m app.cli.wait_for_db

Only connection errors are retried, so a bad setting still fails at once with its own message.
"""

import sys
import time

from sqlalchemy.exc import OperationalError

from app.db.session import engine

MAX_TRIES = 30
RETRY_SECONDS = 2


def main() -> int:
    for attempt in range(1, MAX_TRIES + 1):
        try:
            engine.connect().close()
            return 0
        except OperationalError as err:
            if attempt == MAX_TRIES:
                print(f"[entrypoint] database is not reachable, giving up: {err.orig}", flush=True)
                return 1
        print(
            f"[entrypoint] database not ready yet, retrying in {RETRY_SECONDS}s "
            f"({attempt}/{MAX_TRIES})",
            flush=True,
        )
        time.sleep(RETRY_SECONDS)
    return 1


if __name__ == "__main__":
    sys.exit(main())
