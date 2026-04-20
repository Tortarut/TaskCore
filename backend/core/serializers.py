from django.contrib.auth import get_user_model
from rest_framework import serializers

from core import access, workflow
from core.models import Project, ProjectMember, Task
from users.serializers import UserSerializer

User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Project
        fields = (
            'id',
            'name',
            'description',
            'owner',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source='user',
        queryset=User.objects.all(),
        write_only=True,
    )

    class Meta:
        model = ProjectMember
        fields = (
            'id',
            'project',
            'user',
            'user_id',
            'role',
            'joined_at',
        )
        read_only_fields = ('joined_at',)

    def validate_project(self, project):
        request = self.context['request']
        if not access.accessible_projects(request.user).filter(pk=project.pk).exists():
            raise serializers.ValidationError('Project not found or no access.')
        return project

    def validate(self, attrs):
        if self.instance is not None and 'project' in attrs and attrs['project'] != self.instance.project:
            raise serializers.ValidationError({'project': 'Cannot move a member to another project.'})
        project = attrs.get('project', getattr(self.instance, 'project', None))
        user = attrs.get('user', getattr(self.instance, 'user', None))
        if self.instance is not None and 'user' in attrs and attrs['user'] != self.instance.user:
            raise serializers.ValidationError({'user_id': 'Cannot change the user; remove the member and add again.'})
        if project is not None and user is not None:
            if project.owner_id == user.id:
                raise serializers.ValidationError({'user_id': 'Owner is already part of the project.'})
            qs = ProjectMember.objects.filter(project=project, user=user)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'user_id': 'User is already a member of this project.'})
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        project = validated_data['project']
        if not access.user_can_manage_project(request.user, project):
            raise serializers.ValidationError(
                {'detail': 'Only the project owner or a project manager can add members.'},
            )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context['request']
        if not access.user_can_manage_project(request.user, instance.project):
            raise serializers.ValidationError(
                {'detail': 'Only the project owner or a project manager can change members.'},
            )
        return super().update(instance, validated_data)


class TaskSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    assignee = UserSerializer(read_only=True, allow_null=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        source='assignee',
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Task
        fields = (
            'id',
            'project',
            'title',
            'description',
            'status',
            'priority',
            'due_date',
            'author',
            'assignee',
            'assignee_id',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('author', 'created_at', 'updated_at')

    def validate_project(self, project):
        user = self.context['request'].user
        if not access.accessible_projects(user).filter(pk=project.pk).exists():
            raise serializers.ValidationError('No access to this project.')
        return project

    def create(self, validated_data):
        request = self.context['request']
        project = validated_data['project']
        status = validated_data.get('status', workflow.initial_status_for_create())
        if status != workflow.initial_status_for_create():
            raise serializers.ValidationError(
                {'status': 'New tasks must start with status "todo".'},
            )
        validated_data['status'] = status
        assignee = validated_data.get('assignee')
        if assignee is not None:
            if not access.user_can_assign_tasks(request.user, project):
                raise serializers.ValidationError(
                    {'assignee_id': 'Only the project owner or a project manager can set assignee.'},
                )
            if not access.assignee_allowed_for_project(project, assignee):
                raise serializers.ValidationError(
                    {'assignee_id': 'Assignee must be the project owner or a project member.'},
                )
        validated_data['author'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context['request']
        if 'project' in validated_data and validated_data['project'] != instance.project:
            raise serializers.ValidationError({'project': 'Cannot move a task to another project.'})
        if 'assignee' in validated_data:
            new_assignee = validated_data['assignee']
            if new_assignee != instance.assignee:
                if not access.user_can_assign_tasks(request.user, instance.project):
                    raise serializers.ValidationError(
                        {'assignee_id': 'Only the project owner or a project manager can change assignee.'},
                    )
                if not access.assignee_allowed_for_project(instance.project, new_assignee):
                    raise serializers.ValidationError(
                        {'assignee_id': 'Assignee must be the project owner or a project member.'},
                    )
        new_status = validated_data.get('status', instance.status)
        ok, err = workflow.validate_status_transition(
            request.user,
            instance,
            instance.status,
            new_status,
        )
        if not ok:
            raise serializers.ValidationError({'status': err})
        return super().update(instance, validated_data)
