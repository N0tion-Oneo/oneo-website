# Update recipient_type for existing notification templates

from django.db import migrations


def update_recipient_types(apps, schema_editor):
    """Update recipient_type for seeded templates based on their purpose."""
    NotificationTemplate = apps.get_model('notifications', 'NotificationTemplate')

    # Templates for candidates
    candidate_templates = [
        'Interview Scheduled (Candidate)',
        'Interview Reminder (Candidate)',
        'Interview Rescheduled',
        'Interview Cancelled',
        'Assessment Assigned',
        'Assessment Deadline Reminder',
        'Application Shortlisted',
        'Application Rejected',
        'Offer Received',
        'Self-Schedule Interview Link',
        'Welcome Message',
    ]

    # Templates for recruiters/interviewers
    recruiter_templates = [
        'Interview Scheduled (Interviewer)',
        'Assessment Submitted',
        'Application Received',
    ]

    # Templates for all users (broadcast)
    all_users_templates = [
        'Admin Broadcast',
    ]

    # Update candidate templates
    NotificationTemplate.objects.filter(name__in=candidate_templates).update(
        recipient_type='candidate'
    )

    # Update recruiter templates
    NotificationTemplate.objects.filter(name__in=recruiter_templates).update(
        recipient_type='recruiter'
    )

    # Interview Scheduled (Interviewer) should be interviewer type
    NotificationTemplate.objects.filter(name='Interview Scheduled (Interviewer)').update(
        recipient_type='interviewer'
    )

    # Admin broadcast is for all users
    NotificationTemplate.objects.filter(name__in=all_users_templates).update(
        recipient_type='all'
    )


def reverse_update(apps, schema_editor):
    """Reverse: set all to candidate (default)."""
    NotificationTemplate = apps.get_model('notifications', 'NotificationTemplate')
    NotificationTemplate.objects.all().update(recipient_type='candidate')


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0004_add_recipient_type'),
    ]

    operations = [
        migrations.RunPython(update_recipient_types, reverse_update),
    ]
