import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    Application, ApplicationStatus,
    ActivityLog, ActivityNote, ActivityType,
)
from ..serializers import (
    ActivityLogSerializer,
    ActivityNoteSerializer,
    ActivityNoteCreateSerializer,
)
from companies.models import CompanyUser
from users.models import UserRole

logger = logging.getLogger(__name__)


# =============================================================================
# Activity Log Helper
# =============================================================================

def log_activity(
    application,
    user,
    activity_type,
    previous_status=None,
    new_status=None,
    previous_stage=None,
    new_stage=None,
    stage_name='',
    metadata=None
):
    """
    Helper function to create an activity log entry.
    """
    return ActivityLog.objects.create(
        application=application,
        performed_by=user,
        activity_type=activity_type,
        previous_status=previous_status or '',
        new_status=new_status or '',
        previous_stage=previous_stage,
        new_stage=new_stage,
        stage_name=stage_name,
        metadata=metadata or {},
    )


# =============================================================================
# Activity Log Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_application_activities(request, application_id):
    """
    List all activity log entries for an application.
    Company members or recruiters only.
    """
    try:
        application = Application.objects.select_related(
            'job', 'job__company'
        ).get(id=application_id)
    except Application.DoesNotExist:
        return Response(
            {'error': 'Application not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        is_active=True
    ).exists()

    if not is_staff and not is_company_member:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    activities = ActivityLog.objects.filter(
        application=application
    ).select_related(
        'performed_by'
    ).prefetch_related(
        'notes', 'notes__author'
    ).order_by('-created_at')

    serializer = ActivityLogSerializer(activities, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_activity_note(request, application_id, activity_id):
    """
    Add a note to an activity log entry.
    Company members or recruiters only.
    """
    try:
        application = Application.objects.select_related(
            'job', 'job__company'
        ).get(id=application_id)
    except Application.DoesNotExist:
        return Response(
            {'error': 'Application not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        is_active=True
    ).exists()

    if not is_staff and not is_company_member:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        activity = ActivityLog.objects.get(
            id=activity_id,
            application=application
        )
    except ActivityLog.DoesNotExist:
        return Response(
            {'error': 'Activity not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ActivityNoteCreateSerializer(data=request.data)
    if serializer.is_valid():
        note = ActivityNote.objects.create(
            activity=activity,
            author=request.user,
            content=serializer.validated_data['content']
        )
        return Response(
            ActivityNoteSerializer(note).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
