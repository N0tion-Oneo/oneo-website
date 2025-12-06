import logging
import secrets
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import (
    Job, Application, ApplicationStatus,
    ActivityType,
    InterviewStageTemplate, StageInstanceStatus, ApplicationStageInstance,
)
from ..serializers import (
    ApplicationSerializer,
    InterviewStageTemplateSerializer,
    InterviewStageTemplateCreateSerializer,
    InterviewStageTemplateBulkSerializer,
    ApplicationStageInstanceSerializer,
    ScheduleStageSerializer,
    RescheduleStageSerializer,
    AssignAssessmentSerializer,
    SubmitAssessmentSerializer,
    CompleteStageSerializer,
)
from scheduling.models import UserCalendarConnection, BookingToken
from scheduling.services.calendar_service import CalendarService, CalendarServiceError
from notifications.services.notification_service import NotificationService
from companies.models import CompanyUser, CompanyUserRole
from users.models import UserRole
from .activity import log_activity

logger = logging.getLogger(__name__)
User = get_user_model()


# =============================================================================
# Interview Stage Template Endpoints (Job Pipeline Configuration)
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_create_stage_templates(request, job_id):
    """
    GET: List all stage templates for a job.
    POST: Create a new stage template for a job.
    """
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response(
            {'error': 'Job not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        is_active=True
    ).exists()

    if not is_staff and not is_company_member:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        templates = InterviewStageTemplate.objects.filter(job=job).order_by('order')
        serializer = InterviewStageTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Check editor permission for creation
        is_company_editor = CompanyUser.objects.filter(
            user=request.user,
            company=job.company,
            role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
            is_active=True
        ).exists()

        if not is_staff and not is_company_editor:
            return Response(
                {'error': 'You do not have permission to create stage templates'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = InterviewStageTemplateCreateSerializer(data=request.data)
        if serializer.is_valid():
            template = serializer.save(job=job)
            return Response(
                InterviewStageTemplateSerializer(template).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def stage_template_detail(request, job_id, template_id):
    """
    GET: Get a single stage template.
    PUT: Update a stage template.
    DELETE: Delete a stage template.
    """
    try:
        job = Job.objects.get(id=job_id)
        template = InterviewStageTemplate.objects.get(id=template_id, job=job)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
    except InterviewStageTemplate.DoesNotExist:
        return Response({'error': 'Stage template not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if request.method == 'GET':
        is_company_member = CompanyUser.objects.filter(
            user=request.user,
            company=job.company,
            is_active=True
        ).exists()
        if not is_staff and not is_company_member:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        return Response(InterviewStageTemplateSerializer(template).data)

    elif request.method == 'PUT':
        if not is_staff and not is_company_editor:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        serializer = InterviewStageTemplateCreateSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(InterviewStageTemplateSerializer(template).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        if not is_staff and not is_company_editor:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_stage_templates(request, job_id):
    """
    Bulk create/update stage templates for a job.
    Replaces all existing templates with the provided list.
    """
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = InterviewStageTemplateBulkSerializer(data=request.data)
    if serializer.is_valid():
        # Delete existing templates
        InterviewStageTemplate.objects.filter(job=job).delete()

        # Create new templates
        stages_data = serializer.validated_data['stages']
        created_templates = []
        for i, stage_data in enumerate(stages_data):
            if 'order' not in stage_data:
                stage_data['order'] = i + 1
            template = InterviewStageTemplate.objects.create(job=job, **stage_data)
            created_templates.append(template)

        return Response(
            InterviewStageTemplateSerializer(created_templates, many=True).data,
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reorder_stage_templates(request, job_id):
    """
    Reorder stage templates for a job.
    Expects: { "order": ["uuid1", "uuid2", "uuid3"] }
    """
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    order_list = request.data.get('order', [])
    if not order_list:
        return Response({'error': 'order list is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Update orders
    for i, template_id in enumerate(order_list):
        InterviewStageTemplate.objects.filter(id=template_id, job=job).update(order=i + 1)

    templates = InterviewStageTemplate.objects.filter(job=job).order_by('order')
    return Response(InterviewStageTemplateSerializer(templates, many=True).data)


# =============================================================================
# Application Stage Instance Endpoints (Candidate Scheduling)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_application_stage_instances(request, application_id):
    """
    List all stage instances for an application.
    Auto-creates missing instances if stage templates exist but instances don't.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        is_active=True
    ).exists()
    is_own_application = (
        hasattr(application, 'candidate') and
        application.candidate.user == request.user
    )

    if not is_staff and not is_company_member and not is_own_application:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    # Auto-create missing stage instances for this application
    stage_templates = InterviewStageTemplate.objects.filter(job=application.job)
    existing_template_ids = set(
        ApplicationStageInstance.objects.filter(application=application)
        .values_list('stage_template_id', flat=True)
    )

    for template in stage_templates:
        if template.id not in existing_template_ids:
            ApplicationStageInstance.objects.create(
                application=application,
                stage_template=template,
                status=StageInstanceStatus.NOT_STARTED,
            )

    instances = ApplicationStageInstance.objects.filter(
        application=application
    ).select_related(
        'stage_template', 'interviewer'
    ).order_by('stage_template__order')

    serializer = ApplicationStageInstanceSerializer(instances, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_stage_instance(request, application_id, instance_id):
    """
    Get a single stage instance.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related(
            'stage_template', 'interviewer'
        ).get(id=instance_id, application=application)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        is_active=True
    ).exists()
    is_own_application = (
        hasattr(application, 'candidate') and
        application.candidate.user == request.user
    )

    if not is_staff and not is_company_member and not is_own_application:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    return Response(ApplicationStageInstanceSerializer(instance).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_stage(request, application_id, instance_id):
    """
    Schedule an interview for a stage instance.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related('stage_template').get(
            id=instance_id, application=application
        )
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ScheduleStageSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data

        # Get interviewer if provided
        interviewer = None
        interviewer_id = data.get('interviewer_id')
        if interviewer_id:
            try:
                interviewer = User.objects.get(id=interviewer_id)
            except User.DoesNotExist:
                return Response({'error': 'Interviewer not found'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            interviewer = instance.stage_template.default_interviewer

        # Determine location
        location = data.get('location', '')
        if not location and instance.stage_template.requires_location:
            if instance.stage_template.use_company_address:
                company = application.job.company
                address_parts = [
                    company.billing_address or '',
                    str(company.billing_city) if company.billing_city else '',
                    str(company.billing_country) if company.billing_country else '',
                ]
                location = ', '.join(filter(None, address_parts))
            else:
                location = instance.stage_template.custom_location

        # Schedule the instance
        instance.scheduled_at = data['scheduled_at']
        instance.duration_minutes = data.get('duration_minutes') or instance.stage_template.default_duration_minutes
        instance.interviewer = interviewer
        instance.meeting_link = data.get('meeting_link', '')
        instance.location = location
        instance.meeting_notes = data.get('meeting_notes', '')
        instance.status = StageInstanceStatus.SCHEDULED
        instance.save()

        # Handle additional participants
        participant_ids = data.get('participant_ids', [])
        if participant_ids:
            participants = User.objects.filter(id__in=participant_ids)
            instance.participants.set(participants)

        # Create calendar event with auto-generated meeting link if requested
        if data.get('send_calendar_invite', False) and interviewer:
            try:
                connection = UserCalendarConnection.objects.filter(
                    user=interviewer,
                    is_active=True
                ).first()

                if connection:
                    attendees = [application.candidate.user.email]
                    for participant in instance.participants.all():
                        if participant.email and participant.email not in attendees:
                            attendees.append(participant.email)

                    CalendarService.create_event_with_meeting_link(
                        connection=connection,
                        stage_instance=instance,
                        attendees=attendees,
                    )
                    instance.refresh_from_db()
            except CalendarServiceError as e:
                logger.warning(f"Failed to create calendar event: {e}")

        # Log activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.INTERVIEW_SCHEDULED,
            new_stage=instance.stage_template.order,
            stage_name=instance.stage_template.name,
            metadata={
                'stage_name': instance.stage_template.name,
                'stage_type': instance.stage_template.stage_type,
                'scheduled_at': data['scheduled_at'].isoformat(),
                'duration_minutes': instance.duration_minutes,
                'interviewer_name': interviewer.full_name if interviewer else None,
                'meeting_link': instance.meeting_link or None,
                'location': instance.location or None,
            }
        )

        # Send notification to candidate
        try:
            notification_service = NotificationService()
            notification_service.send_interview_scheduled(instance)
        except Exception as e:
            logger.warning(f"Failed to send notification: {e}")

        return Response(ApplicationStageInstanceSerializer(instance).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def reschedule_stage(request, application_id, instance_id):
    """
    Reschedule an interview.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related('stage_template').get(
            id=instance_id, application=application
        )
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = RescheduleStageSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        old_time = instance.scheduled_at

        instance.scheduled_at = data['scheduled_at']
        if 'duration_minutes' in data:
            instance.duration_minutes = data['duration_minutes']
        if 'interviewer_id' in data and data['interviewer_id']:
            try:
                instance.interviewer = User.objects.get(id=data['interviewer_id'])
            except User.DoesNotExist:
                return Response({'error': 'Interviewer not found'}, status=status.HTTP_400_BAD_REQUEST)
        if 'meeting_link' in data:
            instance.meeting_link = data['meeting_link']
        if 'location' in data:
            instance.location = data['location']
        if 'meeting_notes' in data:
            instance.meeting_notes = data['meeting_notes']
        instance.save()

        # Handle additional participants
        if 'participant_ids' in data:
            participant_ids = data.get('participant_ids', [])
            if participant_ids:
                participants = User.objects.filter(id__in=participant_ids)
                instance.participants.set(participants)
            else:
                instance.participants.clear()

        # Update calendar event if requested
        if data.get('send_calendar_invite', False) and instance.interviewer:
            try:
                connection = UserCalendarConnection.objects.filter(
                    user=instance.interviewer,
                    is_active=True
                ).first()

                if connection and (instance.google_calendar_event_id or instance.microsoft_calendar_event_id):
                    attendees = [application.candidate.user.email]
                    for participant in instance.participants.all():
                        if participant.email and participant.email not in attendees:
                            attendees.append(participant.email)

                    CalendarService.update_calendar_event(
                        connection=connection,
                        stage_instance=instance,
                        attendees=attendees,
                    )
                    instance.refresh_from_db()
            except CalendarServiceError as e:
                logger.warning(f"Failed to update calendar event: {e}")

        # Log activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.INTERVIEW_RESCHEDULED,
            new_stage=instance.stage_template.order,
            stage_name=instance.stage_template.name,
            metadata={
                'stage_name': instance.stage_template.name,
                'stage_type': instance.stage_template.stage_type,
                'old_time': old_time.isoformat() if old_time else None,
                'new_time': data['scheduled_at'].isoformat(),
                'scheduled_at': data['scheduled_at'].isoformat(),
                'duration_minutes': instance.duration_minutes,
                'reason': data.get('reschedule_reason', ''),
                'interviewer_name': instance.interviewer.full_name if instance.interviewer else None,
                'meeting_link': instance.meeting_link or None,
                'location': instance.location or None,
            }
        )

        # Send rescheduled notification
        try:
            notification_service = NotificationService()
            notification_service.send_interview_rescheduled(
                instance,
                old_time=old_time,
                reason=data.get('reschedule_reason', '')
            )
        except Exception as e:
            logger.warning(f"Failed to send reschedule notification: {e}")

        return Response(ApplicationStageInstanceSerializer(instance).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_stage(request, application_id, instance_id):
    """
    Cancel a scheduled stage.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related('stage_template').get(
            id=instance_id, application=application
        )
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    instance.status = StageInstanceStatus.CANCELLED
    instance.save()

    # Log activity
    log_activity(
        application=application,
        user=request.user,
        activity_type=ActivityType.INTERVIEW_CANCELLED,
        new_stage=instance.stage_template.order,
        stage_name=instance.stage_template.name,
        metadata={
            'stage_name': instance.stage_template.name,
            'scheduled_at': instance.scheduled_at.isoformat() if instance.scheduled_at else None,
        }
    )

    # Delete calendar event if exists
    if instance.interviewer and (instance.google_calendar_event_id or instance.microsoft_calendar_event_id):
        try:
            connection = UserCalendarConnection.objects.filter(
                user=instance.interviewer,
                is_active=True
            ).first()

            if connection:
                CalendarService.delete_calendar_event(
                    connection=connection,
                    stage_instance=instance,
                )
        except CalendarServiceError as e:
            logger.warning(f"Failed to delete calendar event: {e}")

    # Send cancellation notification
    try:
        notification_service = NotificationService()
        notification_service.send_interview_cancelled(instance)
    except Exception as e:
        logger.warning(f"Failed to send cancellation notification: {e}")

    return Response(ApplicationStageInstanceSerializer(instance).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_stage(request, application_id, instance_id):
    """
    Mark a stage as completed with feedback.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related('stage_template').get(
            id=instance_id, application=application
        )
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = CompleteStageSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        instance.complete(
            feedback=data.get('feedback', ''),
            score=data.get('score'),
            recommendation=data.get('recommendation', '')
        )

        # Log activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.STAGE_CHANGED,
            new_stage=instance.stage_template.order,
            stage_name=instance.stage_template.name,
            metadata={
                'action': 'completed',
                'feedback': data.get('feedback', ''),
                'score': data.get('score'),
                'recommendation': data.get('recommendation', ''),
            }
        )

        # Send notifications
        try:
            NotificationService.notify_stage_completed(instance, result=data.get('recommendation', ''))
        except Exception as e:
            logger.warning(f"Failed to send stage completed notification: {e}")

        if data.get('feedback'):
            try:
                NotificationService.notify_feedback_received(instance)
            except Exception as e:
                logger.warning(f"Failed to send feedback notification: {e}")

        return Response(ApplicationStageInstanceSerializer(instance).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reopen_stage(request, application_id, instance_id):
    """
    Reopen a completed or cancelled stage (undo complete/cancel).
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related('stage_template').get(
            id=instance_id, application=application
        )
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    # Only allow reopening completed or cancelled stages
    if instance.status not in [StageInstanceStatus.COMPLETED, StageInstanceStatus.CANCELLED]:
        return Response(
            {'error': 'Only completed or cancelled stages can be reopened'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Determine the new status
    if instance.scheduled_at:
        new_status = StageInstanceStatus.SCHEDULED
    else:
        new_status = StageInstanceStatus.NOT_STARTED

    old_status = instance.status
    instance.status = new_status
    instance.completed_at = None
    instance.save()

    # Log activity
    log_activity(
        application=application,
        user=request.user,
        activity_type=ActivityType.STAGE_CHANGED,
        new_stage=instance.stage_template.order,
        stage_name=instance.stage_template.name,
        metadata={
            'action': 'reopened',
            'previous_status': old_status,
            'new_status': new_status,
        }
    )

    return Response(ApplicationStageInstanceSerializer(instance).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_assessment(request, application_id, instance_id):
    """
    Assign an assessment to a candidate with deadline.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related('stage_template').get(
            id=instance_id, application=application
        )
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check this is an assessment stage
    if not instance.stage_template.is_assessment:
        return Response(
            {'error': 'This stage is not an assessment type'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = AssignAssessmentSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data

        instance.deadline = data['deadline']
        instance.meeting_notes = data.get('instructions', '') or instance.stage_template.assessment_instructions
        instance.meeting_link = data.get('external_url', '') or instance.stage_template.assessment_external_url
        instance.status = StageInstanceStatus.AWAITING_SUBMISSION
        instance.save()

        # Log activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.STAGE_CHANGED,
            new_stage=instance.stage_template.order,
            stage_name=instance.stage_template.name,
            metadata={
                'action': 'assessment_assigned',
                'deadline': data['deadline'].isoformat(),
            }
        )

        # Send notification to candidate
        if data.get('send_notification', True):
            NotificationService.notify_assessment_assigned(instance)

        return Response(ApplicationStageInstanceSerializer(instance).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_assessment(request, application_id, instance_id):
    """
    Candidate submits an assessment.
    """
    try:
        application = Application.objects.select_related('job', 'job__company', 'candidate').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related('stage_template').get(
            id=instance_id, application=application
        )
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check this is the candidate's application
    if application.candidate.user != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    # Check the stage is awaiting submission
    if instance.status != StageInstanceStatus.AWAITING_SUBMISSION:
        return Response(
            {'error': 'This stage is not awaiting submission'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = SubmitAssessmentSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data

        instance.submission_url = data.get('submission_url', '')
        if data.get('submission_file'):
            instance.submission_file = data['submission_file']
        instance.submitted_at = timezone.now()
        instance.status = StageInstanceStatus.SUBMITTED
        instance.save()

        # Log activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.STAGE_CHANGED,
            new_stage=instance.stage_template.order,
            stage_name=instance.stage_template.name,
            metadata={'action': 'assessment_submitted'}
        )

        # Notify recruiter
        NotificationService.notify_submission_received(instance)

        return Response(ApplicationStageInstanceSerializer(instance).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_to_stage_template(request, application_id, template_id):
    """
    Move an application to a specific stage template.
    Creates a stage instance if it doesn't exist.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
        template = InterviewStageTemplate.objects.get(id=template_id, job=application.job)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except InterviewStageTemplate.DoesNotExist:
        return Response({'error': 'Stage template not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    # Get the previous stage instance (if any)
    previous_stage_instance = None
    if application.current_stage_order:
        previous_stage_instance = ApplicationStageInstance.objects.filter(
            application=application,
            stage_template__order=application.current_stage_order
        ).first()

    # Get or create stage instance
    instance, created = ApplicationStageInstance.objects.get_or_create(
        application=application,
        stage_template=template,
        defaults={'status': StageInstanceStatus.NOT_STARTED}
    )

    # Update application's current stage
    previous_stage = application.current_stage_order
    application.current_stage_order = template.order
    application.status = ApplicationStatus.IN_PROGRESS
    application.save()

    # Log activity
    log_activity(
        application=application,
        user=request.user,
        activity_type=ActivityType.STAGE_CHANGED,
        previous_stage=previous_stage,
        new_stage=template.order,
        stage_name=template.name,
    )

    # Send notification
    try:
        NotificationService.notify_application_stage_advanced(
            application=application,
            from_stage=previous_stage_instance,
            to_stage=instance,
        )
    except Exception as e:
        logger.warning(f"Failed to send stage advancement notification: {e}")

    return Response({
        'application': ApplicationSerializer(application).data,
        'stage_instance': ApplicationStageInstanceSerializer(instance).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_booking_link(request, application_id, instance_id):
    """
    Send a booking link to the candidate so they can self-schedule.
    Creates a BookingToken and sends it via email.
    """
    try:
        application = Application.objects.select_related('job', 'job__company', 'candidate__user').get(id=application_id)
        instance = ApplicationStageInstance.objects.select_related('stage_template', 'interviewer').get(
            id=instance_id, application=application
        )
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    # Check if stage requires scheduling
    if not instance.stage_template.requires_scheduling:
        return Response({
            'error': 'This stage type does not require scheduling'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Get interviewer
    interviewer_id = request.data.get('interviewer_id')
    if interviewer_id:
        try:
            interviewer = User.objects.get(id=interviewer_id)
        except User.DoesNotExist:
            return Response({
                'error': 'Interviewer not found'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        interviewer = instance.interviewer or instance.stage_template.default_interviewer

    if not interviewer:
        return Response({
            'error': 'Please assign an interviewer before sending booking link'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Update interviewer on instance
    instance.interviewer = interviewer
    instance.save(update_fields=['interviewer'])

    # Delete any existing booking token
    BookingToken.objects.filter(stage_instance=instance).delete()

    # Create new booking token
    booking = BookingToken.objects.create(
        stage_instance=instance,
        token=secrets.token_urlsafe(32),
        expires_at=timezone.now() + timedelta(days=7),
    )

    # Build booking URL
    from django.conf import settings
    booking_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/book/{booking.token}"

    # Send email with booking link
    try:
        notification_service = NotificationService()
        notification_service.send_booking_link(
            stage_instance=instance,
            booking_url=booking_url,
        )
    except Exception as e:
        logger.warning(f"Failed to send booking link email: {e}")

    # Log activity
    log_activity(
        application=application,
        user=request.user,
        activity_type=ActivityType.BOOKING_LINK_SENT,
        new_stage=instance.stage_template.order,
        stage_name=instance.stage_template.name,
        metadata={
            'stage_name': instance.stage_template.name,
            'booking_url': booking_url,
            'expires_at': booking.expires_at.isoformat(),
            'interviewer_name': interviewer.full_name if interviewer else None,
        }
    )

    return Response({
        'booking_url': booking_url,
        'expires_at': booking.expires_at.isoformat(),
        'message': f'Booking link sent to {application.candidate.user.email}',
    })
