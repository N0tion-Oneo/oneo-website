"""
Dashboard API views for recruiters and admins.
Provides data for the recruiter dashboard including:
- Today's bookings
- Today's interviews
- Invitations (pending/completed)
- New applications
- Pipeline overview
- Recent activity
- Candidates needing attention
"""
from datetime import timedelta
from django.db.models import Count, Q, F, Max
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import DashboardSettings
from core.serializers import DashboardSettingsSerializer
from users.models import UserRole


def get_time_filter(time_filter: str):
    """Convert time filter string to timedelta for filtering."""
    now = timezone.now()
    if time_filter == '24h':
        return now - timedelta(hours=24)
    elif time_filter == '7d':
        return now - timedelta(days=7)
    elif time_filter == '30d':
        return now - timedelta(days=30)
    return None  # 'all' or invalid


def is_admin_or_recruiter(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# =============================================================================
# Dashboard Settings API
# =============================================================================

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def dashboard_settings(request):
    """
    GET: Retrieve dashboard settings.
    PATCH: Update dashboard settings (admin only).
    """
    if not is_admin_or_recruiter(request.user):
        return Response(
            {'error': 'Only recruiters and admins can access dashboard settings'},
            status=status.HTTP_403_FORBIDDEN
        )

    settings = DashboardSettings.get_settings()

    if request.method == 'GET':
        serializer = DashboardSettingsSerializer(settings)
        return Response(serializer.data)

    # PATCH - admin only
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can update dashboard settings'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = DashboardSettingsSerializer(settings, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Today's Bookings
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def todays_bookings(request):
    """
    Get today's bookings for the current user (or all for admins).
    Returns both upcoming and past bookings for today.
    """
    from scheduling.models import Booking, BookingStatus

    if not is_admin_or_recruiter(request.user):
        return Response(
            {'error': 'Only recruiters and admins can access this'},
            status=status.HTTP_403_FORBIDDEN
        )

    user = request.user
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Base queryset
    bookings = Booking.objects.filter(
        scheduled_at__gte=today_start,
        scheduled_at__lt=today_end,
    ).exclude(
        status=BookingStatus.CANCELLED
    ).select_related(
        'meeting_type',
        'attendee_user',
        'candidate_profile__user',
        'organizer',
    ).order_by('scheduled_at')

    # Filter by organizer unless admin
    if user.role != UserRole.ADMIN:
        bookings = bookings.filter(organizer=user)

    # Split into upcoming and past
    upcoming = []
    past = []

    for booking in bookings[:20]:  # Limit to 20
        # Determine join link or location based on location_type
        join_link = None
        location_info = None
        if booking.location_type == 'video':
            join_link = booking.meeting_url
        elif booking.location_type == 'phone':
            location_info = booking.attendee_phone or booking.location
        elif booking.location_type == 'in_person':
            location_info = booking.location

        booking_data = {
            'id': str(booking.id),
            'scheduled_at': booking.scheduled_at.isoformat(),
            'duration_minutes': booking.duration_minutes,
            'meeting_type_name': booking.meeting_type.name if booking.meeting_type else 'Meeting',
            'attendee_name': booking.attendee_name or (
                booking.attendee_user.full_name if booking.attendee_user else 'Unknown'
            ),
            'attendee_email': booking.attendee_email or (
                booking.attendee_user.email if booking.attendee_user else None
            ),
            'status': booking.status,
            'location_type': booking.location_type,
            'join_link': join_link,
            'location': location_info,
            'organizer_name': booking.organizer.full_name if booking.organizer else None,
            'organizer_id': booking.organizer.id if booking.organizer else None,
        }

        if booking.scheduled_at > now:
            upcoming.append(booking_data)
        else:
            past.append(booking_data)

    return Response({
        'upcoming': upcoming[:10],
        'past': past[:10],
        'total_today': len(upcoming) + len(past),
    })


# =============================================================================
# Today's Interviews
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def todays_interviews(request):
    """
    Get today's interviews (ApplicationStageInstances) for the current user.
    Shows: Company, Interviewer, Candidate, Job Title, Stage, Time, Status
    """
    from jobs.models import ApplicationStageInstance, StageInstanceStatus

    if not is_admin_or_recruiter(request.user):
        return Response(
            {'error': 'Only recruiters and admins can access this'},
            status=status.HTTP_403_FORBIDDEN
        )

    user = request.user
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Get scheduled interviews for today
    interviews = ApplicationStageInstance.objects.filter(
        scheduled_at__gte=today_start,
        scheduled_at__lt=today_end,
    ).exclude(
        status=StageInstanceStatus.CANCELLED
    ).select_related(
        'application__candidate__user',
        'application__job__company',
        'stage_template',
        'interviewer',
    ).order_by('scheduled_at')

    # Filter: admins see all, recruiters see their own or assigned
    if user.role != UserRole.ADMIN:
        interviews = interviews.filter(
            Q(interviewer=user) |
            Q(participants=user) |
            Q(application__job__assigned_recruiters=user)
        ).distinct()

    result = []
    for interview in interviews[:20]:
        app = interview.application
        job = app.job
        candidate = app.candidate

        result.append({
            'id': str(interview.id),
            'scheduled_at': interview.scheduled_at.isoformat(),
            'company_name': job.company.name if job.company else None,
            'interviewer_name': interview.interviewer.full_name if interview.interviewer else None,
            'candidate_name': candidate.user.full_name if candidate and candidate.user else 'Unknown',
            'candidate_id': candidate.id if candidate else None,
            'job_title': job.title,
            'job_id': str(job.id),
            'stage_name': interview.stage_template.name if interview.stage_template else 'Interview',
            'status': interview.status,
            'is_past': interview.scheduled_at < now,
        })

    return Response({
        'interviews': result[:10],
        'total_today': len(result),
    })


# =============================================================================
# Invitations
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invitations_summary(request):
    """
    Get invitation summary with pending and recently completed.
    Supports time_filter query param: 24h, 7d, 30d, all
    Separate tabs for client and candidate invitations.
    """
    from authentication.models import ClientInvitation, CandidateInvitation

    if not is_admin_or_recruiter(request.user):
        return Response(
            {'error': 'Only recruiters and admins can access this'},
            status=status.HTTP_403_FORBIDDEN
        )

    user = request.user
    time_filter = request.query_params.get('time_filter', '7d')
    since = get_time_filter(time_filter)
    now = timezone.now()

    # Base querysets
    if user.role == UserRole.ADMIN:
        client_invitations = ClientInvitation.objects.all()
        candidate_invitations = CandidateInvitation.objects.all()
    else:
        client_invitations = ClientInvitation.objects.filter(created_by=user)
        candidate_invitations = CandidateInvitation.objects.filter(created_by=user)

    # Pending invitations (not used, not expired)
    pending_client = client_invitations.filter(
        used_at__isnull=True,
        expires_at__gt=now,
    ).select_related('created_by').order_by('-created_at')

    pending_candidate = candidate_invitations.filter(
        used_at__isnull=True,
        expires_at__gt=now,
    ).select_related('created_by', 'booking').order_by('-created_at')

    # Completed invitations (with time filter)
    completed_client_qs = client_invitations.filter(used_at__isnull=False)
    completed_candidate_qs = candidate_invitations.filter(used_at__isnull=False)

    if since:
        completed_client_qs = completed_client_qs.filter(used_at__gte=since)
        completed_candidate_qs = completed_candidate_qs.filter(used_at__gte=since)

    completed_client = completed_client_qs.select_related(
        'created_by', 'used_by'
    ).order_by('-used_at')

    completed_candidate = completed_candidate_qs.select_related(
        'created_by', 'used_by', 'booking'
    ).order_by('-used_at')

    def serialize_client_invitation(inv):
        return {
            'token': str(inv.token),
            'email': inv.email,
            'created_at': inv.created_at.isoformat(),
            'created_by_name': inv.created_by.full_name if inv.created_by else None,
            'expires_at': inv.expires_at.isoformat(),
            'used_at': inv.used_at.isoformat() if inv.used_at else None,
            'used_by_name': inv.used_by.full_name if inv.used_by else None,
            'is_expired': inv.is_expired,
        }

    def serialize_candidate_invitation(inv):
        return {
            'token': str(inv.token),
            'email': inv.email,
            'name': inv.name,
            'created_at': inv.created_at.isoformat(),
            'created_by_name': inv.created_by.full_name if inv.created_by else None,
            'expires_at': inv.expires_at.isoformat(),
            'used_at': inv.used_at.isoformat() if inv.used_at else None,
            'used_by_name': inv.used_by.full_name if inv.used_by else None,
            'has_booking': inv.booking is not None,
            'is_expired': inv.is_expired,
        }

    return Response({
        'client': {
            'pending': [serialize_client_invitation(inv) for inv in pending_client[:10]],
            'pending_count': pending_client.count(),
            'completed': [serialize_client_invitation(inv) for inv in completed_client[:10]],
            'completed_count': completed_client.count(),
        },
        'candidate': {
            'pending': [serialize_candidate_invitation(inv) for inv in pending_candidate[:10]],
            'pending_count': pending_candidate.count(),
            'completed': [serialize_candidate_invitation(inv) for inv in completed_candidate[:10]],
            'completed_count': completed_candidate.count(),
        },
    })


# =============================================================================
# New Applications
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def new_applications(request):
    """
    Get new applications (in APPLIED status) from assigned jobs.
    Supports time_filter query param: 24h, 7d, 30d, all
    """
    from jobs.models import Application, ApplicationStatus, JobStatus

    if not is_admin_or_recruiter(request.user):
        return Response(
            {'error': 'Only recruiters and admins can access this'},
            status=status.HTTP_403_FORBIDDEN
        )

    user = request.user
    time_filter = request.query_params.get('time_filter', 'all')
    since = get_time_filter(time_filter)

    # Base queryset - only APPLIED status from published jobs
    applications = Application.objects.filter(
        status=ApplicationStatus.APPLIED,
        job__status=JobStatus.PUBLISHED,
    ).select_related(
        'candidate__user',
        'job__company',
    ).order_by('-applied_at')

    # Filter by assigned jobs unless admin
    if user.role != UserRole.ADMIN:
        applications = applications.filter(
            Q(job__assigned_recruiters=user) |
            Q(job__created_by=user)
        ).distinct()

    # Apply time filter
    if since:
        applications = applications.filter(applied_at__gte=since)

    result = []
    for app in applications[:10]:
        result.append({
            'id': str(app.id),
            'candidate_name': app.candidate.user.full_name if app.candidate and app.candidate.user else 'Unknown',
            'candidate_id': app.candidate.id if app.candidate else None,
            'job_title': app.job.title,
            'job_id': str(app.job.id),
            'company_name': app.job.company.name if app.job.company else None,
            'applied_at': app.applied_at.isoformat(),
        })

    return Response({
        'applications': result,
        'total_count': applications.count(),
    })


# =============================================================================
# Pipeline Overview
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pipeline_overview(request):
    """
    Get pipeline overview for all published assigned jobs.
    Shows job-by-job breakdown of candidates per stage.
    Also returns summary stats: open positions, offers pending.
    """
    from jobs.models import Job, JobStatus, Application, ApplicationStatus

    if not is_admin_or_recruiter(request.user):
        return Response(
            {'error': 'Only recruiters and admins can access this'},
            status=status.HTTP_403_FORBIDDEN
        )

    user = request.user

    # Get published jobs
    jobs = Job.objects.filter(
        status=JobStatus.PUBLISHED,
    ).select_related('company').prefetch_related(
        'applications',
        'stage_templates',
    ).order_by('-created_at')

    # Filter by assigned unless admin
    if user.role != UserRole.ADMIN:
        jobs = jobs.filter(
            Q(assigned_recruiters=user) |
            Q(created_by=user)
        ).distinct()

    # Build pipeline data
    pipeline_data = []
    total_open_positions = 0
    total_offers_pending = 0

    for job in jobs:
        # Count applications by status
        apps = job.applications.all()
        status_counts = {
            'applied': apps.filter(status=ApplicationStatus.APPLIED).count(),
            'shortlisted': apps.filter(status=ApplicationStatus.SHORTLISTED).count(),
            'in_progress': apps.filter(status=ApplicationStatus.IN_PROGRESS).count(),
            'offer_made': apps.filter(status=ApplicationStatus.OFFER_MADE).count(),
            'offer_accepted': apps.filter(status=ApplicationStatus.OFFER_ACCEPTED).count(),
            'rejected': apps.filter(status=ApplicationStatus.REJECTED).count(),
        }

        remaining = job.remaining_positions
        total_open_positions += remaining if remaining > 0 else 0
        total_offers_pending += status_counts['offer_made']

        pipeline_data.append({
            'job_id': str(job.id),
            'job_title': job.title,
            'company_name': job.company.name if job.company else None,
            'positions_to_fill': job.positions_to_fill,
            'hired_count': job.hired_count,
            'remaining_positions': remaining,
            'status_counts': status_counts,
            'total_applications': sum(status_counts.values()),
        })

    return Response({
        'jobs': pipeline_data,
        'summary': {
            'total_jobs': len(pipeline_data),
            'open_positions': total_open_positions,
            'offers_pending': total_offers_pending,
        },
    })


# =============================================================================
# Recent Activity
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    """
    Get recent activity on applications:
    - Notes added
    - Stage changes
    - Suggestions resolved/declined (from CandidateActivity)
    """
    from jobs.models import ActivityLog, ActivityNote, ActivityType

    if not is_admin_or_recruiter(request.user):
        return Response(
            {'error': 'Only recruiters and admins can access this'},
            status=status.HTTP_403_FORBIDDEN
        )

    user = request.user
    limit = int(request.query_params.get('limit', 10))
    now = timezone.now()
    since = now - timedelta(days=7)  # Last 7 days of activity

    # Get application activity (stage changes, offers, interviews, etc.)
    app_activity_qs = ActivityLog.objects.filter(
        created_at__gte=since,
        activity_type__in=[
            ActivityType.STAGE_CHANGED,
            ActivityType.SHORTLISTED,
            ActivityType.OFFER_MADE,
            ActivityType.OFFER_ACCEPTED,
            ActivityType.OFFER_UPDATED,
            ActivityType.REJECTED,
            ActivityType.INTERVIEW_BOOKED,
            ActivityType.INTERVIEW_SCHEDULED,
            ActivityType.INTERVIEW_RESCHEDULED,
            ActivityType.INTERVIEW_CANCELLED,
            ActivityType.BOOKING_LINK_SENT,
        ]
    ).select_related(
        'application__candidate__user',
        'application__job',
        'performed_by',
    ).order_by('-created_at')

    # Filter by assigned jobs unless admin
    if user.role != UserRole.ADMIN:
        app_activity_qs = app_activity_qs.filter(
            Q(application__job__assigned_recruiters=user) |
            Q(application__job__created_by=user)
        ).distinct()

    # Get activity notes (separate query)
    notes_qs = ActivityNote.objects.filter(
        created_at__gte=since,
    ).select_related(
        'activity__application__candidate__user',
        'activity__application__job',
        'author',
    ).order_by('-created_at')

    if user.role != UserRole.ADMIN:
        notes_qs = notes_qs.filter(
            Q(activity__application__job__assigned_recruiters=user) |
            Q(activity__application__job__created_by=user)
        ).distinct()

    # Note: CandidateActivity doesn't have suggestion types yet
    # This section can be expanded later when suggestion approval tracking is added

    # Combine and sort all activities
    activities = []

    for log in app_activity_qs[:limit]:
        activities.append({
            'type': 'stage_change',
            'activity_type': log.activity_type,
            'candidate_name': log.application.candidate.user.full_name if log.application.candidate and log.application.candidate.user else 'Unknown',
            'candidate_id': log.application.candidate.id if log.application.candidate else None,
            'job_title': log.application.job.title if log.application.job else None,
            'job_id': str(log.application.job.id) if log.application.job else None,
            'performed_by': log.performed_by.full_name if log.performed_by else 'System',
            'details': {
                'previous_status': log.previous_status,
                'new_status': log.new_status,
                'stage_name': log.stage_name,
            },
            'created_at': log.created_at.isoformat(),
        })

    for note in notes_qs[:limit]:
        activities.append({
            'type': 'note_added',
            'candidate_name': note.activity.application.candidate.user.full_name if note.activity.application.candidate and note.activity.application.candidate.user else 'Unknown',
            'candidate_id': note.activity.application.candidate.id if note.activity.application.candidate else None,
            'job_title': note.activity.application.job.title if note.activity.application.job else None,
            'job_id': str(note.activity.application.job.id) if note.activity.application.job else None,
            'performed_by': note.author.full_name if note.author else 'Unknown',
            'details': {
                'note_preview': note.content[:100] + '...' if len(note.content) > 100 else note.content,
            },
            'created_at': note.created_at.isoformat(),
        })

    # Sort by created_at descending and limit
    activities.sort(key=lambda x: x['created_at'], reverse=True)

    return Response({
        'activities': activities[:limit],
    })


# =============================================================================
# Candidates Needing Attention
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def candidates_needing_attention(request):
    """
    Get candidates that need attention based on configurable thresholds:
    - Not contacted in X days
    - Stuck in stage for X days
    - Interview prep needed (within X days)
    """
    from candidates.models import CandidateProfile, CandidateActivity
    from jobs.models import ApplicationStageInstance, StageInstanceStatus

    if not is_admin_or_recruiter(request.user):
        return Response(
            {'error': 'Only recruiters and admins can access this'},
            status=status.HTTP_403_FORBIDDEN
        )

    user = request.user
    settings = DashboardSettings.get_settings()
    now = timezone.now()

    # Get candidates based on role
    if user.role == UserRole.ADMIN:
        candidates = CandidateProfile.objects.all()
    else:
        candidates = CandidateProfile.objects.filter(assigned_to=user)

    candidates = candidates.select_related('user', 'onboarding_stage')

    # 1. Not contacted in X days
    contact_threshold = now - timedelta(days=settings.days_without_contact)
    not_contacted = []

    for candidate in candidates:
        # Check last activity (any type of interaction)
        last_activity = CandidateActivity.objects.filter(
            candidate=candidate
        ).order_by('-created_at').first()

        last_contact = last_activity.created_at if last_activity else candidate.created_at

        if last_contact < contact_threshold:
            not_contacted.append({
                'id': candidate.id,
                'name': candidate.user.full_name if candidate.user else 'Unknown',
                'email': candidate.user.email if candidate.user else None,
                'last_contact': last_contact.isoformat(),
                'days_since_contact': (now - last_contact).days,
                'stage': candidate.onboarding_stage.name if candidate.onboarding_stage else None,
            })

    # 2. Stuck in stage for X days
    # Using OnboardingHistory to find candidates who haven't changed stage
    from core.models import OnboardingHistory

    stuck_threshold = now - timedelta(days=settings.days_stuck_in_stage)
    stuck_in_stage = []

    for candidate in candidates:
        if not candidate.onboarding_stage:
            continue

        # Get last stage change
        last_change = OnboardingHistory.objects.filter(
            entity_type='candidate',
            entity_id=candidate.id,
        ).order_by('-created_at').first()

        stage_since = last_change.created_at if last_change else candidate.created_at

        if stage_since < stuck_threshold and not candidate.onboarding_stage.is_terminal:
            stuck_in_stage.append({
                'id': candidate.id,
                'name': candidate.user.full_name if candidate.user else 'Unknown',
                'email': candidate.user.email if candidate.user else None,
                'stage': candidate.onboarding_stage.name,
                'stage_color': candidate.onboarding_stage.color,
                'in_stage_since': stage_since.isoformat(),
                'days_in_stage': (now - stage_since).days,
            })

    # 3. Upcoming interviews needing prep
    prep_threshold = now + timedelta(days=settings.days_before_interview_prep)
    needs_prep = []

    upcoming_interviews = ApplicationStageInstance.objects.filter(
        scheduled_at__gte=now,
        scheduled_at__lte=prep_threshold,
        status=StageInstanceStatus.SCHEDULED,
    ).select_related(
        'application__candidate__user',
        'application__job__company',
        'stage_template',
    )

    if user.role != UserRole.ADMIN:
        upcoming_interviews = upcoming_interviews.filter(
            Q(interviewer=user) |
            Q(application__job__assigned_recruiters=user)
        ).distinct()

    for interview in upcoming_interviews:
        candidate = interview.application.candidate
        if candidate:
            needs_prep.append({
                'id': candidate.id,
                'name': candidate.user.full_name if candidate.user else 'Unknown',
                'email': candidate.user.email if candidate.user else None,
                'interview_id': str(interview.id),
                'interview_at': interview.scheduled_at.isoformat(),
                'days_until': (interview.scheduled_at - now).days,
                'job_title': interview.application.job.title if interview.application.job else None,
                'stage_name': interview.stage_template.name if interview.stage_template else 'Interview',
                'company_name': interview.application.job.company.name if interview.application.job and interview.application.job.company else None,
            })

    return Response({
        'not_contacted': not_contacted[:10],
        'not_contacted_count': len(not_contacted),
        'stuck_in_stage': stuck_in_stage[:10],
        'stuck_in_stage_count': len(stuck_in_stage),
        'needs_interview_prep': needs_prep[:10],
        'needs_interview_prep_count': len(needs_prep),
        'thresholds': {
            'days_without_contact': settings.days_without_contact,
            'days_stuck_in_stage': settings.days_stuck_in_stage,
            'days_before_interview_prep': settings.days_before_interview_prep,
        },
    })
