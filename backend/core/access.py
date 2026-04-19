from django.db.models import Q

from core.models import Project, ProjectMember, Task


def accessible_projects(user):
    if not user.is_authenticated:
        return Project.objects.none()
    return Project.objects.filter(
        Q(owner=user) | Q(memberships__user=user),
    ).distinct()


def user_can_manage_project(user, project) -> bool:
    if project.owner_id == user.id:
        return True
    return ProjectMember.objects.filter(
        project=project,
        user=user,
        role=ProjectMember.Role.MANAGER,
    ).exists()


def user_can_assign_tasks(user, project) -> bool:
    return user_can_manage_project(user, project)


def user_can_edit_task(user, task: Task) -> bool:
    return accessible_projects(user).filter(pk=task.project_id).exists()


def user_can_delete_task(user, task: Task) -> bool:
    return user_can_manage_project(user, task.project)


def assignee_allowed_for_project(project, assignee) -> bool:
    if assignee is None:
        return True
    if project.owner_id == assignee.id:
        return True
    return ProjectMember.objects.filter(project=project, user=assignee).exists()
