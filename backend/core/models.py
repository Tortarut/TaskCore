from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Project(models.Model):
    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_('owner'),
        related_name='owned_projects',
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('project')
        verbose_name_plural = _('projects')
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=('owner', '-created_at')),
        ]

    def __str__(self):
        return self.name


class ProjectMember(models.Model):
    
    class Role(models.TextChoices):
        MEMBER = 'member', _('Member')
        MANAGER = 'manager', _('Project manager')

    project = models.ForeignKey(
        Project,
        verbose_name=_('project'),
        related_name='memberships',
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_('user'),
        related_name='project_memberships',
        on_delete=models.CASCADE,
    )
    role = models.CharField(
        _('role'),
        max_length=32,
        choices=Role.choices,
        default=Role.MEMBER,
    )
    joined_at = models.DateTimeField(_('joined at'), auto_now_add=True)

    class Meta:
        verbose_name = _('project member')
        verbose_name_plural = _('project members')
        constraints = [
            models.UniqueConstraint(fields=('project', 'user'), name='uniq_project_member_user'),
        ]
        indexes = [
            models.Index(fields=('project', 'user')),
        ]

    def __str__(self):
        return f'{self.user} @ {self.project}'


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = 'todo', _('To do')
        IN_PROGRESS = 'in_progress', _('In progress')
        REVIEW = 'review', _('Review')
        DONE = 'done', _('Done')
        CANCELLED = 'cancelled', _('Cancelled')

    class Priority(models.TextChoices):
        LOW = 'low', _('Low')
        MEDIUM = 'medium', _('Medium')
        HIGH = 'high', _('High')

    project = models.ForeignKey(
        Project,
        verbose_name=_('project'),
        related_name='tasks',
        on_delete=models.CASCADE,
    )
    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    status = models.CharField(
        _('status'),
        max_length=32,
        choices=Status.choices,
        default=Status.TODO,
        db_index=True,
    )
    priority = models.CharField(
        _('priority'),
        max_length=16,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    due_date = models.DateField(_('due date'), null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_('author'),
        related_name='authored_tasks',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_('assignee'),
        related_name='assigned_tasks',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('task')
        verbose_name_plural = _('tasks')
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=('project', 'status')),
            models.Index(fields=('assignee', 'status')),
            models.Index(fields=('due_date',)),
        ]

    def __str__(self):
        return self.title


class TaskComment(models.Model):
    task = models.ForeignKey(
        Task,
        verbose_name=_('task'),
        related_name='comments',
        on_delete=models.CASCADE,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_('author'),
        related_name='task_comments',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    body = models.TextField(_('body'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('task comment')
        verbose_name_plural = _('task comments')
        ordering = ('created_at',)
        indexes = [
            models.Index(fields=('task', 'created_at')),
        ]

    def __str__(self):
        return f'Comment on {self.task_id}'


class TaskChangeLog(models.Model):
    
    task = models.ForeignKey(
        Task,
        verbose_name=_('task'),
        related_name='change_logs',
        on_delete=models.CASCADE,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_('actor'),
        related_name='task_change_logs',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    field_name = models.CharField(_('field'), max_length=64)
    old_value = models.TextField(_('old value'), blank=True)
    new_value = models.TextField(_('new value'), blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('task change log')
        verbose_name_plural = _('task change logs')
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=('task', '-created_at')),
        ]

    def __str__(self):
        return f'{self.field_name} @ task {self.task_id}'
