from django.contrib.auth import get_user_model
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.serializers import (
    RegisterSerializer,
    TaskCoreTokenObtainPairSerializer,
    UserListSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class UserMeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    http_method_names = ('get', 'patch', 'head', 'options')

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return UserUpdateSerializer
        return UserSerializer


class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        refresh = request.data.get('refresh')
        if refresh:
            try:
                token = RefreshToken(refresh)
                token.blacklist()
            except Exception:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskCoreTokenObtainPairView(TokenObtainPairView):
    serializer_class = TaskCoreTokenObtainPairSerializer


class TaskCoreTokenRefreshView(TokenRefreshView):
    pass


class UserListView(generics.ListAPIView):
    """
    User search for UI selectors.
    """

    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserListSerializer
    queryset = User.objects.all().order_by('email')
    filter_backends = (filters.SearchFilter,)
    search_fields = ('email', 'first_name', 'last_name')
