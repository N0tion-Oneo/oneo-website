"""
Activity logging service for candidate-level events.
Provides a simple interface for logging candidate activities from views/services.
"""
from typing import Optional, Any
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Model

from .models import CandidateProfile, CandidateActivity, CandidateActivityType

User = get_user_model()


# Human-readable field labels for activity display
FIELD_LABELS = {
    'first_name': 'First Name',
    'last_name': 'Last Name',
    'phone': 'Phone',
    'professional_title': 'Professional Title',
    'headline': 'Headline',
    'professional_summary': 'Professional Summary',
    'seniority': 'Seniority Level',
    'city_id': 'City',
    'country_id': 'Country',
    'work_preference': 'Work Preference',
    'willing_to_relocate': 'Willing to Relocate',
    'preferred_locations': 'Preferred Locations',
    'salary_expectation_min': 'Minimum Salary',
    'salary_expectation_max': 'Maximum Salary',
    'salary_currency': 'Salary Currency',
    'notice_period_days': 'Notice Period',
    'portfolio_links': 'Portfolio Links',
    'visibility': 'Profile Visibility',
    'industry_ids': 'Industries',
}

# Field labels for Experience model
EXPERIENCE_FIELD_LABELS = {
    'job_title': 'Job Title',
    'company_name': 'Company',
    'description': 'Description',
    'achievements': 'Achievements',
    'start_date': 'Start Date',
    'end_date': 'End Date',
    'is_current': 'Currently Working',
    'employment_type': 'Employment Type',
    'location': 'Location',
}

# Field labels for Education model
EDUCATION_FIELD_LABELS = {
    'institution': 'Institution',
    'degree': 'Degree',
    'field_of_study': 'Field of Study',
    'description': 'Description',
    'start_date': 'Start Date',
    'end_date': 'End Date',
    'is_current': 'Currently Studying',
    'grade': 'Grade',
}


def _serialize_value(value: Any) -> Any:
    """Convert a value to a JSON-serializable format for logging."""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list):
        return [_serialize_value(v) for v in value]
    if isinstance(value, dict):
        return {k: _serialize_value(v) for k, v in value.items()}
    if isinstance(value, Model):
        return str(value)
    return str(value)


def detect_profile_changes(
    profile: CandidateProfile,
    validated_data: dict,
    user_data: Optional[dict] = None,
) -> list[dict]:
    """
    Compare profile fields with validated_data to detect actual changes.

    Args:
        profile: The CandidateProfile instance (before changes)
        validated_data: Dictionary of new values from serializer
        user_data: Optional dict of user fields (first_name, last_name, phone)

    Returns:
        List of change dicts: [{"field": name, "label": label, "old": old, "new": new}]
    """
    changes = []

    # Fields that live on the User model, not CandidateProfile
    user_fields = {'first_name', 'last_name', 'phone'}

    for field_name, new_value in validated_data.items():
        # Skip fields we don't want to track
        if field_name in ('industry_ids',):
            # Handle M2M separately below
            continue

        # Get old value
        if field_name in user_fields:
            # User fields are on profile.user
            old_value = getattr(profile.user, field_name, None)
        else:
            old_value = getattr(profile, field_name, None)

        # Serialize for comparison
        old_serialized = _serialize_value(old_value)
        new_serialized = _serialize_value(new_value)

        # Only log if actually changed
        if old_serialized != new_serialized:
            changes.append({
                'field': field_name,
                'label': FIELD_LABELS.get(field_name, field_name.replace('_', ' ').title()),
                'old': old_serialized,
                'new': new_serialized,
            })

    # Handle user_data if provided separately
    if user_data:
        for field_name, new_value in user_data.items():
            old_value = getattr(profile.user, field_name, None)
            old_serialized = _serialize_value(old_value)
            new_serialized = _serialize_value(new_value)

            if old_serialized != new_serialized:
                changes.append({
                    'field': field_name,
                    'label': FIELD_LABELS.get(field_name, field_name.replace('_', ' ').title()),
                    'old': old_serialized,
                    'new': new_serialized,
                })

    # Handle industry_ids M2M field
    if 'industry_ids' in validated_data:
        old_industry_ids = set(profile.industries.values_list('id', flat=True))
        new_industry_ids = set(validated_data['industry_ids'])

        if old_industry_ids != new_industry_ids:
            # Get industry names for display
            from taxonomy.models import Industry
            old_names = list(profile.industries.values_list('name', flat=True))
            new_names = list(Industry.objects.filter(id__in=new_industry_ids).values_list('name', flat=True))

            changes.append({
                'field': 'industry_ids',
                'label': 'Industries',
                'old': old_names,
                'new': new_names,
            })

    return changes


