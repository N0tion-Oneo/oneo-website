"""
Signals for the core app.
Handles automatic activity logging for tasks.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Task, TaskActivity, TaskActivityType, TaskNote, TaskStatus


# Store original values before save
_task_original_values = {}


@receiver(pre_save, sender=Task)
def task_pre_save(sender, instance, **kwargs):
    """Capture original values before task is saved."""
    if instance.pk:
        try:
            original = Task.objects.get(pk=instance.pk)
            _task_original_values[instance.pk] = {
                'status': original.status,
                'priority': original.priority,
                'assigned_to_id': original.assigned_to_id,
                'due_date': str(original.due_date) if original.due_date else None,
                'title': original.title,
                'description': original.description,
            }
        except Task.DoesNotExist:
            pass


@receiver(post_save, sender=Task)
def task_post_save(sender, instance, created, **kwargs):
    """Log task activity after save."""
    # Get the user who made the change (from thread local or context)
    # For now, we'll use assigned_to as fallback
    performed_by = getattr(instance, '_current_user', None) or instance.assigned_to

    if created:
        # New task created
        TaskActivity.objects.create(
            task=instance,
            activity_type=TaskActivityType.CREATED,
            new_value={
                'title': instance.title,
                'status': instance.status,
                'priority': instance.priority,
                'assigned_to_id': instance.assigned_to_id,
                'due_date': str(instance.due_date) if instance.due_date else None,
            },
            description=f"Task created: {instance.title}",
            performed_by=performed_by,
        )
    else:
        # Existing task updated - check what changed
        original = _task_original_values.pop(instance.pk, None)
        if not original:
            return

        # Status change
        if original['status'] != instance.status:
            if instance.status == TaskStatus.COMPLETED:
                activity_type = TaskActivityType.COMPLETED
                description = "Task marked as completed"
            elif original['status'] == TaskStatus.COMPLETED:
                activity_type = TaskActivityType.REOPENED
                description = "Task reopened"
            else:
                activity_type = TaskActivityType.STATUS_CHANGED
                description = f"Status changed from {original['status']} to {instance.status}"

            TaskActivity.objects.create(
                task=instance,
                activity_type=activity_type,
                old_value={'status': original['status']},
                new_value={'status': instance.status},
                description=description,
                performed_by=performed_by,
            )

        # Priority change
        if original['priority'] != instance.priority:
            TaskActivity.objects.create(
                task=instance,
                activity_type=TaskActivityType.PRIORITY_CHANGED,
                old_value={'priority': original['priority']},
                new_value={'priority': instance.priority},
                description=f"Priority changed from {original['priority']} to {instance.priority}",
                performed_by=performed_by,
            )

        # Assignee change
        if original['assigned_to_id'] != instance.assigned_to_id:
            TaskActivity.objects.create(
                task=instance,
                activity_type=TaskActivityType.REASSIGNED,
                old_value={'assigned_to_id': original['assigned_to_id']},
                new_value={'assigned_to_id': instance.assigned_to_id},
                description="Task reassigned",
                performed_by=performed_by,
            )

        # Due date change
        current_due = str(instance.due_date) if instance.due_date else None
        if original['due_date'] != current_due:
            TaskActivity.objects.create(
                task=instance,
                activity_type=TaskActivityType.DUE_DATE_CHANGED,
                old_value={'due_date': original['due_date']},
                new_value={'due_date': current_due},
                description=f"Due date changed to {current_due or 'none'}",
                performed_by=performed_by,
            )


@receiver(post_save, sender=TaskNote)
def task_note_post_save(sender, instance, created, **kwargs):
    """Log activity when a note is added to a task."""
    if created:
        TaskActivity.objects.create(
            task=instance.task,
            activity_type=TaskActivityType.NOTE_ADDED,
            new_value={'note_id': str(instance.id), 'content_preview': instance.content[:100]},
            description="Note added to task",
            performed_by=instance.created_by,
        )
