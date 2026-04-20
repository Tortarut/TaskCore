"""
Task status lifecycle: allowed transitions and who may apply them.
"""

from core import access
from core.models import Task

Status = Task.Status

# Linear work for any project member who can edit the task
_MEMBER_TRANSITIONS: dict[str, frozenset[str]] = {
    Status.TODO: frozenset({Status.IN_PROGRESS}),
    Status.IN_PROGRESS: frozenset({Status.REVIEW}),
    Status.REVIEW: frozenset({Status.IN_PROGRESS}),
}

# Extra targets only for project owner / project manager
_MANAGER_EXTRA_TRANSITIONS: dict[str, frozenset[str]] = {
    Status.TODO: frozenset({Status.CANCELLED}),
    Status.IN_PROGRESS: frozenset({Status.CANCELLED, Status.DONE}),
    Status.REVIEW: frozenset({Status.DONE, Status.CANCELLED}),
    Status.DONE: frozenset({Status.IN_PROGRESS}),
    Status.CANCELLED: frozenset(),
}


def validate_status_transition(user, task: Task, old_status: str, new_status: str) -> tuple[bool, str | None]:
    """Return (ok, error_message). Same status is always allowed."""
    if old_status == new_status:
        return True, None
    if old_status == Status.CANCELLED:
        return False, 'A cancelled task cannot change status.'

    allowed = set(_MEMBER_TRANSITIONS.get(old_status, frozenset()))
    if access.user_can_manage_project(user, task.project):
        allowed |= set(_MANAGER_EXTRA_TRANSITIONS.get(old_status, frozenset()))

    if new_status not in allowed:
        return False, 'This status change is not allowed for the current workflow state.'

    return True, None


def initial_status_for_create() -> str:
    return Status.TODO
