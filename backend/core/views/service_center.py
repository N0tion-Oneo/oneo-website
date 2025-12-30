"""
Service Center views for unified entity management.
Aggregates timeline data from multiple sources and provides service-level APIs.
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import UserRole
from core.models import Task, OnboardingHistory, OnboardingEntityType, EntityType
from core.serializers import TaskSerializer, TimelineEntrySerializer


def is_staff_user(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# ============================================================================
# Activity Type Normalization Map
# ============================================================================

ACTIVITY_TYPE_MAP = {
    # LeadActivity types
    'note_added': 'note',
    'stage_changed': 'stage_change',
    'meeting_scheduled': 'meeting_scheduled',
    'meeting_completed': 'meeting_completed',
    'meeting_cancelled': 'meeting_cancelled',
    'email_sent': 'email',
    'call_logged': 'call',
    'invitation_sent': 'invitation',
    'converted': 'conversion',
    'assigned': 'assignment',
    'created': 'created',

    # OnboardingHistory (single type)
    'onboarding_transition': 'stage_change',

    # ActivityLog (Application) types
    'applied': 'application',
    'shortlisted': 'shortlist',
    'offer_made': 'offer',
    'offer_updated': 'offer',
    'offer_accepted': 'offer_accepted',
    'rejected': 'rejection',
    'withdrawn': 'withdrawn',
    'application_viewed': 'view',
    'booking_link_sent': 'invitation',
    'interview_booked': 'meeting_scheduled',
    'interview_scheduled': 'meeting_scheduled',
    'interview_rescheduled': 'meeting_scheduled',
    'interview_cancelled': 'meeting_cancelled',

    # CandidateActivity types
    'profile_updated': 'profile_update',
    'profile_viewed': 'view',
    'job_viewed': 'view',
    'logged_in': 'login',
    'resume_uploaded': 'document',
    'resume_parsed': 'document',
    'experience_added': 'profile_update',
    'experience_updated': 'profile_update',
    'education_added': 'profile_update',
    'education_updated': 'profile_update',

    # StageFeedback and Task types
    'feedback': 'feedback',
    'task_completed': 'task_completed',
}


def normalize_activity_type(activity_type: str) -> str:
    """Normalize activity type to a common format."""
    return ACTIVITY_TYPE_MAP.get(activity_type, activity_type)


def get_performer_dict(user):
    """Convert a user to a performer dictionary."""
    if user is None:
        return None
    return {
        'id': str(user.id),
        'name': user.get_full_name() or user.email,
        'email': user.email,
    }


# ============================================================================
# Source Mapping Functions
# ============================================================================

def map_lead_activity(activity) -> dict:
    """Map LeadActivity to TimelineEntry format."""
    return {
        'id': str(activity.id),
        'source': 'lead_activity',
        'activity_type': normalize_activity_type(activity.activity_type),
        'title': activity.get_activity_type_display(),
        'content': activity.content or '',
        'performed_by': get_performer_dict(activity.performed_by),
        'metadata': {
            'original_type': activity.activity_type,
            'previous_stage': activity.previous_stage.name if activity.previous_stage else None,
            'new_stage': activity.new_stage.name if activity.new_stage else None,
            **(activity.metadata or {}),
        },
        'created_at': activity.created_at,
    }


def map_onboarding_history(history) -> dict:
    """Map OnboardingHistory to TimelineEntry format."""
    from_name = history.from_stage.name if history.from_stage else 'None'
    to_name = history.to_stage.name if history.to_stage else 'Unknown'

    return {
        'id': str(history.id),
        'source': 'onboarding_history',
        'activity_type': 'stage_change',
        'title': f'Stage changed: {from_name} → {to_name}',
        'content': history.notes or '',
        'performed_by': get_performer_dict(history.changed_by),
        'metadata': {
            'from_stage_id': history.from_stage.id if history.from_stage else None,
            'from_stage_name': from_name,
            'to_stage_id': history.to_stage.id if history.to_stage else None,
            'to_stage_name': to_name,
        },
        'created_at': history.created_at,
    }


def map_activity_log(log) -> dict:
    """Map ActivityLog (Application) to TimelineEntry format."""
    return {
        'id': str(log.id),
        'source': 'activity_log',
        'activity_type': normalize_activity_type(log.activity_type),
        'title': log.get_activity_type_display(),
        'content': '',
        'performed_by': get_performer_dict(log.performed_by),
        'metadata': {
            'original_type': log.activity_type,
            'application_id': str(log.application.id),
            'job_title': log.application.job.title if log.application.job else None,
            'previous_status': log.previous_status,
            'new_status': log.new_status,
            'stage_name': log.stage_name,
            **(log.metadata or {}),
        },
        'created_at': log.created_at,
    }


def map_candidate_activity(activity) -> dict:
    """Map CandidateActivity to TimelineEntry format."""
    return {
        'id': str(activity.id),
        'source': 'candidate_activity',
        'activity_type': normalize_activity_type(activity.activity_type),
        'title': activity.get_activity_type_display(),
        'content': '',
        'performed_by': get_performer_dict(activity.performed_by),
        'metadata': {
            'original_type': activity.activity_type,
            'job_id': str(activity.job.id) if activity.job else None,
            'job_title': activity.job.title if activity.job else None,
            **(activity.metadata or {}),
        },
        'created_at': activity.created_at,
    }


def map_booking(booking) -> dict:
    """Map Booking to TimelineEntry format."""
    # Determine activity type based on booking status
    status_to_type = {
        'pending': 'meeting_scheduled',
        'confirmed': 'meeting_scheduled',
        'completed': 'meeting_completed',
        'cancelled': 'meeting_cancelled',
        'no_show': 'meeting_cancelled',
    }
    activity_type = status_to_type.get(booking.status, 'meeting_scheduled')

    # Build title
    title = f"{booking.meeting_type.name}: {booking.title}"

    return {
        'id': str(booking.id),
        'source': 'booking',
        'activity_type': activity_type,
        'title': title,
        'content': booking.description or '',
        'performed_by': get_performer_dict(booking.organizer),
        'metadata': {
            'booking_id': str(booking.id),
            'meeting_type': booking.meeting_type.name,
            'status': booking.status,
            'scheduled_at': booking.scheduled_at.isoformat() if booking.scheduled_at else None,
            'duration_minutes': booking.duration_minutes,
            'location_type': booking.location_type,
            'meeting_url': booking.meeting_url or None,
        },
        'created_at': booking.created_at,
    }


def map_stage_feedback(feedback) -> dict:
    """Map StageFeedback to TimelineEntry format."""
    # Determine stage name
    if feedback.stage_instance:
        stage_name = feedback.stage_instance.stage_template.name
    elif feedback.stage_type:
        stage_name = feedback.get_stage_type_display()
    else:
        stage_name = 'Unknown Stage'

    return {
        'id': str(feedback.id),
        'source': 'stage_feedback',
        'activity_type': 'feedback',
        'title': f'Feedback on {stage_name}',
        'content': feedback.comment or '',
        'performed_by': get_performer_dict(feedback.author),
        'metadata': {
            'stage_name': stage_name,
            'stage_type': feedback.stage_type,
            'stage_instance_id': str(feedback.stage_instance.id) if feedback.stage_instance else None,
            'score': feedback.score,
        },
        'created_at': feedback.created_at,
    }


def map_task_completion(task) -> dict:
    """Map completed Task to TimelineEntry format."""
    return {
        'id': str(task.id),
        'source': 'task',
        'activity_type': 'task_completed',
        'title': f'Task completed: {task.title}',
        'content': task.description or '',
        'performed_by': get_performer_dict(task.assigned_to),
        'metadata': {
            'task_id': str(task.id),
            'priority': task.priority,
            'stage_template_id': str(task.stage_template.id) if task.stage_template else None,
            'stage_template_name': task.stage_template.name if task.stage_template else None,
        },
        'created_at': task.completed_at or task.updated_at,
    }


# ============================================================================
# Timeline Aggregation
# ============================================================================

def get_entity_timeline(entity_type: str, entity_id: str, limit: int = 50, sources: list = None):
    """
    Aggregate activities from all sources for an entity.

    Args:
        entity_type: 'lead', 'company', or 'candidate'
        entity_id: ID of the entity
        limit: Maximum number of entries to return
        sources: Optional list of sources to filter by

    Returns:
        List of TimelineEntry dictionaries sorted by created_at descending
    """
    entries = []
    available_sources = []

    if entity_type == 'lead':
        available_sources = ['lead_activity', 'onboarding_history', 'booking']

        if sources is None or 'lead_activity' in sources:
            from companies.models import LeadActivity
            for activity in LeadActivity.objects.filter(lead_id=entity_id).select_related(
                'performed_by', 'previous_stage', 'new_stage'
            )[:limit]:
                entries.append(map_lead_activity(activity))

        if sources is None or 'onboarding_history' in sources:
            for history in OnboardingHistory.objects.filter(
                entity_type='lead', entity_id=str(entity_id)
            ).select_related('from_stage', 'to_stage', 'changed_by')[:limit]:
                entries.append(map_onboarding_history(history))

        if sources is None or 'booking' in sources:
            from scheduling.models import Booking
            for booking in Booking.objects.filter(lead_id=entity_id).select_related(
                'meeting_type', 'organizer'
            )[:limit]:
                entries.append(map_booking(booking))

    elif entity_type == 'candidate':
        available_sources = ['candidate_activity', 'onboarding_history', 'booking', 'activity_log']

        if sources is None or 'candidate_activity' in sources:
            from candidates.models import CandidateActivity
            for activity in CandidateActivity.objects.filter(candidate_id=entity_id).select_related(
                'performed_by', 'job'
            )[:limit]:
                entries.append(map_candidate_activity(activity))

        if sources is None or 'onboarding_history' in sources:
            for history in OnboardingHistory.objects.filter(
                entity_type='candidate', entity_id=str(entity_id)
            ).select_related('from_stage', 'to_stage', 'changed_by')[:limit]:
                entries.append(map_onboarding_history(history))

        if sources is None or 'booking' in sources:
            from scheduling.models import Booking
            for booking in Booking.objects.filter(candidate_profile_id=entity_id).select_related(
                'meeting_type', 'organizer'
            )[:limit]:
                entries.append(map_booking(booking))

        if sources is None or 'activity_log' in sources:
            from jobs.models import Application, ActivityLog
            application_ids = Application.objects.filter(
                candidate_id=entity_id
            ).values_list('id', flat=True)
            for log in ActivityLog.objects.filter(
                application_id__in=application_ids
            ).select_related('performed_by', 'application__job')[:limit]:
                entries.append(map_activity_log(log))

    elif entity_type == 'company':
        available_sources = ['onboarding_history']

        if sources is None or 'onboarding_history' in sources:
            for history in OnboardingHistory.objects.filter(
                entity_type='company', entity_id=str(entity_id)
            ).select_related('from_stage', 'to_stage', 'changed_by')[:limit]:
                entries.append(map_onboarding_history(history))

        # TODO: Add company bookings when we determine how to link them

    elif entity_type == 'application':
        # Application timeline aggregates from:
        # - ActivityLog (application events)
        # - StageFeedback (interview feedback/comments)
        # - Task completions
        available_sources = ['activity_log', 'stage_feedback', 'task']

        if sources is None or 'activity_log' in sources:
            from jobs.models import ActivityLog
            for log in ActivityLog.objects.filter(
                application_id=entity_id
            ).select_related('performed_by', 'application__job')[:limit]:
                entries.append(map_activity_log(log))

        if sources is None or 'stage_feedback' in sources:
            from jobs.models import StageFeedback
            for feedback in StageFeedback.objects.filter(
                application_id=entity_id
            ).select_related('author', 'stage_instance__stage_template')[:limit]:
                entries.append(map_stage_feedback(feedback))

        if sources is None or 'task' in sources:
            from core.models import TaskStatus
            for task in Task.objects.filter(
                entity_type='application',
                entity_id=str(entity_id),
                status=TaskStatus.COMPLETED
            ).select_related('assigned_to', 'stage_template')[:limit]:
                entries.append(map_task_completion(task))

    # Sort all entries by timestamp
    entries.sort(key=lambda x: x['created_at'], reverse=True)
    return entries[:limit], available_sources


# ============================================================================
# API Views
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def timeline_list(request, entity_type, entity_id):
    """
    Get unified timeline for an entity.

    Query params:
    - limit: Maximum entries (default 50, max 200)
    - offset: Skip first N entries
    - sources: Comma-separated list of sources to include
    - activity_types: Comma-separated normalized activity types to filter
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    if entity_type not in ['lead', 'company', 'candidate', 'application']:
        return Response(
            {'error': 'Invalid entity_type. Must be lead, company, candidate, or application.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Parse query params
    limit = min(int(request.query_params.get('limit', 50)), 200)
    offset = int(request.query_params.get('offset', 0))

    sources_param = request.query_params.get('sources')
    sources = sources_param.split(',') if sources_param else None

    activity_types_param = request.query_params.get('activity_types')
    activity_types = activity_types_param.split(',') if activity_types_param else None

    # Get timeline entries
    entries, available_sources = get_entity_timeline(
        entity_type, entity_id, limit=limit + offset, sources=sources
    )

    # Apply activity type filter if specified
    if activity_types:
        entries = [e for e in entries if e['activity_type'] in activity_types]

    # Apply offset
    entries = entries[offset:offset + limit]

    # Serialize
    serializer = TimelineEntrySerializer(entries, many=True)

    return Response({
        'results': serializer.data,
        'count': len(entries),
        'sources_available': available_sources,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def timeline_add_note(request, entity_type, entity_id):
    """
    Add a note to an entity's timeline.
    Creates a LeadActivity or CandidateActivity depending on entity type.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    content = request.data.get('content', '').strip()
    if not content:
        return Response(
            {'error': 'Content is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if entity_type == 'lead':
        from companies.models import Lead, LeadActivity, LeadActivityType
        lead = get_object_or_404(Lead, id=entity_id)
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type=LeadActivityType.NOTE_ADDED,
            content=content,
            performed_by=request.user,
        )
        return Response(map_lead_activity(activity), status=status.HTTP_201_CREATED)

    elif entity_type == 'candidate':
        # For candidates, we need to add a note differently
        # CandidateActivity doesn't have a NOTE type, so we'll create a custom activity
        # Or we could use CandidateActivityNote attached to a profile view event
        # For now, return an error and we can implement this properly later
        return Response(
            {'error': 'Candidate notes not yet implemented. Use application notes instead.'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )

    elif entity_type == 'company':
        # Companies don't have their own activity model yet
        return Response(
            {'error': 'Company notes not yet implemented.'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )

    elif entity_type == 'application':
        # For applications, we create a StageFeedback with no specific stage
        # or add an ActivityNote to an existing activity
        # For simplicity, create a feedback entry
        from jobs.models import Application, StageFeedback
        application = get_object_or_404(Application, id=entity_id)
        # Create as an "applied" stage feedback (general note)
        feedback = StageFeedback.objects.create(
            application=application,
            stage_type='applied',  # General note attached to applied stage
            author=request.user,
            comment=content,
        )
        return Response(map_stage_feedback(feedback), status=status.HTTP_201_CREATED)

    return Response(
        {'error': 'Invalid entity_type'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def timeline_log_call(request, entity_type, entity_id):
    """
    Log a call in an entity's timeline.
    Creates a LeadActivity with call_logged type.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    notes = request.data.get('notes', '').strip()
    duration = request.data.get('duration_minutes')

    if entity_type == 'lead':
        from companies.models import Lead, LeadActivity, LeadActivityType
        lead = get_object_or_404(Lead, id=entity_id)
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type=LeadActivityType.CALL_LOGGED,
            content=notes,
            performed_by=request.user,
            metadata={'duration_minutes': duration} if duration else {},
        )
        return Response(map_lead_activity(activity), status=status.HTTP_201_CREATED)

    elif entity_type in ['candidate', 'company']:
        return Response(
            {'error': f'{entity_type.capitalize()} call logging not yet implemented.'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )

    elif entity_type == 'application':
        # For applications, create a StageFeedback as a call log
        from jobs.models import Application, StageFeedback
        application = get_object_or_404(Application, id=entity_id)
        feedback = StageFeedback.objects.create(
            application=application,
            stage_type='applied',  # General note attached to applied stage
            author=request.user,
            comment=f"Call logged ({duration} min)" if duration else "Call logged" + (f": {notes}" if notes else ""),
        )
        return Response(map_stage_feedback(feedback), status=status.HTTP_201_CREATED)

    return Response(
        {'error': 'Invalid entity_type'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_center_data(request, entity_type, entity_id):
    """
    Get all service center data for an entity.
    Returns entity details, tasks, timeline, and upcoming meetings.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    if entity_type not in ['lead', 'company', 'candidate', 'application']:
        return Response(
            {'error': 'Invalid entity_type'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get entity details
    entity_data = None
    upcoming_meetings = []
    now = timezone.now()

    if entity_type == 'lead':
        from companies.models import Lead
        from companies.serializers import LeadDetailSerializer
        from scheduling.models import Booking
        from scheduling.serializers import BookingSerializer
        lead = get_object_or_404(Lead, id=entity_id)
        entity_data = LeadDetailSerializer(lead).data
        bookings = Booking.objects.filter(
            lead_id=entity_id,
            scheduled_at__gte=now,
            status__in=['pending', 'confirmed']
        ).select_related('meeting_type', 'organizer').order_by('scheduled_at')[:5]
        upcoming_meetings = BookingSerializer(bookings, many=True).data

    elif entity_type == 'company':
        from companies.models import Company
        from companies.serializers import CompanyDetailSerializer
        company = get_object_or_404(Company, id=entity_id)
        entity_data = CompanyDetailSerializer(company).data

    elif entity_type == 'candidate':
        from candidates.models import CandidateProfile
        from candidates.serializers import CandidateProfileSerializer
        from scheduling.models import Booking
        from scheduling.serializers import BookingSerializer
        candidate = get_object_or_404(CandidateProfile, id=entity_id)
        entity_data = CandidateProfileSerializer(candidate).data
        bookings = Booking.objects.filter(
            candidate_profile_id=entity_id,
            scheduled_at__gte=now,
            status__in=['pending', 'confirmed']
        ).select_related('meeting_type', 'organizer').order_by('scheduled_at')[:5]
        upcoming_meetings = BookingSerializer(bookings, many=True).data

    elif entity_type == 'application':
        from jobs.models import Application, ApplicationStageInstance
        from jobs.serializers import ApplicationSerializer, ApplicationStageInstanceSerializer
        application = get_object_or_404(
            Application.objects.select_related('job', 'candidate'),
            id=entity_id
        )
        entity_data = ApplicationSerializer(application).data
        # Get upcoming scheduled interviews
        stage_instances = ApplicationStageInstance.objects.filter(
            application=application,
            scheduled_at__gte=now,
            status__in=['scheduled', 'in_progress']
        ).select_related('stage_template', 'interviewer').order_by('scheduled_at')[:5]
        upcoming_meetings = ApplicationStageInstanceSerializer(stage_instances, many=True).data

    # Get tasks for this entity
    tasks = Task.objects.filter(
        entity_type=entity_type,
        entity_id=str(entity_id)
    ).select_related('assigned_to', 'created_by', 'stage_template')
    tasks_data = TaskSerializer(tasks, many=True).data

    # Get timeline (last 20 entries)
    timeline_entries, _ = get_entity_timeline(entity_type, entity_id, limit=20)
    timeline_data = TimelineEntrySerializer(timeline_entries, many=True).data

    return Response({
        'entity': entity_data,
        'tasks': tasks_data,
        'timeline': timeline_data,
        'upcoming_meetings': upcoming_meetings,
        'health_score': None,  # TODO: Implement health score calculation
    })
