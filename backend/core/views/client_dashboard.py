"""
Client Dashboard API views.
Provides data for the client (company) dashboard including:
- Active jobs with application counts
- Recent applications
- Upcoming interviews
- Pipeline overview
- Pending offers
- Company profile completion status
- Team activity
- Assigned recruiter info
- Hiring metrics
"""
from datetime import timedelta
from django.db.models import Count, Q, Avg, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import UserRole


def get_user_company(user):
    """Get the company associated with the user (for CLIENT users)."""
    # Get company through membership for any user who has one
    membership = user.company_memberships.select_related('company').first()
    return membership.company if membership else None


# =============================================================================
# Active Jobs
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_active_jobs(request):
    """
    Get active jobs for the client's company with application counts.
    """
    from jobs.models import Job, JobStatus, ApplicationStatus

    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    jobs = Job.objects.filter(
        company=company,
        status=JobStatus.PUBLISHED,
    ).annotate(
        total_applications=Count('applications'),
        new_applications=Count(
            'applications',
            filter=Q(applications__status=ApplicationStatus.APPLIED)
        ),
        shortlisted_count=Count(
            'applications',
            filter=Q(applications__status=ApplicationStatus.SHORTLISTED)
        ),
        in_progress_count=Count(
            'applications',
            filter=Q(applications__status=ApplicationStatus.IN_PROGRESS)
        ),
        offers_count=Count(
            'applications',
            filter=Q(applications__status__in=[
                ApplicationStatus.OFFER_MADE,
                ApplicationStatus.OFFER_ACCEPTED,
            ])
        ),
    ).order_by('-created_at')

    result = []
    for job in jobs[:10]:
        result.append({
            'id': str(job.id),
            'title': job.title,
            'location': job.location,
            'employment_type': job.employment_type,
            'created_at': job.created_at.isoformat(),
            'positions_to_fill': job.positions_to_fill,
            'hired_count': job.hired_count,
            'remaining_positions': job.remaining_positions,
            'total_applications': job.total_applications,
            'new_applications': job.new_applications,
            'shortlisted_count': job.shortlisted_count,
            'in_progress_count': job.in_progress_count,
            'offers_count': job.offers_count,
        })

    return Response({
        'jobs': result,
        'total_active_jobs': jobs.count(),
    })


# =============================================================================
# Recent Applications
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_recent_applications(request):
    """
    Get recent applications for the client's company jobs.
    Focuses on new applications (applied status) and newly shortlisted candidates.
    """
    from jobs.models import Application, ApplicationStatus, JobStatus

    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get applications from last 7 days that are either applied or shortlisted
    since = timezone.now() - timedelta(days=7)

    applications = Application.objects.filter(
        job__company=company,
        job__status=JobStatus.PUBLISHED,
        status__in=[ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED],
    ).select_related(
        'candidate__user',
        'job',
    ).order_by('-updated_at')[:15]

    # Count by status for summary
    applied_count = applications.filter(status=ApplicationStatus.APPLIED).count()
    shortlisted_count = applications.filter(status=ApplicationStatus.SHORTLISTED).count()

    result = []
    for app in applications:
        candidate = app.candidate
        result.append({
            'id': str(app.id),
            'candidate_name': candidate.user.full_name if candidate and candidate.user else 'Unknown',
            'candidate_id': candidate.id if candidate else None,
            'candidate_headline': candidate.headline if candidate else None,
            'job_title': app.job.title,
            'job_id': str(app.job.id),
            'status': app.status,
            'applied_at': app.applied_at.isoformat(),
            'updated_at': app.updated_at.isoformat(),
        })

    return Response({
        'applications': result,
        'total_count': len(result),
        'applied_count': applied_count,
        'shortlisted_count': shortlisted_count,
    })


# =============================================================================
# Upcoming Interviews
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_upcoming_interviews(request):
    """
    Get upcoming interviews for the client's company.
    """
    from jobs.models import ApplicationStageInstance, StageInstanceStatus

    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    now = timezone.now()
    # Get interviews for the next 14 days
    until = now + timedelta(days=14)

    interviews = ApplicationStageInstance.objects.filter(
        application__job__company=company,
        scheduled_at__gte=now,
        scheduled_at__lte=until,
        status=StageInstanceStatus.SCHEDULED,
    ).select_related(
        'application__candidate__user',
        'application__job',
        'stage_template',
        'interviewer',
    ).order_by('scheduled_at')[:10]

    result = []
    for interview in interviews:
        app = interview.application
        candidate = app.candidate

        result.append({
            'id': str(interview.id),
            'scheduled_at': interview.scheduled_at.isoformat(),
            'candidate_name': candidate.user.full_name if candidate and candidate.user else 'Unknown',
            'candidate_id': candidate.id if candidate else None,
            'job_title': app.job.title,
            'job_id': str(app.job.id),
            'stage_name': interview.stage_template.name if interview.stage_template else 'Interview',
            'interviewer_name': interview.interviewer.full_name if interview.interviewer else None,
            'location_type': interview.location_type,
            'meeting_url': interview.meeting_url,
        })

    return Response({
        'interviews': result,
        'total_upcoming': len(result),
    })


