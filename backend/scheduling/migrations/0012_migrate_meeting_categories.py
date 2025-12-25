# Generated migration to update meeting type categories

from django.db import migrations


def update_categories(apps, schema_editor):
    """Update existing meeting types to new category values."""
    MeetingType = apps.get_model('scheduling', 'MeetingType')

    # Map old 'sales' category to new categories based on meeting name
    for mt in MeetingType.objects.filter(category='sales'):
        if 'onboarding' in mt.name.lower():
            mt.category = 'onboarding'
        else:
            # Sales Discovery Call and similar -> leads
            mt.category = 'leads'
        mt.save(update_fields=['category'])


def reverse_categories(apps, schema_editor):
    """Reverse: convert leads and onboarding back to sales."""
    MeetingType = apps.get_model('scheduling', 'MeetingType')

    MeetingType.objects.filter(category__in=['leads', 'onboarding']).update(category='sales')


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0011_update_meeting_categories'),
    ]

    operations = [
        migrations.RunPython(update_categories, reverse_categories),
    ]
