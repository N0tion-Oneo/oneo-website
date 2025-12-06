"""
Activity logging service for candidate-level events.
Provides a simple interface for logging candidate activities from views/services.
"""
from typing import Optional
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import CandidateProfile, CandidateActivity, CandidateActivityType

User = get_user_model()


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
    fields_updated: Optional[list] = None,
) -> CandidateActivity:
    """Log a profile update event."""
    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.PROFILE_UPDATED,
        performed_by=performed_by,
        metadata={'fields_updated': fields_updated or []},
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
) -> CandidateActivity:
    """Log when a work experience is updated."""
    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.EXPERIENCE_UPDATED,
        performed_by=performed_by,
        metadata={
            'job_title': job_title,
            'company_name': company_name,
        },
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
) -> CandidateActivity:
    """Log when education is updated."""
    return log_candidate_activity(
        candidate=candidate,
        activity_type=CandidateActivityType.EDUCATION_UPDATED,
        performed_by=performed_by,
        metadata={
            'institution': institution,
            'degree': degree,
        },
    )
