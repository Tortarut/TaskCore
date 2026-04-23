from core.threadlocals import set_current_user


class CurrentUserMiddleware:
    """
    Stores request.user in thread-local storage for audit logging.

    This is only for synchronous Django request handling.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        set_current_user(getattr(request, 'user', None))
        try:
            return self.get_response(request)
        finally:
            set_current_user(None)

