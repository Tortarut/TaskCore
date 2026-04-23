from rest_framework.permissions import BasePermission

from core import access
from core.models import Project


def _project_from_obj(obj):
    if isinstance(obj, Project):
        return obj
    return getattr(obj, 'project', None)


class IsProjectOwnerOrManager(BasePermission):
    message = 'Only the project owner or a project manager can perform this action.'

    def has_object_permission(self, request, view, obj):
        project = _project_from_obj(obj)
        if project is None:
            return False
        return access.user_can_manage_project(request.user, project)


class CanManageProjectMembers(BasePermission):
    message = 'Only the project owner or a project manager can manage members.'

    def has_object_permission(self, request, view, obj):
        return access.user_can_manage_project(request.user, obj.project)


class CanEditTask(BasePermission):
    message = 'You do not have access to this task.'

    def has_object_permission(self, request, view, obj):
        return access.user_can_edit_task(request.user, obj)


class CanDeleteTask(BasePermission):
    message = 'Only the project owner or a project manager can delete tasks.'

    def has_object_permission(self, request, view, obj):
        return access.user_can_delete_task(request.user, obj)


class CanModifyComment(BasePermission):
    message = 'Only the comment author or a project manager can modify this comment.'

    def has_object_permission(self, request, view, obj):
        if obj.author_id == request.user.id:
            return True
        return access.user_can_manage_project(request.user, obj.task.project)
