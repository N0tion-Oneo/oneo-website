# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0007_add_authenticated_target_stage'),
    ]

    operations = [
        migrations.AddField(
            model_name='meetingtype',
            name='show_on_dashboard',
            field=models.BooleanField(
                default=False,
                help_text='Show this meeting type on candidate/company dashboards for booking with assigned contacts',
            ),
        ),
    ]
