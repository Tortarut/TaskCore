import importlib
import os
import sys
import time
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django = importlib.import_module('django')
django.setup()

connections = importlib.import_module('django.db').connections


def main() -> int:
    timeout_s = int(os.environ.get('DB_WAIT_TIMEOUT', '60'))
    interval_s = float(os.environ.get('DB_WAIT_INTERVAL', '1'))
    deadline = time.monotonic() + timeout_s

    while time.monotonic() < deadline:
        try:
            connections['default'].ensure_connection()
            return 0
        except Exception:
            time.sleep(interval_s)

    print('Timed out waiting for database.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
