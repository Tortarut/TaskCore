from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.serializers import (
    RegisterSerializer,
    TaskCoreTokenObtainPairSerializer,
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
    """
    Stateless JWT: client discards tokens. Optional blacklist can be added later.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskCoreTokenObtainPairView(TokenObtainPairView):
    serializer_class = TaskCoreTokenObtainPairSerializer


class TaskCoreTokenRefreshView(TokenRefreshView):
    pass
