"""
Migration to update existing notification action_urls to match valid frontend routes.

Old URLs:
- /applications/{id} → /dashboard/my-applications?application={id}
- /dashboard/jobs/{job_id}/applications/{app_id} → /dashboard/applications?application={app_id}
- /dashboard/jobs/{job_id} → /dashboard/admin/jobs
"""

import re
from django.db import migrations


def update_action_urls(apps, schema_editor):
    """Update existing action_urls to match valid frontend routes."""
    Notification = apps.get_model('notifications', 'Notification')

    updated_count = 0

    for notification in Notification.objects.exclude(action_url='').exclude(action_url__isnull=True):
        old_url = notification.action_url
        new_url = old_url

        # Pattern: /applications/{uuid} → /dashboard/my-applications?application={uuid}
        match = re.match(r'^/applications/([a-f0-9-]+)$', old_url)
        if match:
            app_id = match.group(1)
            new_url = f'/dashboard/my-applications?application={app_id}'

        # Pattern: /dashboard/jobs/{uuid}/applications/{uuid} → /dashboard/applications?application={uuid}
        match = re.match(r'^/dashboard/jobs/[a-f0-9-]+/applications/([a-f0-9-]+)$', old_url)
        if match:
            app_id = match.group(1)
            new_url = f'/dashboard/applications?application={app_id}'

        # Pattern: /dashboard/jobs/{uuid} → /dashboard/admin/jobs
        match = re.match(r'^/dashboard/jobs/[a-f0-9-]+$', old_url)
        if match:
            new_url = '/dashboard/admin/jobs'

        # Only update if URL changed
        if new_url != old_url:
            notification.action_url = new_url
            notification.save(update_fields=['action_url'])
            updated_count += 1

    print(f'Updated {updated_count} notification action_urls')


def reverse_action_urls(apps, schema_editor):
    """Reverse is a no-op since we can't recover original URLs."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0009_add_candidate_booking_invite_template'),
    ]

    operations = [
        migrations.RunPython(update_action_urls, reverse_action_urls),
    ]
