"""
Data migration to seed comprehensive bottleneck rules.

Adds additional rules beyond the basic onboarding stuck rules.
"""
from django.db import migrations


def seed_comprehensive_rules(apps, schema_editor):
    """Create comprehensive bottleneck rules for all entity types."""
    BottleneckRule = apps.get_model('bottlenecks', 'BottleneckRule')

    additional_rules = [
        # =====================================================================
        # Lead Bottlenecks
        # =====================================================================
        {
            'name': 'Stale Leads',
            'description': 'Leads with no activity for more than 7 days.',
            'entity_type': 'lead',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'updated_at',
                'threshold_days': 7,
            },
            'filter_conditions': [],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Stale lead: {{name}}',
                'body_template': 'Lead {{name}} has had no activity for over 7 days. Consider reaching out.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 48,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 1440,  # Daily
        },
        {
            'name': 'Unread Leads',
            'description': 'Leads that have not been read within 2 days of creation.',
            'entity_type': 'lead',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'created_at',
                'threshold_days': 2,
            },
            'filter_conditions': [
                {'field': 'is_read', 'operator': 'equals', 'value': 'false'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'all_admins',
                'channel': 'in_app',
                'title_template': 'Unread lead: {{name}}',
                'body_template': 'Lead {{name}} has not been reviewed yet.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 24,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 240,  # Every 4 hours
        },
        {
            'name': 'Unreplied Leads',
            'description': 'Leads that have been read but not replied to within 3 days.',
            'entity_type': 'lead',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'updated_at',
                'threshold_days': 3,
            },
            'filter_conditions': [
                {'field': 'is_read', 'operator': 'equals', 'value': 'true'},
                {'field': 'is_replied', 'operator': 'equals', 'value': 'false'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Unreplied lead: {{name}}',
                'body_template': 'Lead {{name}} was read but has not received a reply.',
            },
            'create_task': True,
            'task_config': {
                'title_template': 'Reply to lead: {{name}}',
                'priority': 'high',
                'due_days': 1,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 48,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 480,  # Every 8 hours
        },

        # =====================================================================
        # Company Bottlenecks
        # =====================================================================
        {
            'name': 'Incomplete Company Onboarding',
            'description': 'Companies that have not completed onboarding within 14 days.',
            'entity_type': 'company',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'created_at',
                'threshold_days': 14,
            },
            'filter_conditions': [
                {'field': 'onboarding_completed_at', 'operator': 'is_empty', 'value': ''}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'both',
                'title_template': 'Incomplete onboarding: {{name}}',
                'body_template': 'Company {{name}} has not completed onboarding after 14 days. Please follow up.',
            },
            'create_task': True,
            'task_config': {
                'title_template': 'Complete onboarding for: {{name}}',
                'priority': 'high',
                'due_days': 2,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 72,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 1440,  # Daily
        },
        {
            'name': 'Inactive Companies',
            'description': 'Companies with no activity for more than 30 days.',
            'entity_type': 'company',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'updated_at',
                'threshold_days': 30,
            },
            'filter_conditions': [],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Inactive company: {{name}}',
                'body_template': 'Company {{name}} has had no activity for 30+ days.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 168,  # Weekly
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 1440,  # Daily
        },

        # =====================================================================
        # Candidate Bottlenecks
        # =====================================================================
        {
            'name': 'Low Profile Completeness',
            'description': 'Candidates with less than 50% profile completeness after 7 days.',
            'entity_type': 'candidate',
            'bottleneck_type': 'threshold',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'created_at',
                'threshold_days': 7,
            },
            'filter_conditions': [
                {'field': 'profile_completeness', 'operator': 'less_than', 'value': '50'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Incomplete profile: {{name}}',
                'body_template': 'Candidate {{name}} has only {{profile_completeness}}% profile completeness.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 168,  # Weekly
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 1440,  # Daily
        },
        {
            'name': 'Stale Candidates',
            'description': 'Candidates with no activity for more than 30 days.',
            'entity_type': 'candidate',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'updated_at',
                'threshold_days': 30,
            },
            'filter_conditions': [],
            'send_notification': False,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Stale candidate: {{name}}',
                'body_template': 'Candidate {{name}} has had no activity for 30+ days.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 168,  # Weekly
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 1440,  # Daily
        },

        # =====================================================================
        # Application Bottlenecks
        # =====================================================================
        {
            'name': 'Awaiting Shortlist Decision',
            'description': 'Applications in APPLIED status for more than 5 days.',
            'entity_type': 'application',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'applied_at',
                'threshold_days': 5,
            },
            'filter_conditions': [
                {'field': 'status', 'operator': 'equals', 'value': 'applied'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'all_recruiters',
                'channel': 'in_app',
                'title_template': 'Application pending review: {{name}}',
                'body_template': 'Application from {{name}} has been waiting for shortlist decision for 5+ days.',
            },
            'create_task': True,
            'task_config': {
                'title_template': 'Review application: {{name}}',
                'priority': 'medium',
                'due_days': 2,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 48,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 480,  # Every 8 hours
        },
        {
            'name': 'Pending Offer Response',
            'description': 'Applications with OFFER_MADE status for more than 7 days.',
            'entity_type': 'application',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'offer_made_at',
                'threshold_days': 7,
            },
            'filter_conditions': [
                {'field': 'status', 'operator': 'equals', 'value': 'offer_made'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'both',
                'title_template': 'Pending offer response: {{name}}',
                'body_template': 'Offer to {{name}} has been pending for 7+ days. Follow up needed.',
            },
            'create_task': True,
            'task_config': {
                'title_template': 'Follow up on offer: {{name}}',
                'priority': 'high',
                'due_days': 1,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 48,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 480,  # Every 8 hours
        },

        # =====================================================================
        # Interview Stage (stage_instance) Bottlenecks
        # =====================================================================
        {
            'name': 'Overdue Assessment',
            'description': 'Assessment submissions that are past their deadline.',
            'entity_type': 'stage_instance',
            'bottleneck_type': 'overdue',
            'detection_config': {
                'type': 'overdue',
                'threshold_days': 0,
            },
            'filter_conditions': [
                {'field': 'status', 'operator': 'equals', 'value': 'awaiting_submission'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'both',
                'title_template': 'Overdue assessment',
                'body_template': 'Assessment deadline has passed. Follow up with candidate.',
            },
            'create_task': True,
            'task_config': {
                'title_template': 'Follow up on overdue assessment',
                'priority': 'urgent',
                'due_days': 1,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 24,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 240,  # Every 4 hours
        },
        {
            'name': 'Unscheduled Interview Stages',
            'description': 'Interview stages in NOT_STARTED status for more than 5 days.',
            'entity_type': 'stage_instance',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'created_at',
                'threshold_days': 5,
            },
            'filter_conditions': [
                {'field': 'status', 'operator': 'equals', 'value': 'not_started'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Unscheduled interview stage',
                'body_template': 'Interview stage has not been scheduled for 5+ days.',
            },
            'create_task': True,
            'task_config': {
                'title_template': 'Schedule interview stage',
                'priority': 'medium',
                'due_days': 2,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 48,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 480,  # Every 8 hours
        },
        {
            'name': 'Interview No-Show Follow-up',
            'description': 'Interview stages with NO_SHOW status requiring follow-up.',
            'entity_type': 'stage_instance',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'updated_at',
                'threshold_days': 1,
            },
            'filter_conditions': [
                {'field': 'status', 'operator': 'equals', 'value': 'no_show'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Interview no-show requires action',
                'body_template': 'Candidate did not attend scheduled interview. Decision needed.',
            },
            'create_task': True,
            'task_config': {
                'title_template': 'Handle interview no-show',
                'priority': 'high',
                'due_days': 1,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 24,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 240,  # Every 4 hours
        },
        {
            'name': 'Pending Interview Feedback',
            'description': 'Completed interviews without score/feedback after 2 days.',
            'entity_type': 'stage_instance',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'completed_at',
                'threshold_days': 2,
            },
            'filter_conditions': [
                {'field': 'status', 'operator': 'equals', 'value': 'completed'},
                {'field': 'score', 'operator': 'is_empty', 'value': ''}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'Interview feedback pending',
                'body_template': 'Interview completed 2+ days ago but feedback not submitted.',
            },
            'create_task': True,
            'task_config': {
                'title_template': 'Submit interview feedback',
                'priority': 'medium',
                'due_days': 1,
                'assign_to': 'entity_owner',
            },
            'cooldown_hours': 24,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 480,  # Every 8 hours
        },

        # =====================================================================
        # Additional Task Bottlenecks
        # =====================================================================
        {
            'name': 'Urgent Tasks Aging',
            'description': 'Urgent priority tasks that have been pending for more than 1 day.',
            'entity_type': 'task',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'created_at',
                'threshold_days': 1,
            },
            'filter_conditions': [
                {'field': 'priority', 'operator': 'equals', 'value': 'urgent'},
                {'field': 'status', 'operator': 'equals', 'value': 'pending'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'both',
                'title_template': 'Urgent task aging: {{name}}',
                'body_template': 'Urgent task "{{name}}" has been pending for over 1 day.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 12,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 60,  # Hourly
        },
        {
            'name': 'High Priority Task Backlog',
            'description': 'High priority tasks that have been pending for more than 3 days.',
            'entity_type': 'task',
            'bottleneck_type': 'duration',
            'detection_config': {
                'type': 'last_activity',
                'activity_field': 'created_at',
                'threshold_days': 3,
            },
            'filter_conditions': [
                {'field': 'priority', 'operator': 'equals', 'value': 'high'},
                {'field': 'status', 'operator': 'equals', 'value': 'pending'}
            ],
            'send_notification': True,
            'notification_config': {
                'recipient_type': 'assigned_user',
                'channel': 'in_app',
                'title_template': 'High priority task backlog: {{name}}',
                'body_template': 'High priority task "{{name}}" has been pending for over 3 days.',
            },
            'create_task': False,
            'task_config': {},
            'cooldown_hours': 24,
            'is_active': True,
            'run_on_schedule': True,
            'schedule_interval_minutes': 240,  # Every 4 hours
        },
    ]

    for rule_data in additional_rules:
        # Only create if rule with same name doesn't exist
        if not BottleneckRule.objects.filter(name=rule_data['name']).exists():
            BottleneckRule.objects.create(**rule_data)


def reverse_seed(apps, schema_editor):
    """Remove the seeded rules."""
    BottleneckRule = apps.get_model('bottlenecks', 'BottleneckRule')
    rule_names = [
        'Stale Leads',
        'Unread Leads',
        'Unreplied Leads',
        'Incomplete Company Onboarding',
        'Inactive Companies',
        'Low Profile Completeness',
        'Stale Candidates',
        'Awaiting Shortlist Decision',
        'Pending Offer Response',
        'Overdue Assessment',
        'Unscheduled Interview Stages',
        'Interview No-Show Follow-up',
        'Pending Interview Feedback',
        'Urgent Tasks Aging',
        'High Priority Task Backlog',
    ]
    BottleneckRule.objects.filter(name__in=rule_names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('bottlenecks', '0003_add_per_rule_scheduling'),
    ]

    operations = [
        migrations.RunPython(seed_comprehensive_rules, reverse_seed),
    ]
