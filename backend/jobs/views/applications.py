import logging

from django.db import models
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    Job, JobStatus,
    Application, ApplicationStatus,
    ActivityType,
    InterviewStageTemplate, StageInstanceStatus, ApplicationStageInstance,
)
from ..serializers import (
    ApplicationSerializer,
    ApplicationListSerializer,
    ApplicationCreateSerializer,
    CandidateApplicationListSerializer,
    MakeOfferSerializer,
    AcceptOfferSerializer,
    RejectApplicationSerializer,
)
from notifications.services.notification_service import NotificationService
from companies.models import CompanyUser, CompanyUserRole
from users.models import UserRole
from .activity import log_activity

logger = logging.getLogger(__name__)


# =============================================================================
# Application Endpoints
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_to_job(request):
    """
    Apply to a job.
    Candidates only.
    """
    from candidates.models import CandidateProfile

    # Check user is a candidate
    if request.user.role != UserRole.CANDIDATE:
        return Response(
            {'error': 'Only candidates can apply to jobs'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ApplicationCreateSerializer(
        data=request.data,
        context={'request': request}
    )
    if serializer.is_valid():
        application = serializer.save()

        # Create stage instances for all job stage templates
        stage_templates = InterviewStageTemplate.objects.filter(job=application.job).order_by('order')
        for template in stage_templates:
            ApplicationStageInstance.objects.create(
                application=application,
                stage_template=template,
                status=StageInstanceStatus.NOT_STARTED,
            )

        # Log the application activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.APPLIED,
            new_status=ApplicationStatus.APPLIED,
        )

        # Notify recruiter/hiring manager about new application
        NotificationService.notify_application_received(application)

        return Response(
            ApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_applications(request):
    """
    List the current candidate's applications.
    """
    from candidates.models import CandidateProfile

    if request.user.role != UserRole.CANDIDATE:
        return Response(
            {'error': 'Only candidates can view their applications'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        candidate = CandidateProfile.objects.get(user=request.user)
    except CandidateProfile.DoesNotExist:
        return Response(
            {'error': 'Candidate profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    applications = Application.objects.filter(
        candidate=candidate
    ).select_related(
        'job', 'job__company', 'job__location_city', 'job__location_country'
    ).prefetch_related(
        'job__required_skills', 'job__technologies'
    ).order_by('-applied_at')

    # Filter by status
    app_status = request.query_params.get('status')
    if app_status:
        applications = applications.filter(status=app_status)

    serializer = CandidateApplicationListSerializer(applications, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_application(request, application_id):
    """
    Get a single application.
    Candidate can view own, company/recruiter can view for their jobs.
    """
    from candidates.models import CandidateProfile

    try:
        application = Application.objects.select_related(
            'job', 'job__company', 'candidate', 'candidate__user', 'referrer'
        ).get(id=application_id)
    except Application.DoesNotExist:
        return Response(
            {'error': 'Application not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    is_own_application = (
        request.user.role == UserRole.CANDIDATE and
        application.candidate.user == request.user
    )
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        is_active=True
    ).exists()

    if not is_own_application and not is_staff and not is_company_member:
        return Response(
            {'error': 'You do not have permission to view this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ApplicationSerializer(application)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def withdraw_application(request, application_id):
    """
    Withdraw an application.
    Candidate only, and only if not already in interview process.
    """
    from candidates.models import CandidateProfile

    try:
        application = Application.objects.select_related(
            'job', 'candidate'
        ).get(id=application_id)
    except Application.DoesNotExist:
        return Response(
            {'error': 'Application not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check ownership
    if application.candidate.user != request.user:
        return Response(
            {'error': 'You do not have permission to withdraw this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check if already in interview process
    if application.status in [ApplicationStatus.OFFER, ApplicationStatus.ACCEPTED]:
        return Response(
            {'error': 'Cannot withdraw application at this stage'},
            status=status.HTTP_400_BAD_REQUEST
        )

    application.withdraw()

    # Decrement job applications count
    application.job.applications_count = max(0, application.job.applications_count - 1)
    application.job.save(update_fields=['applications_count'])

    # Notify recruiter/company that candidate withdrew
    try:
        NotificationService.notify_application_withdrawn(application)
    except Exception as e:
        logger.warning(f"Failed to send withdrawal notification: {e}")

    return Response(
        {'message': 'Application withdrawn'},
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_job_applications(request, job_id):
    """
    List all applications for a specific job.
    Company members or recruiters only.
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
            {'error': 'You do not have permission to view applications for this job'},
            status=status.HTTP_403_FORBIDDEN
        )

    applications = Application.objects.filter(
        job=job
    ).select_related(
        'candidate', 'candidate__user'
    ).order_by('-applied_at')

    # Filter by status
    app_status = request.query_params.get('status')
    if app_status:
        applications = applications.filter(status=app_status)

    # Filter by stage
    stage = request.query_params.get('stage')
    if stage:
        stage_int = int(stage)
        if stage_int == 0:
            applications = applications.filter(current_stage__isnull=True)
        else:
            applications = applications.filter(current_stage__order=stage_int)

    serializer = ApplicationListSerializer(applications, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def shortlist_application(request, application_id):
    """
    Move an application to shortlisted status.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response(
            {'error': 'You do not have permission to update this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Capture previous status before change
    previous_status = application.status

    # Allow shortlisting from any status (full flexibility for pipeline movement)
    application.shortlist()

    # Log the activity
    log_activity(
        application=application,
        user=request.user,
        activity_type=ActivityType.SHORTLISTED,
        previous_status=previous_status,
        new_status=application.status,
    )

    # Notify candidate they've been shortlisted
    NotificationService.notify_application_shortlisted(application)

    return Response(ApplicationSerializer(application).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_application(request, application_id):
    """
    Reject an application with structured reason and feedback.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response(
            {'error': 'You do not have permission to update this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Allow rejecting from any status (even already rejected - allows changing reason)

    serializer = RejectApplicationSerializer(data=request.data)
    if serializer.is_valid():
        # Capture previous status before change
        previous_status = application.status

        reason = serializer.validated_data.get('rejection_reason', '')
        feedback = serializer.validated_data.get('rejection_feedback', '')
        application.reject(reason=reason, feedback=feedback)

        # Log the activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.REJECTED,
            previous_status=previous_status,
            new_status=application.status,
            metadata={
                'rejection_reason': reason,
                'rejection_feedback': feedback,
            },
        )

        # Notify candidate about rejection
        NotificationService.notify_application_rejected(
            application=application,
            reason=reason,
            feedback=feedback,
        )

        return Response(ApplicationSerializer(application).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def make_offer(request, application_id):
    """
    Make an offer to a candidate with offer details.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response(
            {'error': 'You do not have permission to update this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Allow making offers from any status (full flexibility - can update/redo offers)
    serializer = MakeOfferSerializer(data=request.data)
    if serializer.is_valid():
        # Capture previous status before change
        previous_status = application.status
        is_update = application.status == ApplicationStatus.OFFER_MADE

        offer_details = serializer.validated_data.get('offer_details', {})
        # Convert date to string for JSON storage
        if offer_details.get('start_date'):
            offer_details['start_date'] = offer_details['start_date'].isoformat()
        application.make_offer(offer_details=offer_details)

        # Log the activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.OFFER_UPDATED if is_update else ActivityType.OFFER_MADE,
            previous_status=previous_status,
            new_status=application.status,
            metadata={'offer_details': offer_details},
        )

        # Notify candidate about the offer (for new offers, not updates)
        if not is_update:
            NotificationService.notify_offer_received(
                application=application,
                offer_details=offer_details,
            )

        return Response(ApplicationSerializer(application).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_offer(request, application_id):
    """
    Confirm offer acceptance with final details.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response(
            {'error': 'You do not have permission to update this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Allow accepting from any status (full flexibility for data corrections)
    from ..serializers import AcceptOfferSerializer
    serializer = AcceptOfferSerializer(data=request.data)
    if serializer.is_valid():
        # Capture previous status before change
        previous_status = application.status

        final_details = serializer.validated_data.get('final_offer_details')
        if final_details and final_details.get('start_date'):
            final_details['start_date'] = final_details['start_date'].isoformat()
        application.accept_offer(final_details=final_details)

        # Log the activity
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.OFFER_ACCEPTED,
            previous_status=previous_status,
            new_status=application.status,
            metadata={'final_offer_details': final_details or application.offer_details},
        )

        # Notify recruiter and client about offer acceptance
        try:
            NotificationService.notify_offer_accepted(application)
        except Exception as e:
            logger.warning(f"Failed to send offer accepted notification: {e}")

        # Check if job should be marked as filled
        job = application.job
        if job.status == JobStatus.PUBLISHED and getattr(job, 'positions_to_fill', 1) == 1:
            job.status = JobStatus.FILLED
            job.save(update_fields=['status'])
            try:
                NotificationService.notify_job_filled(job, hired_candidate=application)
            except Exception as e:
                logger.warning(f"Failed to send job filled notification: {e}")

        return Response(ApplicationSerializer(application).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decline_offer(request, application_id):
    """
    Record that a candidate declined an offer.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response(
            {'error': 'You do not have permission to update this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Must be in OFFER_MADE status to decline
    if application.status != ApplicationStatus.OFFER_MADE:
        return Response(
            {'error': 'Can only decline an offer that has been made'},
            status=status.HTTP_400_BAD_REQUEST
        )

    reason = request.data.get('reason', '')
    previous_status = application.status
    application.decline_offer(reason=reason)

    # Log the activity
    log_activity(
        application=application,
        user=request.user,
        activity_type=ActivityType.STAGE_CHANGED,
        previous_status=previous_status,
        new_status=application.status,
        metadata={'decline_reason': reason},
    )

    # Notify recruiter and client about offer decline
    try:
        NotificationService.notify_offer_declined(application, reason=reason)
    except Exception as e:
        logger.warning(f"Failed to send offer declined notification: {e}")

    return Response(ApplicationSerializer(application).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_to_stage(request, application_id):
    """
    Move an application to a specific interview stage.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response(
            {'error': 'You do not have permission to update this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Allow moving from any status (full flexibility for pipeline movement)
    stage_order = request.data.get('stage_order')
    if stage_order is None:
        return Response(
            {'error': 'stage_order is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        stage_order = int(stage_order)
    except (ValueError, TypeError):
        return Response(
            {'error': 'stage_order must be an integer'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate stage exists (0 = Applied, otherwise must match a template)
    stage_template = None
    if stage_order > 0:
        stage_template = InterviewStageTemplate.objects.filter(
            job=application.job,
            order=stage_order
        ).first()
        if not stage_template:
            max_stage = InterviewStageTemplate.objects.filter(
                job=application.job
            ).aggregate(max_order=models.Max('order'))['max_order'] or 0
            return Response(
                {'error': f'Invalid stage_order. Must be between 0 and {max_stage}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Capture previous state before change
    previous_status = application.status
    previous_stage = application.current_stage_order

    # Update current_stage FK (None = Applied)
    application.current_stage = stage_template
    if stage_template:
        application.status = ApplicationStatus.IN_PROGRESS
    else:
        application.status = ApplicationStatus.APPLIED

    # Clear rejection fields when moving to a non-rejected stage
    application.rejection_reason = ''
    application.rejection_feedback = ''
    application.rejected_at = None

    application.save()

    stage_name = stage_template.name if stage_template else 'Applied'

    # Log the activity
    log_activity(
        application=application,
        user=request.user,
        activity_type=ActivityType.STAGE_CHANGED,
        previous_status=previous_status,
        new_status=application.status,
        previous_stage=previous_stage,
        new_stage=stage_order,
        stage_name=stage_name,
    )

    return Response(ApplicationSerializer(application).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_application_notes(request, application_id):
    """
    Update notes for an application.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response(
            {'error': 'You do not have permission to update this application'},
            status=status.HTTP_403_FORBIDDEN
        )

    feedback = request.data.get('feedback')
    if feedback is not None:
        application.feedback = feedback

    stage_notes = request.data.get('stage_notes')
    if stage_notes is not None:
        # Merge with existing notes
        existing_notes = application.stage_notes or {}
        existing_notes.update(stage_notes)
        application.stage_notes = existing_notes

    application.save()
    return Response(ApplicationSerializer(application).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_application_view(request, application_id):
    """
    Record that an application was viewed.
    Debounced on frontend; creates one view event per session.
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

    # Create view activity
    log_activity(
        application=application,
        user=request.user,
        activity_type=ActivityType.APPLICATION_VIEWED,
    )

    return Response({'status': 'recorded'}, status=status.HTTP_201_CREATED)
