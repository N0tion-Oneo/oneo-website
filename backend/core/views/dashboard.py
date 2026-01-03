"""
Dashboard API views for recruiters and admins.
Provides data for the recruiter dashboard including:
- Today's bookings
- Today's interviews
- Invitations (pending/completed)
- New applications
- Pipeline overview
- Recent activity
"""
from datetime import timedelta
from django.db.models import Count, Q, F, Max
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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
    Works for admins, recruiters, and clients.
    """
    from jobs.models import ApplicationStageInstance, StageInstanceStatus

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

    # Filter based on role
    if user.role == UserRole.CLIENT:
        # Client users see interviews for their company's jobs
        membership = user.company_memberships.select_related('company').first()
        if not membership:
            return Response({'interviews': [], 'total_today': 0})
        interviews = interviews.filter(application__job__company=membership.company)
    elif user.role == UserRole.RECRUITER:
        # Recruiters see their own or assigned interviews
        interviews = interviews.filter(
            Q(interviewer=user) |
            Q(participants=user) |
            Q(application__job__assigned_recruiters=user)
        ).distinct()
    # Admins see all

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
    Works for admins, recruiters, and clients.
    """
    from jobs.models import Job, JobStatus, Application, ApplicationStatus

    user = request.user

    # Get published jobs
    jobs = Job.objects.filter(
        status=JobStatus.PUBLISHED,
    ).select_related('company').prefetch_related(
        'applications',
        'stage_templates',
    ).order_by('-created_at')

    # Filter based on role
    if user.role == UserRole.CLIENT:
        # Client users see jobs for their company
        membership = user.company_memberships.select_related('company').first()
        if not membership:
            return Response({
                'jobs': [],
                'summary': {'total_jobs': 0, 'open_positions': 0, 'offers_pending': 0},
            })
        jobs = jobs.filter(company=membership.company)
    elif user.role == UserRole.RECRUITER:
        # Recruiters see assigned jobs or jobs they created
        jobs = jobs.filter(
            Q(assigned_recruiters=user) |
            Q(created_by=user)
        ).distinct()
    # Admins see all jobs

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

    # Filter based on user role
    if user.role == UserRole.CLIENT:
        # Client users see activity for their company's jobs
        membership = user.company_memberships.select_related('company').first()
        if not membership:
            return Response({'activities': []})
        app_activity_qs = app_activity_qs.filter(
            application__job__company=membership.company
        )
    elif user.role == UserRole.RECRUITER:
        # Recruiters see activity for assigned/created jobs
        app_activity_qs = app_activity_qs.filter(
            Q(application__job__assigned_recruiters=user) |
            Q(application__job__created_by=user)
        ).distinct()
    # Admins see all activity

    # Get activity notes (separate query)
    notes_qs = ActivityNote.objects.filter(
        created_at__gte=since,
    ).select_related(
        'activity__application__candidate__user',
        'activity__application__job',
        'author',
    ).order_by('-created_at')

    # Filter notes based on user role
    if user.role == UserRole.CLIENT:
        membership = user.company_memberships.select_related('company').first()
        if membership:
            notes_qs = notes_qs.filter(
                activity__application__job__company=membership.company
            )
        else:
            notes_qs = notes_qs.none()
    elif user.role == UserRole.RECRUITER:
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
