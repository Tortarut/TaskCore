"""OpenAPI fuzz tests (Schemathesis).

Two suites:
- positive: schema-valid random inputs, JWT must work (no 401/5xx)
- negative + coverage: invalid types, missing fields, boundary values (no 5xx only)
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest
from django.contrib.auth import get_user_model
from django.core.wsgi import get_wsgi_application
from requests.structures import CaseInsensitiveDict
from rest_framework_simplejwt.tokens import RefreshToken
from schemathesis import openapi
from schemathesis.config import GenerationConfig, SchemathesisConfig
from schemathesis.config._phases import CoveragePhaseConfig, ExamplesPhaseConfig, PhasesConfig, StatefulPhaseConfig
from schemathesis.config._projects import ProjectConfig, ProjectsConfig
from schemathesis.generation import GenerationMode
from schemathesis.generation.case import Case
from schemathesis.schemas import BaseSchema

from core.models import Project, ProjectMember, Task, TaskChangeLog, TaskComment
from core.tests import PASSWORD, unique_email

User = get_user_model()

_wsgi_app = get_wsgi_application()
_SCHEMA_PATH = '/api/schema/'
_SCHEMA_EXCLUDE = r'^/api/(schema|docs|auth)/'


def _build_schema(*, generation: GenerationConfig, phases: PhasesConfig) -> BaseSchema:
    config = SchemathesisConfig(
        projects=ProjectsConfig(
            default=ProjectConfig(generation=generation, phases=phases),
        ),
    )
    return openapi.from_wsgi(
        _SCHEMA_PATH,
        app=_wsgi_app,
        config=config,
    ).exclude(path_regex=_SCHEMA_EXCLUDE)


_minimal_phases = PhasesConfig(
    examples=ExamplesPhaseConfig(enabled=False),
    coverage=CoveragePhaseConfig(enabled=False),
    stateful=StatefulPhaseConfig(enabled=False),
)

_positive_schema = _build_schema(
    generation=GenerationConfig(
        modes=[GenerationMode.POSITIVE],
        with_security_parameters=False,
        max_examples=10,
    ),
    phases=_minimal_phases,
)

_negative_schema = _build_schema(
    generation=GenerationConfig(
        modes=[GenerationMode.NEGATIVE],
        with_security_parameters=False,
        max_examples=15,
        allow_x00=True,
        allow_extra_parameters=True,
    ),
    phases=PhasesConfig(
        examples=ExamplesPhaseConfig(enabled=False),
        coverage=CoveragePhaseConfig(enabled=True),
        stateful=StatefulPhaseConfig(enabled=False),
    ),
)


@dataclass
class FuzzSeed:
    user: User
    extra_user: User
    project: Project
    member: ProjectMember
    task: Task
    comment: TaskComment
    change_log_id: int | None
    auth_headers: dict[str, str]


def create_fuzz_seed() -> FuzzSeed:
    user = User.objects.create_user(unique_email('fuzz'), PASSWORD)
    extra_user = User.objects.create_user(unique_email('fuzz-extra'), PASSWORD)
    project = Project.objects.create(name='Fuzz project', description='seed', owner=user)
    member = ProjectMember.objects.create(
        project=project,
        user=extra_user,
        role=ProjectMember.Role.MEMBER,
    )
    task = Task.objects.create(
        project=project,
        title='Fuzz task',
        description='seed',
        author=user,
    )
    comment = TaskComment.objects.create(task=task, author=user, body='fuzz seed comment')
    change_log = TaskChangeLog.objects.filter(task=task).order_by('id').first()
    token = str(RefreshToken.for_user(user).access_token)
    return FuzzSeed(
        user=user,
        extra_user=extra_user,
        project=project,
        member=member,
        task=task,
        comment=comment,
        change_log_id=change_log.id if change_log else None,
        auth_headers={'Authorization': f'Bearer {token}'},
    )


def _resource_id_for_path(path: str, seed: FuzzSeed) -> int | None:
    if '/project-members/' in path:
        return seed.member.id
    if '/projects/' in path:
        return seed.project.id
    if '/tasks/' in path:
        return seed.task.id
    if '/task-comments/' in path:
        return seed.comment.id
    if '/task-change-logs/' in path:
        return seed.change_log_id
    return None


def apply_fuzz_seed(case: Case, seed: FuzzSeed) -> None:
    """Point FK/path ids at seed data so fuzz hits serializers, not random 404."""
    if case.path_parameters and 'id' in case.path_parameters:
        resource_id = _resource_id_for_path(case.path, seed)
        if resource_id is not None:
            case.path_parameters['id'] = resource_id

    if case.query:
        if 'project' in case.query:
            case.query['project'] = seed.project.id
        if 'task' in case.query:
            case.query['task'] = seed.task.id

    if isinstance(case.body, dict):
        if 'project' in case.body:
            case.body['project'] = seed.project.id
        if 'task' in case.body:
            case.body['task'] = seed.task.id
        if 'user_id' in case.body:
            case.body['user_id'] = seed.extra_user.id
        if 'assignee_id' in case.body and case.body['assignee_id'] is not None:
            case.body['assignee_id'] = seed.user.id


def _call_with_auth(case: Case, seed: FuzzSeed):
    apply_fuzz_seed(case, seed)
    headers = CaseInsensitiveDict(case.headers or {})
    headers.update(seed.auth_headers)
    object.__setattr__(case, 'headers', headers)
    return case.call()


@_positive_schema.parametrize()
@pytest.mark.django_db
def test_openapi_fuzz_no_5xx(case: Case) -> None:
    """Schema-valid inputs: API must not crash and must accept JWT."""
    seed = create_fuzz_seed()
    response = _call_with_auth(case, seed)
    assert response.status_code < 500, (
        f'{case.method} {case.formatted_path} → {response.status_code}'
    )
    assert response.status_code != 401, (
        f'JWT not applied or invalid for {case.method} {case.formatted_path}'
    )


@_negative_schema.parametrize()
@pytest.mark.django_db
def test_openapi_fuzz_negative_no_5xx(case: Case) -> None:
    """Invalid / boundary inputs: API must not crash (400/403/404 are OK)."""
    seed = create_fuzz_seed()
    response = _call_with_auth(case, seed)
    assert response.status_code < 500, (
        f'{case.method} {case.formatted_path} → {response.status_code}'
    )
