"""
Data migration to seed default bottleneck rules.

These rules replace the hardcoded thresholds that were previously in analytics views.
"""
from django.db import migrations


def seed_default_rules(apps, schema_editor):
    """Create default bottleneck rules matching previous hardcoded behavior."""
    BottleneckRule = apps.get_model('bottlenecks', 'BottleneckRule')

    default_rules = [
        # =====================================================================
        # Lead Onboarding Bottlenecks
        # =====================================================================
        {
            'name': 'Lead Stuck in Onboarding Stage',
            'description': 'Detects leads that have been in the same onboarding stage for more than 7 days.',
            'entity_type': 'lead',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'stage_duration',
                'stage_field': 'onboarding_stage',
                'threshold_days': 7,
                'exclude_terminal': True,
            },
            'filter_conditions': [],
            'send_notification': False,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Lead stuck: {{name}}',
                'body_template': 'Lead {{name}} has been in stage {{stage_name}} for over 7 days.',
            },
            'create_task': False,
            'task_config': {
                'title_template': 'Follow up with stuck lead: {{name}}',
                'priority': 'medium',
                'due_days': 1,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 24,
            'is_active': True,
            'run_on_schedule': True,
        },

        # =====================================================================
        # Company Onboarding Bottlenecks
        # =====================================================================
        {
            'name': 'Company Stuck in Onboarding Stage',
            'description': 'Detects companies that have been in the same onboarding stage for more than 7 days.',
            'entity_type': 'company',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'stage_duration',
                'stage_field': 'onboarding_stage',
                'threshold_days': 7,
                'exclude_terminal': True,
            },
            'filter_conditions': [],
            'send_notification': False,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Company stuck: {{name}}',
                'body_template': 'Company {{name}} has been in stage {{stage_name}} for over 7 days.',
            },
            'create_task': False,
            'task_config': {
                'title_template': 'Follow up with stuck company: {{name}}',
                'priority': 'medium',
                'due_days': 1,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 24,
            'is_active': True,
            'run_on_schedule': True,
        },

        # =====================================================================
        # Candidate Onboarding Bottlenecks
        # =====================================================================
        {
            'name': 'Candidate Stuck in Onboarding Stage',
            'description': 'Detects candidates that have been in the same onboarding stage for more than 7 days.',
            'entity_type': 'candidate',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'stage_duration',
                'stage_field': 'onboarding_stage',
                'threshold_days': 7,
                'exclude_terminal': True,
            },
            'filter_conditions': [],
            'send_notification': False,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Candidate stuck: {{name}}',
                'body_template': 'Candidate {{name}} has been in stage {{stage_name}} for over 7 days.',
            },
            'create_task': False,
            'task_config': {
                'title_template': 'Follow up with stuck candidate: {{name}}',
                'priority': 'medium',
                'due_days': 1,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 24,
            'is_active': True,
            'run_on_schedule': True,
        },

        # =====================================================================
        # Task Bottlenecks
        # =====================================================================
        {
            'name': 'Overdue Tasks',
            'description': 'Detects tasks that are past their due date.',
            'entity_type': 'task',
            'bottleneck_type': 'overdue',
            'detection_config': {
                'type': 'overdue',
                'threshold_days': 0,  # Past due immediately
            },
            'filter_conditions': [],
            'send_notification': False,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Task overdue: {{name}}',
                'body_template': 'Task "{{name}}" is {{days_overdue}} days overdue.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 48,
            'is_active': True,
            'run_on_schedule': True,
        },
        {
            'name': 'Stale Pending Tasks',
            'description': 'Detects pending tasks with no recent activity for more than 14 days.',
            'entity_type': 'task',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'updated_at',
                'threshold_days': 14,
            },
            'filter_conditions': [
                {'field': 'status', 'operator': 'equals', 'value': 'pending'}
            ],
            'send_notification': False,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Stale task: {{name}}',
                'body_template': 'Task "{{name}}" has had no activity for 14+ days.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 72,
            'is_active': True,
            'run_on_schedule': True,
        },

        # =====================================================================
        # Application Bottlenecks
        # =====================================================================
        {
            'name': 'Application Stuck in Stage',
            'description': 'Detects applications that have been in the same stage for more than 10 days.',
            'entity_type': 'application',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'stage_duration',
                'stage_field': 'current_stage',
                'threshold_days': 10,
                'exclude_terminal': True,
            },
            'filter_conditions': [],
            'send_notification': False,
            'notification_config': {
                'recipient_type': 'all_recruiters',
                'channel': 'in_app',
                'title_template': 'Application stuck: {{name}}',
                'body_template': 'Application for {{name}} has been in stage {{stage_name}} for over 10 days.',
            },
            'create_task': False,
            'task_config': {
                'title_template': 'Review stuck application: {{name}}',
                'priority': 'medium',
                'due_days': 2,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 48,
            'is_active': True,
            'run_on_schedule': True,
        },
    ]

    for rule_data in default_rules:
        BottleneckRule.objects.create(**rule_data)


def reverse_seed(apps, schema_editor):
    """Remove the seeded default rules."""
    BottleneckRule = apps.get_model('bottlenecks', 'BottleneckRule')
    default_names = [
        'Lead Stuck in Onboarding Stage',
        'Company Stuck in Onboarding Stage',
        'Candidate Stuck in Onboarding Stage',
        'Overdue Tasks',
        'Stale Pending Tasks',
        'Application Stuck in Stage',
    ]
    BottleneckRule.objects.filter(name__in=default_names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('bottlenecks', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_default_rules, reverse_seed),
    ]
