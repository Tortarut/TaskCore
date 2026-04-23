from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views import (
    ProjectMemberViewSet,
    ProjectViewSet,
    TaskChangeLogViewSet,
    TaskCommentViewSet,
    TaskViewSet,
)

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('project-members', ProjectMemberViewSet, basename='project-member')
router.register('tasks', TaskViewSet, basename='task')
router.register('task-comments', TaskCommentViewSet, basename='task-comment')
router.register('task-change-logs', TaskChangeLogViewSet, basename='task-change-log')

urlpatterns = [
    path('', include(router.urls)),
]