# =============================================================================
# Pipeline Overview
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_pipeline_overview(request):
    """
    Get pipeline overview for the client's company.
    Shows candidates in each stage across all jobs.
    """
    from jobs.models import Job, Application, ApplicationStatus, JobStatus

    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get all active jobs
    jobs = Job.objects.filter(
        company=company,
        status=JobStatus.PUBLISHED,
    )

    # Aggregate counts by status
    pipeline = {
        'applied': 0,
        'shortlisted': 0,
        'in_progress': 0,
        'offer_made': 0,
        'offer_accepted': 0,
        'rejected': 0,
    }

    job_pipelines = []
    for job in jobs:
        apps = job.applications.all()
        job_counts = {
            'applied': apps.filter(status=ApplicationStatus.APPLIED).count(),
            'shortlisted': apps.filter(status=ApplicationStatus.SHORTLISTED).count(),
            'in_progress': apps.filter(status=ApplicationStatus.IN_PROGRESS).count(),
            'offer_made': apps.filter(status=ApplicationStatus.OFFER_MADE).count(),
            'offer_accepted': apps.filter(status=ApplicationStatus.OFFER_ACCEPTED).count(),
            'rejected': apps.filter(status=ApplicationStatus.REJECTED).count(),
        }

        # Add to totals
        for key in pipeline:
            pipeline[key] += job_counts[key]

        job_pipelines.append({
            'job_id': str(job.id),
            'job_title': job.title,
            'counts': job_counts,
            'total': sum(job_counts.values()),
        })

    return Response({
        'total_pipeline': pipeline,
        'total_candidates': sum(pipeline.values()),
        'jobs': job_pipelines[:10],
    })


# =============================================================================
# Pending Offers
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_pending_offers(request):
    """
    Get pending offers awaiting candidate response.
    """
    from jobs.models import Application, ApplicationStatus, JobStatus

    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    offers = Application.objects.filter(
        job__company=company,
        job__status=JobStatus.PUBLISHED,
        status=ApplicationStatus.OFFER_MADE,
    ).select_related(
        'candidate__user',
        'job',
    ).order_by('-updated_at')[:10]

    result = []
    for app in offers:
        candidate = app.candidate
        # Calculate days since offer
        days_pending = (timezone.now() - app.updated_at).days

        result.append({
            'id': str(app.id),
            'candidate_name': candidate.user.full_name if candidate and candidate.user else 'Unknown',
            'candidate_id': candidate.id if candidate else None,
            'job_title': app.job.title,
            'job_id': str(app.job.id),
            'offer_date': app.updated_at.isoformat(),
            'days_pending': days_pending,
            'salary_offered': app.offered_salary,
        })

    return Response({
        'offers': result,
        'total_pending': len(result),
    })


# =============================================================================
# Company Profile Completion
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_profile_completion(request):
    """
    Get company profile completion status.
    """
    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Define required fields and their weights
    fields = {
        'logo': {'filled': bool(company.logo), 'weight': 10},
        'description': {'filled': bool(company.description), 'weight': 15},
        'industry': {'filled': bool(company.industry), 'weight': 10},
        'company_size': {'filled': bool(company.company_size), 'weight': 5},
        'website_url': {'filled': bool(company.website_url), 'weight': 10},
        'headquarters_city': {'filled': bool(company.headquarters_city), 'weight': 10},
        'headquarters_country': {'filled': bool(company.headquarters_country), 'weight': 10},
        'culture_description': {'filled': bool(company.culture_description), 'weight': 10},
        'benefits': {'filled': bool(company.benefits), 'weight': 10},
        'technologies': {'filled': company.technologies.exists(), 'weight': 10},
    }

    total_weight = sum(f['weight'] for f in fields.values())
    completed_weight = sum(f['weight'] for f in fields.values() if f['filled'])
    completion_percentage = int((completed_weight / total_weight) * 100)

    missing_fields = [
        field for field, data in fields.items() if not data['filled']
    ]

    return Response({
        'completion_percentage': completion_percentage,
        'is_complete': completion_percentage >= 80,
        'missing_fields': missing_fields,
        'company_name': company.name,
        'company_id': company.id,
    })