def detect_experience_changes(
    experience: 'Experience',
    validated_data: dict,
) -> list[dict]:
    """
    Compare experience fields with validated_data to detect actual changes.

    Args:
        experience: The Experience instance (before changes)
        validated_data: Dictionary of new values from serializer

    Returns:
        List of change dicts: [{\"field\": name, \"label\": label, \"old\": old, \"new\": new}]
    """
    changes = []

    for field_name, new_value in validated_data.items():
        old_value = getattr(experience, field_name, None)

        # Serialize for comparison
        old_serialized = _serialize_value(old_value)
        new_serialized = _serialize_value(new_value)

        # Only log if actually changed
        if old_serialized != new_serialized:
            changes.append({
                'field': field_name,
                'label': EXPERIENCE_FIELD_LABELS.get(field_name, field_name.replace('_', ' ').title()),
                'old': old_serialized,
                'new': new_serialized,
            })

    return changes


def detect_education_changes(
    education: 'Education',
    validated_data: dict,
) -> list[dict]:
    """
    Compare education fields with validated_data to detect actual changes.

    Args:
        education: The Education instance (before changes)
        validated_data: Dictionary of new values from serializer

    Returns:
        List of change dicts: [{\"field\": name, \"label\": label, \"old\": old, \"new\": new}]
    """
    changes = []

    for field_name, new_value in validated_data.items():
        old_value = getattr(education, field_name, None)

        # Serialize for comparison
        old_serialized = _serialize_value(old_value)
        new_serialized = _serialize_value(new_value)

        # Only log if actually changed
        if old_serialized != new_serialized:
            changes.append({
                'field': field_name,
                'label': EDUCATION_FIELD_LABELS.get(field_name, field_name.replace('_', ' ').title()),
                'old': old_serialized,
                'new': new_serialized,
            })

    return changes


def log_candidate_activity(
    candidate: CandidateProfile,
    activity_type: str,
    performed_by: Optional[User] = None,
    job=None,
    metadata: Optional[dict] = None,
) -> CandidateActivity:
    """
    Log a candidate-level activity event.

    Args:
        candidate: The CandidateProfile this activity is for
        activity_type: One of CandidateActivityType choices
        performed_by: User who performed the action (defaults to candidate's user)
        job: Optional Job reference (for job_viewed events)
        metadata: Optional dict with additional context

    Returns:
        The created CandidateActivity instance

    Example:
        log_candidate_activity(
            candidate=profile,
            activity_type=CandidateActivityType.PROFILE_UPDATED,
            metadata={'fields_updated': ['skills', 'summary']}
        )
    """
    # Default performer to the candidate's user if not specified
    if performed_by is None:
        performed_by = candidate.user

    return CandidateActivity.objects.create(
        candidate=candidate,
        activity_type=activity_type,
        performed_by=performed_by,
        job=job,
        metadata=metadata or {},
    )


def log_profile_updated(
    candidate: CandidateProfile,
    performed_by: Optional[User] = None,
    changes: Optional[list[dict]] = None,
) -> Optional[CandidateActivity]:
    """
    Log a profile update event with detailed change tracking.

    Args:
        candidate: The CandidateProfile that was updated
        performed_by: User who made the changes
        changes: List of change dicts from detect_profile_changes()
                 Each dict has: field, label, old, new

    Returns:
        CandidateActivity if changes were logged, None if no changes
    """
    # Don't log if no actual changes
    if not changes:
        return None

    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.PROFILE_UPDATED,
        performed_by=performed_by,
        metadata={
            'changes': changes,
            # Also include simple field list for backwards compatibility
            'fields_updated': [c['label'] for c in changes],
        },
    )


def log_profile_viewed(
    candidate: CandidateProfile,
    viewed_by: Optional[User] = None,
    view_type: str = 'staff',  # 'staff' or 'public'
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Optional[CandidateActivity]:
    """
    Log when someone views a candidate's profile.
    Includes debouncing: same viewer won't create multiple entries within 1 hour.

    Args:
        candidate: The CandidateProfile being viewed
        viewed_by: User viewing the profile (None for anonymous/public views)
        view_type: 'staff' for admin/recruiter views, 'public' for public profile views
        ip_address: IP address (useful for anonymous tracking)
        user_agent: Browser user agent

    Returns:
        CandidateActivity if logged, None if debounced
    """
    # Don't track if the candidate is viewing their own profile
    if viewed_by and hasattr(candidate, 'user') and candidate.user_id == viewed_by.id:
        return None

    # Debounce: check for recent view by same viewer (within 1 hour)
    one_hour_ago = timezone.now() - timedelta(hours=1)

    recent_view_filter = {
        'candidate': candidate,
        'activity_type': CandidateActivityType.PROFILE_VIEWED,
        'created_at__gte': one_hour_ago,
    }

    if viewed_by:
        recent_view_filter['performed_by'] = viewed_by
    elif ip_address:
        # For anonymous views, debounce by IP
        recent_view_filter['metadata__ip_address'] = ip_address

    if CandidateActivity.objects.filter(**recent_view_filter).exists():
        return None  # Already logged recently

    # Build metadata
    metadata = {
        'view_type': view_type,
    }
    if ip_address:
        metadata['ip_address'] = ip_address
    if user_agent:
        metadata['user_agent'] = user_agent[:200]
    if viewed_by:
        metadata['viewer_role'] = viewed_by.role if hasattr(viewed_by, 'role') else None

    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.PROFILE_VIEWED,
        performed_by=viewed_by,
        metadata=metadata,
    )


