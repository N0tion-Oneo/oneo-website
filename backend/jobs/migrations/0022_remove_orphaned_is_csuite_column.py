# Generated manually to remove orphaned is_csuite column
# The is_csuite field was replaced with a @property that computes based on seniority

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0021_alter_job_seniority'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE jobs DROP COLUMN IF EXISTS is_csuite;',
            reverse_sql='ALTER TABLE jobs ADD COLUMN is_csuite BOOLEAN NOT NULL DEFAULT FALSE;',
        ),
    ]
