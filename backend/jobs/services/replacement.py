"""Service layer for replacement request functionality."""
from datetime import date, timedelta
from django.utils import timezone

from jobs.models import Application, ApplicationStatus, ReplacementRequest, ReplacementStatus
from subscriptions.utils import company_has_feature
from cms.models import PricingConfig
from subscriptions.models import CompanyFeatureOverride


def get_replacement_period_days(company):
    """
    Get the replacement period in days for a company.

    Uses CompanyPricing.get_effective_replacement_period() which checks for
    company-specific override first, then falls back to service type default.

    Args:
        company: Company instance

    Returns:
        int: Number of days for replacement period, or 0 if not available
    """
    if not company or not company.service_type:
        return 0

    # Use the CompanyPricing model's method which handles custom and default values
    from subscriptions.models import CompanyPricing
    pricing, _ = CompanyPricing.objects.get_or_create(company=company)
    return pricing.get_effective_replacement_period()


def get_start_date_from_application(application):
    """
    Extract the start date from an application's offer details.

    Checks final_offer_details first, then falls back to offer_details.
    This handles cases where final_offer_details exists but is empty or
    doesn't include start_date (legacy data before the merge fix).

    Args:
        application: Application instance

    Returns:
        date or None: The start date if found
    """
    # Check final_offer_details first for start_date
    final_offer = application.final_offer_details or {}
    start_date_str = final_offer.get('start_date')

    # If not in final_offer_details, check offer_details as fallback
    if not start_date_str:
        offer = application.offer_details or {}
        start_date_str = offer.get('start_date')

    if not start_date_str:
        return None

    # Parse the date string
    try:
        if isinstance(start_date_str, date):
            return start_date_str
        return date.fromisoformat(start_date_str)
    except (ValueError, TypeError):
        return None


def check_replacement_eligibility(application):
    """
    Check if a replacement can be requested for an application.

    Args:
        application: Application instance

    Returns:
        dict: Eligibility information with keys:
            - eligible (bool)
            - reason (str or None): Reason if not eligible
            - replacement_period_days (int)
            - start_date (date or None)
            - expiry_date (date or None)
            - days_remaining (int or None)
            - has_existing_request (bool)
            - existing_request_status (str or None)
    """
    company = application.job.company

    # Default response structure
    result = {
        'eligible': False,
        'reason': None,
        'replacement_period_days': 0,
        'start_date': None,
        'expiry_date': None,
        'days_remaining': None,
        'has_existing_request': False,
        'existing_request_status': None,
    }

    # Check if company has the free-replacements feature
    if not company_has_feature(company, 'free-replacements'):
        result['reason'] = 'Company does not have the free replacements feature.'
        return result

    # Get replacement period
    replacement_period_days = get_replacement_period_days(company)
    result['replacement_period_days'] = replacement_period_days

    if replacement_period_days <= 0:
        result['reason'] = 'Replacement period is not configured for this service type.'
        return result

    # Check application status - must be OFFER_ACCEPTED
    if application.status != ApplicationStatus.OFFER_ACCEPTED:
        result['reason'] = 'Replacement can only be requested for accepted offers.'
        return result

    # Check if this is already a replacement (no chained replacements)
    if application.is_replacement:
        result['reason'] = 'Cannot request replacement for a replacement hire.'
        return result

    # Check for existing replacement request
    try:
        existing_request = application.replacement_request
        result['has_existing_request'] = True
        result['existing_request_status'] = existing_request.status
        result['reason'] = f'A replacement request already exists (status: {existing_request.get_status_display()}).'
        return result
    except ReplacementRequest.DoesNotExist:
        pass

    # Get start date from offer
    start_date = get_start_date_from_application(application)
    result['start_date'] = start_date

    if not start_date:
        result['reason'] = 'Start date is not set in the offer details.'
        return result

    # Calculate expiry date and days remaining
    expiry_date = start_date + timedelta(days=replacement_period_days)
    result['expiry_date'] = expiry_date

    today = date.today()
    days_remaining = (expiry_date - today).days
    result['days_remaining'] = max(0, days_remaining)

    # Check if within replacement period (expires based on start_date + replacement_period_days)
    # Replacement is available immediately after offer acceptance, but expiry is calculated from start date
    if today > expiry_date:
        result['reason'] = f'Replacement period has expired (ended {expiry_date.strftime("%Y-%m-%d")}).'
        return result

    # All checks passed
    result['eligible'] = True
    return result


def create_replacement_request(application, reason_category, reason_details, requested_by):
    """
    Create a replacement request for an application.

    Args:
        application: Application instance
        reason_category: ReplacementReasonCategory choice
        reason_details: Text explaining the reason
        requested_by: User making the request

    Returns:
        ReplacementRequest: The created request

    Raises:
        ValueError: If the application is not eligible for replacement
    """
    # Check eligibility first
    eligibility = check_replacement_eligibility(application)
    if not eligibility['eligible']:
        raise ValueError(eligibility['reason'])

    # Create the request
    request = ReplacementRequest.objects.create(
        application=application,
        reason_category=reason_category,
        reason_details=reason_details,
        requested_by=requested_by,
    )

    # Send notification to admins
    _notify_replacement_requested(request)

    return request


def approve_replacement_request(replacement_request, approval_type, reviewed_by, discount_percentage=None, notes=''):
    """
    Approve a replacement request.

    Args:
        replacement_request: ReplacementRequest instance
        approval_type: 'free' or 'discounted'
        reviewed_by: User approving the request
        discount_percentage: Required if approval_type is 'discounted'
        notes: Review notes

    Returns:
        ReplacementRequest: The updated request

    Raises:
        ValueError: If the request cannot be approved
    """
    if replacement_request.status != ReplacementStatus.PENDING:
        raise ValueError('Only pending requests can be approved.')

    if approval_type == 'free':
        replacement_request.approve_free(reviewed_by, notes)
    elif approval_type == 'discounted':
        if not discount_percentage:
            raise ValueError('Discount percentage is required for discounted approvals.')
        replacement_request.approve_discounted(reviewed_by, discount_percentage, notes)
    else:
        raise ValueError(f'Invalid approval type: {approval_type}')

    # Send notifications
    _notify_replacement_approved(replacement_request)
    _notify_job_reopened(replacement_request)

    return replacement_request