def log_job_viewed(
    candidate: CandidateProfile,
    job,
) -> CandidateActivity:
    """Log when a candidate views a job listing."""
    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.JOB_VIEWED,
        job=job,
        metadata={
            'job_title': job.title,
            'company_name': job.company.name if job.company else None,
        },
    )


def log_logged_in(
    candidate: CandidateProfile,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> CandidateActivity:
    """Log a login event."""
    metadata = {}
    if ip_address:
        metadata['ip_address'] = ip_address
    if user_agent:
        metadata['user_agent'] = user_agent[:200]  # Truncate long user agents

    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.LOGGED_IN,
        metadata=metadata,
    )


def log_resume_uploaded(
    candidate: CandidateProfile,
    filename: str,
    file_size: Optional[int] = None,
) -> CandidateActivity:
    """Log when a resume file is uploaded."""
    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.RESUME_UPLOADED,
        metadata={
            'filename': filename,
            'file_size': file_size,
        },
    )


def log_resume_parsed(
    candidate: CandidateProfile,
    experiences_count: int = 0,
    education_count: int = 0,
    technologies_count: int = 0,
    skills_count: int = 0,
) -> CandidateActivity:
    """Log when a resume is parsed and data is imported."""
    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.RESUME_PARSED,
        metadata={
            'experiences_imported': experiences_count,
            'education_imported': education_count,
            'technologies_matched': technologies_count,
            'skills_matched': skills_count,
        },
    )


def log_experience_added(
    candidate: CandidateProfile,
    job_title: str,
    company_name: str,
    performed_by: Optional[User] = None,
) -> CandidateActivity:
    """Log when a work experience is added."""
    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.EXPERIENCE_ADDED,
        performed_by=performed_by,
        metadata={
            'job_title': job_title,
            'company_name': company_name,
        },
    )


def log_experience_updated(
    candidate: CandidateProfile,
    job_title: str,
    company_name: str,
    performed_by: Optional[User] = None,
    changes: Optional[list[dict]] = None,
) -> Optional[CandidateActivity]:
    """
    Log when a work experience is updated with detailed change tracking.

    Args:
        candidate: The CandidateProfile that owns the experience
        job_title: Job title of the experience
        company_name: Company name of the experience
        performed_by: User who made the changes
        changes: List of change dicts from detect_experience_changes()

    Returns:
        CandidateActivity if changes were logged, None if no changes
    """
    # Don't log if no actual changes
    if changes is not None and len(changes) == 0:
        return None

    metadata = {
        'job_title': job_title,
        'company_name': company_name,
    }

    if changes:
        metadata['changes'] = changes
        metadata['fields_updated'] = [c['label'] for c in changes]

    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.EXPERIENCE_UPDATED,
        performed_by=performed_by,
        metadata=metadata,
    )


def log_education_added(
    candidate: CandidateProfile,
    institution: str,
    degree: str,
    performed_by: Optional[User] = None,
) -> CandidateActivity:
    """Log when education is added."""
    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.EDUCATION_ADDED,
        performed_by=performed_by,
        metadata={
            'institution': institution,
            'degree': degree,
        },
    )


def log_education_updated(
    candidate: CandidateProfile,
    institution: str,
    degree: str,
    performed_by: Optional[User] = None,
    changes: Optional[list[dict]] = None,
) -> Optional[CandidateActivity]:
    """
    Log when education is updated with detailed change tracking.

    Args:
        candidate: The CandidateProfile that owns the education
        institution: Institution name
        degree: Degree name
        performed_by: User who made the changes
        changes: List of change dicts from detect_education_changes()

    Returns:
        CandidateActivity if changes were logged, None if no changes
    """
    # Don't log if no actual changes
    if changes is not None and len(changes) == 0:
        return None

    metadata = {
        'institution': institution,
        'degree': degree,
    }

    if changes:
        metadata['changes'] = changes
        metadata['fields_updated'] = [c['label'] for c in changes]

    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.EDUCATION_UPDATED,
        performed_by=performed_by,
        metadata=metadata,
    )
