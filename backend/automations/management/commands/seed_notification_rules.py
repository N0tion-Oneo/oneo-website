"""
Management command to seed default notification automation rules.

This creates automation rules that replicate the hardcoded notification triggers,
allowing gradual migration to the automation system.

Usage:
    python manage.py seed_notification_rules
    python manage.py seed_notification_rules --dry-run
    python manage.py seed_notification_rules --force  # Recreate existing rules
"""

from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from automations.models import AutomationRule
from notifications.models import NotificationTemplate


class Command(BaseCommand):
    help = 'Seed default notification automation rules'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Recreate rules even if they already exist',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        self.stdout.write(self.style.NOTICE('Seeding notification automation rules...'))

        # Define the rules to create
        rules = self.get_rule_definitions()

        created = 0
        skipped = 0
        errors = 0

        for rule_def in rules:
            try:
                result = self.create_rule(rule_def, dry_run=dry_run, force=force)
                if result == 'created':
                    created += 1
                elif result == 'skipped':
                    skipped += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error creating rule '{rule_def['name']}': {e}"))
                errors += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Created: {created}'))
        self.stdout.write(self.style.WARNING(f'Skipped: {skipped}'))
        if errors:
            self.stdout.write(self.style.ERROR(f'Errors: {errors}'))

    def get_rule_definitions(self):
        """Define all the notification automation rules to create."""
        return [
            # =====================================================================
            # JOB LIFECYCLE
            # =====================================================================
            {
                'name': '[Auto] Job Published - Notify Client',
                'description': 'Notify assigned client when a job is published',
                'trigger_model': 'jobs.job',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'published'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'assigned_client',
                },
                'template_type': 'job_published',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Job Closed - Notify Client',
                'description': 'Notify assigned client when a job is closed',
                'trigger_model': 'jobs.job',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'closed'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'assigned_client',
                },
                'template_type': 'job_closed',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Job Closed - Notify Recruiter',
                'description': 'Notify recruiters when a job is closed',
                'trigger_model': 'jobs.job',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'closed'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'recruiter',
                },
                'template_type': 'job_closed',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Job Filled - Notify Client',
                'description': 'Notify assigned client when a job is filled',
                'trigger_model': 'jobs.job',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'filled'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'assigned_client',
                },
                'template_type': 'job_filled',
                'template_recipient': 'client',
            },

            # =====================================================================
            # APPLICATION LIFECYCLE
            # =====================================================================
            {
                'name': '[Auto] Application Received - Notify Recruiter',
                'description': 'Notify recruiters when a new application is received',
                'trigger_model': 'jobs.application',
                'trigger_type': 'model_created',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'recruiter',
                },
                'template_type': 'application_received',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Application Shortlisted - Notify Candidate',
                'description': 'Notify candidate when their application is shortlisted',
                'trigger_model': 'jobs.application',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'shortlisted'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'application_shortlisted',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Application Rejected - Notify Candidate',
                'description': 'Notify candidate when their application is rejected',
                'trigger_model': 'jobs.application',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'rejected'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'application_rejected',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Application Withdrawn - Notify Recruiter',
                'description': 'Notify recruiters when a candidate withdraws their application',
                'trigger_model': 'jobs.application',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'withdrawn'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'recruiter',
                },
                'template_type': 'application_withdrawn',
                'template_recipient': 'recruiter',
            },

            # =====================================================================
            # OFFER LIFECYCLE
            # =====================================================================
            {
                'name': '[Auto] Offer Received - Notify Candidate',
                'description': 'Notify candidate when they receive an offer',
                'trigger_model': 'jobs.application',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'offer_made'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'offer_received',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Offer Accepted - Notify Client',
                'description': 'Notify client when a candidate accepts an offer',
                'trigger_model': 'jobs.application',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'hired'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'assigned_client',
                },
                'template_type': 'offer_accepted',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Offer Accepted - Notify Recruiter',
                'description': 'Notify recruiters when a candidate accepts an offer',
                'trigger_model': 'jobs.application',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'hired'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'recruiter',
                },
                'template_type': 'offer_accepted',
                'template_recipient': 'recruiter',
            },

            {
                'name': '[Auto] Offer Declined - Notify Recruiter',
                'description': 'Notify recruiters when an offer is declined',
                'trigger_model': 'jobs.application',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'offer_declined'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'recruiter',
                },
                'template_type': 'offer_declined',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Offer Declined - Notify Client',
                'description': 'Notify client when an offer is declined',
                'trigger_model': 'jobs.application',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'offer_declined'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'assigned_client',
                },
                'template_type': 'offer_declined',
                'template_recipient': 'client',
            },

            # =====================================================================
            # STAGE/INTERVIEW LIFECYCLE
            # =====================================================================
            {
                'name': '[Auto] Stage Scheduled - Notify Candidate',
                'description': 'Notify candidate when an interview/stage is scheduled',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'scheduled'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'stage_scheduled',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Stage Scheduled - Notify Interviewer',
                'description': 'Notify interviewer when an interview/stage is scheduled',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'scheduled'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'interviewer',
                },
                'template_type': 'stage_scheduled',
                'template_recipient': 'interviewer',
            },
            {
                'name': '[Auto] Stage Completed - Notify Recruiter',
                'description': 'Notify recruiters when an interview/stage is completed',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'completed'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'recruiter',
                },
                'template_type': 'stage_completed',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Stage Completed - Notify Client',
                'description': 'Notify client when an interview/stage is completed',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'completed'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'assigned_client',
                },
                'template_type': 'stage_completed',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Stage Cancelled - Notify Candidate',
                'description': 'Notify candidate when an interview/stage is cancelled',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'cancelled'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'stage_cancelled',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Stage Cancelled - Notify Interviewer',
                'description': 'Notify interviewer when an interview/stage is cancelled',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'cancelled'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'interviewer',
                },
                'template_type': 'stage_cancelled',
                'template_recipient': 'interviewer',
            },
            {
                'name': '[Auto] Stage Feedback Received - Notify Candidate',
                'description': 'Notify candidate when feedback is available for their interview',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'field_changed',
                'trigger_conditions': [
                    {'field': 'feedback', 'operator': 'is_not_empty'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'stage_feedback_received',
                'template_recipient': 'candidate',
            },

            # =====================================================================
            # ASSESSMENT LIFECYCLE
            # =====================================================================
            {
                'name': '[Auto] Assessment Assigned - Notify Candidate',
                'description': 'Notify candidate when they are assigned an assessment',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'awaiting_submission'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'assessment_assigned',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Assessment Submitted - Notify Recruiter',
                'description': 'Notify recruiters when a candidate submits an assessment',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'pending_review'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'recruiter',
                },
                'template_type': 'submission_received',
                'template_recipient': 'recruiter',
            },

            # =====================================================================
            # JOB UPDATED (Bulk notification to active applicants)
            # =====================================================================
            {
                'name': '[Auto] Job Updated - Notify Active Applicants',
                'description': 'Notify all candidates with active applications when a job is updated',
                'trigger_model': 'jobs.job',
                'trigger_type': 'model_updated',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'published'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'active_applicants',
                },
                'template_type': 'job_updated',
                'template_recipient': 'candidate',
            },

            # =====================================================================
            # STAGE ADVANCED (By stage type - dynamic template selection)
            # =====================================================================
            {
                'name': '[Auto] Advanced to Phone Screening - Notify Candidate',
                'description': 'Notify candidate when they advance to phone screening stage',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'stage_template__stage_type', 'operator': 'equals', 'value': 'phone_screening'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'advanced_to_phone_screening',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Advanced to Video Interview - Notify Candidate',
                'description': 'Notify candidate when they advance to video interview stage',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'stage_template__stage_type', 'operator': 'equals', 'value': 'video_call'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'advanced_to_video_interview',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Advanced to In-Person Interview - Notify Candidate',
                'description': 'Notify candidate when they advance to in-person interview stage',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'stage_template__stage_type', 'operator': 'equals', 'value': 'in_person_interview'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'advanced_to_in_person_interview',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Advanced to Application Screen - Notify Candidate',
                'description': 'Notify candidate when they advance to application screen stage',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'stage_template__stage_type', 'operator': 'equals', 'value': 'application_screen'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'advanced_to_application_screen',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Advanced to Take-Home Assessment - Notify Candidate',
                'description': 'Notify candidate when they advance to take-home assessment stage',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'stage_template__stage_type', 'operator': 'equals', 'value': 'take_home_assessment'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'advanced_to_take_home_assessment',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Advanced to In-Person Assessment - Notify Candidate',
                'description': 'Notify candidate when they advance to in-person assessment stage',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'stage_template__stage_type', 'operator': 'equals', 'value': 'in_person_assessment'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'advanced_to_in_person_assessment',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Advanced to Custom Stage - Notify Candidate',
                'description': 'Notify candidate when they advance to a custom stage',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'stage_template__stage_type', 'operator': 'equals', 'value': 'custom'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'advanced_to_custom_stage',
                'template_recipient': 'candidate',
            },

            # =====================================================================
            # INVITATIONS (External email recipients)
            # =====================================================================
            {
                'name': '[Auto] Client Invitation Created - Send Invite Email',
                'description': 'Send invitation email when a client invitation is created',
                'trigger_model': 'authentication.clientinvitation',
                'trigger_type': 'model_created',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',  # Email only - external user
                    'recipient_type': 'invitation_email',
                },
                'template_type': 'client_invite',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Recruiter Invitation Created - Send Invite Email',
                'description': 'Send invitation email when a recruiter/team member invitation is created',
                'trigger_model': 'authentication.recruiterinvitation',
                'trigger_type': 'model_created',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',  # Email only - external user
                    'recipient_type': 'invitation_email',
                },
                'template_type': 'team_invite',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Company Member Invitation Created - Send Invite Email',
                'description': 'Send invitation email when a company member invitation is created',
                'trigger_model': 'companies.companyinvitation',
                'trigger_type': 'model_created',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',  # Email only - external user
                    'recipient_type': 'invitation_email',
                },
                'template_type': 'company_member_invite',
                'template_recipient': 'client',
            },

            # =====================================================================
            # BOOKING LIFECYCLE
            # =====================================================================
            {
                'name': '[Auto] Booking Confirmed - Notify Attendee',
                'description': 'Notify attendee when a booking is confirmed',
                'trigger_model': 'scheduling.booking',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'confirmed'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'booking_attendee',
                },
                'template_type': 'booking_confirmed',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Booking Confirmed - Notify Organizer',
                'description': 'Notify organizer when a booking is confirmed',
                'trigger_model': 'scheduling.booking',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'confirmed'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'booking_organizer',
                },
                'template_type': 'booking_confirmed',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Booking Reminder - 24h Before (Attendee)',
                'description': 'Remind attendee 24 hours before their booking',
                'trigger_model': 'scheduling.booking',
                'trigger_type': 'scheduled',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'confirmed'}
                ],
                'schedule_config': {
                    'datetime_field': 'scheduled_at',
                    'offset_hours': 24,
                    'offset_type': 'before',
                },
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'booking_attendee',
                },
                'template_type': 'booking_reminder',
                'template_recipient': 'candidate',
            },

            # =====================================================================
            # SCHEDULED REMINDERS (Time-based triggers)
            # =====================================================================
            {
                'name': '[Auto] Interview Reminder - 24h Before (Candidate)',
                'description': 'Remind candidate 24 hours before their scheduled interview',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'scheduled',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'scheduled'}
                ],
                'schedule_config': {
                    'datetime_field': 'scheduled_at',
                    'offset_hours': 24,
                    'offset_type': 'before',
                },
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'stage_reminder',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Interview Reminder - 24h Before (Interviewer)',
                'description': 'Remind interviewer 24 hours before the scheduled interview',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'scheduled',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'scheduled'}
                ],
                'schedule_config': {
                    'datetime_field': 'scheduled_at',
                    'offset_hours': 24,
                    'offset_type': 'before',
                },
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'interviewer',
                },
                'template_type': 'stage_reminder',
                'template_recipient': 'interviewer',
            },
            {
                'name': '[Auto] Assessment Deadline Reminder - 24h Before',
                'description': 'Remind candidate 24 hours before assessment deadline',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'scheduled',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'awaiting_submission'}
                ],
                'schedule_config': {
                    'datetime_field': 'deadline',
                    'offset_hours': 24,
                    'offset_type': 'before',
                },
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'assessment_reminder',
                'template_recipient': 'candidate',
            },

            # =====================================================================
            # WELCOME EMAILS (User created with specific role)
            # =====================================================================
            {
                'name': '[Auto] Welcome Email - Candidate',
                'description': 'Send welcome email when a new candidate signs up',
                'trigger_model': 'users.user',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'role', 'operator': 'equals', 'value': 'candidate'},
                    {'field': 'is_pending_signup', 'operator': 'equals', 'value': 'False'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'self',
                },
                'template_type': 'welcome',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Welcome Email - Client',
                'description': 'Send welcome email when a new client signs up',
                'trigger_model': 'users.user',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'role', 'operator': 'equals', 'value': 'client'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'self',
                },
                'template_type': 'welcome',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Welcome Email - Recruiter',
                'description': 'Send welcome email when a new recruiter signs up',
                'trigger_model': 'users.user',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'role', 'operator': 'equals', 'value': 'recruiter'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'self',
                },
                'template_type': 'welcome',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Welcome Email - Admin',
                'description': 'Send welcome email when a new admin is created',
                'trigger_model': 'users.user',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'role', 'operator': 'equals', 'value': 'admin'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'self',
                },
                'template_type': 'welcome',
                'template_recipient': 'company_admin',
            },

            # =====================================================================
            # STAGE RESCHEDULED (field_changed on scheduled_at)
            # =====================================================================
            {
                'name': '[Auto] Stage Rescheduled - Notify Candidate',
                'description': 'Notify candidate when their interview is rescheduled',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'field_changed',
                'trigger_conditions': [
                    {'field': 'scheduled_at', 'operator': 'changed'},
                    {'field': 'status', 'operator': 'equals', 'value': 'scheduled'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'candidate',
                },
                'template_type': 'stage_rescheduled',
                'template_recipient': 'candidate',
            },
            {
                'name': '[Auto] Stage Rescheduled - Notify Interviewer',
                'description': 'Notify interviewer when an interview is rescheduled',
                'trigger_model': 'jobs.applicationstageinstance',
                'trigger_type': 'field_changed',
                'trigger_conditions': [
                    {'field': 'scheduled_at', 'operator': 'changed'},
                    {'field': 'status', 'operator': 'equals', 'value': 'scheduled'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'interviewer',
                },
                'template_type': 'stage_rescheduled',
                'template_recipient': 'interviewer',
            },

            # =====================================================================
            # CANDIDATE BOOKING INVITATIONS
            # =====================================================================
            {
                'name': '[Auto] Candidate Booking Invite - Send Email',
                'description': 'Send booking invitation when a candidate invitation is created with a booking',
                'trigger_model': 'authentication.candidateinvitation',
                'trigger_type': 'model_created',
                'trigger_conditions': [
                    {'field': 'booking', 'operator': 'is_not_empty'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'invitation_email',
                },
                'template_type': 'candidate_booking_invite',
                'template_recipient': 'candidate',
            },

            # =====================================================================
            # LEAD PIPELINE
            # =====================================================================
            {
                'name': '[Auto] Lead Created - Notify Admins',
                'description': 'Notify all admins when a new lead is created',
                'trigger_model': 'companies.lead',
                'trigger_type': 'model_created',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'all_admins',
                },
                'template_type': 'lead_created',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Lead Stage Changed - Notify Assignees',
                'description': 'Notify assigned recruiters when lead stage changes',
                'trigger_model': 'companies.lead',
                'trigger_type': 'stage_changed',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'lead_assignees',
                },
                'template_type': 'lead_stage_changed',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Lead Assigned - Notify New Assignee',
                'description': 'Notify recruiter when they are assigned to a lead',
                'trigger_model': 'companies.lead',
                'trigger_type': 'field_changed',
                'trigger_conditions': [
                    {'field': 'assigned_to', 'operator': 'changed'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'lead_assignees',
                },
                'template_type': 'lead_assigned',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Lead Converted - Welcome New Client',
                'description': 'Send welcome email when a lead is converted to a client',
                'trigger_model': 'companies.lead',
                'trigger_type': 'field_changed',
                'trigger_conditions': [
                    {'field': 'is_converted', 'operator': 'equals', 'value': 'True'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'lead_email',
                },
                'template_type': 'lead_converted',
                'template_recipient': 'client',
            },

            # =====================================================================
            # COMPANY
            # =====================================================================
            {
                'name': '[Auto] Company Created - Notify Admins',
                'description': 'Notify all admins when a new company is created',
                'trigger_model': 'companies.company',
                'trigger_type': 'model_created',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'all_admins',
                },
                'template_type': 'company_created',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Company Stage Changed - Notify Assignees',
                'description': 'Notify assigned recruiters when company onboarding stage changes',
                'trigger_model': 'companies.company',
                'trigger_type': 'stage_changed',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'company_assignees',
                },
                'template_type': 'company_stage_changed',
                'template_recipient': 'recruiter',
            },

            # =====================================================================
            # INVOICING
            # =====================================================================
            {
                'name': '[Auto] Invoice Sent - Notify Billing Contact',
                'description': 'Notify billing contact when invoice is sent',
                'trigger_model': 'subscriptions.invoice',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'sent'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'billing_contact',
                },
                'template_type': 'invoice_sent',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Invoice Paid - Notify Billing Contact',
                'description': 'Notify billing contact when invoice is paid',
                'trigger_model': 'subscriptions.invoice',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'paid'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'billing_contact',
                },
                'template_type': 'invoice_paid',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Invoice Overdue - Notify Billing Contact',
                'description': 'Notify billing contact when invoice becomes overdue',
                'trigger_model': 'subscriptions.invoice',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'overdue'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'billing_contact',
                },
                'template_type': 'invoice_overdue',
                'template_recipient': 'client',
            },

            # =====================================================================
            # SUBSCRIPTIONS
            # =====================================================================
            {
                'name': '[Auto] Subscription Activated - Notify Company',
                'description': 'Notify company admins when subscription is activated',
                'trigger_model': 'subscriptions.subscription',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'active'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'subscription_company',
                },
                'template_type': 'subscription_activated',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Subscription Paused - Notify Company',
                'description': 'Notify company admins when subscription is paused',
                'trigger_model': 'subscriptions.subscription',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'paused'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'subscription_company',
                },
                'template_type': 'subscription_paused',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Subscription Terminated - Notify Company',
                'description': 'Notify company admins when subscription is terminated',
                'trigger_model': 'subscriptions.subscription',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'terminated'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'subscription_company',
                },
                'template_type': 'subscription_terminated',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Subscription Renewed - Notify Company',
                'description': 'Notify company admins when subscription contract end date is extended',
                'trigger_model': 'subscriptions.subscription',
                'trigger_type': 'field_changed',
                'trigger_conditions': [
                    {'field': 'contract_end_date', 'operator': 'changed'},
                    {'field': 'status', 'operator': 'equals', 'value': 'active'},
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'subscription_company',
                },
                'template_type': 'subscription_renewed',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Subscription Expiring - 30 Day Reminder',
                'description': 'Remind company 30 days before subscription expires',
                'trigger_model': 'subscriptions.subscription',
                'trigger_type': 'scheduled',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'active'}
                ],
                'schedule_config': {
                    'datetime_field': 'contract_end_date',
                    'offset_days': 30,
                    'offset_type': 'before',
                },
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'subscription_company',
                },
                'template_type': 'subscription_expiring',
                'template_recipient': 'client',
            },

            # =====================================================================
            # REPLACEMENT REQUESTS
            # =====================================================================
            {
                'name': '[Auto] Replacement Requested - Notify Admins',
                'description': 'Notify all admins when a replacement request is submitted',
                'trigger_model': 'jobs.replacementrequest',
                'trigger_type': 'model_created',
                'trigger_conditions': [],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'all_admins',
                },
                'template_type': 'replacement_requested',
                'template_recipient': 'recruiter',
            },
            {
                'name': '[Auto] Replacement Approved - Notify Client',
                'description': 'Notify the client who requested when their replacement is approved',
                'trigger_model': 'jobs.replacementrequest',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'in', 'value': ['approved_free', 'approved_discounted']}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'replacement_requester',
                },
                'template_type': 'replacement_approved',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Replacement Rejected - Notify Client',
                'description': 'Notify the client who requested when their replacement is rejected',
                'trigger_model': 'jobs.replacementrequest',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'equals', 'value': 'rejected'}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'replacement_requester',
                },
                'template_type': 'replacement_rejected',
                'template_recipient': 'client',
            },
            {
                'name': '[Auto] Job Reopened for Replacement - Notify Recruiters',
                'description': 'Notify assigned recruiters when a job is reopened due to approved replacement',
                'trigger_model': 'jobs.replacementrequest',
                'trigger_type': 'status_changed',
                'trigger_conditions': [
                    {'field': 'status', 'operator': 'in', 'value': ['approved_free', 'approved_discounted']}
                ],
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'job_recruiters',
                },
                'template_type': 'job_reopened_for_replacement',
                'template_recipient': 'recruiter',
            },

            # =====================================================================
            # MANUAL TRIGGERS
            # =====================================================================
            {
                'name': '[Manual] Admin Broadcast',
                'description': 'Manually triggered broadcast to all users or selected recipients',
                'trigger_model': None,  # No model for manual triggers
                'trigger_type': 'manual',
                'trigger_conditions': [],
                'signal_name': 'admin_broadcast',
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'both',
                    'recipient_type': 'all_users',
                },
                'template_type': 'admin_broadcast',
                'template_recipient': 'all',
            },

            # =====================================================================
            # SIGNAL TRIGGERS (Django Auth)
            # =====================================================================
            {
                'name': '[Signal] Password Reset Requested',
                'description': 'Send password reset email when user requests password reset',
                'trigger_model': 'users.user',
                'trigger_type': 'signal',
                'trigger_conditions': [],
                'signal_name': 'password_reset',
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'self',
                },
                'template_type': 'password_reset',
                'template_recipient': 'all',
            },
            {
                'name': '[Signal] Password Changed',
                'description': 'Send confirmation email when user changes password',
                'trigger_model': 'users.user',
                'trigger_type': 'signal',
                'trigger_conditions': [],
                'signal_name': 'password_changed',
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'self',
                },
                'template_type': 'password_changed',
                'template_recipient': 'all',
            },
            {
                'name': '[Signal] Email Verification',
                'description': 'Send email verification when user signs up',
                'trigger_model': 'users.user',
                'trigger_type': 'signal',
                'trigger_conditions': [],
                'signal_name': 'email_verification',
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'self',
                },
                'template_type': 'email_verification',
                'template_recipient': 'all',
            },

            # =====================================================================
            # VIEW ACTION TRIGGERS
            # =====================================================================
            {
                'name': '[Action] Booking Link Sent',
                'description': 'Send email when recruiter sends booking link to candidate',
                'trigger_model': 'scheduling.booking',
                'trigger_type': 'view_action',
                'trigger_conditions': [],
                'signal_name': 'booking_link_sent',
                'action_type': 'send_notification',
                'action_config': {
                    'channel': 'email',
                    'recipient_type': 'booking_attendee',
                },
                'template_type': 'booking_link_sent',
                'template_recipient': 'candidate',
            },
        ]

    def create_rule(self, rule_def, dry_run=False, force=False):
        """Create a single automation rule."""
        name = rule_def['name']

        # Check if rule already exists
        existing = AutomationRule.objects.filter(name=name).first()
        if existing and not force:
            self.stdout.write(f"  Skipping '{name}' (already exists)")
            return 'skipped'

        if existing and force:
            if not dry_run:
                existing.delete()
            self.stdout.write(f"  Deleting existing '{name}'")

        # Get content type (optional for manual/signal/view_action triggers)
        content_type = None
        trigger_model = rule_def.get('trigger_model')
        if trigger_model:
            app_label, model = trigger_model.split('.')
            try:
                content_type = ContentType.objects.get(app_label=app_label, model=model)
            except ContentType.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"  Model not found: {trigger_model}"))
                return 'error'

        # Get notification template
        template = None
        if rule_def.get('template_type'):
            template = NotificationTemplate.objects.filter(
                template_type=rule_def['template_type'],
                recipient_type=rule_def['template_recipient'],
                is_active=True,
            ).first()
            if not template:
                self.stdout.write(self.style.WARNING(
                    f"  Template not found: {rule_def['template_type']} / {rule_def['template_recipient']}"
                ))

        if dry_run:
            trigger_info = trigger_model or rule_def.get('signal_name', 'manual')
            self.stdout.write(f"  Would create: '{name}' -> {trigger_info} ({rule_def['trigger_type']})")
            return 'created'

        # Create the rule
        rule = AutomationRule.objects.create(
            name=name,
            description=rule_def.get('description', ''),
            trigger_type=rule_def['trigger_type'],
            trigger_content_type=content_type,
            trigger_conditions=rule_def.get('trigger_conditions', []),
            schedule_config=rule_def.get('schedule_config'),
            signal_name=rule_def.get('signal_name', ''),
            action_type=rule_def['action_type'],
            action_config=rule_def.get('action_config', {}),
            notification_template=template,
            is_active=False,  # Start disabled - admin must enable
        )

        self.stdout.write(self.style.SUCCESS(f"  Created: '{name}' (ID: {rule.id})"))
        return 'created'
