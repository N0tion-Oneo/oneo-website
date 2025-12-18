"""Signals for auto-posting content to the feed."""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from jobs.models import Job, JobStatus
from .models import FeedPost, PostType, PostStatus


@receiver(pre_save, sender=Job)
def track_job_status_change(sender, instance, **kwargs):
    """Track if job status is changing to PUBLISHED."""
    if instance.pk:
        try:
            old_instance = Job.objects.get(pk=instance.pk)
            instance._was_published = old_instance.status == JobStatus.PUBLISHED
            instance._becoming_published = (
                old_instance.status != JobStatus.PUBLISHED and
                instance.status == JobStatus.PUBLISHED
            )
        except Job.DoesNotExist:
            instance._was_published = False
            instance._becoming_published = instance.status == JobStatus.PUBLISHED
    else:
        # New job
        instance._was_published = False
        instance._becoming_published = instance.status == JobStatus.PUBLISHED


@receiver(post_save, sender=Job)
def auto_post_job_to_feed(sender, instance, created, **kwargs):
    """
    Automatically create a feed post when a job is published.

    - Creates a FeedPost with post_type='job_announcement'
    - Only creates once when job transitions to PUBLISHED
    - Links to the job via FK
    """
    # Check if job is becoming published (either newly created as published, or status changed to published)
    becoming_published = getattr(instance, '_becoming_published', False)

    if not becoming_published:
        return

    # Check if a feed post already exists for this job
    existing_post = FeedPost.objects.filter(
        job=instance,
        post_type=PostType.JOB_ANNOUNCEMENT
    ).exists()

    if existing_post:
        return

    # Create the feed post
    FeedPost.objects.create(
        company=instance.company,
        author=instance.created_by,
        post_type=PostType.JOB_ANNOUNCEMENT,
        title=f"New Job: {instance.title}",
        content=instance.summary or '',
        job=instance,
        status=PostStatus.PUBLISHED,
        published_at=instance.published_at or timezone.now(),
    )
