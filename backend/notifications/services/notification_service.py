"""
Notification service for the interview stages system.

This service handles:
- Creating in-app notifications from CMS templates
- Sending notification emails using templates
- Scheduling reminder notifications
- Auto-determining recipients based on template configuration

All notification content AND recipient routing is driven by NotificationTemplate
records in the database. Admins can control who receives what notifications
by enabling/disabling templates for specific recipient types.
"""

import logging
from django.conf import settings
from django.core.mail import EmailMessage
from django.template import Template, Context
from django.utils import timezone
from django.utils.html import strip_tags
from datetime import timedelta
from typing import Optional, Dict, Any, List, Union

from notifications.models import (
    Notification,
    NotificationType,
    NotificationTemplate,
    NotificationChannel,
    RecipientType,
)
from jobs.models import (
    Application,
    ApplicationStageInstance,
    StageInstanceStatus,
    StageType,
)
from companies.models import CompanyUserRole
from branding.models import BrandingSettings

logger = logging.getLogger(__name__)


class TemplateNotFoundError(Exception):
    """Raised when a required notification template is not found."""
    pass


# Mapping from StageType to NotificationType for stage advancement notifications
STAGE_TYPE_TO_NOTIFICATION_TYPE = {
    StageType.APPLICATION_SCREEN: NotificationType.ADVANCED_TO_APPLICATION_SCREEN,
    StageType.PHONE_SCREENING: NotificationType.ADVANCED_TO_PHONE_SCREENING,
    StageType.VIDEO_CALL: NotificationType.ADVANCED_TO_VIDEO_INTERVIEW,
    StageType.IN_PERSON_INTERVIEW: NotificationType.ADVANCED_TO_IN_PERSON_INTERVIEW,
    StageType.TAKE_HOME_ASSESSMENT: NotificationType.ADVANCED_TO_TAKE_HOME_ASSESSMENT,
    StageType.IN_PERSON_ASSESSMENT: NotificationType.ADVANCED_TO_IN_PERSON_ASSESSMENT,
    StageType.CUSTOM: NotificationType.ADVANCED_TO_CUSTOM_STAGE,
}


