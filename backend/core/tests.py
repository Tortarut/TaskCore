import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Project, Task

User = get_user_model()

PASSWORD = 'Xk9mP2vL8nQ4rT6wE1hJ3!aB'


def unique_email(prefix='u'):
    return f'{prefix}.{uuid.uuid4().hex[:12]}@test.local'


def bearer_client(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(token.access_token)}')
    return client


class ProjectAccessApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(unique_email('owner'), PASSWORD)
        self.member = User.objects.create_user(unique_email('member'), PASSWORD)
        self.outsider = User.objects.create_user(unique_email('out'), PASSWORD)
        self.client_owner = bearer_client(self.owner)
        self.client_member = bearer_client(self.member)
        self.client_outsider = bearer_client(self.outsider)

    def test_create_and_list_project(self):
        r = self.client_owner.post(
            '/api/projects/',
            {'name': 'Alpha', 'description': 'desc'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['name'], 'Alpha')
        self.assertEqual(r.data['owner']['id'], self.owner.id)

        lst = self.client_owner.get('/api/projects/', format='json')
        self.assertEqual(lst.status_code, status.HTTP_200_OK)
        ids = {row['id'] for row in lst.data['results']}
        self.assertIn(r.data['id'], ids)

    def test_outsider_does_not_see_foreign_project(self):
        p = self.client_owner.post(
            '/api/projects/',
            {'name': 'Secret', 'description': ''},
            format='json',
        )
        self.assertEqual(p.status_code, status.HTTP_201_CREATED)
        lst = self.client_outsider.get('/api/projects/', format='json')
        ids = {row['id'] for row in lst.data['results']}
        self.assertNotIn(p.data['id'], ids)

    def test_member_sees_project_after_membership(self):
        p = self.client_owner.post(
            '/api/projects/',
            {'name': 'Shared', 'description': ''},
            format='json',
        )
        project_id = p.data['id']
        add = self.client_owner.post(
            '/api/project-members/',
            {
                'project': project_id,
                'user_id': self.member.id,
                'role': 'member',
            },
            format='json',
        )
        self.assertEqual(add.status_code, status.HTTP_201_CREATED)

        lst = self.client_member.get('/api/projects/', format='json')
        ids = {row['id'] for row in lst.data['results']}
        self.assertIn(project_id, ids)

    def test_member_cannot_delete_project(self):
        p = self.client_owner.post(
            '/api/projects/',
            {'name': 'Owned', 'description': ''},
            format='json',
        )
        project_id = p.data['id']
        self.client_owner.post(
            '/api/project-members/',
            {
                'project': project_id,
                'user_id': self.member.id,
                'role': 'member',
            },
            format='json',
        )
        r = self.client_member.delete(f'/api/projects/{project_id}/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class TaskWorkflowApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(unique_email('ow'), PASSWORD)
        self.member = User.objects.create_user(unique_email('mem'), PASSWORD)
        self.client_owner = bearer_client(self.owner)
        self.client_member = bearer_client(self.member)
        pr = self.client_owner.post(
            '/api/projects/',
            {'name': 'TaskProj', 'description': ''},
            format='json',
        )
        self.project_id = pr.data['id']
        self.client_owner.post(
            '/api/project-members/',
            {
                'project': self.project_id,
                'user_id': self.member.id,
                'role': 'member',
            },
            format='json',
        )

    def test_create_task_default_status(self):
        r = self.client_member.post(
            '/api/tasks/',
            {'project': self.project_id, 'title': 'Do work', 'description': ''},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['status'], Task.Status.TODO)
        self.assertEqual(r.data['author']['id'], self.member.id)

    def test_create_task_invalid_initial_status(self):
        r = self.client_member.post(
            '/api/tasks/',
            {
                'project': self.project_id,
                'title': 'Bad',
                'description': '',
                'status': Task.Status.DONE,
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_status_transition(self):
        t = self.client_member.post(
            '/api/tasks/',
            {'project': self.project_id, 'title': 'Flow', 'description': ''},
            format='json',
        )
        tid = t.data['id']
        r = self.client_member.patch(
            f'/api/tasks/{tid}/',
            {'status': Task.Status.IN_PROGRESS},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['status'], Task.Status.IN_PROGRESS)

    def test_member_cannot_delete_task(self):
        t = self.client_member.post(
            '/api/tasks/',
            {'project': self.project_id, 'title': 'Del', 'description': ''},
            format='json',
        )
        r = self.client_member.delete(f'/api/tasks/{t.data["id"]}/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_task(self):
        t = self.client_member.post(
            '/api/tasks/',
            {'project': self.project_id, 'title': 'X', 'description': ''},
            format='json',
        )
        r = self.client_owner.delete(f'/api/tasks/{t.data["id"]}/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)


class TaskCommentAndLogApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(unique_email('c'), PASSWORD)
        self.client_u = bearer_client(self.user)
        pr = self.client_u.post(
            '/api/projects/',
            {'name': 'CProj', 'description': ''},
            format='json',
        )
        self.project_id = pr.data['id']
        t = self.client_u.post(
            '/api/tasks/',
            {'project': self.project_id, 'title': 'With comments', 'description': ''},
            format='json',
        )
        self.task_id = t.data['id']

    def test_create_comment_and_list(self):
        r = self.client_u.post(
            '/api/task-comments/',
            {'task': self.task_id, 'body': 'hello'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['body'], 'hello')
        lst = self.client_u.get('/api/task-comments/', {'task': self.task_id})
        self.assertEqual(lst.status_code, status.HTTP_200_OK)
        bodies = {row['body'] for row in lst.data['results']}
        self.assertIn('hello', bodies)

    def test_change_log_list_after_status_change(self):
        self.client_u.patch(
            f'/api/tasks/{self.task_id}/',
            {'status': Task.Status.IN_PROGRESS},
            format='json',
        )
        r = self.client_u.get('/api/task-change-logs/', {'task': self.task_id})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        fields = {row['field_name'] for row in r.data['results']}
        self.assertIn('status', fields)


class ProjectSearchApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(unique_email('s'), PASSWORD)
        self.client_u = bearer_client(self.user)
        self.client_u.post(
            '/api/projects/',
            {'name': 'UniqueRocketName', 'description': 'x'},
            format='json',
        )

    def test_project_search_query(self):
        r = self.client_u.get('/api/projects/', {'search': 'Rocket'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        names = [row['name'] for row in r.data['results']]
        self.assertTrue(any('Rocket' in n for n in names))


class AccessibleProjectsUnitTests(TestCase):
    def test_accessible_projects_helper(self):
        from core import access

        owner = User.objects.create_user(unique_email('acc1'), PASSWORD)
        other = User.objects.create_user(unique_email('acc2'), PASSWORD)
        p = Project.objects.create(name='P', description='', owner=owner)
        qs = access.accessible_projects(owner)
        self.assertTrue(qs.filter(pk=p.pk).exists())
        self.assertFalse(access.accessible_projects(other).filter(pk=p.pk).exists())


try:
    import pytest
    from schemathesis import openapi
except Exception:
    pytest = None
    openapi = None


if pytest is not None and openapi is not None:
    from django.core.wsgi import get_wsgi_application

    _wsgi_app = get_wsgi_application()
    _schema = openapi.from_wsgi('/api/schema/', app=_wsgi_app).exclude(path_regex=r'^/api/(schema|docs|auth)/')

    _AUTH_HEADERS_CACHE = None

    def _get_auth_headers():
        global _AUTH_HEADERS_CACHE
        if _AUTH_HEADERS_CACHE is not None:
            return _AUTH_HEADERS_CACHE
        from rest_framework_simplejwt.tokens import RefreshToken

        user = User.objects.create_user(unique_email('fuzz'), PASSWORD)
        token = RefreshToken.for_user(user)
        _AUTH_HEADERS_CACHE = {'Authorization': f'Bearer {str(token.access_token)}'}
        return _AUTH_HEADERS_CACHE

    @_schema.parametrize()
    @pytest.mark.django_db
    def test_openapi_fuzz_no_5xx(case):
        response = case.call(headers=_get_auth_headers())
        assert response.status_code < 500
