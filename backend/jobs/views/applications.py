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

        # Notification handled by automation rule: [Auto] Application Received - Notify Recruiter

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


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def get_application(request, application_id):
    """
    Get or update a single application.
    GET: Candidate can view own, company/recruiter can view for their jobs.
    PATCH: Staff can update assigned recruiters.
    """
    from candidates.models import CandidateProfile
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        application = Application.objects.select_related(
            'job', 'job__company', 'candidate', 'candidate__user', 'referrer'
        ).prefetch_related('assigned_recruiters').get(id=application_id)
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

    if request.method == 'PATCH':
        # Only staff can update assigned recruiters
        if not is_staff:
            return Response(
                {'error': 'Only staff can update application assignments'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Handle assigned_recruiter_ids update
        assigned_recruiter_ids = request.data.get('assigned_recruiter_ids')
        if assigned_recruiter_ids is not None:
            # Validate and set assigned recruiters
            recruiters = User.objects.filter(
                id__in=assigned_recruiter_ids,
                role__in=[UserRole.ADMIN, UserRole.RECRUITER]
            )
            application.assigned_recruiters.set(recruiters)

        return Response(ApplicationListSerializer(application).data)

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

    # Notification handled by automation rule: [Auto] Application Withdrawn - Notify Recruiter

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

    # Notification handled by automation rule: [Auto] Application Shortlisted - Notify Candidate

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

        # Notification handled by automation rule: [Auto] Application Rejected - Notify Candidate

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
        # Convert types for JSON storage
        if offer_details.get('start_date'):
            offer_details['start_date'] = offer_details['start_date'].isoformat()
        # Convert Decimal to float for JSON storage
        if offer_details.get('annual_salary'):
            offer_details['annual_salary'] = float(offer_details['annual_salary'])
        # Convert benefit costs to float
        if offer_details.get('benefits'):
            for benefit in offer_details['benefits']:
                if 'annual_cost' in benefit:
                    benefit['annual_cost'] = float(benefit['annual_cost'])
        # Convert equity values to float
        if offer_details.get('equity'):
            equity = offer_details['equity']
            if 'share_value' in equity:
                equity['share_value'] = float(equity['share_value'])
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

        # Notification handled by automation rule: [Auto] Offer Received - Notify Candidate

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
        if final_details:
            # Convert types for JSON storage
            if final_details.get('start_date'):
                final_details['start_date'] = final_details['start_date'].isoformat()
            # Convert Decimal to float for JSON storage
            if final_details.get('annual_salary'):
                final_details['annual_salary'] = float(final_details['annual_salary'])
            # Convert benefit costs to float
            if final_details.get('benefits'):
                for benefit in final_details['benefits']:
                    if 'annual_cost' in benefit:
                        benefit['annual_cost'] = float(benefit['annual_cost'])
            # Convert equity values to float
            if final_details.get('equity'):
                equity = final_details['equity']
                if 'share_value' in equity:
                    equity['share_value'] = float(equity['share_value'])
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

        # Notifications handled by automation rules:
        # - [Auto] Offer Accepted - Notify Client/Recruiter
        # - [Auto] Job Filled - Notify Client (if job becomes filled)

        # Check if job should be marked as filled
        job = application.job
        job.update_fill_status()

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

    # Notification handled by automation rule: [Auto] Offer Declined - Notify Client/Recruiter

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

    # Handle status-specific feedback (for Applied and Shortlisted stages)
    applied_feedback = request.data.get('applied_feedback')
    if applied_feedback is not None:
        application.applied_feedback = applied_feedback

    applied_score = request.data.get('applied_score')
    if applied_score is not None:
        if applied_score and (int(applied_score) < 1 or int(applied_score) > 10):
            return Response(
                {'error': 'Applied score must be between 1 and 10'},
                status=status.HTTP_400_BAD_REQUEST
            )
        application.applied_score = applied_score if applied_score else None

    shortlisted_feedback = request.data.get('shortlisted_feedback')
    if shortlisted_feedback is not None:
        application.shortlisted_feedback = shortlisted_feedback

    shortlisted_score = request.data.get('shortlisted_score')
    if shortlisted_score is not None:
        if shortlisted_score and (int(shortlisted_score) < 1 or int(shortlisted_score) > 10):
            return Response(
                {'error': 'Shortlisted score must be between 1 and 10'},
                status=status.HTTP_400_BAD_REQUEST
            )
        application.shortlisted_score = shortlisted_score if shortlisted_score else None

    application.save()
    return Response(ApplicationSerializer(application).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_applications(request):
    """
    List all applications across all jobs.
    Admin/Recruiter only - scoped to their accessible jobs.

    Query Parameters:
    - status: Filter by application status
    - stage: Filter by current stage order (0 = Applied)
    - job: Filter by job ID
    - job_status: Filter by job status (published, closed, etc.)
    - company: Filter by company ID
    - recruiter: Filter by assigned recruiter ID (job.created_by)
    - applied_after: Date range start
    - applied_before: Date range end
    - search: Text search (candidate name, job title)
    - ordering: Sort field (default: -applied_at)
    - page: Page number
    - page_size: Results per page (default: 20, max: 100)
    """
    from django.db.models import Q, F, Value, CharField
    from django.db.models.functions import Concat
    from django.core.paginator import Paginator, EmptyPage

    # Check permission - admin, recruiter, or client
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.CLIENT]:
        return Response(
            {'error': 'Only admins, recruiters, and clients can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Base queryset with select_related for performance
    applications = Application.objects.select_related(
        'job', 'job__company', 'job__created_by',
        'candidate', 'candidate__user',
        'current_stage',
    ).prefetch_related(
        'assigned_recruiters',
    ).order_by('-applied_at')

    # Scope to accessible jobs based on role
    if request.user.role == UserRole.RECRUITER:
        # Recruiters see applications for jobs they created or are assigned to
        from django.db.models import Q
        applications = applications.filter(
            Q(job__created_by=request.user) | Q(job__assigned_recruiters=request.user)
        )
    elif request.user.role == UserRole.CLIENT:
        # Clients see applications for their company's jobs only
        company_membership = request.user.company_memberships.first()
        if company_membership:
            applications = applications.filter(job__company=company_membership.company)
        else:
            applications = applications.none()

    # Filter by status
    app_status = request.query_params.get('status')
    if app_status:
        applications = applications.filter(status=app_status)

    # Filter by stage (0 = Applied, >0 = stage order)
    stage = request.query_params.get('stage')
    if stage is not None and stage != '':
        try:
            stage_int = int(stage)
            if stage_int == 0:
                applications = applications.filter(current_stage__isnull=True)
            else:
                applications = applications.filter(current_stage__order=stage_int)
        except ValueError:
            pass

    # Filter by job
    job_id = request.query_params.get('job')
    if job_id:
        applications = applications.filter(job_id=job_id)

    # Filter by job status
    job_status_filter = request.query_params.get('job_status')
    if job_status_filter:
        applications = applications.filter(job__status=job_status_filter)

    # Filter by company
    company_id = request.query_params.get('company')
    if company_id:
        applications = applications.filter(job__company_id=company_id)

    # Filter by recruiter (job creator)
    recruiter_id = request.query_params.get('recruiter')
    if recruiter_id:
        applications = applications.filter(job__created_by_id=recruiter_id)

    # Filter by date range
    applied_after = request.query_params.get('applied_after')
    if applied_after:
        applications = applications.filter(applied_at__date__gte=applied_after)

    applied_before = request.query_params.get('applied_before')
    if applied_before:
        applications = applications.filter(applied_at__date__lte=applied_before)

    # Text search (candidate name, email, job title)
    search = request.query_params.get('search')
    if search:
        applications = applications.filter(
            Q(candidate__user__first_name__icontains=search) |
            Q(candidate__user__last_name__icontains=search) |
            Q(candidate__user__email__icontains=search) |
            Q(job__title__icontains=search)
        )

    # Ordering
    ordering = request.query_params.get('ordering', '-applied_at')
    valid_orderings = {
        'applied_at': 'applied_at',
        '-applied_at': '-applied_at',
        'candidate_name': 'candidate__user__first_name',
        '-candidate_name': '-candidate__user__first_name',
        'job_title': 'job__title',
        '-job_title': '-job__title',
        'status': 'status',
        '-status': '-status',
        'company_name': 'job__company__name',
        '-company_name': '-job__company__name',
    }
    if ordering in valid_orderings:
        applications = applications.order_by(valid_orderings[ordering])

    # Pagination
    page = request.query_params.get('page', 1)
    page_size = min(int(request.query_params.get('page_size', 20)), 100)

    paginator = Paginator(applications, page_size)
    try:
        page_obj = paginator.page(page)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)

    # Serialize
    serializer = ApplicationListSerializer(page_obj.object_list, many=True)

    return Response({
        'results': serializer.data,
        'count': paginator.count,
        'page': page_obj.number,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    })


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
