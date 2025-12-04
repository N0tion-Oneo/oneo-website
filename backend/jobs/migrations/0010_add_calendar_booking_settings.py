# Generated manually for calendar booking settings

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0009_booking_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='usercalendarconnection',
            name='calendar_name',
            field=models.CharField(blank=True, default='', help_text='Display name of the selected calendar', max_length=255),
        ),
        migrations.AddField(
            model_name='usercalendarconnection',
            name='booking_days_ahead',
            field=models.PositiveIntegerField(default=14, help_text='How many days in advance bookings are allowed'),
        ),
        migrations.AddField(
            model_name='usercalendarconnection',
            name='business_hours_start',
            field=models.PositiveSmallIntegerField(default=9, help_text='Start hour for availability (0-23)'),
        ),
        migrations.AddField(
            model_name='usercalendarconnection',
            name='business_hours_end',
            field=models.PositiveSmallIntegerField(default=18, help_text='End hour for availability (0-23)'),
        ),
        migrations.AddField(
            model_name='usercalendarconnection',
            name='min_notice_hours',
            field=models.PositiveIntegerField(default=24, help_text='Minimum hours notice required before booking'),
        ),
        migrations.AddField(
            model_name='usercalendarconnection',
            name='buffer_minutes',
            field=models.PositiveIntegerField(default=0, help_text='Buffer time between meetings in minutes'),
        ),
        migrations.AddField(
            model_name='usercalendarconnection',
            name='available_days',
            field=models.CharField(default='0,1,2,3,4', help_text='Available days (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)', max_length=20),
        ),
        migrations.AddField(
            model_name='usercalendarconnection',
            name='timezone',
            field=models.CharField(default='Africa/Johannesburg', help_text='Timezone for availability display', max_length=50),
        ),
    ]
