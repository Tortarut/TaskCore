import uuid

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

PASSWORD = 'Xk9mP2vL8nQ4rT6wE1hJ3!aB'


def unique_email(prefix='user'):
    return f'{prefix}.{uuid.uuid4().hex[:12]}@test.local'


class RegisterApiTests(APITestCase):
    def test_register_success(self):
        email = unique_email('reg')
        r = self.client.post(
            '/api/auth/register/',
            {
                'email': email,
                'password': PASSWORD,
                'password_confirm': PASSWORD,
                'first_name': 'Ann',
                'last_name': 'One',
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['email'], email)
        self.assertTrue(User.objects.filter(email=email).exists())

    def test_register_password_mismatch(self):
        r = self.client.post(
            '/api/auth/register/',
            {
                'email': unique_email('badpwd'),
                'password': PASSWORD,
                'password_confirm': PASSWORD + 'x',
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_admin_role_rejected(self):
        r = self.client.post(
            '/api/auth/register/',
            {
                'email': unique_email('admintry'),
                'password': PASSWORD,
                'password_confirm': PASSWORD,
                'role': 'admin',
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        email = unique_email('dup')
        self.client.post(
            '/api/auth/register/',
            {
                'email': email,
                'password': PASSWORD,
                'password_confirm': PASSWORD,
            },
            format='json',
        )
        r2 = self.client.post(
            '/api/auth/register/',
            {
                'email': email,
                'password': PASSWORD,
                'password_confirm': PASSWORD,
            },
            format='json',
        )
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)


class TokenApiTests(APITestCase):
    def setUp(self):
        self.email = unique_email('tok')
        self.client.post(
            '/api/auth/register/',
            {
                'email': self.email,
                'password': PASSWORD,
                'password_confirm': PASSWORD,
            },
            format='json',
        )

    def test_token_obtain_success(self):
        r = self.client.post(
            '/api/auth/token/',
            {'email': self.email, 'password': PASSWORD},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)
        self.assertIn('refresh', r.data)
        self.assertIn('user', r.data)
        self.assertEqual(r.data['user']['email'], self.email)

    def test_token_obtain_invalid_password(self):
        r = self.client.post(
            '/api/auth/token/',
            {'email': self.email, 'password': 'wrong-password'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        first = self.client.post(
            '/api/auth/token/',
            {'email': self.email, 'password': PASSWORD},
            format='json',
        )
        r = self.client.post(
            '/api/auth/token/refresh/',
            {'refresh': first.data['refresh']},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)


class UserMeAndListApiTests(APITestCase):
    def setUp(self):
        self.email = unique_email('me')
        self.client.post(
            '/api/auth/register/',
            {
                'email': self.email,
                'password': PASSWORD,
                'password_confirm': PASSWORD,
                'first_name': 'Beta',
                'last_name': 'Search',
            },
            format='json',
        )
        tok = self.client.post(
            '/api/auth/token/',
            {'email': self.email, 'password': PASSWORD},
            format='json',
        )
        self.access = tok.data['access']

    def test_users_me_requires_auth(self):
        r = self.client.get('/api/users/me/')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_users_me_get(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        r = self.client.get('/api/users/me/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['email'], self.email)
        self.assertEqual(r.data['first_name'], 'Beta')

    def test_users_me_patch(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        r = self.client.patch(
            '/api/users/me/',
            {'first_name': 'Gamma'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['first_name'], 'Gamma')

    def test_users_list_requires_auth(self):
        r = self.client.get('/api/users/')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_users_list_search(self):
        other = User.objects.create_user(unique_email('other'), PASSWORD, first_name='Zeta', last_name='Unique')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        r = self.client.get('/api/users/', {'search': 'Zeta'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = {row['id'] for row in r.data['results']} if 'results' in r.data else {row['id'] for row in r.data}
        self.assertIn(other.id, ids)


class LogoutApiTests(APITestCase):
    def test_logout_blacklists_refresh(self):
        email = unique_email('out')
        self.client.post(
            '/api/auth/register/',
            {
                'email': email,
                'password': PASSWORD,
                'password_confirm': PASSWORD,
            },
            format='json',
        )
        tok = self.client.post(
            '/api/auth/token/',
            {'email': email, 'password': PASSWORD},
            format='json',
        )
        refresh = tok.data['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tok.data["access"]}')
        out = self.client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
        self.assertEqual(out.status_code, status.HTTP_204_NO_CONTENT)
        again = self.client.post(
            '/api/auth/token/refresh/',
            {'refresh': refresh},
            format='json',
        )
        self.assertEqual(again.status_code, status.HTTP_401_UNAUTHORIZED)
