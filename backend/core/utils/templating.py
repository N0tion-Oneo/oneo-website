"""
Shared template rendering utilities.

This module provides unified template rendering and context building
for both the notifications and automations systems.

Template syntax: {variable} or {object.attribute}
"""
import re
import logging
from typing import Any, Dict, Optional
from datetime import date, datetime
from decimal import Decimal

from django.conf import settings

logger = logging.getLogger(__name__)


class TemplateRenderer:
    """
    Unified template renderer with {variable} syntax.

    Supports:
    - Simple variables: {name}
    - Nested attributes: {job.company.name}
    - Missing variables return empty string
    """

    @classmethod
    def render(cls, template: str, context: Dict[str, Any]) -> str:
        """
        Render a template string with the given context.

        Supports both syntaxes for backward compatibility:
        - {variable} - standard syntax
        - {{variable}} - legacy automation syntax

        Args:
            template: Template string with {variable} or {{variable}} placeholders
            context: Dictionary of values to substitute

        Returns:
            Rendered string with variables replaced
        """
        if not template:
            return ''

        def replace_var(match):
            var_path = match.group(1)
            value = cls._resolve_path(var_path, context)
            return cls._format_value(value)

        # First handle {{variable}} syntax (legacy automations)
        result = re.sub(r'\{\{(\w+(?:\.\w+)*)\}\}', replace_var, template)

        # Then handle {variable} syntax (standard templates)
        # But skip if it looks like {{}} was already there (avoid double processing)
        result = re.sub(r'(?<!\{)\{(\w+(?:\.\w+)*)\}(?!\})', replace_var, result)

        return result

    @classmethod
    def render_dict(cls, template_dict: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively render all string values in a dictionary.

        Args:
            template_dict: Dictionary with template strings as values
            context: Dictionary of values to substitute

        Returns:
            Dictionary with all templates rendered
        """
        def process(obj):
            if isinstance(obj, str):
                return cls.render(obj, context)
            elif isinstance(obj, dict):
                return {k: process(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [process(i) for i in obj]
            return obj

        return process(template_dict)

    @classmethod
    def _resolve_path(cls, path: str, context: Dict[str, Any]) -> Any:
        """Resolve a dot-notation path against the context."""
        parts = path.split('.')
        value = context

        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            elif hasattr(value, part):
                value = getattr(value, part)
            else:
                return None

            if value is None:
                return None

            # Handle callables (methods without args)
            if callable(value) and not hasattr(value, '__self__'):
                try:
                    value = value()
                except TypeError:
                    pass

        return value

    @classmethod
    def _format_value(cls, value: Any) -> str:
        """Format a value for display in templates."""
        if value is None:
            return ''

        if isinstance(value, str):
            return value

        if isinstance(value, bool):
            return 'Yes' if value else 'No'

        if isinstance(value, (date, datetime)):
            if isinstance(value, datetime):
                return value.strftime('%B %d, %Y at %I:%M %p')
            return value.strftime('%B %d, %Y')

        if isinstance(value, Decimal):
            return f"{value:,.2f}"

        if isinstance(value, (int, float)):
            return str(value)

        # Handle QuerySets and managers
        if hasattr(value, 'all'):
            items = list(value.all())
            if not items:
                return ''
            return ', '.join(cls._get_display_name(item) for item in items)

        # Handle lists
        if isinstance(value, list):
            if not value:
                return ''
            if value and isinstance(value[0], dict):
                return ', '.join(
                    item.get('name') or item.get('title') or str(item)
                    for item in value
                )
            return ', '.join(str(v) for v in value)

        # Handle model instances - use display name
        return cls._get_display_name(value)

    @classmethod
    def _get_display_name(cls, obj: Any) -> str:
        """Get a display name for an object."""
        if hasattr(obj, 'get_full_name'):
            name = obj.get_full_name()
            if name:
                return name
        if hasattr(obj, 'full_name'):
            return obj.full_name or ''
        if hasattr(obj, 'name'):
            return obj.name or ''
        if hasattr(obj, 'title'):
            return obj.title or ''
        if hasattr(obj, 'email'):
            return obj.email or ''
        return str(obj)


class ContextBuilder:
    """
    Build template context dictionaries for model instances.

    Provides consistent variable names across notifications and automations.
    """

    @classmethod
    def build(cls, instance: Any, extra_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Build a context dictionary for any model instance.

        Args:
            instance: Model instance to build context for
            extra_context: Additional context to merge in

        Returns:
            Dictionary with template variables
        """
        if instance is None:
            return extra_context or {}

        context = {}
        model_name = instance.__class__.__name__

        # Add branding context
        cls._add_branding_context(context)

        # Add model-specific context
        builder_method = getattr(cls, f'_build_{model_name.lower()}_context', None)
        if builder_method:
            builder_method(instance, context)
        else:
            # Generic fallback
            cls._build_generic_context(instance, context)

        # Merge extra context (overrides)
        if extra_context:
            context.update(extra_context)

        return context

    @classmethod
    def _add_branding_context(cls, context: Dict[str, Any]) -> None:
        """Add branding-related context variables."""
        try:
            from branding.models import BrandingSettings
            branding = BrandingSettings.get_settings()
            context['brand_name'] = branding.company_name or ''
            context['site_url'] = getattr(settings, 'SITE_URL', 'http://localhost:5173')
        except Exception:
            context['brand_name'] = ''
            context['site_url'] = getattr(settings, 'SITE_URL', 'http://localhost:5173')

    @classmethod
    def _build_generic_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build generic context for any model."""
        context['instance'] = instance

        # Common fields
        for field in ['name', 'title', 'email', 'status', 'description']:
            if hasattr(instance, field):
                context[field] = getattr(instance, field, '') or ''

        # Status display
        if hasattr(instance, 'get_status_display'):
            context['status_display'] = instance.get_status_display()

    # =========================================================================
    # Model-specific context builders
    # =========================================================================

    @classmethod
    def _build_job_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for Job model."""
        context['job'] = instance
        context['job_title'] = instance.title or ''
        context['title'] = instance.title or ''
        context['status'] = getattr(instance, 'status', '')
        context['location'] = getattr(instance, 'location', '')
        context['employment_type'] = getattr(instance, 'employment_type', '')

        if hasattr(instance, 'company') and instance.company:
            context['company_name'] = instance.company.name
            context['company'] = instance.company

    @classmethod
    def _build_application_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for Application model."""
        context['application'] = instance
        context['status'] = getattr(instance, 'status', '')

        if hasattr(instance, 'job') and instance.job:
            context['job'] = instance.job
            context['job_title'] = instance.job.title
            if hasattr(instance.job, 'company') and instance.job.company:
                context['company_name'] = instance.job.company.name
                context['company'] = instance.job.company

        if hasattr(instance, 'candidate') and instance.candidate:
            context['candidate'] = instance.candidate
            context['candidate_name'] = getattr(instance.candidate, 'full_name', str(instance.candidate))
            if hasattr(instance.candidate, 'user') and instance.candidate.user:
                context['candidate_email'] = instance.candidate.user.email

    @classmethod
    def _build_lead_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for Lead model."""
        context['lead'] = instance
        context['lead_name'] = getattr(instance, 'name', '') or str(instance)
        context['name'] = context['lead_name']
        context['lead_email'] = getattr(instance, 'email', '')
        context['email'] = context['lead_email']
        context['phone'] = getattr(instance, 'phone', '')
        context['job_title'] = getattr(instance, 'job_title', '')
        context['lead_company_name'] = getattr(instance, 'company_name', '')
        context['company_website'] = getattr(instance, 'company_website', '')
        context['notes'] = getattr(instance, 'notes', '')
        context['subject'] = getattr(instance, 'subject', '')

        # Source
        if hasattr(instance, 'get_source_display'):
            context['lead_source'] = instance.get_source_display()
            context['source'] = context['lead_source']
        else:
            context['lead_source'] = getattr(instance, 'source', '')
            context['source'] = context['lead_source']

        # Stage
        onboarding_stage = getattr(instance, 'onboarding_stage', None)
        if onboarding_stage:
            context['lead_stage'] = onboarding_stage.name
            context['stage'] = onboarding_stage.name
        else:
            context['lead_stage'] = ''
            context['stage'] = ''

        # Assigned users
        cls._add_assigned_to_context(instance, context)

        # Conversion info
        context['is_converted'] = getattr(instance, 'is_converted', False)
        if hasattr(instance, 'converted_to_company') and instance.converted_to_company:
            context['converted_company_name'] = instance.converted_to_company.name

    @classmethod
    def _build_company_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for Company model."""
        context['company'] = instance
        context['company_name'] = instance.name or ''
        context['name'] = instance.name or ''
        context['company_slug'] = getattr(instance, 'slug', '')
        context['company_tagline'] = getattr(instance, 'tagline', '')

        # Industry
        industry = getattr(instance, 'industry', None)
        context['company_industry'] = industry.name if industry else ''

        # Size
        if hasattr(instance, 'get_company_size_display'):
            context['company_size'] = instance.get_company_size_display()
        else:
            context['company_size'] = getattr(instance, 'company_size', '')

        # Location
        context['headquarters_location'] = getattr(instance, 'headquarters_location', '')

        # Stage
        onboarding_stage = getattr(instance, 'onboarding_stage', None)
        if onboarding_stage:
            context['company_stage'] = onboarding_stage.name
            context['stage'] = onboarding_stage.name
        else:
            context['company_stage'] = ''
            context['stage'] = ''

        # Assigned users
        cls._add_assigned_to_context(instance, context)

    @classmethod
    def _build_invoice_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for Invoice model."""
        context['invoice'] = instance
        context['invoice_number'] = getattr(instance, 'invoice_number', '')

        if hasattr(instance, 'get_invoice_type_display'):
            context['invoice_type'] = instance.get_invoice_type_display()
        if hasattr(instance, 'get_status_display'):
            context['status'] = instance.get_status_display()

        # Amounts (formatted as currency)
        subtotal = getattr(instance, 'subtotal', 0) or 0
        vat_amount = getattr(instance, 'vat_amount', 0) or 0
        total_amount = getattr(instance, 'total_amount', 0) or 0
        amount_paid = getattr(instance, 'amount_paid', 0) or 0
        balance_due = getattr(instance, 'balance_due', total_amount - amount_paid)

        context['subtotal'] = f"R{subtotal:,.2f}"
        context['vat_amount'] = f"R{vat_amount:,.2f}"
        context['total_amount'] = f"R{total_amount:,.2f}"
        context['amount_paid'] = f"R{amount_paid:,.2f}"
        context['balance_due'] = f"R{balance_due:,.2f}"

        # Dates
        invoice_date = getattr(instance, 'invoice_date', None)
        due_date = getattr(instance, 'due_date', None)
        paid_at = getattr(instance, 'paid_at', None)

        context['invoice_date'] = invoice_date.strftime('%B %d, %Y') if invoice_date else ''
        context['due_date'] = due_date.strftime('%B %d, %Y') if due_date else ''
        context['payment_date'] = paid_at.strftime('%B %d, %Y') if paid_at else ''

        # Days overdue
        if due_date and getattr(instance, 'status', '') in ['sent', 'overdue', 'partially_paid']:
            today = date.today()
            context['days_overdue'] = max(0, (today - due_date).days)
        else:
            context['days_overdue'] = 0

        context['invoice_description'] = getattr(instance, 'description', '')

        # Company info
        company = getattr(instance, 'company', None)
        if company:
            context['company_name'] = company.name
            context['billing_contact_name'] = getattr(company, 'billing_contact_name', '')
            context['billing_contact_email'] = getattr(company, 'billing_contact_email', '')

    @classmethod
    def _build_subscription_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for Subscription model."""
        context['subscription'] = instance

        if hasattr(instance, 'get_service_type_display'):
            context['service_type'] = instance.get_service_type_display()
        if hasattr(instance, 'get_status_display'):
            context['status'] = instance.get_status_display()

        # Dates
        contract_start = getattr(instance, 'contract_start_date', None)
        contract_end = getattr(instance, 'contract_end_date', None)
        paused_at = getattr(instance, 'paused_at', None)
        terminated_at = getattr(instance, 'terminated_at', None)
        termination_effective = getattr(instance, 'termination_effective_date', None)

        context['contract_start'] = contract_start.strftime('%B %d, %Y') if contract_start else ''
        context['contract_end'] = contract_end.strftime('%B %d, %Y') if contract_end else ''
        context['paused_date'] = paused_at.strftime('%B %d, %Y') if paused_at else ''

        if termination_effective:
            context['termination_date'] = termination_effective.strftime('%B %d, %Y')
        elif terminated_at:
            context['termination_date'] = terminated_at.strftime('%B %d, %Y')
        else:
            context['termination_date'] = ''

        # Days remaining
        context['days_remaining'] = getattr(instance, 'days_until_renewal', 0) or 0

        # Company
        company = getattr(instance, 'company', None)
        if company:
            context['company_name'] = company.name

    @classmethod
    def _build_candidate_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for Candidate model."""
        context['candidate'] = instance
        context['candidate_name'] = getattr(instance, 'full_name', str(instance))
        context['name'] = context['candidate_name']

        if hasattr(instance, 'user') and instance.user:
            context['candidate_email'] = instance.user.email
            context['email'] = instance.user.email
            context['first_name'] = getattr(instance.user, 'first_name', '')
            context['last_name'] = getattr(instance.user, 'last_name', '')

    @classmethod
    def _build_user_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for User model."""
        context['user'] = instance
        context['email'] = getattr(instance, 'email', '')
        context['first_name'] = getattr(instance, 'first_name', '')
        context['last_name'] = getattr(instance, 'last_name', '')
        context['full_name'] = instance.get_full_name() if hasattr(instance, 'get_full_name') else ''
        context['name'] = context['full_name'] or context['first_name'] or context['email']
        context['role'] = getattr(instance, 'role', '')

    @classmethod
    def _build_applicationstageinstance_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for ApplicationStageInstance model."""
        context['stage_instance'] = instance
        context['stage_name'] = ''
        context['stage_type'] = ''

        # Stage template info
        template = getattr(instance, 'stage_template', None)
        if template:
            context['stage_name'] = template.name
            context['stage_type'] = getattr(template, 'stage_type', '')

        # Scheduling info
        scheduled_at = getattr(instance, 'scheduled_at', None)
        if scheduled_at:
            context['scheduled_date'] = scheduled_at.strftime('%B %d, %Y')
            context['scheduled_time'] = scheduled_at.strftime('%I:%M %p')
            context['scheduled_datetime'] = scheduled_at.strftime('%B %d, %Y at %I:%M %p')

        context['duration_minutes'] = getattr(instance, 'duration_minutes', '')
        context['location'] = getattr(instance, 'location', '')
        context['meeting_link'] = getattr(instance, 'meeting_link', '')

        # Interviewer
        interviewer = getattr(instance, 'interviewer', None)
        if interviewer:
            context['interviewer_name'] = interviewer.get_full_name() or interviewer.email
            context['interviewer_email'] = interviewer.email

        # Application context
        application = getattr(instance, 'application', None)
        if application:
            cls._build_application_context(application, context)

    @classmethod
    def _build_booking_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for Booking model."""
        context['booking'] = instance
        context['booking_title'] = getattr(instance, 'title', '')

        scheduled_at = getattr(instance, 'scheduled_at', None)
        if scheduled_at:
            context['scheduled_date'] = scheduled_at.strftime('%B %d, %Y')
            context['scheduled_time'] = scheduled_at.strftime('%I:%M %p')
            context['scheduled_datetime'] = scheduled_at.strftime('%B %d, %Y at %I:%M %p')

        context['duration_minutes'] = getattr(instance, 'duration_minutes', '')
        context['meeting_link'] = getattr(instance, 'meeting_link', '')
        context['location'] = getattr(instance, 'location', '')

        # Organizer
        organizer = getattr(instance, 'organizer', None)
        if organizer:
            context['organizer_name'] = organizer.get_full_name() or organizer.email
            context['organizer_email'] = organizer.email

        # Meeting type
        meeting_type = getattr(instance, 'meeting_type', None)
        if meeting_type:
            context['meeting_type'] = meeting_type.name

    @classmethod
    def _build_replacementrequest_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Build context for ReplacementRequest model."""
        context['replacement_request'] = instance

        if hasattr(instance, 'get_reason_category_display'):
            context['reason_category'] = instance.get_reason_category_display()
        context['reason_details'] = getattr(instance, 'reason_details', '')

        if hasattr(instance, 'get_status_display'):
            context['status'] = instance.get_status_display()

        context['discount_percentage'] = getattr(instance, 'discount_percentage', '')
        context['review_notes'] = getattr(instance, 'review_notes', '')

        # Requester
        requested_by = getattr(instance, 'requested_by', None)
        if requested_by:
            context['requested_by_name'] = requested_by.get_full_name() or requested_by.email

        # Application/Job info
        application = getattr(instance, 'application', None)
        if application:
            cls._build_application_context(application, context)

    # =========================================================================
    # Invitation context builders
    # =========================================================================

    @classmethod
    def _build_clientinvitation_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        cls._build_invitation_context(instance, context, 'client')

    @classmethod
    def _build_recruiterinvitation_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        cls._build_invitation_context(instance, context, 'recruiter')

    @classmethod
    def _build_candidateinvitation_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        cls._build_invitation_context(instance, context, 'candidate')

    @classmethod
    def _build_companyinvitation_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        cls._build_invitation_context(instance, context, 'company')

    @classmethod
    def _build_invitation_context(cls, instance: Any, context: Dict[str, Any], inv_type: str) -> None:
        """Build context for invitation models."""
        context['email'] = getattr(instance, 'email', '')
        context['token'] = str(getattr(instance, 'token', ''))
        context['name'] = getattr(instance, 'name', '')

        site_url = context.get('site_url', 'http://localhost:5173')
        token = context['token']

        if inv_type == 'client':
            context['signup_url'] = f"{site_url}/signup/client/{token}"
            context['invitation_type'] = 'Client'
        elif inv_type == 'recruiter':
            context['signup_url'] = f"{site_url}/signup/recruiter/{token}"
            context['invitation_type'] = 'Team Member'
        elif inv_type == 'candidate':
            context['signup_url'] = f"{site_url}/signup/candidate/{token}"
            context['invitation_type'] = 'Candidate'
            # Booking context
            booking = getattr(instance, 'booking', None)
            if booking:
                context['has_booking'] = True
                cls._build_booking_context(booking, context)
        elif inv_type == 'company':
            company = getattr(instance, 'company', None)
            if company:
                context['company_name'] = company.name
                context['signup_url'] = f"{site_url}/signup/company/{token}"
            else:
                context['signup_url'] = f"{site_url}/signup/{token}"
            context['invitation_type'] = 'Company Member'
            context['role'] = getattr(instance, 'role', '')

        # Inviter
        created_by = getattr(instance, 'created_by', None) or getattr(instance, 'invited_by', None)
        if created_by:
            context['inviter_name'] = created_by.get_full_name() or created_by.email
            context['inviter_email'] = created_by.email

    # =========================================================================
    # Helper methods
    # =========================================================================

    @classmethod
    def _add_assigned_to_context(cls, instance: Any, context: Dict[str, Any]) -> None:
        """Add assigned_to context for models with assignment."""
        if hasattr(instance, 'assigned_to'):
            assigned = instance.assigned_to
            if hasattr(assigned, 'all'):
                # ManyToMany
                users = list(assigned.all())
                context['assigned_to'] = ', '.join(
                    u.get_full_name() or u.email for u in users
                ) if users else ''
            elif assigned:
                context['assigned_to'] = str(assigned)
            else:
                context['assigned_to'] = ''
