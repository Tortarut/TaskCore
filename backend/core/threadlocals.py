import threading
from contextlib import contextmanager

_state = threading.local()


def set_current_user(user) -> None:
    _state.user = user


def get_current_user():
    return getattr(_state, 'user', None)


@contextmanager
def audit_actor(user):
    """
    Thread-local user for Task post_save audit (JWT is applied in DRF after Django middleware,
    so middleware alone cannot see request.user).
    """
    prev = get_current_user()
    set_current_user(user)
    try:
        yield
    finally:
        set_current_user(prev)

