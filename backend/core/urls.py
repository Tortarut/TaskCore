from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views import ProjectMemberViewSet, ProjectViewSet, TaskViewSet

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('project-members', ProjectMemberViewSet, basename='project-member')
router.register('tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]
