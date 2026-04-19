from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from core.models import Project, ProjectMember, Task, TaskChangeLog, TaskComment


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0
    fields = ('title', 'status', 'priority', 'assignee', 'due_date', 'created_at')
    readonly_fields = ('created_at',)
    show_change_link = True


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 0
    autocomplete_fields = ('user',)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'description', 'owner__email')
    readonly_fields = ('created_at', 'updated_at')
    inlines = (ProjectMemberInline, TaskInline)
    fieldsets = (
        (None, {'fields': ('name', 'description', 'owner')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at')}),
    )


class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0
    fields = ('author', 'body', 'created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('author',)


class TaskChangeLogInline(admin.TabularInline):
    model = TaskChangeLog
    extra = 0
    can_delete = False
    max_num = 50
    fields = ('actor', 'field_name', 'old_value', 'new_value', 'created_at')
    readonly_fields = fields
    autocomplete_fields = ('actor',)

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'project',
        'status',
        'priority',
        'assignee',
        'due_date',
        'author',
        'created_at',
    )
    list_filter = ('status', 'priority', 'project', 'created_at')
    search_fields = ('title', 'description', 'project__name')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('project', 'author', 'assignee')
    inlines = (TaskCommentInline, TaskChangeLogInline)
    fieldsets = (
        (None, {'fields': ('project', 'title', 'description')}),
        (_('Workflow'), {'fields': ('status', 'priority', 'due_date')}),
        (_('People'), {'fields': ('author', 'assignee')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ('project', 'user', 'role', 'joined_at')
    list_filter = ('role',)
    search_fields = ('project__name', 'user__email')
    autocomplete_fields = ('project', 'user')


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'author', 'short_body', 'created_at')
    search_fields = ('body', 'task__title')
    autocomplete_fields = ('task', 'author')
    readonly_fields = ('created_at', 'updated_at')

    @admin.display(description=_('body'))
    def short_body(self, obj):
        text = (obj.body or '')[:80]
        return f'{text}…' if len(obj.body or '') > 80 else text


@admin.register(TaskChangeLog)
class TaskChangeLogAdmin(admin.ModelAdmin):
    list_display = ('task', 'actor', 'field_name', 'created_at')
    list_filter = ('field_name',)
    search_fields = ('task__title', 'field_name', 'old_value', 'new_value')
    autocomplete_fields = ('task', 'actor')
    readonly_fields = ('task', 'actor', 'field_name', 'old_value', 'new_value', 'created_at')

    def has_add_permission(self, request):
        return False