def reject_replacement_request(replacement_request, reviewed_by, notes=''):
    """
    Reject a replacement request.

    Args:
        replacement_request: ReplacementRequest instance
        reviewed_by: User rejecting the request
        notes: Review notes

    Returns:
        ReplacementRequest: The updated request

    Raises:
        ValueError: If the request cannot be rejected
    """
    if replacement_request.status != ReplacementStatus.PENDING:
        raise ValueError('Only pending requests can be rejected.')

    replacement_request.reject(reviewed_by, notes)

    # Send notification to the client who requested
    _notify_replacement_rejected(replacement_request)

    return replacement_request


# =============================================================================
# Notification Helpers
# =============================================================================


def _notify_replacement_requested(replacement_request):
    """Notify admins that a new replacement request has been submitted."""
    import logging
    from django.contrib.auth import get_user_model
    from users.models import UserRole

    logger = logging.getLogger(__name__)

    try:
        from notifications.services.notification_service import NotificationService
        from notifications.models import NotificationType, RecipientType

        User = get_user_model()

        # Get all admin users
        admins = User.objects.filter(role=UserRole.ADMIN, is_active=True)

        context = _build_replacement_context(replacement_request)

        for admin in admins:
            try:
                NotificationService.send_notification(
                    recipient=admin,
                    notification_type=NotificationType.REPLACEMENT_REQUESTED,
                    context=context,
                    recipient_type=RecipientType.RECRUITER,
                    action_url=f"/dashboard/companies/{replacement_request.company.id}?tab=replacements",
                )
            except Exception as e:
                logger.warning(f"Failed to send replacement request notification to {admin.email}: {e}")

    except Exception as e:
        logger.error(f"Error sending replacement request notifications: {e}")


def _notify_replacement_approved(replacement_request):
    """Notify the client that their replacement request was approved."""
    import logging

    logger = logging.getLogger(__name__)

    try:
        from notifications.services.notification_service import NotificationService
        from notifications.models import NotificationType, RecipientType

        if not replacement_request.requested_by:
            return

        context = _build_replacement_context(replacement_request)

        try:
            NotificationService.send_notification(
                recipient=replacement_request.requested_by,
                notification_type=NotificationType.REPLACEMENT_APPROVED,
                context=context,
                recipient_type=RecipientType.CLIENT,
                action_url=f"/dashboard/jobs/{replacement_request.job.id}",
            )
        except Exception as e:
            logger.warning(f"Failed to send replacement approved notification: {e}")

    except Exception as e:
        logger.error(f"Error sending replacement approved notification: {e}")


def _notify_replacement_rejected(replacement_request):
    """Notify the client that their replacement request was rejected."""
    import logging

    logger = logging.getLogger(__name__)

    try:
        from notifications.services.notification_service import NotificationService
        from notifications.models import NotificationType, RecipientType

        if not replacement_request.requested_by:
            return

        context = _build_replacement_context(replacement_request)

        try:
            NotificationService.send_notification(
                recipient=replacement_request.requested_by,
                notification_type=NotificationType.REPLACEMENT_REJECTED,
                context=context,
                recipient_type=RecipientType.CLIENT,
                action_url=f"/dashboard/jobs/{replacement_request.job.id}",
            )
        except Exception as e:
            logger.warning(f"Failed to send replacement rejected notification: {e}")

    except Exception as e:
        logger.error(f"Error sending replacement rejected notification: {e}")


def _notify_job_reopened(replacement_request):
    """Notify assigned recruiters that a job has been reopened for replacement."""
    import logging

    logger = logging.getLogger(__name__)

    try:
        from notifications.services.notification_service import NotificationService
        from notifications.models import NotificationType, RecipientType

        job = replacement_request.job
        recruiters = job.assigned_recruiters.filter(is_active=True)

        if not recruiters.exists():
            return

        context = _build_replacement_context(replacement_request)

        for recruiter in recruiters:
            try:
                NotificationService.send_notification(
                    recipient=recruiter,
                    notification_type=NotificationType.JOB_REOPENED_FOR_REPLACEMENT,
                    context=context,
                    recipient_type=RecipientType.RECRUITER,
                    action_url=f"/dashboard/jobs/{job.id}/applications",
                )
            except Exception as e:
                logger.warning(f"Failed to send job reopened notification to {recruiter.email}: {e}")

    except Exception as e:
        logger.error(f"Error sending job reopened notifications: {e}")


def _build_replacement_context(replacement_request):
    """Build context dict for replacement notification templates."""
    application = replacement_request.application
    job = application.job
    company = job.company
    candidate = application.candidate

    return {
        'replacement_request': {
            'id': str(replacement_request.id),
            'reason_category': replacement_request.get_reason_category_display(),
            'reason_details': replacement_request.reason_details,
            'status': replacement_request.get_status_display(),
            'discount_percentage': replacement_request.discount_percentage,
            'review_notes': replacement_request.review_notes,
        },
        'candidate_name': candidate.user.get_full_name(),
        'job_title': job.title,
        'company_name': company.name,
        'company_id': str(company.id),
        'job_id': str(job.id),
        'requested_by_name': replacement_request.requested_by.get_full_name() if replacement_request.requested_by else 'Unknown',
    }
