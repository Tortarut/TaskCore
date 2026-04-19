from django.urls import path

from users import views

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='auth-register'),
    path('auth/token/', views.TaskCoreTokenObtainPairView.as_view(), name='auth-token'),
    path('auth/token/refresh/', views.TaskCoreTokenRefreshView.as_view(), name='auth-token-refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='auth-logout'),
    path('users/me/', views.UserMeView.as_view(), name='users-me'),
]
