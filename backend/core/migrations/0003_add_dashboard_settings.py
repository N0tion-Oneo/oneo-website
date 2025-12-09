# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_seed_onboarding_stages'),
    ]

    operations = [
        migrations.CreateModel(
            name='DashboardSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('days_without_contact', models.PositiveIntegerField(default=7, help_text='Flag candidates not contacted in this many days')),
                ('days_stuck_in_stage', models.PositiveIntegerField(default=14, help_text='Flag candidates stuck in the same stage for this many days')),
                ('days_before_interview_prep', models.PositiveIntegerField(default=2, help_text='Flag candidates with interviews within this many days for prep')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Dashboard Settings',
                'verbose_name_plural': 'Dashboard Settings',
            },
        ),
    ]