# =============================================================================
# Team Activity
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_team_activity(request):
    """
    Get recent activity by team members.
    """
    from jobs.models import ActivityLog, ActivityType

    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get team member IDs
    team_member_ids = company.members.values_list('user_id', flat=True)

    since = timezone.now() - timedelta(days=7)

    # Get activity from team members on company jobs
    activities = ActivityLog.objects.filter(
        Q(performed_by_id__in=team_member_ids) |
        Q(application__job__company=company),
        created_at__gte=since,
        activity_type__in=[
            ActivityType.SHORTLISTED,
            ActivityType.STAGE_CHANGED,
            ActivityType.OFFER_MADE,
            ActivityType.OFFER_ACCEPTED,
            ActivityType.REJECTED,
            ActivityType.INTERVIEW_SCHEDULED,
            ActivityType.APPLICATION_VIEWED,
        ]
    ).select_related(
        'application__candidate__user',
        'application__job',
        'performed_by',
    ).order_by('-created_at')[:15]

    result = []
    for log in activities:
        result.append({
            'id': log.id,
            'activity_type': log.activity_type,
            'candidate_name': log.application.candidate.user.full_name if log.application.candidate and log.application.candidate.user else 'Unknown',
            'candidate_id': log.application.candidate.id if log.application.candidate else None,
            'job_title': log.application.job.title if log.application.job else None,
            'job_id': str(log.application.job.id) if log.application.job else None,
            'performed_by': log.performed_by.full_name if log.performed_by else 'System',
            'created_at': log.created_at.isoformat(),
            'details': {
                'previous_status': log.previous_status,
                'new_status': log.new_status,
                'stage_name': log.stage_name,
            },
        })

    return Response({
        'activities': result,
    })


# =============================================================================
# Assigned Recruiter
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_assigned_recruiter(request):
    """
    Get assigned recruiter info for the client's company.
    """
    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    recruiters = company.assigned_to.all()

    result = []
    for recruiter in recruiters:
        # Get recruiter's booking slug if available
        booking_slug = getattr(recruiter, 'booking_slug', None)

        result.append({
            'id': recruiter.id,
            'name': recruiter.full_name,
            'email': recruiter.email,
            'booking_slug': booking_slug,
        })

    return Response({
        'recruiters': result,
        'has_assigned_recruiter': len(result) > 0,
    })


# =============================================================================
# Hiring Metrics
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_hiring_metrics(request):
    """
    Get hiring metrics for the client's company.
    - Time to hire (average days from application to offer accepted)
    - Offer acceptance rate
    - Applications per job
    - Interview to offer ratio
    """
    from jobs.models import Job, Application, ApplicationStatus, JobStatus

    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'No company associated with this user'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get all jobs for this company
    jobs = Job.objects.filter(company=company)
    all_applications = Application.objects.filter(job__company=company)

    # Total counts
    total_applications = all_applications.count()
    total_jobs = jobs.count()
    active_jobs = jobs.filter(status=JobStatus.PUBLISHED).count()

    # Offer stats
    offers_made = all_applications.filter(
        status__in=[ApplicationStatus.OFFER_MADE, ApplicationStatus.OFFER_ACCEPTED, ApplicationStatus.OFFER_DECLINED]
    ).count()
    offers_accepted = all_applications.filter(status=ApplicationStatus.OFFER_ACCEPTED).count()
    offers_declined = all_applications.filter(status=ApplicationStatus.OFFER_DECLINED).count()

    offer_acceptance_rate = (
        round((offers_accepted / offers_made) * 100) if offers_made > 0 else None
    )

    # Average applications per job
    avg_applications_per_job = (
        round(total_applications / total_jobs, 1) if total_jobs > 0 else 0
    )

    # Time to hire calculation (for accepted offers)
    # This would require tracking when offer was accepted vs applied date
    # For now, estimate based on updated_at - applied_at for accepted offers
    accepted_apps = all_applications.filter(status=ApplicationStatus.OFFER_ACCEPTED)
    time_to_hire_days = None
    if accepted_apps.exists():
        total_days = 0
        count = 0
        for app in accepted_apps:
            days = (app.updated_at - app.applied_at).days
            if days >= 0:
                total_days += days
                count += 1
        if count > 0:
            time_to_hire_days = round(total_days / count)

    # Shortlist to interview ratio
    shortlisted = all_applications.filter(
        status__in=[
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.IN_PROGRESS,
            ApplicationStatus.OFFER_MADE,
            ApplicationStatus.OFFER_ACCEPTED,
        ]
    ).count()

    shortlist_rate = (
        round((shortlisted / total_applications) * 100) if total_applications > 0 else None
    )

    return Response({
        'total_applications': total_applications,
        'total_jobs': total_jobs,
        'active_jobs': active_jobs,
        'offers_made': offers_made,
        'offers_accepted': offers_accepted,
        'offers_declined': offers_declined,
        'offer_acceptance_rate': offer_acceptance_rate,
        'avg_applications_per_job': avg_applications_per_job,
        'time_to_hire_days': time_to_hire_days,
        'shortlist_rate': shortlist_rate,
    })
