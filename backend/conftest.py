import logging

import pytest

_LOG_LEVEL = (logging.INFO, logging.ERROR)


@pytest.fixture(autouse=True)
def _configure_test_logging(request):
    """Quiet logs for unit tests; keep request logs for openapi fuzz."""
    is_fuzz = 'openapi_fuzz' in request.node.nodeid
    level = _LOG_LEVEL[0] if is_fuzz else _LOG_LEVEL[1]

    root = logging.getLogger()
    django_request = logging.getLogger('django.request')
    previous = (root.level, django_request.level)
    root.setLevel(level)
    django_request.setLevel(level)

    yield

    root.setLevel(previous[0])
    django_request.setLevel(previous[1])