class NotificationService:
    """
    Service for creating and sending notifications.

    All notification content AND recipient routing is driven by templates stored
    in the database. Templates are managed through the Notification CMS.

    Admins can control who receives what notifications by enabling/disabling
    templates for specific recipient types.
    """

    # =========================================================================
    # Core auto-routing notification methods
    # =========================================================================

    @classmethod
    def get_templates_for_type(
        cls,
        notification_type: NotificationType,
    ) -> List[NotificationTemplate]:
        """
        Get all active notification templates for a given type.

        Returns templates for all recipient types that are configured.
        """
        return list(NotificationTemplate.objects.filter(
            template_type=notification_type,
            is_active=True,
        ))

    @classmethod
    def get_template(
        cls,
        notification_type: NotificationType,
        recipient_type: RecipientType = RecipientType.CANDIDATE,
    ) -> Optional[NotificationTemplate]:
        """
        Get the active notification template for a given type and recipient.
        """
        return NotificationTemplate.objects.filter(
            template_type=notification_type,
            recipient_type=recipient_type,
            is_active=True,
        ).first()

    @classmethod
    def resolve_recipients(
        cls,
        recipient_type: RecipientType,
        application: Optional[Application] = None,
        stage_instance: Optional[ApplicationStageInstance] = None,
        job=None,
    ) -> List[Any]:
        """
        Resolve the actual user(s) to notify based on recipient type and context.

        Args:
            recipient_type: The type of recipient (CANDIDATE, INTERVIEWER, etc.)
            application: The related application (if any)
            stage_instance: The related stage instance (if any)
            job: The related job (if any)

        Returns:
            List of User objects to notify (may be empty)
        """
        # Get job from application if not provided
        if not job and application:
            job = application.job
        if not job and stage_instance:
            job = stage_instance.application.job

        # Get application from stage_instance if not provided
        if not application and stage_instance:
            application = stage_instance.application

        if recipient_type == RecipientType.CANDIDATE:
            if application:
                return [application.candidate.user]
            return []

        elif recipient_type == RecipientType.INTERVIEWER:
            if stage_instance and stage_instance.interviewer:
                return [stage_instance.interviewer]
            return []

        elif recipient_type == RecipientType.RECRUITER:
            if job:
                # assigned_recruiters is a ManyToMany field
                recruiters = list(job.assigned_recruiters.all())
                if recruiters:
                    return recruiters
                # Fall back to created_by if no assigned recruiters
                return [job.created_by] if job.created_by else []
            return []

        elif recipient_type == RecipientType.CLIENT:
            if job and job.assigned_client:
                return [job.assigned_client]
            return []

        elif recipient_type == RecipientType.COMPANY_ADMIN:
            if job and job.company:
                return [cu.user for cu in job.company.members.filter(
                    role=CompanyUserRole.ADMIN,
                    is_active=True
                ).select_related('user')]
            return []

        elif recipient_type == RecipientType.COMPANY_EDITOR:
            if job and job.company:
                return [cu.user for cu in job.company.members.filter(
                    role=CompanyUserRole.EDITOR,
                    is_active=True
                ).select_related('user')]
            return []

        elif recipient_type == RecipientType.COMPANY_VIEWER:
            if job and job.company:
                return [cu.user for cu in job.company.members.filter(
                    role=CompanyUserRole.VIEWER,
                    is_active=True
                ).select_related('user')]
            return []

        elif recipient_type == RecipientType.COMPANY_TEAM:
            if job and job.company:
                return [cu.user for cu in job.company.members.filter(
                    is_active=True
                ).select_related('user')]
            return []

        elif recipient_type == RecipientType.ALL:
            # ALL is for broadcasts - not resolved from context
            return []

        return []

    @classmethod
    def resolve_recipient(
        cls,
        recipient_type: RecipientType,
        application: Optional[Application] = None,
        stage_instance: Optional[ApplicationStageInstance] = None,
        job=None,
    ) -> Optional[Any]:
        """
        Legacy method - resolve a single recipient.
        Use resolve_recipients() for new code.
        """
        recipients = cls.resolve_recipients(recipient_type, application, stage_instance, job)
        return recipients[0] if recipients else None

    @classmethod
    def get_action_url_for_recipient(
        cls,
        recipient_type: RecipientType,
        application: Optional[Application] = None,
        stage_instance: Optional[ApplicationStageInstance] = None,
        job=None,
    ) -> str:
        """
        Get the appropriate action URL based on recipient type.
        URLs must match actual frontend routes.
        """
        if not job and application:
            job = application.job
        if not application and stage_instance:
            application = stage_instance.application

        if recipient_type == RecipientType.CANDIDATE:
            # Candidates view their applications at /dashboard/my-applications
            if application:
                return f"/dashboard/my-applications?application={application.id}"
            return "/dashboard/my-applications"

        # All non-candidate types get dashboard links
        elif recipient_type in [
            RecipientType.INTERVIEWER,
            RecipientType.RECRUITER,
            RecipientType.CLIENT,
            RecipientType.COMPANY_ADMIN,
            RecipientType.COMPANY_EDITOR,
            RecipientType.COMPANY_VIEWER,
            RecipientType.COMPANY_TEAM,
        ]:
            # Staff/clients view applications at /dashboard/applications
            if application:
                return f"/dashboard/applications?application={application.id}"
            elif job:
                return f"/dashboard/admin/jobs"
            return "/dashboard/applications"

        return "/dashboard"

    @classmethod
    def send_notifications(
        cls,
        notification_type: NotificationType,
        context: Dict[str, Any],
        application: Optional[Application] = None,
        stage_instance: Optional[ApplicationStageInstance] = None,
        job=None,
        send_email: bool = True,
    ) -> List[Notification]:
        """
        Send notifications to all configured recipients for a notification type.

        This is the main entry point. It:
        1. Looks up all active templates for the notification type
        2. For each template, resolves the recipient(s) based on recipient_type
        3. Sends the notification using that template to all resolved recipients

        Args:
            notification_type: Type of notification to send
            context: Variables to substitute in templates
            application: Related application (for recipient resolution)
            stage_instance: Related stage instance (for recipient resolution)
            job: Related job (for recipient resolution)
            send_email: Whether to send emails

        Returns:
            List of created Notification objects
        """
        templates = cls.get_templates_for_type(notification_type)

        if not templates:
            logger.warning(f"No active templates found for notification type '{notification_type}'")
            return []

        # Get job from context if not provided
        if not job:
            job = context.get('job')

        notifications = []
        sent_to_users = set()  # Track to avoid duplicate notifications

        for template in templates:
            # Resolve recipients for this template's recipient_type (may be multiple)
            recipients = cls.resolve_recipients(
                recipient_type=template.recipient_type,
                application=application,
                stage_instance=stage_instance,
                job=job,
            )

            if not recipients:
                logger.debug(
                    f"Could not resolve recipients for {notification_type} "
                    f"with recipient_type={template.recipient_type}"
                )
                continue

            # Get action URL for this recipient type
            action_url = cls.get_action_url_for_recipient(
                recipient_type=template.recipient_type,
                application=application,
                stage_instance=stage_instance,
                job=job,
            )

            # Send to each recipient
            for recipient in recipients:
                # Skip if we already sent to this user (avoid duplicates)
                if recipient.id in sent_to_users:
                    continue
                sent_to_users.add(recipient.id)

                try:
                    notification = cls._send_single_notification(
                        recipient=recipient,
                        template=template,
                        context=context,
                        application=application,
                        stage_instance=stage_instance,
                        action_url=action_url,
                        send_email=send_email,
                    )
                    notifications.append(notification)
                except Exception as e:
                    logger.error(
                        f"Failed to send {notification_type} to {recipient.email}: {e}"
                    )

        return notifications

    @classmethod
    def _send_single_notification(
        cls,
        recipient,
        template: NotificationTemplate,
        context: Dict[str, Any],
        application: Optional[Application] = None,
        stage_instance: Optional[ApplicationStageInstance] = None,
        action_url: str = "",
        send_email: bool = True,
    ) -> Notification:
        """
        Send a single notification using a specific template.

        Internal method - use send_notifications() for auto-routing.
        """
        # Add common context variables
        branding = BrandingSettings.get_settings()
        full_context = {
            "brand_name": branding.company_name or "Oneo",
            "site_url": getattr(settings, 'SITE_URL', 'http://localhost:3000'),
            "recipient_name": recipient.get_full_name() or recipient.email,
            "first_name": recipient.first_name or recipient.email.split('@')[0],
            "recipient_email": recipient.email,
            **context,
        }

        # Add company context if available
        company_context = cls._get_company_context(
            application=application,
            job=context.get('job')
        )
        full_context.update(company_context)

        # Render the template
        try:
            rendered = template.render(full_context)
        except KeyError as e:
            logger.error(
                f"Template render error for {template.template_type}: "
                f"missing variable {e}"
            )
            raise

        # Create the notification
        notification = Notification.objects.create(
            recipient=recipient,
            notification_type=template.template_type,
            channel=template.default_channel,
            title=rendered['title'],
            body=rendered['body'],
            application=application,
            stage_instance=stage_instance,
            action_url=action_url,
            sent_at=timezone.now(),
        )

        # Send email if configured
        should_send_email = (
            send_email and
            recipient.email and
            template.default_channel in [NotificationChannel.EMAIL, NotificationChannel.BOTH]
        )

        if should_send_email:
            cls._send_notification_email(
                notification=notification,
                template=template,
                rendered=rendered,
                context=full_context,
            )

        return notification

    @classmethod
    def send_notification(
        cls,
        recipient,
        notification_type: NotificationType,
        context: Dict[str, Any],
        recipient_type: RecipientType = RecipientType.CANDIDATE,
        application: Optional[Application] = None,
        stage_instance: Optional[ApplicationStageInstance] = None,
        action_url: str = "",
        send_email: bool = True,
    ) -> Notification:
        """
        Send a notification to a specific recipient using a specific template.

        Use this when you need to explicitly control the recipient.
        For auto-routing based on templates, use send_notifications() instead.
        """
        template = cls.get_template(notification_type, recipient_type)

        if not template:
            error_msg = (
                f"No active template found for notification type "
                f"'{notification_type}' and recipient type '{recipient_type}'"
            )
            logger.error(error_msg)
            raise TemplateNotFoundError(error_msg)

        return cls._send_single_notification(
            recipient=recipient,
            template=template,
            context=context,
            application=application,
            stage_instance=stage_instance,
            action_url=action_url,
            send_email=send_email,
        )

    @classmethod
    def _get_company_context(cls, application=None, job=None) -> Dict[str, Any]:
        """Build company context for templates."""
        company = None
        if application and hasattr(application, 'job'):
            company = application.job.company
        elif job and hasattr(job, 'company'):
            company = job.company

        if not company:
            return {}

        return {
            "company": {
                "name": company.name,
                "logo_url": company.logo.url if company.logo else None,
                "website_url": company.website_url,
                "tagline": getattr(company, 'tagline', ''),
                "industry": company.industry.name if company.industry else '',
            },
            "company_name": company.name,
            "company_logo_url": company.logo.url if company.logo else None,
        }

    @classmethod
    def _send_notification_email(
        cls,
        notification: Notification,
        template: NotificationTemplate,
        rendered: Dict[str, str],
        context: Dict[str, Any],
    ) -> bool:
        """Send an email for a notification using templates."""
        try:
            # Get branding settings for base template
            branding = BrandingSettings.get_settings()
            branding_context = branding.get_email_context()

            # Build full email context
            email_context = {
                **context,
                **branding_context,
                "notification": notification,
            }

            # Get the email content from the template
            email_body_html = rendered.get('email_body') or rendered['body']
            email_subject = rendered.get('email_subject') or rendered['title']

            # Build action URL
            site_url = email_context.get('site_url', '')
            action_url = notification.action_url or ''
            full_action_url = f"{site_url}{action_url}" if action_url and not action_url.startswith('http') else action_url

            # Wrap email content with title and action button
            email_content = f'''
<h1>{rendered['title']}</h1>
{email_body_html}
{f'<p><a href="{full_action_url}" class="button">View Details</a></p>' if full_action_url else ''}
'''

            # Get the base template from branding
            base_template = branding.get_email_template()

            # Render the full email
            full_context = {**email_context, 'email_content': email_content}
            django_template = Template(base_template)
            html_content = django_template.render(Context(full_context))

            text_content = strip_tags(html_content)

            # Build CC and Reply-To from settings
            cc = []
            reply_to = []
            if hasattr(settings, 'EMAIL_CC') and settings.EMAIL_CC:
                cc = [addr.strip() for addr in settings.EMAIL_CC.split(',') if addr.strip()]
            if hasattr(settings, 'EMAIL_REPLY_TO') and settings.EMAIL_REPLY_TO:
                reply_to = [settings.EMAIL_REPLY_TO.strip()]

            # Send email using EmailMessage for CC/Reply-To support
            email = EmailMessage(
                subject=email_subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[notification.recipient.email],
                cc=cc,
                reply_to=reply_to,
            )
            email.content_subtype = 'html'
            email.body = html_content
            email.send(fail_silently=False)

            # Mark email as sent
            notification.email_sent = True
            notification.email_sent_at = timezone.now()
            notification.save(update_fields=['email_sent', 'email_sent_at'])

            return True

        except Exception as e:
            notification.email_error = str(e)
            notification.save(update_fields=['email_error'])
            logger.error(f"Error sending notification email: {e}")
            return False

    @classmethod
    def _send_email(
        cls,
        to_email: str,
        subject: str,
        body: str,
        action_url: str = None,
    ) -> bool:
        """
        Send an email directly without a notification object.
        Used for invitations to non-users.
        """
        try:
            # Get branding settings for base template
            branding = BrandingSettings.get_settings()
            branding_context = branding.get_email_context()

            # Build action URL
            site_url = branding_context.get('site_url', '')
            full_action_url = action_url or ''
            if full_action_url and not full_action_url.startswith('http'):
                full_action_url = f"{site_url}{full_action_url}"

            # Wrap email content with action button
            email_content = f'''
{body}
{f'<p><a href="{full_action_url}" class="button">View Details</a></p>' if full_action_url else ''}
'''

            # Get the base template from branding
            base_template = branding.get_email_template()

            # Render the full email
            full_context = {**branding_context, 'email_content': email_content}
            django_template = Template(base_template)
            html_content = django_template.render(Context(full_context))

            text_content = strip_tags(html_content)

            # Build CC and Reply-To from settings
            cc = []
            reply_to = []
            if hasattr(settings, 'EMAIL_CC') and settings.EMAIL_CC:
                cc = [addr.strip() for addr in settings.EMAIL_CC.split(',') if addr.strip()]
            if hasattr(settings, 'EMAIL_REPLY_TO') and settings.EMAIL_REPLY_TO:
                reply_to = [settings.EMAIL_REPLY_TO.strip()]

            # Send email using EmailMessage for CC/Reply-To support
            email = EmailMessage(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
                cc=cc,
                reply_to=reply_to,
            )
            email.content_subtype = 'html'
            email.body = html_content
            email.send(fail_silently=False)

            return True

        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}")
            raise

    # =========================================================================
    # Stage/Interview notification methods
    # =========================================================================

    @classmethod
    def notify_stage_scheduled(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> List[Notification]:
        """
        Send notifications when a stage is scheduled.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        scheduled_time = stage_instance.scheduled_at.strftime("%B %d, %Y at %I:%M %p") if stage_instance.scheduled_at else "TBD"

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "scheduled_time": scheduled_time,
            "duration": stage_instance.duration_minutes,
            "location": stage_instance.location,
            "meeting_link": stage_instance.meeting_link,
            "time": stage_instance.scheduled_at.strftime("%I:%M %p") if stage_instance.scheduled_at else "",
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.STAGE_SCHEDULED,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    @classmethod
    def notify_stage_rescheduled(
        cls,
        stage_instance: ApplicationStageInstance,
        reason: str = "",
    ) -> List[Notification]:
        """
        Send notifications when a stage is rescheduled.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        scheduled_time = stage_instance.scheduled_at.strftime("%B %d, %Y at %I:%M %p") if stage_instance.scheduled_at else "TBD"

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "scheduled_time": scheduled_time,
            "reason": reason,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.STAGE_RESCHEDULED,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    @classmethod
    def notify_stage_cancelled(
        cls,
        stage_instance: ApplicationStageInstance,
        reason: str = "",
    ) -> List[Notification]:
        """
        Send notifications when a stage is cancelled.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "reason": reason,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.STAGE_CANCELLED,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    @classmethod
    def notify_stage_completed(
        cls,
        stage_instance: ApplicationStageInstance,
        result: str = "",
    ) -> List[Notification]:
        """
        Send notifications when a stage is completed.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "candidate_name": application.candidate.full_name,
            "result": result,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.STAGE_COMPLETED,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    @classmethod
    def notify_feedback_received(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> List[Notification]:
        """
        Send notification when interview feedback is available.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.STAGE_FEEDBACK_RECEIVED,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    @classmethod
    def notify_stage_reminder(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> List[Notification]:
        """
        Send interview/stage reminder notification.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        scheduled_time = stage_instance.scheduled_at.strftime("%B %d, %Y at %I:%M %p") if stage_instance.scheduled_at else "TBD"

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "scheduled_time": scheduled_time,
            "time": stage_instance.scheduled_at.strftime("%I:%M %p") if stage_instance.scheduled_at else "TBD",
            "location": stage_instance.location,
            "meeting_link": stage_instance.meeting_link,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.STAGE_REMINDER,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    # =========================================================================
    # Booking / Self-scheduling notification methods
    # =========================================================================

    @classmethod
    def send_booking_link(
        cls,
        stage_instance: ApplicationStageInstance,
        booking_url: str,
    ) -> List[Notification]:
        """
        Send a booking link email to the candidate for self-scheduling.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "booking_url": booking_url,
            "duration": template.default_duration_minutes or 60,
            "interviewer_name": stage_instance.interviewer.get_full_name() if stage_instance.interviewer else None,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.BOOKING_LINK_SENT,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    # Alias for consistency
    notify_booking_link_sent = send_booking_link

    @classmethod
    def notify_booking_confirmed(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> List[Notification]:
        """
        Send notifications when a candidate confirms their booking.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        scheduled_time = stage_instance.scheduled_at.strftime("%B %d, %Y at %I:%M %p") if stage_instance.scheduled_at else "TBD"

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "scheduled_time": scheduled_time,
            "duration": stage_instance.duration_minutes,
            "location": stage_instance.location,
            "meeting_link": stage_instance.meeting_link,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.BOOKING_CONFIRMED,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    @classmethod
    def notify_booking_reminder(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> List[Notification]:
        """
        Send reminder notification for candidate to book their interview.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.BOOKING_REMINDER,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    # =========================================================================
    # Assessment notification methods
    # =========================================================================

    @classmethod
    def notify_assessment_assigned(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> List[Notification]:
        """
        Send notification when an assessment is assigned.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        deadline_str = stage_instance.deadline.strftime("%B %d, %Y at %I:%M %p") if stage_instance.deadline else "No deadline"

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "deadline": deadline_str,
            "instructions": getattr(template, 'assessment_instructions', ''),
            "external_url": getattr(template, 'assessment_external_url', ''),
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.ASSESSMENT_ASSIGNED,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    @classmethod
    def notify_submission_received(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> List[Notification]:
        """
        Send notification when an assessment submission is received.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.SUBMISSION_RECEIVED,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    @classmethod
    def notify_assessment_reminder(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> List[Notification]:
        """
        Send assessment deadline reminder notification.

        Recipients are auto-determined from active templates.
        """
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        deadline_str = stage_instance.deadline.strftime("%B %d, %Y at %I:%M %p") if stage_instance.deadline else "Soon"

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "deadline": deadline_str,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.ASSESSMENT_REMINDER,
            context=context,
            application=application,
            stage_instance=stage_instance,
        )

    # =========================================================================
    # Application lifecycle notification methods
    # =========================================================================

    @classmethod
    def notify_application_received(
        cls,
        application: Application,
    ) -> List[Notification]:
        """
        Send notification when an application is received.

        Recipients are auto-determined from active templates.
        """
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "candidate_name": application.candidate.full_name,
            "candidate_email": application.candidate.user.email,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.APPLICATION_RECEIVED,
            context=context,
            application=application,
        )

    @classmethod
    def notify_application_shortlisted(
        cls,
        application: Application,
    ) -> List[Notification]:
        """
        Send notification when an application is shortlisted.

        Recipients are auto-determined from active templates.
        """
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.APPLICATION_SHORTLISTED,
            context=context,
            application=application,
        )

    @classmethod
    def notify_application_stage_advanced(
        cls,
        application: Application,
        from_stage: Optional[ApplicationStageInstance] = None,
        to_stage: Optional[ApplicationStageInstance] = None,
    ) -> List[Notification]:
        """
        Send notification when an application advances to the next stage.

        Uses stage-specific notification types based on the target stage type.
        Recipients are auto-determined from active templates.
        """
        job = application.job

        from_name = from_stage.stage_template.name if from_stage else "initial review"
        to_name = to_stage.stage_template.name if to_stage else "next stage"

        # Determine the notification type based on the target stage type
        notification_type = NotificationType.ADVANCED_TO_CUSTOM_STAGE  # default
        stage_type = None

        if to_stage and to_stage.stage_template:
            stage_template = to_stage.stage_template
            stage_type = getattr(stage_template, 'stage_type', None)

            if stage_type and stage_type in STAGE_TYPE_TO_NOTIFICATION_TYPE:
                notification_type = STAGE_TYPE_TO_NOTIFICATION_TYPE[stage_type]

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "from_stage": from_name,
            "to_stage": to_name,
            "stage_name": to_name,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        # Add stage-specific details if we have a target stage
        if to_stage and to_stage.stage_template:
            stage_template = to_stage.stage_template
            context["stage_type"] = stage_type
            context["stage_type_display"] = stage_template.get_stage_type_display() if hasattr(stage_template, 'get_stage_type_display') else to_name
            context["stage_description"] = getattr(stage_template, 'description', '')
            context["duration_minutes"] = getattr(stage_template, 'default_duration_minutes', None)

            # Add interview-specific context
            if to_stage.interviewer:
                context["interviewer_name"] = to_stage.interviewer.get_full_name()

            if to_stage.scheduled_at:
                context["scheduled_time"] = to_stage.scheduled_at.strftime("%B %d, %Y at %I:%M %p")
                context["time"] = to_stage.scheduled_at.strftime("%I:%M %p")

            context["location"] = to_stage.location
            context["meeting_link"] = to_stage.meeting_link

            # Add assessment-specific context
            if to_stage.deadline:
                context["deadline"] = to_stage.deadline.strftime("%B %d, %Y at %I:%M %p")

        return cls.send_notifications(
            notification_type=notification_type,
            context=context,
            application=application,
            stage_instance=to_stage,
        )

    @classmethod
    def notify_application_rejected(
        cls,
        application: Application,
        reason: str = "",
        feedback: str = "",
    ) -> List[Notification]:
        """
        Send notification when an application is rejected.

        Recipients are auto-determined from active templates.
        """
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "rejection_reason": reason,
            "rejection_feedback": feedback,
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.APPLICATION_REJECTED,
            context=context,
            application=application,
        )

    @classmethod
    def notify_application_withdrawn(
        cls,
        application: Application,
        reason: str = "",
    ) -> List[Notification]:
        """
        Send notifications when a candidate withdraws their application.

        Recipients are auto-determined from active templates.
        """
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "candidate_name": application.candidate.full_name,
            "candidate_email": application.candidate.user.email,
            "reason": reason,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.APPLICATION_WITHDRAWN,
            context=context,
            application=application,
        )

    # =========================================================================
    # Offer notification methods
    # =========================================================================

    @classmethod
    def notify_offer_received(
        cls,
        application: Application,
        offer_details: Optional[Dict[str, Any]] = None,
    ) -> List[Notification]:
        """
        Send notification when a candidate receives a job offer.

        Recipients are auto-determined from active templates.
        """
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "offer_details": offer_details or {},
            "candidate_name": application.candidate.full_name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.OFFER_RECEIVED,
            context=context,
            application=application,
        )

    # Alias for consistency
    notify_offer_made = notify_offer_received

    @classmethod
    def notify_offer_accepted(
        cls,
        application: Application,
    ) -> List[Notification]:
        """
        Send notifications when a candidate accepts an offer.

        Recipients are auto-determined from active templates.
        """
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "candidate_name": application.candidate.full_name,
            "candidate_email": application.candidate.user.email,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.OFFER_ACCEPTED,
            context=context,
            application=application,
        )

    @classmethod
    def notify_offer_declined(
        cls,
        application: Application,
        reason: str = "",
    ) -> List[Notification]:
        """
        Send notifications when a candidate declines an offer.

        Recipients are auto-determined from active templates.
        """
        job = application.job

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "candidate_name": application.candidate.full_name,
            "reason": reason,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.OFFER_DECLINED,
            context=context,
            application=application,
        )

    # =========================================================================
    # Job lifecycle notification methods
    # =========================================================================

    @classmethod
    def notify_job_published(cls, job) -> List[Notification]:
        """
        Send notifications when a job is published.

        Recipients are auto-determined from active templates.
        """
        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.JOB_PUBLISHED,
            context=context,
            job=job,
        )

    @classmethod
    def notify_job_closed(cls, job, reason: str = "") -> List[Notification]:
        """
        Send notifications when a job is closed.

        Recipients are auto-determined from active templates.
        """
        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "reason": reason,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.JOB_CLOSED,
            context=context,
            job=job,
        )

    @classmethod
    def notify_job_filled(cls, job, hired_candidate=None) -> List[Notification]:
        """
        Send notifications when a job is filled.

        Recipients are auto-determined from active templates.
        """
        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "candidate_name": hired_candidate.candidate.full_name if hired_candidate else None,
            "job": job,
        }

        return cls.send_notifications(
            notification_type=NotificationType.JOB_FILLED,
            context=context,
            job=job,
        )

    @classmethod
    def notify_job_updated(cls, job) -> List[Notification]:
        """
        Send notifications to active candidates when a job is updated.

        Notifies all candidates with non-terminal application statuses.
        """
        from jobs.models import Application, ApplicationStatus

        # Get all active applications for this job
        active_statuses = [
            ApplicationStatus.APPLIED,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.IN_PROGRESS,
            ApplicationStatus.OFFER_MADE,
        ]

        active_applications = Application.objects.filter(
            job=job,
            status__in=active_statuses,
        ).select_related('candidate__user')

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "job": job,
        }

        notifications = []
        for application in active_applications:
            try:
                notif = cls.send_notification(
                    recipient=application.candidate.user,
                    notification_type=NotificationType.JOB_UPDATED,
                    context={
                        **context,
                        "candidate_name": application.candidate.full_name,
                    },
                    recipient_type=RecipientType.CANDIDATE,
                    application=application,
                    action_url=f"/jobs/{job.id}",
                )
                if notif:
                    notifications.append(notif)
            except Exception as e:
                logger.warning(f"Failed to send job update notification: {e}")

        return notifications

    # =========================================================================
    # Welcome / Onboarding notification methods
    # =========================================================================

    @classmethod
    def send_welcome_notification(cls, user) -> Optional[Notification]:
        """Send welcome notification to a newly registered user."""
        from users.models import UserRole

        role = getattr(user, 'role', UserRole.CANDIDATE)

        # Map user role to recipient type
        role_to_recipient = {
            UserRole.CANDIDATE: RecipientType.CANDIDATE,
            UserRole.CLIENT: RecipientType.CLIENT,
            UserRole.RECRUITER: RecipientType.RECRUITER,
            UserRole.ADMIN: RecipientType.COMPANY_ADMIN,
        }
        recipient_type = role_to_recipient.get(role, RecipientType.CANDIDATE)

        # Map role to action URL
        role_to_url = {
            UserRole.ADMIN: "/dashboard/admin",
            UserRole.RECRUITER: "/dashboard/jobs",
            UserRole.CLIENT: "/dashboard/company",
            UserRole.CANDIDATE: "/dashboard",
        }
        action_url = role_to_url.get(role, "/dashboard")

        # Get template for WELCOME notification with matching recipient_type
        template = cls.get_template(NotificationType.WELCOME, recipient_type)
        if not template:
            logger.warning(f"No WELCOME template for recipient_type={recipient_type}")
            return None

        context = {
            "user_name": user.get_full_name() or user.email,
            "user_role": role,
        }

        return cls._send_single_notification(
            recipient=user,
            template=template,
            context=context,
            action_url=action_url,
            send_email=True,
        )

    @classmethod
    def notify_password_changed(cls, user) -> Optional[Notification]:
        """Send notification when user changes their password."""
        template = cls.get_template(NotificationType.PASSWORD_CHANGED, RecipientType.ALL)
        if not template:
            logger.warning("No PASSWORD_CHANGED template found")
            return None

        context = {
            "user_name": user.get_full_name() or user.email,
        }

        return cls._send_single_notification(
            recipient=user,
            template=template,
            context=context,
            action_url="/settings/security",
            send_email=True,
        )

    @classmethod
    def notify_email_verification(cls, user, verification_url: str) -> Optional[Notification]:
        """Send email verification notification."""
        template = cls.get_template(NotificationType.EMAIL_VERIFICATION, RecipientType.ALL)
        if not template:
            logger.warning("No EMAIL_VERIFICATION template found")
            return None

        context = {
            "user_name": user.get_full_name() or user.email,
            "verification_url": verification_url,
        }

        return cls._send_single_notification(
            recipient=user,
            template=template,
            context=context,
            action_url=verification_url,
            send_email=True,
        )

    @classmethod
    def notify_password_reset(cls, user, reset_url: str) -> Optional[Notification]:
        """Send password reset notification."""
        template = cls.get_template(NotificationType.PASSWORD_RESET, RecipientType.ALL)
        if not template:
            logger.warning("No PASSWORD_RESET template found")
            return None

        context = {
            "user_name": user.get_full_name() or user.email,
            "reset_url": reset_url,
        }

        return cls._send_single_notification(
            recipient=user,
            template=template,
            context=context,
            action_url=reset_url,
            send_email=True,
        )

    # =========================================================================
    # Invitation notification methods
    # =========================================================================

    @classmethod
    def notify_team_invite(
        cls,
        email: str,
        invited_by,
        signup_url: str,
    ) -> Optional[Notification]:
        """
        Send team member invitation email.
        Note: This sends to an email address, not an existing user.
        """
        template = cls.get_template(NotificationType.TEAM_INVITE, RecipientType.RECRUITER)
        if not template:
            logger.warning("No TEAM_INVITE template found")
            return None

        # Get brand name from branding settings
        branding = BrandingSettings.get_settings()

        context = {
            "inviter_name": invited_by.get_full_name() or invited_by.email,
            "signup_url": signup_url,
            "brand_name": branding.company_name,
        }

        # For invitations to non-users, we only send email (no in-app notification)
        rendered = template.render(context)
        try:
            cls._send_email(
                to_email=email,
                subject=rendered['email_subject'],
                body=rendered['email_body'],
                action_url=signup_url,
            )
            logger.info(f"Sent team invite to {email}")
        except Exception as e:
            logger.error(f"Failed to send team invite to {email}: {e}")

        return None  # No in-app notification for non-users

    @classmethod
    def notify_client_invite(
        cls,
        email: str,
        invited_by,
        signup_url: str,
    ) -> Optional[Notification]:
        """
        Send client invitation email.
        Note: This sends to an email address, not an existing user.
        """
        template = cls.get_template(NotificationType.CLIENT_INVITE, RecipientType.CLIENT)
        if not template:
            logger.warning("No CLIENT_INVITE template found")
            return None

        # Get brand name from branding settings
        branding = BrandingSettings.get_settings()

        context = {
            "inviter_name": invited_by.get_full_name() or invited_by.email,
            "signup_url": signup_url,
            "brand_name": branding.company_name,
        }

        # For invitations to non-users, we only send email (no in-app notification)
        rendered = template.render(context)
        try:
            cls._send_email(
                to_email=email,
                subject=rendered['email_subject'],
                body=rendered['email_body'],
                action_url=signup_url,
            )
            logger.info(f"Sent client invite to {email}")
        except Exception as e:
            logger.error(f"Failed to send client invite to {email}: {e}")

        return None  # No in-app notification for non-users

    @classmethod
    def notify_company_member_invite(
        cls,
        email: str,
        invited_by,
        company_name: str,
        role: str,
        signup_url: str,
    ) -> Optional[Notification]:
        """
        Send company member invitation email.
        Note: This sends to an email address, not an existing user.
        """
        template = cls.get_template(NotificationType.COMPANY_MEMBER_INVITE, RecipientType.CLIENT)
        if not template:
            logger.warning("No COMPANY_MEMBER_INVITE template found")
            return None

        # Get brand name from branding settings
        branding = BrandingSettings.get_settings()

        context = {
            "inviter_name": invited_by.get_full_name() or invited_by.email,
            "company_name": company_name,
            "role": role,
            "signup_url": signup_url,
            "brand_name": branding.company_name,
        }

        # For invitations to non-users, we only send email (no in-app notification)
        rendered = template.render(context)
        try:
            cls._send_email(
                to_email=email,
                subject=rendered['email_subject'],
                body=rendered['email_body'],
                action_url=signup_url,
            )
            logger.info(f"Sent company member invite to {email}")
        except Exception as e:
            logger.error(f"Failed to send company member invite to {email}: {e}")

        return None  # No in-app notification for non-users

    @classmethod
    def notify_candidate_booking_invite(
        cls,
        email: str,
        name: str,
        recruiter,
        meeting_type_name: str,
        scheduled_at,
        duration_minutes: int,
        signup_url: str,
    ) -> Optional[Notification]:
        """
        Send candidate booking invitation email.
        Sent to someone who booked a meeting but doesn't have an account yet.
        Invites them to sign up and complete their profile before the meeting.
        """
        template = cls.get_template(NotificationType.CANDIDATE_BOOKING_INVITE, RecipientType.CANDIDATE)
        if not template:
            logger.warning("No CANDIDATE_BOOKING_INVITE template found, skipping notification")
            return None

        branding = BrandingSettings.get_settings()

        context = {
            "recipient_name": name.split()[0] if name else "there",
            "recruiter_name": recruiter.get_full_name() or recruiter.email,
            "meeting_type_name": meeting_type_name,
            "scheduled_at": scheduled_at,
            "duration_minutes": duration_minutes,
            "signup_url": signup_url,
            "brand_name": branding.company_name,
        }

        rendered = template.render(context)
        try:
            cls._send_email(
                to_email=email,
                subject=rendered['email_subject'],
                body=rendered['email_body'],
                action_url=signup_url,
            )
            logger.info(f"Sent candidate booking invite to {email}")
        except Exception as e:
            logger.error(f"Failed to send candidate booking invite to {email}: {e}")

        return None  # No in-app notification for non-users

    # =========================================================================
    # Reminder notification methods
    # =========================================================================

    @classmethod
    def send_interview_reminders(cls) -> int:
        """Send reminder notifications for interviews scheduled tomorrow."""
        tomorrow_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        tomorrow_end = tomorrow_start + timedelta(days=1)

        upcoming_interviews = ApplicationStageInstance.objects.filter(
            status=StageInstanceStatus.SCHEDULED,
            scheduled_at__gte=tomorrow_start,
            scheduled_at__lt=tomorrow_end,
            reminder_sent_at__isnull=True,
        ).select_related(
            'application', 'application__candidate__user', 'application__job',
            'stage_template', 'interviewer'
        )

        count = 0
        for instance in upcoming_interviews:
            application = instance.application
            template = instance.stage_template
            job = application.job
            candidate = application.candidate.user

            scheduled_time = instance.scheduled_at.strftime("%I:%M %p")

            context = {
                "job_title": job.title,
                "company_name": job.company.name,
                "stage_name": template.name,
                "time": scheduled_time,
                "location": instance.location,
                "meeting_link": instance.meeting_link,
                "candidate_name": application.candidate.full_name,
                "job": job,
            }

            try:
                # Notify candidate
                cls.send_notification(
                    recipient=candidate,
                    notification_type=NotificationType.STAGE_REMINDER,
                    context=context,
                    recipient_type=RecipientType.CANDIDATE,
                    application=application,
                    stage_instance=instance,
                    action_url=f"/dashboard/my-applications?application={application.id}",
                )

                # Notify interviewer
                if instance.interviewer:
                    cls.send_notification(
                        recipient=instance.interviewer,
                        notification_type=NotificationType.STAGE_REMINDER,
                        context=context,
                        recipient_type=RecipientType.INTERVIEWER,
                        application=application,
                        stage_instance=instance,
                        action_url=f"/dashboard/applications?application={application.id}",
                    )

                instance.reminder_sent_at = timezone.now()
                instance.save(update_fields=['reminder_sent_at'])
                count += 1

            except TemplateNotFoundError as e:
                logger.warning(f"Skipping reminder - {e}")

        return count

    @classmethod
    def send_assessment_deadline_reminders(cls) -> int:
        """Send reminder notifications for assessment deadlines tomorrow."""
        tomorrow_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        tomorrow_end = tomorrow_start + timedelta(days=1)

        upcoming_deadlines = ApplicationStageInstance.objects.filter(
            status=StageInstanceStatus.AWAITING_SUBMISSION,
            deadline__gte=tomorrow_start,
            deadline__lt=tomorrow_end,
            reminder_sent_at__isnull=True,
        ).select_related(
            'application', 'application__candidate__user', 'application__job',
            'stage_template'
        )

        count = 0
        for instance in upcoming_deadlines:
            application = instance.application
            template = instance.stage_template
            job = application.job
            candidate = application.candidate.user

            context = {
                "job_title": job.title,
                "company_name": job.company.name,
                "stage_name": template.name,
                "deadline": instance.deadline.strftime("%B %d, %Y at %I:%M %p"),
                "job": job,
            }

            try:
                cls.send_notification(
                    recipient=candidate,
                    notification_type=NotificationType.ASSESSMENT_REMINDER,
                    context=context,
                    recipient_type=RecipientType.CANDIDATE,
                    application=application,
                    stage_instance=instance,
                    action_url=f"/dashboard/my-applications?application={application.id}",
                )

                instance.reminder_sent_at = timezone.now()
                instance.save(update_fields=['reminder_sent_at'])
                count += 1

            except TemplateNotFoundError as e:
                logger.warning(f"Skipping reminder - {e}")

        return count

    @classmethod
    def send_booking_reminders(cls) -> int:
        """
        Send reminder notifications for candidates who have received a booking link
        but haven't booked yet.

        Criteria:
        - Booking token exists and is not used
        - Token hasn't expired yet
        - Token was created more than 2 days ago (give time to book)
        - Reminder hasn't been sent yet
        """
        from scheduling.models import BookingToken

        two_days_ago = timezone.now() - timedelta(days=2)

        # Find unused booking tokens older than 2 days
        pending_bookings = BookingToken.objects.filter(
            is_used=False,
            expires_at__gt=timezone.now(),  # Token not expired
            created_at__lt=two_days_ago,  # Created more than 2 days ago
            stage_instance__reminder_sent_at__isnull=True,  # Reminder not sent
        ).select_related(
            'stage_instance',
            'stage_instance__application',
            'stage_instance__application__candidate__user',
            'stage_instance__application__job',
            'stage_instance__stage_template',
        )

        count = 0
        for booking in pending_bookings:
            instance = booking.stage_instance
            application = instance.application
            template = instance.stage_template
            job = application.job
            candidate = application.candidate.user

            context = {
                "job_title": job.title,
                "company_name": job.company.name,
                "stage_name": template.name,
                "candidate_name": application.candidate.full_name,
                "job": job,
            }

            try:
                cls.send_notification(
                    recipient=candidate,
                    notification_type=NotificationType.BOOKING_REMINDER,
                    context=context,
                    recipient_type=RecipientType.CANDIDATE,
                    application=application,
                    stage_instance=instance,
                    action_url=f"/dashboard/my-applications?application={application.id}",
                )

                instance.reminder_sent_at = timezone.now()
                instance.save(update_fields=['reminder_sent_at'])
                count += 1

            except TemplateNotFoundError as e:
                logger.warning(f"Skipping booking reminder - {e}")

        return count

    # =========================================================================
    # Admin notification methods
    # =========================================================================

    @classmethod
    def send_to_users(
        cls,
        recipients,
        title: str,
        body: str,
        channel: str = 'both',
        action_url: str = '',
        notification_type: NotificationType = None,
    ) -> List[Notification]:
        """
        Send notification to multiple users (admin broadcast).

        Note: For admin broadcasts, content is provided directly rather than
        from templates since it's custom content.
        """
        if notification_type is None:
            notification_type = NotificationType.ADMIN_BROADCAST

        send_email = channel in [NotificationChannel.EMAIL, NotificationChannel.BOTH, 'email', 'both']

        notifications = []
        for recipient in recipients:
            # For admin broadcasts, we create the notification directly
            # since the content is custom
            notification = Notification.objects.create(
                recipient=recipient,
                notification_type=notification_type,
                channel=channel,
                title=title,
                body=body,
                action_url=action_url,
                sent_at=timezone.now(),
            )

            if send_email and recipient.email:
                # Send email with the custom content
                try:
                    branding = BrandingSettings.get_settings()
                    base_template = branding.get_email_template()
                    branding_context = branding.get_email_context()

                    email_content = f'<h1>{title}</h1><p>{body}</p>'
                    if action_url:
                        site_url = getattr(settings, 'SITE_URL', 'http://localhost:3000')
                        full_url = f"{site_url}{action_url}" if not action_url.startswith('http') else action_url
                        email_content += f'<p><a href="{full_url}" class="button">View Details</a></p>'

                    full_context = {
                        **branding_context,
                        'email_content': email_content,
                        'recipient_name': recipient.get_full_name() or recipient.email,
                        'first_name': recipient.first_name or recipient.email.split('@')[0],
                    }

                    django_template = Template(base_template)
                    html_content = django_template.render(Context(full_context))
                    text_content = strip_tags(html_content)

                    # Build CC and Reply-To from settings
                    cc = []
                    reply_to = []
                    if hasattr(settings, 'EMAIL_CC') and settings.EMAIL_CC:
                        cc = [addr.strip() for addr in settings.EMAIL_CC.split(',') if addr.strip()]
                    if hasattr(settings, 'EMAIL_REPLY_TO') and settings.EMAIL_REPLY_TO:
                        reply_to = [settings.EMAIL_REPLY_TO.strip()]

                    # Send email using EmailMessage for CC/Reply-To support
                    email = EmailMessage(
                        subject=title,
                        body=text_content,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[recipient.email],
                        cc=cc,
                        reply_to=reply_to,
                    )
                    email.content_subtype = 'html'
                    email.body = html_content
                    email.send(fail_silently=True)

                    notification.email_sent = True
                    notification.email_sent_at = timezone.now()
                    notification.save(update_fields=['email_sent', 'email_sent_at'])

                except Exception as e:
                    notification.email_error = str(e)
                    notification.save(update_fields=['email_error'])

            notifications.append(notification)

        return notifications

    @classmethod
    def broadcast(
        cls,
        recipient_filter: str,
        title: str,
        body: str,
        channel: str = 'both',
        action_url: str = '',
    ) -> List[Notification]:
        """Broadcast notification to a group of users based on filter."""
        from django.contrib.auth import get_user_model
        from users.models import UserRole

        User = get_user_model()

        if recipient_filter == 'all':
            recipients = User.objects.filter(is_active=True)
        elif recipient_filter == 'candidates':
            recipients = User.objects.filter(is_active=True, role=UserRole.CANDIDATE)
        elif recipient_filter == 'clients':
            recipients = User.objects.filter(is_active=True, role=UserRole.CLIENT)
        elif recipient_filter == 'recruiters':
            recipients = User.objects.filter(is_active=True, role__in=[UserRole.RECRUITER, UserRole.ADMIN])
        else:
            raise ValueError(f"Invalid recipient_filter: {recipient_filter}")

        return cls.send_to_users(
            recipients=recipients,
            title=title,
            body=body,
            channel=channel,
            action_url=action_url,
            notification_type=NotificationType.ADMIN_BROADCAST,
        )

    # =========================================================================
    # Convenience method aliases
    # =========================================================================

    def send_interview_scheduled(self, stage_instance: ApplicationStageInstance) -> List[Notification]:
        """Alias for notify_stage_scheduled."""
        return self.notify_stage_scheduled(stage_instance)

    def send_interview_rescheduled(
        self,
        stage_instance: ApplicationStageInstance,
        old_time=None,
        reason: str = "",
    ) -> List[Notification]:
        """Alias for notify_stage_rescheduled."""
        return self.notify_stage_rescheduled(stage_instance, reason=reason)

    def send_interview_cancelled(
        self,
        stage_instance: ApplicationStageInstance,
        reason: str = "",
    ) -> List[Notification]:
        """Alias for notify_stage_cancelled."""
        return self.notify_stage_cancelled(stage_instance, reason=reason)
