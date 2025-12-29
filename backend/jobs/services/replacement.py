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

    # Notification handled by automation rule: [Auto] Replacement Requested - Notify Admins

    return request


def approve_replacement_request(replacement_request, approval_type, reviewed_by, discount_percentage=None, notes=''):
    """
    Approve a replacement request.

    Args:
        replacement_request: ReplacementRequest instance
        approval_type: 'free' or 'discounted'
        reviewed_by: User approving the request
        discount_percentage: For 'free': credit percentage (1-100, default 100).
                            For 'discounted': discount percentage (1-99, required).
        notes: Review notes

    Returns:
        ReplacementRequest: The updated request

    Raises:
        ValueError: If the request cannot be approved
    """
    if replacement_request.status != ReplacementStatus.PENDING:
        raise ValueError('Only pending requests can be approved.')

    if approval_type == 'free':
        credit_percentage = discount_percentage if discount_percentage else 100
        replacement_request.approve_free(reviewed_by, credit_percentage, notes)
    elif approval_type == 'discounted':
        if not discount_percentage:
            raise ValueError('Discount percentage is required for discounted approvals.')
        replacement_request.approve_discounted(reviewed_by, discount_percentage, notes)
    else:
        raise ValueError(f'Invalid approval type: {approval_type}')

    # Notifications handled by automation rules:
    # - [Auto] Replacement Approved - Notify Client
    # - [Auto] Job Reopened for Replacement - Notify Recruiters

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

    # Notification handled by automation rule: [Auto] Replacement Rejected - Notify Client

    return replacement_request
