from __future__ import annotations

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from core.models import Task, TaskChangeLog
from core.threadlocals import get_current_user


_AUDITED_FIELDS: tuple[str, ...] = ('status', 'assignee_id', 'due_date', 'priority')


def _to_str(value) -> str:
    if value is None:
        return ''
    return str(value)


@receiver(pre_save, sender=Task)
def task_pre_save(sender, instance: Task, **kwargs):
    if not instance.pk:
        instance._old_values = None
        return
    try:
        old = Task.objects.get(pk=instance.pk)
    except Task.DoesNotExist:
        instance._old_values = None
        return
    instance._old_values = {f: getattr(old, f) for f in _AUDITED_FIELDS}


@receiver(post_save, sender=Task)
def task_post_save(sender, instance: Task, created: bool, **kwargs):
    if created:
        return
    old_values: dict[str, object] | None = getattr(instance, '_old_values', None)
    if not old_values:
        return

    actor = get_current_user()
    if actor is not None and getattr(actor, 'is_authenticated', False) is False:
        actor = None

    for field_name in _AUDITED_FIELDS:
        old_value = old_values.get(field_name)
        new_value = getattr(instance, field_name)
        if old_value == new_value:
            continue
        TaskChangeLog.objects.create(
            task=instance,
            actor=actor,
            field_name=field_name,
            old_value=_to_str(old_value),
            new_value=_to_str(new_value),
        )

