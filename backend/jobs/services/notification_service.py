"""
Notification service for the interview stages system.

This service handles:
- Creating in-app notifications
- Sending notification emails
- Scheduling reminder notifications
"""

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from datetime import timedelta
from typing import Optional, Dict, Any, List

from jobs.models import (
    Notification,
    NotificationType,
    Application,
    ApplicationStageInstance,
    StageInstanceStatus,
)


class NotificationService:
    """Service for creating and sending notifications."""

    # Email subjects by notification type
    EMAIL_SUBJECTS = {
        NotificationType.STAGE_SCHEDULED: "Interview Scheduled - {company_name}",
        NotificationType.STAGE_REMINDER: "Interview Reminder - Tomorrow at {time}",
        NotificationType.STAGE_RESCHEDULED: "Interview Rescheduled - {company_name}",
        NotificationType.STAGE_CANCELLED: "Interview Cancelled - {company_name}",
        NotificationType.ASSESSMENT_ASSIGNED: "Assessment Assigned - {job_title}",
        NotificationType.ASSESSMENT_REMINDER: "Assessment Due Tomorrow - {job_title}",
        NotificationType.SUBMISSION_RECEIVED: "Assessment Submitted - {candidate_name}",
        NotificationType.APPLICATION_RECEIVED: "New Application - {job_title}",
        NotificationType.APPLICATION_SHORTLISTED: "Application Update - {company_name}",
        NotificationType.APPLICATION_REJECTED: "Application Update - {company_name}",
        NotificationType.OFFER_RECEIVED: "Job Offer - {company_name}",
    }

    # Email templates by notification type
    EMAIL_TEMPLATES = {
        NotificationType.STAGE_SCHEDULED: "emails/stage_scheduled.html",
        NotificationType.STAGE_REMINDER: "emails/stage_reminder.html",
        NotificationType.STAGE_RESCHEDULED: "emails/stage_rescheduled.html",
        NotificationType.STAGE_CANCELLED: "emails/stage_cancelled.html",
        NotificationType.ASSESSMENT_ASSIGNED: "emails/assessment_assigned.html",
        NotificationType.ASSESSMENT_REMINDER: "emails/assessment_reminder.html",
        NotificationType.SUBMISSION_RECEIVED: "emails/submission_received.html",
        NotificationType.APPLICATION_RECEIVED: "emails/application_received.html",
        NotificationType.APPLICATION_SHORTLISTED: "emails/application_shortlisted.html",
        NotificationType.APPLICATION_REJECTED: "emails/application_rejected.html",
        NotificationType.OFFER_RECEIVED: "emails/offer_received.html",
    }

    @classmethod
    def create_notification(
        cls,
        recipient,
        notification_type: NotificationType,
        title: str,
        body: str,
        application: Optional[Application] = None,
        stage_instance: Optional[ApplicationStageInstance] = None,
        action_url: str = "",
        send_email: bool = True,
        email_context: Optional[Dict[str, Any]] = None,
    ) -> Notification:
        """
        Create an in-app notification and optionally send an email.

        Args:
            recipient: User to notify
            notification_type: Type of notification
            title: Notification title
            body: Notification body text
            application: Related application (optional)
            stage_instance: Related stage instance (optional)
            action_url: URL for the notification action
            send_email: Whether to also send an email
            email_context: Additional context for email template

        Returns:
            Created Notification object
        """
        notification = Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            body=body,
            application=application,
            stage_instance=stage_instance,
            action_url=action_url,
            sent_at=timezone.now(),
        )

        if send_email and recipient.email:
            cls._send_notification_email(
                notification=notification,
                context=email_context or {},
            )

        return notification

    @classmethod
    def _send_notification_email(
        cls,
        notification: Notification,
        context: Dict[str, Any],
    ) -> bool:
        """Send an email for a notification."""
        try:
            # Build email context
            email_context = {
                "notification": notification,
                "recipient": notification.recipient,
                "site_url": getattr(settings, 'SITE_URL', 'http://localhost:3000'),
                **context,
            }

            # Get template path (use generic if specific doesn't exist)
            template_path = cls.EMAIL_TEMPLATES.get(
                notification.notification_type,
                "emails/generic_notification.html"
            )

            # Render email content
            try:
                html_content = render_to_string(template_path, email_context)
            except Exception:
                # Fallback to plain text if template doesn't exist
                html_content = f"""
                <html>
                <body>
                    <h2>{notification.title}</h2>
                    <p>{notification.body}</p>
                    {f'<p><a href="{email_context["site_url"]}{notification.action_url}">View Details</a></p>' if notification.action_url else ''}
                </body>
                </html>
                """

            text_content = strip_tags(html_content)

            # Get subject
            subject_template = cls.EMAIL_SUBJECTS.get(
                notification.notification_type,
                notification.title
            )
            subject = subject_template.format(**context) if context else notification.title

            # Send email
            send_mail(
                subject=subject,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient.email],
                html_message=html_content,
                fail_silently=True,
            )

            # Mark email as sent
            notification.email_sent = True
            notification.save(update_fields=['email_sent'])

            return True

        except Exception as e:
            print(f"Error sending notification email: {e}")
            return False

    # =========================================================================
    # Stage-specific notification methods
    # =========================================================================

    @classmethod
    def notify_stage_scheduled(
        cls,
        stage_instance: ApplicationStageInstance,
        send_to_candidate: bool = True,
        send_to_interviewer: bool = True,
    ) -> List[Notification]:
        """Send notifications when a stage is scheduled."""
        notifications = []
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job
        candidate = application.candidate.user

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
        }

        # Notify candidate
        if send_to_candidate:
            notification = cls.create_notification(
                recipient=candidate,
                notification_type=NotificationType.STAGE_SCHEDULED,
                title=f"Interview Scheduled: {template.name}",
                body=f"Your {template.name} for {job.title} at {job.company.name} has been scheduled for {scheduled_time}.",
                application=application,
                stage_instance=stage_instance,
                action_url=f"/applications/{application.id}",
                email_context=context,
            )
            notifications.append(notification)

        # Notify interviewer
        if send_to_interviewer and stage_instance.interviewer:
            notification = cls.create_notification(
                recipient=stage_instance.interviewer,
                notification_type=NotificationType.STAGE_SCHEDULED,
                title=f"Interview Scheduled: {application.candidate.full_name}",
                body=f"You have an interview scheduled with {application.candidate.full_name} for {job.title} on {scheduled_time}.",
                application=application,
                stage_instance=stage_instance,
                action_url=f"/dashboard/jobs/{job.id}/applications/{application.id}",
                email_context={**context, "candidate_name": application.candidate.full_name},
            )
            notifications.append(notification)

        return notifications

    @classmethod
    def notify_stage_rescheduled(
        cls,
        stage_instance: ApplicationStageInstance,
        reason: str = "",
    ) -> List[Notification]:
        """Send notifications when a stage is rescheduled."""
        notifications = []
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job
        candidate = application.candidate.user

        scheduled_time = stage_instance.scheduled_at.strftime("%B %d, %Y at %I:%M %p") if stage_instance.scheduled_at else "TBD"

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "scheduled_time": scheduled_time,
            "reason": reason,
        }

        # Notify candidate
        notification = cls.create_notification(
            recipient=candidate,
            notification_type=NotificationType.STAGE_RESCHEDULED,
            title=f"Interview Rescheduled: {template.name}",
            body=f"Your {template.name} for {job.title} has been rescheduled to {scheduled_time}." + (f" Reason: {reason}" if reason else ""),
            application=application,
            stage_instance=stage_instance,
            action_url=f"/applications/{application.id}",
            email_context=context,
        )
        notifications.append(notification)

        # Notify interviewer
        if stage_instance.interviewer:
            notification = cls.create_notification(
                recipient=stage_instance.interviewer,
                notification_type=NotificationType.STAGE_RESCHEDULED,
                title=f"Interview Rescheduled: {application.candidate.full_name}",
                body=f"Interview with {application.candidate.full_name} has been rescheduled to {scheduled_time}.",
                application=application,
                stage_instance=stage_instance,
                action_url=f"/dashboard/jobs/{job.id}/applications/{application.id}",
                email_context={**context, "candidate_name": application.candidate.full_name},
            )
            notifications.append(notification)

        return notifications

    @classmethod
    def notify_stage_cancelled(
        cls,
        stage_instance: ApplicationStageInstance,
        reason: str = "",
    ) -> List[Notification]:
        """Send notifications when a stage is cancelled."""
        notifications = []
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job
        candidate = application.candidate.user

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "reason": reason,
        }

        # Notify candidate
        notification = cls.create_notification(
            recipient=candidate,
            notification_type=NotificationType.STAGE_CANCELLED,
            title=f"Interview Cancelled: {template.name}",
            body=f"Your {template.name} for {job.title} has been cancelled." + (f" Reason: {reason}" if reason else ""),
            application=application,
            stage_instance=stage_instance,
            action_url=f"/applications/{application.id}",
            email_context=context,
        )
        notifications.append(notification)

        # Notify interviewer
        if stage_instance.interviewer:
            notification = cls.create_notification(
                recipient=stage_instance.interviewer,
                notification_type=NotificationType.STAGE_CANCELLED,
                title=f"Interview Cancelled: {application.candidate.full_name}",
                body=f"Interview with {application.candidate.full_name} has been cancelled.",
                application=application,
                stage_instance=stage_instance,
                action_url=f"/dashboard/jobs/{job.id}/applications/{application.id}",
                email_context={**context, "candidate_name": application.candidate.full_name},
            )
            notifications.append(notification)

        return notifications

    @classmethod
    def notify_assessment_assigned(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> Notification:
        """Send notification when an assessment is assigned."""
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job
        candidate = application.candidate.user

        deadline_str = stage_instance.deadline.strftime("%B %d, %Y at %I:%M %p") if stage_instance.deadline else "No deadline"

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "deadline": deadline_str,
            "instructions": template.assessment_instructions,
            "external_url": template.assessment_external_url,
        }

        return cls.create_notification(
            recipient=candidate,
            notification_type=NotificationType.ASSESSMENT_ASSIGNED,
            title=f"Assessment Assigned: {template.name}",
            body=f"You have been assigned a {template.name} for {job.title}. Deadline: {deadline_str}",
            application=application,
            stage_instance=stage_instance,
            action_url=f"/applications/{application.id}",
            email_context=context,
        )

    @classmethod
    def notify_submission_received(
        cls,
        stage_instance: ApplicationStageInstance,
    ) -> Notification:
        """Send notification when an assessment submission is received."""
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        # Find recruiters to notify (job creator or assigned recruiter)
        recipient = job.assigned_recruiter or job.created_by
        if not recipient:
            return None

        context = {
            "job_title": job.title,
            "candidate_name": application.candidate.full_name,
            "stage_name": template.name,
        }

        return cls.create_notification(
            recipient=recipient,
            notification_type=NotificationType.SUBMISSION_RECEIVED,
            title=f"Assessment Submitted: {application.candidate.full_name}",
            body=f"{application.candidate.full_name} has submitted their {template.name} for {job.title}.",
            application=application,
            stage_instance=stage_instance,
            action_url=f"/dashboard/jobs/{job.id}/applications/{application.id}",
            email_context=context,
        )

    # =========================================================================
    # Reminder notification methods
    # =========================================================================

    @classmethod
    def send_interview_reminders(cls) -> int:
        """
        Send reminder notifications for interviews scheduled tomorrow.
        This should be called daily (e.g., via Celery beat).

        Returns:
            Number of reminders sent
        """
        tomorrow_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        tomorrow_end = tomorrow_start + timedelta(days=1)

        # Find scheduled interviews for tomorrow
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
            }

            # Notify candidate
            cls.create_notification(
                recipient=candidate,
                notification_type=NotificationType.STAGE_REMINDER,
                title=f"Interview Tomorrow: {template.name}",
                body=f"Reminder: You have {template.name} for {job.title} tomorrow at {scheduled_time}.",
                application=application,
                stage_instance=instance,
                action_url=f"/applications/{application.id}",
                email_context=context,
            )

            # Notify interviewer
            if instance.interviewer:
                cls.create_notification(
                    recipient=instance.interviewer,
                    notification_type=NotificationType.STAGE_REMINDER,
                    title=f"Interview Tomorrow: {application.candidate.full_name}",
                    body=f"Reminder: You have an interview with {application.candidate.full_name} tomorrow at {scheduled_time}.",
                    application=application,
                    stage_instance=instance,
                    action_url=f"/dashboard/jobs/{job.id}/applications/{application.id}",
                    email_context={**context, "candidate_name": application.candidate.full_name},
                )

            # Mark reminder as sent
            instance.reminder_sent_at = timezone.now()
            instance.save(update_fields=['reminder_sent_at'])
            count += 1

        return count

    @classmethod
    def send_assessment_deadline_reminders(cls) -> int:
        """
        Send reminder notifications for assessment deadlines tomorrow.
        This should be called daily (e.g., via Celery beat).

        Returns:
            Number of reminders sent
        """
        tomorrow_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        tomorrow_end = tomorrow_start + timedelta(days=1)

        # Find assessments with deadline tomorrow
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

            deadline_time = instance.deadline.strftime("%I:%M %p")

            context = {
                "job_title": job.title,
                "company_name": job.company.name,
                "stage_name": template.name,
                "deadline": instance.deadline.strftime("%B %d, %Y at %I:%M %p"),
            }

            cls.create_notification(
                recipient=candidate,
                notification_type=NotificationType.ASSESSMENT_REMINDER,
                title=f"Assessment Due Tomorrow: {template.name}",
                body=f"Reminder: Your {template.name} for {job.title} is due tomorrow at {deadline_time}.",
                application=application,
                stage_instance=instance,
                action_url=f"/applications/{application.id}",
                email_context=context,
            )

            # Mark reminder as sent
            instance.reminder_sent_at = timezone.now()
            instance.save(update_fields=['reminder_sent_at'])
            count += 1

        return count

    # =========================================================================
    # Convenience methods (aliases for use in views)
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

    @classmethod
    def send_booking_link(
        cls,
        stage_instance: ApplicationStageInstance,
        booking_url: str,
    ) -> Notification:
        """Send a booking link email to the candidate for self-scheduling."""
        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job
        candidate = application.candidate.user

        context = {
            "job_title": job.title,
            "company_name": job.company.name,
            "stage_name": template.name,
            "booking_url": booking_url,
            "duration": template.default_duration_minutes or 60,
            "interviewer_name": stage_instance.interviewer.full_name if stage_instance.interviewer else None,
        }

        # Use generic notification type or create a custom email
        return cls.create_notification(
            recipient=candidate,
            notification_type=NotificationType.STAGE_SCHEDULED,  # Reuse scheduled type
            title=f"Schedule Your Interview: {template.name}",
            body=f"Please select a time for your {template.name} for the {job.title} position at {job.company.name}. Click the link below to choose from available times.",
            application=application,
            stage_instance=stage_instance,
            action_url=booking_url,  # Use booking URL as action
            email_context=context,
        )
