from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from core import access
from core.filters import TaskFilter
from core.models import ProjectMember, Task, TaskChangeLog, TaskComment
from core.permissions import (
    CanDeleteTask,
    CanEditTask,
    CanManageProjectMembers,
    CanModifyComment,
    IsProjectOwnerOrManager,
)
from core.serializers import (
    ProjectMemberSerializer,
    ProjectSerializer,
    TaskChangeLogSerializer,
    TaskCommentSerializer,
    TaskSerializer,
)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticated,)
    search_fields = ('name', 'description')

    def get_queryset(self):
        return access.accessible_projects(self.request.user).select_related('owner')

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsProjectOwnerOrManager()]
        return [IsAuthenticated()]


class ProjectMemberViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMemberSerializer
    permission_classes = (IsAuthenticated,)
    filterset_fields = ('project',)

    def get_queryset(self):
        return (
            ProjectMember.objects.filter(
                project__in=access.accessible_projects(self.request.user),
            )
            .select_related('project', 'user')
            .order_by('project_id', 'joined_at')
        )

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), CanManageProjectMembers()]
        return [IsAuthenticated()]


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = (IsAuthenticated,)
    filterset_class = TaskFilter
    search_fields = ('title', 'description')
    ordering_fields = ('due_date', 'created_at', 'updated_at', 'priority', 'title', 'status')
    ordering = ('-created_at',)

    def get_queryset(self):
        return (
            Task.objects.filter(project__in=access.accessible_projects(self.request.user))
            .select_related('project', 'author', 'assignee')
        )

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), CanDeleteTask()]
        if self.action in ('update', 'partial_update'):
            return [IsAuthenticated(), CanEditTask()]
        return [IsAuthenticated()]


class TaskCommentViewSet(viewsets.ModelViewSet):
    serializer_class = TaskCommentSerializer
    permission_classes = (IsAuthenticated,)
    filterset_fields = ('task',)
    ordering_fields = ('created_at', 'updated_at')
    ordering = ('created_at',)

    def get_queryset(self):
        return (
            TaskComment.objects.filter(task__project__in=access.accessible_projects(self.request.user))
            .select_related('task', 'author', 'task__project')
        )

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), CanModifyComment()]
        return [IsAuthenticated()]


class TaskChangeLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = TaskChangeLogSerializer
    permission_classes = (IsAuthenticated,)
    filterset_fields = ('task', 'field_name')
    ordering_fields = ('created_at',)
    ordering = ('-created_at',)

    def get_queryset(self):
        return (
            TaskChangeLog.objects.filter(task__project__in=access.accessible_projects(self.request.user))
            .select_related('task', 'actor', 'task__project')
        )
