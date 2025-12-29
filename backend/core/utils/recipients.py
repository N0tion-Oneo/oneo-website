"""
Shared recipient resolution utilities.

This module provides unified recipient resolution for both
the notifications and automations systems.
"""
import logging
from dataclasses import dataclass
from typing import Any, List, Optional, Union

from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


@dataclass
class ExternalRecipient:
    """Represents an external recipient (not a User in the system)."""
    email: str
    name: str = ''

    def __str__(self):
        if self.name:
            return f"{self.name} <{self.email}>"
        return self.email


class RecipientResolver:
    """
    Unified recipient resolution for notifications and automations.

    Resolves a recipient_type string to a list of User objects
    or ExternalRecipient objects.
    """

    @classmethod
    def resolve(
        cls,
        recipient_type: str,
        instance: Any,
        extra_context: Optional[dict] = None,
    ) -> List[Union[Any, ExternalRecipient]]:
        """
        Resolve a recipient type to a list of recipients.

        Args:
            recipient_type: The type of recipient to resolve
            instance: The model instance providing context
            extra_context: Additional context (e.g., specific_user_ids)

        Returns:
            List of User objects or ExternalRecipient objects
        """
        User = get_user_model()
        recipients = []
        extra_context = extra_context or {}

        # Extract common related objects
        company = cls._get_company(instance)
        job = cls._get_job(instance)
        application = cls._get_application(instance)

        # Resolve by type
        resolver_method = getattr(cls, f'_resolve_{recipient_type}', None)
        if resolver_method:
            recipients = resolver_method(
                instance=instance,
                company=company,
                job=job,
                application=application,
                extra_context=extra_context,
            )
        else:
            logger.warning(f"Unknown recipient_type: {recipient_type}")

        return recipients

    # =========================================================================
    # Context extraction helpers
    # =========================================================================

    @classmethod
    def _get_company(cls, instance: Any) -> Optional[Any]:
        """Extract company from instance."""
        if instance.__class__.__name__ == 'Company':
            return instance
        company = getattr(instance, 'company', None)
        if company:
            return company
        # Try via job
        job = getattr(instance, 'job', None)
        if job:
            return getattr(job, 'company', None)
        # Try via application
        application = getattr(instance, 'application', None)
        if application:
            job = getattr(application, 'job', None)
            if job:
                return getattr(job, 'company', None)
        return None

    @classmethod
    def _get_job(cls, instance: Any) -> Optional[Any]:
        """Extract job from instance."""
        if instance.__class__.__name__ == 'Job':
            return instance
        job = getattr(instance, 'job', None)
        if job:
            return job
        # Try via application
        application = getattr(instance, 'application', None)
        if application:
            return getattr(application, 'job', None)
        return None

    @classmethod
    def _get_application(cls, instance: Any) -> Optional[Any]:
        """Extract application from instance."""
        if instance.__class__.__name__ == 'Application':
            return instance
        return getattr(instance, 'application', None)

    # =========================================================================
    # Recipient type resolvers
    # =========================================================================

    @classmethod
    def _resolve_specific_users(cls, extra_context: dict, **kwargs) -> list:
        """Resolve specific users from provided IDs."""
        User = get_user_model()
        user_ids = extra_context.get('user_ids', [])
        if user_ids:
            return list(User.objects.filter(id__in=user_ids, is_active=True))
        return []

    @classmethod
    def _resolve_assigned_user(cls, instance: Any, **kwargs) -> list:
        """Resolve assigned user(s) from instance."""
        assigned_to = getattr(instance, 'assigned_to', None)
        if assigned_to:
            if hasattr(assigned_to, 'all'):  # ManyToMany
                return list(assigned_to.all())
            return [assigned_to]
        return []

    @classmethod
    def _resolve_assigned_client(cls, instance: Any, job: Any, **kwargs) -> list:
        """Resolve assigned client from instance or job."""
        assigned_client = getattr(instance, 'assigned_client', None)
        if not assigned_client and job:
            assigned_client = getattr(job, 'assigned_client', None)
        if assigned_client:
            return [assigned_client]
        return []

    @classmethod
    def _resolve_record_owner(cls, instance: Any, **kwargs) -> list:
        """Resolve record owner/creator."""
        owner = getattr(instance, 'created_by', None) or getattr(instance, 'owner', None)
        if owner:
            return [owner]
        return []

    @classmethod
    def _resolve_company_admin(cls, company: Any, **kwargs) -> list:
        """Resolve company admin users."""
        if company and hasattr(company, 'members'):
            try:
                from companies.models import CompanyUserRole
                return [
                    cu.user for cu in company.members.filter(
                        role__in=[CompanyUserRole.ADMIN, 'admin', 'owner'],
                        is_active=True
                    ).select_related('user')
                    if cu.user
                ]
            except ImportError:
                pass
        return []

    @classmethod
    def _resolve_company_team(cls, company: Any, **kwargs) -> list:
        """Resolve all company team members."""
        if company and hasattr(company, 'members'):
            return [
                cu.user for cu in company.members.filter(
                    is_active=True
                ).select_related('user')
                if cu.user
            ]
        return []

    @classmethod
    def _resolve_recruiter(cls, job: Any, **kwargs) -> list:
        """Resolve job's assigned recruiters."""
        if job:
            recruiters = list(job.assigned_recruiters.all())
            if recruiters:
                return recruiters
            elif job.created_by:
                return [job.created_by]
        return []

    @classmethod
    def _resolve_candidate(cls, application: Any, instance: Any, **kwargs) -> list:
        """Resolve candidate user from application."""
        # Try from application first
        if application and hasattr(application, 'candidate'):
            candidate_user = getattr(application.candidate, 'user', None)
            if candidate_user:
                return [candidate_user]
        # Try from instance directly (if it's a Candidate)
        if instance.__class__.__name__ == 'Candidate':
            user = getattr(instance, 'user', None)
            if user:
                return [user]
        return []

    @classmethod
    def _resolve_all_recruiters(cls, **kwargs) -> list:
        """Resolve all active recruiters."""
        User = get_user_model()
        return list(User.objects.filter(
            is_active=True,
            recruiterprofile__isnull=False
        ).distinct())

    @classmethod
    def _resolve_all_admins(cls, **kwargs) -> list:
        """Resolve all admin/staff users."""
        User = get_user_model()
        return list(User.objects.filter(is_active=True, is_staff=True))

    @classmethod
    def _resolve_interviewer(cls, instance: Any, **kwargs) -> list:
        """Resolve interviewer from stage instance."""
        interviewer = getattr(instance, 'interviewer', None)
        if interviewer:
            return [interviewer]
        # Check nested stage_instance
        stage_instance = getattr(instance, 'stage_instance', None)
        if stage_instance:
            interviewer = getattr(stage_instance, 'interviewer', None)
            if interviewer:
                return [interviewer]
        return []

    @classmethod
    def _resolve_active_applicants(cls, job: Any, **kwargs) -> list:
        """Resolve all candidates with active applications for a job."""
        if job:
            try:
                from jobs.models import Application
                active_statuses = ['applied', 'shortlisted', 'in_progress', 'offer_made']
                active_apps = Application.objects.filter(
                    job=job,
                    status__in=active_statuses
                ).select_related('candidate__user')
                return [
                    app.candidate.user for app in active_apps
                    if app.candidate and app.candidate.user
                ]
            except ImportError:
                pass
        return []

    @classmethod
    def _resolve_all_assigned_recruiters(cls, job: Any, **kwargs) -> list:
        """Resolve all recruiters assigned to the job."""
        if job:
            return list(job.assigned_recruiters.all())
        return []

    @classmethod
    def _resolve_invitation_email(cls, instance: Any, **kwargs) -> list:
        """Resolve invitation email as external recipient."""
        email = getattr(instance, 'email', None)
        if email:
            name = getattr(instance, 'name', '') or ''
            return [ExternalRecipient(email=email, name=name)]
        return []

    @classmethod
    def _resolve_invitation_creator(cls, instance: Any, **kwargs) -> list:
        """Resolve the user who created the invitation."""
        created_by = getattr(instance, 'created_by', None) or getattr(instance, 'invited_by', None)
        if created_by:
            return [created_by]
        return []

    @classmethod
    def _resolve_booking_organizer(cls, instance: Any, **kwargs) -> list:
        """Resolve booking organizer."""
        organizer = getattr(instance, 'organizer', None)
        if organizer:
            return [organizer]
        return []

    @classmethod
    def _resolve_booking_attendee(cls, instance: Any, **kwargs) -> list:
        """Resolve booking attendee (user or external)."""
        attendee_user = getattr(instance, 'attendee_user', None)
        if attendee_user:
            return [attendee_user]
        # External attendee
        attendee_email = getattr(instance, 'attendee_email', None)
        if attendee_email:
            attendee_name = getattr(instance, 'attendee_name', '') or ''
            return [ExternalRecipient(email=attendee_email, name=attendee_name)]
        return []

    @classmethod
    def _resolve_self(cls, instance: Any, **kwargs) -> list:
        """Resolve the instance itself as recipient (for User model)."""
        User = get_user_model()
        if isinstance(instance, User):
            return [instance]
        return []

    @classmethod
    def _resolve_billing_contact(cls, company: Any, **kwargs) -> list:
        """Resolve billing contact for invoices/subscriptions."""
        if company:
            billing_email = getattr(company, 'billing_contact_email', None)
            if billing_email:
                billing_name = getattr(company, 'billing_contact_name', '') or ''
                return [ExternalRecipient(email=billing_email, name=billing_name)]
            # Fall back to company admins
            return cls._resolve_company_admin(company=company)
        return []

    @classmethod
    def _resolve_subscription_company(cls, company: Any, **kwargs) -> list:
        """Resolve company admins for subscription notifications."""
        return cls._resolve_company_admin(company=company)

    @classmethod
    def _resolve_lead_assignees(cls, instance: Any, **kwargs) -> list:
        """Resolve lead's assigned users."""
        return cls._resolve_assigned_user(instance=instance)

    @classmethod
    def _resolve_lead_email(cls, instance: Any, **kwargs) -> list:
        """Resolve lead's email as external recipient."""
        lead_email = getattr(instance, 'email', None)
        if lead_email:
            lead_name = getattr(instance, 'name', '') or ''
            return [ExternalRecipient(email=lead_email, name=lead_name)]
        return []

    @classmethod
    def _resolve_company_assignees(cls, instance: Any, **kwargs) -> list:
        """Resolve company's assigned users."""
        return cls._resolve_assigned_user(instance=instance)

    @classmethod
    def _resolve_replacement_requester(cls, instance: Any, **kwargs) -> list:
        """Resolve the user who requested a replacement."""
        requested_by = getattr(instance, 'requested_by', None)
        if requested_by:
            return [requested_by]
        return []

    @classmethod
    def _resolve_job_recruiters(cls, instance: Any, **kwargs) -> list:
        """Resolve recruiters for replacement request via application -> job."""
        application = getattr(instance, 'application', None)
        if application:
            job = getattr(application, 'job', None)
            if job:
                recruiters = list(job.assigned_recruiters.filter(is_active=True))
                if recruiters:
                    return recruiters
        return []


# Convenience function
def resolve_recipients(
    recipient_type: str,
    instance: Any,
    extra_context: Optional[dict] = None,
) -> List[Union[Any, ExternalRecipient]]:
    """
    Convenience function to resolve recipients.

    Args:
        recipient_type: The type of recipient to resolve
        instance: The model instance providing context
        extra_context: Additional context (e.g., specific_user_ids)

    Returns:
        List of User objects or ExternalRecipient objects
    """
    return RecipientResolver.resolve(recipient_type, instance, extra_context)
