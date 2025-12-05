"""
Management command to seed notification templates.

Usage:
    python manage.py seed_notification_templates
    python manage.py seed_notification_templates --reset  # Reset to defaults
"""

from django.core.management.base import BaseCommand
from notifications.models import NotificationTemplate, NotificationType, NotificationChannel, RecipientType


class Command(BaseCommand):
    help = 'Seed notification templates for all notification types'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset system templates to defaults (will not affect custom templates)',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Resetting system templates to defaults...')
            # Delete non-custom templates
            deleted_count = NotificationTemplate.objects.filter(is_custom=False).delete()[0]
            self.stdout.write(f'Deleted {deleted_count} system templates')

        templates = self.get_templates()
        created_count = 0
        updated_count = 0

        for template_data in templates:
            template, created = NotificationTemplate.objects.update_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully seeded notification templates: '
                f'{created_count} created, {updated_count} updated'
            )
        )

    def get_templates(self):
        """Return the list of template definitions."""
        return [
            # =================================================================
            # Welcome / Onboarding Notifications
            # =================================================================
            {
                'name': 'Welcome - Candidate',
                'description': 'Welcome email sent to new candidate users',
                'template_type': NotificationType.WELCOME,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Welcome to {brand_name}!',
                'body_template': 'Welcome to {brand_name}! Your account is ready. Start exploring job opportunities and complete your profile to stand out to employers.',
                'email_subject_template': 'Welcome to {brand_name}!',
                'email_body_template': self._get_email_template('welcome_candidate'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Welcome - Client',
                'description': 'Welcome email sent to new client users',
                'template_type': NotificationType.WELCOME,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': 'Welcome to {brand_name}!',
                'body_template': 'Welcome to {brand_name}! Your client account has been created. You can now view job postings and track candidates for your assigned positions.',
                'email_subject_template': 'Welcome to {brand_name}!',
                'email_body_template': self._get_email_template('welcome_client'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Welcome - Recruiter',
                'description': 'Welcome email sent to new recruiter users',
                'template_type': NotificationType.WELCOME,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'Welcome to the {brand_name} Team!',
                'body_template': 'Welcome to {brand_name}! Your recruiter account is ready. You can now manage job postings, review applications, and schedule interviews.',
                'email_subject_template': 'Welcome to the {brand_name} Team!',
                'email_body_template': self._get_email_template('welcome_recruiter'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Welcome - Admin',
                'description': 'Welcome email sent to new admin users',
                'template_type': NotificationType.WELCOME,
                'recipient_type': RecipientType.COMPANY_ADMIN,
                'is_custom': False,
                'title_template': 'Welcome to {brand_name} - Admin Access',
                'body_template': 'Welcome to {brand_name}! Your admin account has been created. You have full access to manage jobs, applications, users, and system settings.',
                'email_subject_template': 'Welcome to {brand_name} - Admin Access',
                'email_body_template': self._get_email_template('welcome_admin'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },

            # =================================================================
            # Account Security Notifications
            # =================================================================
            {
                'name': 'Email Verification',
                'description': 'Sent to verify user email address',
                'template_type': NotificationType.EMAIL_VERIFICATION,
                'recipient_type': RecipientType.ALL,
                'is_custom': False,
                'title_template': 'Verify Your Email',
                'body_template': 'Please verify your email address to complete your account setup.',
                'email_subject_template': 'Verify Your Email Address',
                'email_body_template': self._get_email_template('email_verification'),
                'default_channel': NotificationChannel.EMAIL,
                'is_active': True,
            },
            {
                'name': 'Password Reset',
                'description': 'Sent when user requests password reset',
                'template_type': NotificationType.PASSWORD_RESET,
                'recipient_type': RecipientType.ALL,
                'is_custom': False,
                'title_template': 'Password Reset Request',
                'body_template': 'A password reset was requested for your account. If you did not make this request, please ignore this message.',
                'email_subject_template': 'Reset Your Password',
                'email_body_template': self._get_email_template('password_reset'),
                'default_channel': NotificationChannel.EMAIL,
                'is_active': True,
            },
            {
                'name': 'Password Changed',
                'description': 'Sent when user changes their password',
                'template_type': NotificationType.PASSWORD_CHANGED,
                'recipient_type': RecipientType.ALL,
                'is_custom': False,
                'title_template': 'Password Changed',
                'body_template': 'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
                'email_subject_template': 'Your Password Has Been Changed',
                'email_body_template': self._get_email_template('password_changed'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },

            # =================================================================
            # Invitation Notifications
            # =================================================================
            {
                'name': 'Team Member Invitation',
                'description': 'Sent to invite a new recruiter/team member',
                'template_type': NotificationType.TEAM_INVITE,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'You\'ve Been Invited to Join the Team',
                'body_template': '{inviter_name} has invited you to join the recruitment team.',
                'email_subject_template': 'You\'ve Been Invited to Join {brand_name}',
                'email_body_template': self._get_email_template('team_invite'),
                'default_channel': NotificationChannel.EMAIL,
                'is_active': True,
            },
            {
                'name': 'Client Invitation',
                'description': 'Sent to invite a new client user',
                'template_type': NotificationType.CLIENT_INVITE,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': 'You\'ve Been Invited as a Client',
                'body_template': '{inviter_name} has invited you to join as a client.',
                'email_subject_template': 'You\'ve Been Invited to {brand_name}',
                'email_body_template': self._get_email_template('client_invite'),
                'default_channel': NotificationChannel.EMAIL,
                'is_active': True,
            },
            {
                'name': 'Company Member Invitation',
                'description': 'Sent to invite someone to join a company',
                'template_type': NotificationType.COMPANY_MEMBER_INVITE,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': 'You\'ve Been Invited to Join {company_name}',
                'body_template': '{inviter_name} has invited you to join {company_name} as a {role}.',
                'email_subject_template': 'Join {company_name} on {brand_name}',
                'email_body_template': self._get_email_template('company_member_invite'),
                'default_channel': NotificationChannel.EMAIL,
                'is_active': True,
            },

            # =================================================================
            # Interview/Stage Notifications
            # =================================================================
            # Candidate templates
            {
                'name': 'Interview Scheduled (Candidate)',
                'description': 'Sent to candidate when an interview is scheduled',
                'template_type': NotificationType.STAGE_SCHEDULED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Interview Scheduled: {stage_name}',
                'body_template': 'Your {stage_name} for {job_title} at {company_name} has been scheduled for {scheduled_time}.',
                'email_subject_template': 'Interview Scheduled - {company_name}',
                'email_body_template': self._get_email_template('stage_scheduled_candidate'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Interviewer templates
            {
                'name': 'Interview Scheduled (Interviewer)',
                'description': 'Sent to interviewer when an interview is scheduled',
                'template_type': NotificationType.STAGE_SCHEDULED,
                'recipient_type': RecipientType.INTERVIEWER,
                'is_custom': False,
                'title_template': 'Interview Scheduled: {candidate_name}',
                'body_template': 'You have an interview scheduled with {candidate_name} for {job_title} on {scheduled_time}.',
                'email_subject_template': 'Interview Scheduled - {candidate_name}',
                'email_body_template': self._get_email_template('stage_scheduled_interviewer'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Reminder templates (Candidate)
            {
                'name': 'Interview Reminder (Candidate)',
                'description': 'Sent to candidate as a reminder for upcoming interview',
                'template_type': NotificationType.STAGE_REMINDER,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Interview Tomorrow: {stage_name}',
                'body_template': 'Reminder: You have {stage_name} for {job_title} tomorrow at {time}.',
                'email_subject_template': 'Interview Reminder - Tomorrow at {time}',
                'email_body_template': self._get_email_template('stage_reminder'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Reminder templates (Interviewer)
            {
                'name': 'Interview Reminder (Interviewer)',
                'description': 'Sent to interviewer as a reminder for upcoming interview',
                'template_type': NotificationType.STAGE_REMINDER,
                'recipient_type': RecipientType.INTERVIEWER,
                'is_custom': False,
                'title_template': 'Interview Tomorrow: {candidate_name}',
                'body_template': 'Reminder: You have an interview with {candidate_name} for {job_title} tomorrow at {time}.',
                'email_subject_template': 'Interview Reminder - {candidate_name} Tomorrow',
                'email_body_template': self._get_email_template('stage_reminder_interviewer'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Rescheduled templates (Candidate)
            {
                'name': 'Interview Rescheduled (Candidate)',
                'description': 'Sent to candidate when an interview is rescheduled',
                'template_type': NotificationType.STAGE_RESCHEDULED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Interview Rescheduled: {stage_name}',
                'body_template': 'Your {stage_name} for {job_title} has been rescheduled to {scheduled_time}.',
                'email_subject_template': 'Interview Rescheduled - {company_name}',
                'email_body_template': self._get_email_template('stage_rescheduled'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Rescheduled templates (Interviewer)
            {
                'name': 'Interview Rescheduled (Interviewer)',
                'description': 'Sent to interviewer when an interview is rescheduled',
                'template_type': NotificationType.STAGE_RESCHEDULED,
                'recipient_type': RecipientType.INTERVIEWER,
                'is_custom': False,
                'title_template': 'Interview Rescheduled: {candidate_name}',
                'body_template': 'Your interview with {candidate_name} for {job_title} has been rescheduled to {scheduled_time}.',
                'email_subject_template': 'Interview Rescheduled - {candidate_name}',
                'email_body_template': self._get_email_template('stage_rescheduled_interviewer'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Cancelled templates (Candidate)
            {
                'name': 'Interview Cancelled (Candidate)',
                'description': 'Sent to candidate when an interview is cancelled',
                'template_type': NotificationType.STAGE_CANCELLED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Interview Cancelled: {stage_name}',
                'body_template': 'Your {stage_name} for {job_title} has been cancelled.',
                'email_subject_template': 'Interview Cancelled - {company_name}',
                'email_body_template': self._get_email_template('stage_cancelled'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Cancelled templates (Interviewer)
            {
                'name': 'Interview Cancelled (Interviewer)',
                'description': 'Sent to interviewer when an interview is cancelled',
                'template_type': NotificationType.STAGE_CANCELLED,
                'recipient_type': RecipientType.INTERVIEWER,
                'is_custom': False,
                'title_template': 'Interview Cancelled: {candidate_name}',
                'body_template': 'Your interview with {candidate_name} for {job_title} has been cancelled.',
                'email_subject_template': 'Interview Cancelled - {candidate_name}',
                'email_body_template': self._get_email_template('stage_cancelled_interviewer'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Completed templates (Recruiter)
            {
                'name': 'Interview Completed (Recruiter)',
                'description': 'Sent to recruiter when an interview stage is completed',
                'template_type': NotificationType.STAGE_COMPLETED,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': '{stage_name} Completed: {candidate_name}',
                'body_template': '{candidate_name} has completed {stage_name} for {job_title}.',
                'email_subject_template': 'Interview Completed - {candidate_name}',
                'email_body_template': self._get_email_template('stage_completed'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Completed templates (Client)
            {
                'name': 'Interview Completed (Client)',
                'description': 'Sent to client when an interview stage is completed',
                'template_type': NotificationType.STAGE_COMPLETED,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': '{stage_name} Completed: {candidate_name}',
                'body_template': '{candidate_name} has completed {stage_name} for {job_title}.',
                'email_subject_template': 'Interview Completed - {candidate_name}',
                'email_body_template': self._get_email_template('stage_completed'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Feedback Available (Candidate)
            {
                'name': 'Feedback Available',
                'description': 'Sent to candidate when interview feedback is available',
                'template_type': NotificationType.STAGE_FEEDBACK_RECEIVED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Feedback Available: {stage_name}',
                'body_template': 'Feedback from your {stage_name} for {job_title} at {company_name} is now available.',
                'email_subject_template': 'Interview Feedback Available - {company_name}',
                'email_body_template': self._get_email_template('stage_feedback'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },

            # =================================================================
            # Booking / Self-Scheduling Notifications
            # =================================================================
            {
                'name': 'Booking Link Sent',
                'description': 'Sent to candidate with a link to self-schedule their interview',
                'template_type': NotificationType.BOOKING_LINK_SENT,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Schedule Your Interview: {stage_name}',
                'body_template': 'Please select a time for your {stage_name} for the {job_title} position at {company_name}.',
                'email_subject_template': 'Schedule Your Interview - {company_name}',
                'email_body_template': self._get_email_template('booking_link'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Booking Confirmed (Candidate)
            {
                'name': 'Booking Confirmed (Candidate)',
                'description': 'Sent to candidate when they confirm their self-scheduled interview',
                'template_type': NotificationType.BOOKING_CONFIRMED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Interview Confirmed: {stage_name}',
                'body_template': 'Your {stage_name} for {job_title} at {company_name} is confirmed for {scheduled_time}.',
                'email_subject_template': 'Interview Confirmed - {company_name}',
                'email_body_template': self._get_email_template('booking_confirmed'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Booking Confirmed (Interviewer)
            {
                'name': 'Booking Confirmed (Interviewer)',
                'description': 'Sent to interviewer when a candidate books an interview slot',
                'template_type': NotificationType.BOOKING_CONFIRMED,
                'recipient_type': RecipientType.INTERVIEWER,
                'is_custom': False,
                'title_template': 'Interview Booked: {candidate_name}',
                'body_template': '{candidate_name} has booked a {stage_name} for {job_title} on {scheduled_time}.',
                'email_subject_template': 'Interview Booked - {candidate_name}',
                'email_body_template': self._get_email_template('booking_confirmed_interviewer'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Booking Confirmed (Recruiter)
            {
                'name': 'Booking Confirmed (Recruiter)',
                'description': 'Sent to recruiter when a candidate books an interview slot',
                'template_type': NotificationType.BOOKING_CONFIRMED,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'Interview Booked: {candidate_name}',
                'body_template': '{candidate_name} has booked a {stage_name} for {job_title} on {scheduled_time}.',
                'email_subject_template': 'Interview Booked - {candidate_name}',
                'email_body_template': self._get_email_template('booking_confirmed_recruiter'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Booking Reminder - for candidates who haven't booked yet
            {
                'name': 'Booking Reminder',
                'description': 'Reminder for candidate to schedule their interview',
                'template_type': NotificationType.BOOKING_REMINDER,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Schedule Your Interview: {stage_name}',
                'body_template': "Don't forget to schedule your {stage_name} for {job_title}. Use your booking link to select a time that works for you.",
                'email_subject_template': 'Action Required: Schedule Your Interview - {company_name}',
                'email_body_template': self._get_email_template('booking_reminder'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },

            # =================================================================
            # Assessment Notifications
            # =================================================================
            {
                'name': 'Assessment Assigned',
                'description': 'Sent to candidate when an assessment is assigned',
                'template_type': NotificationType.ASSESSMENT_ASSIGNED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Assessment Assigned: {stage_name}',
                'body_template': 'You have been assigned a {stage_name} for {job_title}. Deadline: {deadline}',
                'email_subject_template': 'Assessment Assigned - {job_title}',
                'email_body_template': self._get_email_template('assessment_assigned'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Assessment Deadline Reminder',
                'description': 'Sent to candidate as a reminder for assessment deadline',
                'template_type': NotificationType.ASSESSMENT_REMINDER,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Assessment Due Tomorrow: {stage_name}',
                'body_template': 'Reminder: Your {stage_name} for {job_title} is due tomorrow.',
                'email_subject_template': 'Assessment Due Tomorrow - {job_title}',
                'email_body_template': self._get_email_template('assessment_reminder'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Assessment Submitted',
                'description': 'Sent to recruiter when candidate submits an assessment',
                'template_type': NotificationType.SUBMISSION_RECEIVED,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'Assessment Submitted: {candidate_name}',
                'body_template': '{candidate_name} has submitted their {stage_name} for {job_title}.',
                'email_subject_template': 'Assessment Submitted - {candidate_name}',
                'email_body_template': self._get_email_template('submission_received'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },

            # =================================================================
            # Application Lifecycle Notifications
            # =================================================================
            {
                'name': 'Application Received',
                'description': 'Sent to recruiter when a new application is submitted',
                'template_type': NotificationType.APPLICATION_RECEIVED,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'New Application: {candidate_name}',
                'body_template': '{candidate_name} has applied for {job_title}.',
                'email_subject_template': 'New Application - {job_title}',
                'email_body_template': self._get_email_template('application_received'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Application Shortlisted',
                'description': 'Sent to candidate when their application is shortlisted',
                'template_type': NotificationType.APPLICATION_SHORTLISTED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Application Update: {job_title}',
                'body_template': 'Great news! Your application for {job_title} at {company_name} has been shortlisted.',
                'email_subject_template': 'Application Update - {company_name}',
                'email_body_template': self._get_email_template('application_shortlisted'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # =================================================================
            # Stage-Specific Advancement Notifications
            # =================================================================
            {
                'name': 'Advanced to Application Screen',
                'description': 'Sent to candidate when their application advances to application screening',
                'template_type': NotificationType.ADVANCED_TO_APPLICATION_SCREEN,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Application Under Review: {job_title}',
                'body_template': 'Your application for {job_title} at {company_name} is now being reviewed by our team.',
                'email_subject_template': 'Application Under Review - {company_name}',
                'email_body_template': self._get_email_template('advanced_to_application_screen'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Advanced to Phone Screening',
                'description': 'Sent to candidate when they advance to phone screening',
                'template_type': NotificationType.ADVANCED_TO_PHONE_SCREENING,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Phone Screening: {job_title}',
                'body_template': 'Great news! You have been selected for a phone screening for the {job_title} position at {company_name}.',
                'email_subject_template': 'Phone Screening Invitation - {company_name}',
                'email_body_template': self._get_email_template('advanced_to_phone_screening'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Advanced to Video Interview',
                'description': 'Sent to candidate when they advance to video interview',
                'template_type': NotificationType.ADVANCED_TO_VIDEO_INTERVIEW,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Video Interview: {job_title}',
                'body_template': 'Congratulations! You have been selected for a video interview for the {job_title} position at {company_name}.',
                'email_subject_template': 'Video Interview Invitation - {company_name}',
                'email_body_template': self._get_email_template('advanced_to_video_interview'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Advanced to In-Person Interview',
                'description': 'Sent to candidate when they advance to in-person interview',
                'template_type': NotificationType.ADVANCED_TO_IN_PERSON_INTERVIEW,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'In-Person Interview: {job_title}',
                'body_template': 'Congratulations! You have been invited for an in-person interview for the {job_title} position at {company_name}.',
                'email_subject_template': 'In-Person Interview Invitation - {company_name}',
                'email_body_template': self._get_email_template('advanced_to_in_person_interview'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Advanced to Take-Home Assessment',
                'description': 'Sent to candidate when they advance to take-home assessment',
                'template_type': NotificationType.ADVANCED_TO_TAKE_HOME_ASSESSMENT,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Take-Home Assessment: {job_title}',
                'body_template': 'You have been selected to complete a take-home assessment for the {job_title} position at {company_name}.',
                'email_subject_template': 'Take-Home Assessment - {company_name}',
                'email_body_template': self._get_email_template('advanced_to_take_home_assessment'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Advanced to In-Person Assessment',
                'description': 'Sent to candidate when they advance to in-person assessment',
                'template_type': NotificationType.ADVANCED_TO_IN_PERSON_ASSESSMENT,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'In-Person Assessment: {job_title}',
                'body_template': 'You have been selected for an in-person assessment for the {job_title} position at {company_name}.',
                'email_subject_template': 'In-Person Assessment Invitation - {company_name}',
                'email_body_template': self._get_email_template('advanced_to_in_person_assessment'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Advanced to Custom Stage',
                'description': 'Sent to candidate when they advance to a custom stage',
                'template_type': NotificationType.ADVANCED_TO_CUSTOM_STAGE,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Application Update: {job_title}',
                'body_template': 'Great news! Your application for {job_title} at {company_name} has advanced to the {to_stage} stage.',
                'email_subject_template': 'Application Update - {company_name}',
                'email_body_template': self._get_email_template('advanced_to_custom_stage'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Application Rejected',
                'description': 'Sent to candidate when their application is rejected',
                'template_type': NotificationType.APPLICATION_REJECTED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Application Update: {job_title}',
                'body_template': 'Thank you for your interest in {job_title} at {company_name}. Unfortunately, we will not be moving forward with your application at this time.',
                'email_subject_template': 'Application Update - {company_name}',
                'email_body_template': self._get_email_template('application_rejected'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Application Withdrawn',
                'description': 'Sent to recruiter when a candidate withdraws their application',
                'template_type': NotificationType.APPLICATION_WITHDRAWN,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'Application Withdrawn: {candidate_name}',
                'body_template': '{candidate_name} has withdrawn their application for {job_title}.',
                'email_subject_template': 'Application Withdrawn - {candidate_name}',
                'email_body_template': self._get_email_template('application_withdrawn'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },

            # =================================================================
            # Offer Notifications
            # =================================================================
            {
                'name': 'Offer Received',
                'description': 'Sent to candidate when they receive a job offer',
                'template_type': NotificationType.OFFER_RECEIVED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Job Offer: {job_title}',
                'body_template': 'Congratulations! You have received an offer for {job_title} at {company_name}.',
                'email_subject_template': 'Job Offer - {company_name}',
                'email_body_template': self._get_email_template('offer_received'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Offer Accepted (Recruiter)
            {
                'name': 'Offer Accepted (Recruiter)',
                'description': 'Sent to recruiter when candidate accepts an offer',
                'template_type': NotificationType.OFFER_ACCEPTED,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'Offer Accepted: {candidate_name}',
                'body_template': 'Great news! {candidate_name} has accepted the offer for {job_title}.',
                'email_subject_template': 'Offer Accepted - {candidate_name}',
                'email_body_template': self._get_email_template('offer_accepted'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Offer Accepted (Client)
            {
                'name': 'Offer Accepted (Client)',
                'description': 'Sent to client when candidate accepts an offer',
                'template_type': NotificationType.OFFER_ACCEPTED,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': 'Offer Accepted: {candidate_name}',
                'body_template': 'Great news! {candidate_name} has accepted the offer for {job_title}.',
                'email_subject_template': 'Offer Accepted - {candidate_name}',
                'email_body_template': self._get_email_template('offer_accepted'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Offer Declined (Recruiter)
            {
                'name': 'Offer Declined (Recruiter)',
                'description': 'Sent to recruiter when candidate declines an offer',
                'template_type': NotificationType.OFFER_DECLINED,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'Offer Declined: {candidate_name}',
                'body_template': '{candidate_name} has declined the offer for {job_title}.',
                'email_subject_template': 'Offer Declined - {candidate_name}',
                'email_body_template': self._get_email_template('offer_declined'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Offer Declined (Client)
            {
                'name': 'Offer Declined (Client)',
                'description': 'Sent to client when candidate declines an offer',
                'template_type': NotificationType.OFFER_DECLINED,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': 'Offer Declined: {candidate_name}',
                'body_template': '{candidate_name} has declined the offer for {job_title}.',
                'email_subject_template': 'Offer Declined - {candidate_name}',
                'email_body_template': self._get_email_template('offer_declined'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },

            # =================================================================
            # Job Lifecycle Notifications
            # =================================================================
            {
                'name': 'Job Published',
                'description': 'Sent to assigned client when a job is published',
                'template_type': NotificationType.JOB_PUBLISHED,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': 'Job Published: {job_title}',
                'body_template': 'The job posting for {job_title} at {company_name} is now live and accepting applications.',
                'email_subject_template': 'Job Published - {job_title}',
                'email_body_template': self._get_email_template('job_published'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Job Closed (Client)
            {
                'name': 'Job Closed (Client)',
                'description': 'Sent to client when a job is closed',
                'template_type': NotificationType.JOB_CLOSED,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': 'Job Closed: {job_title}',
                'body_template': 'The job posting for {job_title} has been closed.',
                'email_subject_template': 'Job Closed - {job_title}',
                'email_body_template': self._get_email_template('job_closed'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Job Closed (Recruiter)
            {
                'name': 'Job Closed (Recruiter)',
                'description': 'Sent to recruiter when a job is closed',
                'template_type': NotificationType.JOB_CLOSED,
                'recipient_type': RecipientType.RECRUITER,
                'is_custom': False,
                'title_template': 'Job Closed: {job_title}',
                'body_template': 'The job posting for {job_title} has been closed.',
                'email_subject_template': 'Job Closed - {job_title}',
                'email_body_template': self._get_email_template('job_closed'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            {
                'name': 'Job Filled',
                'description': 'Sent to client when a job position is filled',
                'template_type': NotificationType.JOB_FILLED,
                'recipient_type': RecipientType.CLIENT,
                'is_custom': False,
                'title_template': 'Position Filled: {job_title}',
                'body_template': 'Great news! The {job_title} position has been filled.',
                'email_subject_template': 'Job Filled - {job_title}',
                'email_body_template': self._get_email_template('job_filled'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
            # Job Updated - notify active candidates
            {
                'name': 'Job Updated',
                'description': 'Sent to active candidates when job details are updated',
                'template_type': NotificationType.JOB_UPDATED,
                'recipient_type': RecipientType.CANDIDATE,
                'is_custom': False,
                'title_template': 'Job Updated: {job_title}',
                'body_template': 'The {job_title} position at {company_name} has been updated. Please review the latest job details.',
                'email_subject_template': 'Job Update - {job_title}',
                'email_body_template': self._get_email_template('job_updated'),
                'default_channel': NotificationChannel.IN_APP,
                'is_active': True,
            },

            # =================================================================
            # Admin/Custom Notifications
            # =================================================================
            {
                'name': 'Admin Broadcast',
                'description': 'Template for admin broadcast messages',
                'template_type': NotificationType.ADMIN_BROADCAST,
                'recipient_type': RecipientType.ALL,
                'is_custom': False,
                'title_template': '{title}',
                'body_template': '{body}',
                'email_subject_template': '{title}',
                'email_body_template': self._get_email_template('admin_broadcast'),
                'default_channel': NotificationChannel.BOTH,
                'is_active': True,
            },
        ]

    def _get_email_template(self, template_name):
        """Get the HTML email template content."""
        templates = {
            'stage_scheduled_candidate': '''
<p>Hi {first_name},</p>
<p>Great news! Your <strong>{stage_name}</strong> for the <strong>{job_title}</strong> position at <strong>{company_name}</strong> has been scheduled.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Date & Time:</strong> {scheduled_time}</p>
    <p style="margin: 8px 0 0;"><strong>Duration:</strong> {duration} minutes</p>
</div>
<p>Please make sure to be ready 5 minutes before the scheduled time.</p>
<p>Good luck!</p>
''',
            'stage_scheduled_interviewer': '''
<p>Hi,</p>
<p>You have an upcoming interview with <strong>{candidate_name}</strong> for the <strong>{job_title}</strong> position.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Date & Time:</strong> {scheduled_time}</p>
    <p style="margin: 8px 0 0;"><strong>Duration:</strong> {duration} minutes</p>
</div>
''',
            'stage_reminder': '''
<p>Hi {first_name},</p>
<p>This is a friendly reminder that you have an interview <strong>tomorrow</strong>.</p>
<div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0;"><strong>{stage_name}</strong></p>
    <p style="margin: 8px 0 0;"><strong>Time:</strong> {time}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title} at {company_name}</p>
</div>
<p>Good luck with your interview!</p>
''',
            'stage_reminder_interviewer': '''
<p>Hi,</p>
<p>This is a friendly reminder that you have an interview <strong>tomorrow</strong>.</p>
<div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Time:</strong> {time}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title}</p>
</div>
''',
            'stage_rescheduled': '''
<p>Hi {first_name},</p>
<p>Your <strong>{stage_name}</strong> for the <strong>{job_title}</strong> position has been rescheduled.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>New Date & Time:</strong> {scheduled_time}</p>
</div>
<p>Please update your calendar accordingly. We apologize for any inconvenience.</p>
''',
            'stage_rescheduled_interviewer': '''
<p>Hi,</p>
<p>Your interview with <strong>{candidate_name}</strong> for the <strong>{job_title}</strong> position has been rescheduled.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>New Date & Time:</strong> {scheduled_time}</p>
</div>
<p>Please update your calendar accordingly.</p>
''',
            'stage_cancelled': '''
<p>Hi {first_name},</p>
<p>We regret to inform you that your <strong>{stage_name}</strong> for the <strong>{job_title}</strong> position has been cancelled.</p>
<p>If you have any questions, please don't hesitate to reach out.</p>
''',
            'stage_cancelled_interviewer': '''
<p>Hi,</p>
<p>The interview with <strong>{candidate_name}</strong> for the <strong>{job_title}</strong> position has been cancelled.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title}</p>
</div>
<p>This time is now available on your calendar.</p>
''',
            'assessment_assigned': '''
<p>Hi {first_name},</p>
<p>As part of your application for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>, you have been assigned an assessment to complete.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Assessment:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Deadline:</strong> {deadline}</p>
</div>
<p>Please complete the assessment before the deadline. Good luck!</p>
''',
            'assessment_reminder': '''
<p>Hi {first_name},</p>
<p>This is a friendly reminder that your assessment is due <strong>tomorrow</strong>.</p>
<div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0;"><strong>Assessment:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title}</p>
    <p style="margin: 8px 0 0;"><strong>Deadline:</strong> {deadline}</p>
</div>
<p>Please make sure to submit your assessment before the deadline.</p>
''',
            'submission_received': '''
<p>Hi,</p>
<p><strong>{candidate_name}</strong> has submitted their assessment.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Assessment:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title}</p>
</div>
''',
            'application_received': '''
<p>Hi,</p>
<p>You have received a new application for the <strong>{job_title}</strong> position.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title}</p>
</div>
<p>Review the application to see if this candidate is a good fit for the role.</p>
''',
            'application_shortlisted': '''
<p>Hi {first_name},</p>
<p>Great news! Your application for the <strong>{job_title}</strong> position at <strong>{company_name}</strong> has been <strong>shortlisted</strong>.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724;">You've made it to the next round! The hiring team was impressed with your profile.</p>
</div>
<p>We'll be in touch soon with next steps.</p>
''',
            'application_rejected': '''
<p>Hi {first_name},</p>
<p>Thank you for your interest in the <strong>{job_title}</strong> position at <strong>{company_name}</strong> and for taking the time to apply.</p>
<p>After careful consideration, we have decided not to move forward with your application at this time.</p>
<p>We encourage you to keep an eye on our careers page for future opportunities.</p>
<p>We wish you the best in your job search!</p>
''',
            'offer_received': '''
<p>Hi {first_name},</p>
<p>We are thrilled to inform you that you have been selected for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>!</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; font-size: 18px; color: #155724;"><strong>We would like to offer you this position!</strong></p>
</div>
<p>Please review the offer details and let us know your decision.</p>
<p>We look forward to welcoming you to the team!</p>
''',
            'booking_link': '''
<p>Hi {first_name},</p>
<p>You've been invited to schedule your <strong>{stage_name}</strong> for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Interview:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Duration:</strong> {duration} minutes</p>
</div>
<p>Please click the button below to choose a time that works best for you.</p>
<p style="color: #666; font-size: 14px;">This link will expire after you book your slot or after 7 days.</p>
''',
            'booking_confirmed': '''
<p>Hi {first_name},</p>
<p>Your interview has been confirmed!</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724;"><strong>Interview Confirmed</strong></p>
</div>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Interview:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Date & Time:</strong> {scheduled_time}</p>
    <p style="margin: 8px 0 0;"><strong>Duration:</strong> {duration} minutes</p>
</div>
<p>Please add this to your calendar. We look forward to speaking with you!</p>
''',
            'booking_confirmed_interviewer': '''
<p>Hi,</p>
<p>A candidate has booked an interview slot with you!</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724;"><strong>Interview Booked</strong></p>
</div>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Interview:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Date & Time:</strong> {scheduled_time}</p>
    <p style="margin: 8px 0 0;"><strong>Duration:</strong> {duration} minutes</p>
</div>
<p>Please ensure you are available at this time.</p>
''',
            'booking_confirmed_recruiter': '''
<p>Hi,</p>
<p>A candidate has booked an interview slot.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724;"><strong>Interview Booked</strong></p>
</div>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Interview:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title}</p>
    <p style="margin: 8px 0 0;"><strong>Date & Time:</strong> {scheduled_time}</p>
</div>
''',
            'booking_reminder': '''
<p>Hi {first_name},</p>
<p>This is a friendly reminder to <strong>schedule your interview</strong> for the position below.</p>
<div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0;"><strong>Interview Type:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title} at {company_name}</p>
</div>
<p>Please use the booking link you received to select a time that works for you. If you've lost the link, please contact the recruiter.</p>
''',
            'stage_completed': '''
<p>Hi,</p>
<p><strong>{candidate_name}</strong> has completed their <strong>{stage_name}</strong> for the <strong>{job_title}</strong> position.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Stage:</strong> {stage_name}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title}</p>
</div>
<p>Review the candidate's performance and provide feedback.</p>
''',
            'stage_feedback': '''
<p>Hi {first_name},</p>
<p>Feedback from your <strong>{stage_name}</strong> for the <strong>{job_title}</strong> position is now available.</p>
<p>Click the button below to view the feedback.</p>
''',
            'admin_broadcast': '''
<p>Hi {first_name},</p>
<div style="margin: 16px 0;">
    {body}
</div>
''',
            # Welcome templates
            'welcome_candidate': '''
<p>Hi {first_name},</p>
<p>Welcome to {brand_name}! We're thrilled to have you join our community of talented professionals.</p>
<p>Here are a few things you can do to get started:</p>
<ul>
    <li>Complete your profile to stand out to employers</li>
    <li>Browse job opportunities that match your skills</li>
    <li>Set up job alerts to stay updated on new openings</li>
</ul>
<p>If you have any questions, feel free to reach out. We're here to help!</p>
''',
            'welcome_client': '''
<p>Hi {first_name},</p>
<p>Welcome to {brand_name}! Your client account has been created and you're ready to go.</p>
<p>As a client, you can:</p>
<ul>
    <li>View job postings assigned to you</li>
    <li>Track candidates through the hiring process</li>
    <li>Receive updates on interview schedules and outcomes</li>
</ul>
<p>If you have any questions, please don't hesitate to reach out to your account manager.</p>
''',
            'welcome_recruiter': '''
<p>Hi {first_name},</p>
<p>Welcome to the {brand_name} team! Your recruiter account is set up and ready.</p>
<p>You now have access to:</p>
<ul>
    <li>Create and manage job postings</li>
    <li>Review and process applications</li>
    <li>Schedule interviews and manage the hiring pipeline</li>
    <li>Communicate with candidates</li>
</ul>
<p>Get started by creating your first job posting or reviewing incoming applications.</p>
''',
            'welcome_admin': '''
<p>Hi {first_name},</p>
<p>Welcome to {brand_name}! You have been granted administrator access.</p>
<p>As an admin, you have full access to:</p>
<ul>
    <li>Manage all jobs, applications, and users</li>
    <li>Configure system settings and branding</li>
    <li>View analytics and reports</li>
    <li>Manage notification templates and broadcasts</li>
</ul>
<p>Please use these privileges responsibly. If you have any questions, reach out to the support team.</p>
''',
            # Stage-Specific Advancement Email Templates
            'advanced_to_application_screen': '''
<p>Hi {first_name},</p>
<p>Thank you for applying for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>.</p>
<div style="background: #e7f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #007bff;">
    <p style="margin: 0; color: #004085;"><strong>Your application is now under review</strong></p>
</div>
<p>Our team is carefully reviewing your qualifications and experience. We'll be in touch soon with an update on your application status.</p>
<p>Thank you for your interest in joining our team!</p>
''',
            'advanced_to_phone_screening': '''
<p>Hi {first_name},</p>
<p>Great news! Based on your application for <strong>{job_title}</strong> at <strong>{company_name}</strong>, we'd like to move forward with a phone screening.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724; font-size: 16px;"><strong>Phone Screening</strong></p>
</div>
<p><strong>What to expect:</strong></p>
<ul>
    <li>A brief conversation to learn more about your background and experience</li>
    <li>An opportunity to ask questions about the role and company</li>
    <li>Discussion about your availability and salary expectations</li>
</ul>
<p>We'll be in touch shortly to schedule a convenient time for the call.</p>
<p>Congratulations on advancing to this stage!</p>
''',
            'advanced_to_video_interview': '''
<p>Hi {first_name},</p>
<p>Congratulations! We're excited to invite you to a video interview for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724; font-size: 16px;"><strong>Video Interview</strong></p>
</div>
<p><strong>What to expect:</strong></p>
<ul>
    <li>A video call with our hiring team</li>
    <li>In-depth discussion about your skills and experience</li>
    <li>Opportunity to learn more about the role and team</li>
</ul>
<p><strong>Tips for success:</strong></p>
<ul>
    <li>Ensure you have a stable internet connection</li>
    <li>Find a quiet, well-lit space</li>
    <li>Test your camera and microphone beforehand</li>
</ul>
<p>We'll send you scheduling details shortly. Looking forward to meeting you!</p>
''',
            'advanced_to_in_person_interview': '''
<p>Hi {first_name},</p>
<p>Congratulations! We're thrilled to invite you for an in-person interview for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724; font-size: 16px;"><strong>In-Person Interview</strong></p>
</div>
<p><strong>What to expect:</strong></p>
<ul>
    <li>Face-to-face meetings with the hiring team</li>
    <li>Tour of the office and facilities</li>
    <li>Opportunity to meet potential colleagues</li>
    <li>Deep dive into your experience and the role</li>
</ul>
<p>We'll send you the interview details including location, time, and what to bring shortly.</p>
<p>We're excited to meet you in person!</p>
''',
            'advanced_to_take_home_assessment': '''
<p>Hi {first_name},</p>
<p>Congratulations on progressing to the next stage! For the <strong>{job_title}</strong> position at <strong>{company_name}</strong>, we'd like you to complete a take-home assessment.</p>
<div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0; color: #856404; font-size: 16px;"><strong>Take-Home Assessment</strong></p>
</div>
<p><strong>What to expect:</strong></p>
<ul>
    <li>A practical exercise relevant to the role</li>
    <li>Flexible timing to complete at your convenience</li>
    <li>Opportunity to showcase your skills and problem-solving approach</li>
</ul>
<p>We'll send you the assessment details including instructions and deadline shortly.</p>
<p>Good luck!</p>
''',
            'advanced_to_in_person_assessment': '''
<p>Hi {first_name},</p>
<p>Congratulations! We're excited to invite you for an in-person assessment for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>.</p>
<div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0; color: #856404; font-size: 16px;"><strong>In-Person Assessment</strong></p>
</div>
<p><strong>What to expect:</strong></p>
<ul>
    <li>A hands-on assessment at our office</li>
    <li>Practical exercises relevant to the role</li>
    <li>Opportunity to demonstrate your skills in person</li>
</ul>
<p>We'll send you the assessment details including location, time, and what to prepare shortly.</p>
<p>Looking forward to seeing you!</p>
''',
            'advanced_to_custom_stage': '''
<p>Hi {first_name},</p>
<p>Great news! Your application for the <strong>{job_title}</strong> position at <strong>{company_name}</strong> has advanced to the next stage.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724; font-size: 16px;"><strong>Next Stage: {to_stage}</strong></p>
</div>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Position:</strong> {job_title}</p>
    <p style="margin: 8px 0 0;"><strong>Company:</strong> {company_name}</p>
</div>
<p>We'll be in touch soon with more details about what to expect in this stage.</p>
<p>Congratulations on making it this far!</p>
''',
            'application_withdrawn': '''
<p>Hi,</p>
<p><strong>{candidate_name}</strong> has withdrawn their application for the <strong>{job_title}</strong> position.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Candidate:</strong> {candidate_name}</p>
    <p style="margin: 8px 0 0;"><strong>Position:</strong> {job_title}</p>
</div>
''',
            # Offer templates
            'offer_accepted': '''
<p>Hi,</p>
<p>Great news! <strong>{candidate_name}</strong> has accepted the offer for the <strong>{job_title}</strong> position.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724; font-size: 18px;"><strong>Offer Accepted!</strong></p>
</div>
<p>Please proceed with onboarding preparations.</p>
''',
            'offer_declined': '''
<p>Hi,</p>
<p><strong>{candidate_name}</strong> has declined the offer for the <strong>{job_title}</strong> position.</p>
<div style="background: #f8d7da; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc3545;">
    <p style="margin: 0; color: #721c24;">The candidate has decided not to accept this offer.</p>
</div>
<p>Consider reaching out to backup candidates or reopening the position.</p>
''',
            # Job lifecycle templates
            'job_published': '''
<p>Hi,</p>
<p>The job posting for <strong>{job_title}</strong> at <strong>{company_name}</strong> is now live!</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724;">The position is now accepting applications.</p>
</div>
<p>You can view the posting and track applications through your dashboard.</p>
''',
            'job_closed': '''
<p>Hi,</p>
<p>The job posting for <strong>{job_title}</strong> has been closed.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Position:</strong> {job_title}</p>
    <p style="margin: 8px 0 0;"><strong>Status:</strong> Closed</p>
</div>
<p>The position is no longer accepting new applications.</p>
''',
            'job_filled': '''
<p>Hi,</p>
<p>Great news! The <strong>{job_title}</strong> position has been filled.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724; font-size: 18px;"><strong>Position Filled!</strong></p>
</div>
<p>Thank you for your involvement in the hiring process.</p>
''',
            'job_updated': '''
<p>Hi {first_name},</p>
<p>The <strong>{job_title}</strong> position at <strong>{company_name}</strong> that you applied for has been updated.</p>
<div style="background: #e7f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #0066cc;">
    <p style="margin: 0;"><strong>Position:</strong> {job_title}</p>
    <p style="margin: 8px 0 0;"><strong>Company:</strong> {company_name}</p>
</div>
<p>Please review the updated job details to stay informed about any changes to the role requirements or responsibilities.</p>
''',
            # Account Security Email Templates
            'email_verification': '''
<p>Hi {first_name},</p>
<p>Thank you for registering! Please verify your email address by clicking the button below.</p>
<div style="text-align: center; margin: 24px 0;">
    <a href="{verification_url}" style="background: #007bff; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Verify Email Address</a>
</div>
<p style="color: #666; font-size: 14px;">If you did not create an account, you can safely ignore this email.</p>
<p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
''',
            'password_reset': '''
<p>Hi {first_name},</p>
<p>We received a request to reset the password for your account.</p>
<div style="text-align: center; margin: 24px 0;">
    <a href="{reset_url}" style="background: #007bff; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Reset Password</a>
</div>
<p style="color: #666; font-size: 14px;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
<p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
''',
            'password_changed': '''
<p>Hi {first_name},</p>
<p>This is a confirmation that your password has been successfully changed.</p>
<div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
    <p style="margin: 0; color: #155724;"><strong>Password Changed Successfully</strong></p>
</div>
<p style="color: #dc3545;"><strong>If you did not make this change, please contact our support team immediately and reset your password.</strong></p>
''',
            # Invitation Email Templates
            'team_invite': '''
<p>Hi,</p>
<p><strong>{inviter_name}</strong> has invited you to join the recruitment team.</p>
<div style="background: #e7f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #007bff;">
    <p style="margin: 0; color: #004085;">You've been invited to join as a <strong>Recruiter</strong></p>
</div>
<p>As a recruiter, you'll be able to:</p>
<ul>
    <li>Create and manage job postings</li>
    <li>Review and process applications</li>
    <li>Schedule interviews and manage the hiring pipeline</li>
</ul>
<div style="text-align: center; margin: 24px 0;">
    <a href="{signup_url}" style="background: #007bff; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Accept Invitation</a>
</div>
<p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
''',
            'client_invite': '''
<p>Hi,</p>
<p><strong>{inviter_name}</strong> has invited you to join as a client.</p>
<div style="background: #e7f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #007bff;">
    <p style="margin: 0; color: #004085;">You've been invited to join as a <strong>Client</strong></p>
</div>
<p>As a client, you'll be able to:</p>
<ul>
    <li>View job postings assigned to you</li>
    <li>Track candidates through the hiring process</li>
    <li>Receive updates on interview schedules and outcomes</li>
</ul>
<div style="text-align: center; margin: 24px 0;">
    <a href="{signup_url}" style="background: #007bff; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Accept Invitation</a>
</div>
<p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
''',
            'company_member_invite': '''
<p>Hi,</p>
<p><strong>{inviter_name}</strong> has invited you to join <strong>{company_name}</strong>.</p>
<div style="background: #e7f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #007bff;">
    <p style="margin: 0; color: #004085;">You've been invited to join as a <strong>{role}</strong></p>
</div>
<p>By joining {company_name}, you'll be able to:</p>
<ul>
    <li>View and manage company job postings</li>
    <li>Collaborate with your team on hiring</li>
    <li>Track candidates and interview schedules</li>
</ul>
<div style="text-align: center; margin: 24px 0;">
    <a href="{signup_url}" style="background: #007bff; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Accept Invitation</a>
</div>
<p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
''',
        }
        return templates.get(template_name, '')
