from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

from .models import (
    Job, JobStatus, Application, ApplicationStatus, RejectionReason,
    ActivityLog, ActivityNote, ActivityType,
    # Interview Stage System
    StageType, InterviewStageTemplate, StageInstanceStatus, ApplicationStageInstance,
    CalendarProvider, UserCalendarConnection,
    NotificationType, NotificationChannel, Notification,
    BookingToken,
)
from .services.calendar_service import CalendarService, CalendarServiceError
from .services.notification_service import NotificationService
import secrets
from datetime import timedelta
from .serializers import (
    JobListSerializer,
    JobDetailSerializer,
    JobCreateSerializer,
    JobUpdateSerializer,
    ApplicationSerializer,
    ApplicationListSerializer,
    ApplicationCreateSerializer,
    ApplicationStageUpdateSerializer,
    CandidateApplicationListSerializer,
    MakeOfferSerializer,
    AcceptOfferSerializer,
    RejectApplicationSerializer,
    ActivityLogSerializer,
    ActivityNoteSerializer,
    ActivityNoteCreateSerializer,
    # Interview Stage System
    InterviewStageTemplateSerializer,
    InterviewStageTemplateCreateSerializer,
    InterviewStageTemplateBulkSerializer,
    ApplicationStageInstanceSerializer,
    ScheduleStageSerializer,
    RescheduleStageSerializer,
    AssignAssessmentSerializer,
    SubmitAssessmentSerializer,
    CompleteStageSerializer,
    UserCalendarConnectionSerializer,
    NotificationSerializer,
    NotificationListSerializer,
    MarkNotificationReadSerializer,
)
from companies.models import Company, CompanyUser, CompanyUserRole
from companies.permissions import (
    IsCompanyMember,
    IsCompanyEditor,
    get_user_company,
)
from users.models import UserRole


# =============================================================================
# Public Job Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_jobs(request):
    """
    List all published jobs.
    Supports filtering by various criteria.
    """
    jobs = Job.objects.filter(status=JobStatus.PUBLISHED)

    # Filter by seniority
    seniority = request.query_params.get('seniority')
    if seniority:
        jobs = jobs.filter(seniority=seniority)

    # Filter by job type
    job_type = request.query_params.get('job_type')
    if job_type:
        jobs = jobs.filter(job_type=job_type)

    # Filter by work mode
    work_mode = request.query_params.get('work_mode')
    if work_mode:
        jobs = jobs.filter(work_mode=work_mode)

    # Filter by department
    department = request.query_params.get('department')
    if department:
        jobs = jobs.filter(department=department)

    # Filter by location (country)
    country = request.query_params.get('country')
    if country:
        jobs = jobs.filter(location_country__code=country)

    # Filter by company
    company = request.query_params.get('company')
    if company:
        jobs = jobs.filter(company__slug=company)

    # Filter by salary range
    salary_min = request.query_params.get('salary_min')
    if salary_min:
        jobs = jobs.filter(salary_max__gte=int(salary_min))

    salary_max = request.query_params.get('salary_max')
    if salary_max:
        jobs = jobs.filter(salary_min__lte=int(salary_max))

    # Filter by skills
    skills = request.query_params.get('skills')
    if skills:
        skill_ids = skills.split(',')
        jobs = jobs.filter(required_skills__id__in=skill_ids).distinct()

    # Filter by technologies
    technologies = request.query_params.get('technologies')
    if technologies:
        tech_ids = technologies.split(',')
        jobs = jobs.filter(technologies__id__in=tech_ids).distinct()

    # Search by title or summary
    search = request.query_params.get('search')
    if search:
        jobs = jobs.filter(
            Q(title__icontains=search) |
            Q(summary__icontains=search) |
            Q(company__name__icontains=search)
        )

    # Sorting
    sort = request.query_params.get('sort', '-published_at')
    allowed_sorts = ['published_at', '-published_at', 'salary_max', '-salary_max', 'title', '-title']
    if sort in allowed_sorts:
        jobs = jobs.order_by(sort)
    else:
        jobs = jobs.order_by('-published_at')

    # Optimize query
    jobs = jobs.select_related(
        'company', 'company__industry', 'location_city', 'location_country'
    ).prefetch_related(
        'required_skills', 'technologies'
    )

    serializer = JobListSerializer(jobs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_job(request, slug):
    """
    Get a single job by slug.
    Increments view count for published jobs.
    """
    try:
        job = Job.objects.select_related(
            'company', 'company__industry', 'created_by', 'assigned_recruiter',
            'location_city', 'location_country'
        ).prefetch_related(
            'required_skills', 'nice_to_have_skills', 'technologies'
        ).get(slug=slug)
    except Job.DoesNotExist:
        return Response(
            {'error': 'Job not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only show published jobs publicly
    if job.status != JobStatus.PUBLISHED:
        # Check if user is company member or admin/recruiter
        if request.user.is_authenticated:
            is_member = CompanyUser.objects.filter(
                user=request.user,
                company=job.company,
                is_active=True
            ).exists()
            is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
            if not is_member and not is_staff:
                return Response(
                    {'error': 'Job not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Increment view count for published jobs
        job.increment_views()

    serializer = JobDetailSerializer(job)
    return Response(serializer.data)


# =============================================================================
# Company Job Management Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCompanyMember])
def list_company_jobs(request):
    """
    List all jobs for the current user's company.
    Shows jobs in all statuses.
    """
    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'You are not associated with any company'},
            status=status.HTTP_404_NOT_FOUND
        )

    jobs = Job.objects.filter(company=company).select_related(
        'company', 'location_city', 'location_country', 'created_by'
    ).prefetch_related(
        'required_skills', 'technologies'
    ).order_by('-created_at')

    # Filter by status
    job_status = request.query_params.get('status')
    if job_status:
        jobs = jobs.filter(status=job_status)

    serializer = JobListSerializer(jobs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_job(request):
    """
    Create a new job.

    For regular users: Requires editor or admin role in their company.
    For admin/recruiter: Can pass company_id in request body to create for any company.
    """
    company_id = request.data.get('company_id')
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]

    # Admin/Recruiter can create jobs for any company
    if company_id and is_staff:
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Regular users can only create jobs for their own company
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user has editor permissions for their company
        is_company_editor = CompanyUser.objects.filter(
            user=request.user,
            company=company,
            role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
            is_active=True
        ).exists()

        if not is_company_editor:
            return Response(
                {'error': 'You do not have permission to create jobs'},
                status=status.HTTP_403_FORBIDDEN
            )

    serializer = JobCreateSerializer(data=request.data)
    if serializer.is_valid():
        job = serializer.save(company=company, created_by=request.user)
        return Response(
            JobDetailSerializer(job).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def job_detail(request, job_id):
    """
    Get, update, or delete a specific job.
    Requires appropriate permissions.
    """
    try:
        job = Job.objects.select_related(
            'company', 'created_by', 'assigned_recruiter',
            'location_city', 'location_country'
        ).prefetch_related(
            'required_skills', 'nice_to_have_skills', 'technologies'
        ).get(id=job_id)
    except Job.DoesNotExist:
        return Response(
            {'error': 'Job not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user has permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        is_active=True
    ).exists()
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if request.method == 'GET':
        if not is_company_member and not is_staff:
            return Response(
                {'error': 'You do not have permission to view this job'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = JobDetailSerializer(job)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        if not is_company_editor and not is_staff:
            return Response(
                {'error': 'You do not have permission to update this job'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = JobUpdateSerializer(job, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(JobDetailSerializer(job).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Company admins or platform admins/recruiters can delete
        is_company_admin = CompanyUser.objects.filter(
            user=request.user,
            company=job.company,
            role=CompanyUserRole.ADMIN,
            is_active=True
        ).exists()
        is_platform_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]

        if not is_company_admin and not is_platform_staff:
            return Response(
                {'error': 'You do not have permission to delete this job'},
                status=status.HTTP_403_FORBIDDEN
            )
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publish_job(request, job_id):
    """
    Publish a job (change status to published).
    Sets published_at timestamp.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_company_editor and not is_staff:
        return Response(
            {'error': 'You do not have permission to publish this job'},
            status=status.HTTP_403_FORBIDDEN
        )

    if job.status == JobStatus.PUBLISHED:
        return Response(
            {'error': 'Job is already published'},
            status=status.HTTP_400_BAD_REQUEST
        )

    job.status = JobStatus.PUBLISHED
    job.published_at = timezone.now()
    job.save()

    return Response(JobDetailSerializer(job).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_job(request, job_id):
    """
    Close a job (change status to closed).
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_company_editor and not is_staff:
        return Response(
            {'error': 'You do not have permission to close this job'},
            status=status.HTTP_403_FORBIDDEN
        )

    if job.status == JobStatus.CLOSED:
        return Response(
            {'error': 'Job is already closed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    job.status = JobStatus.CLOSED
    job.save()

    return Response(JobDetailSerializer(job).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_job_filled(request, job_id):
    """
    Mark a job as filled.
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
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_company_editor and not is_staff:
        return Response(
            {'error': 'You do not have permission to update this job'},
            status=status.HTTP_403_FORBIDDEN
        )

    job.status = JobStatus.FILLED
    job.save()

    return Response(JobDetailSerializer(job).data)


# =============================================================================
# Admin/Recruiter Endpoints (access to ALL jobs)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_jobs(request):
    """
    List ALL jobs across all companies.
    Admin/Recruiter only.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    jobs = Job.objects.select_related(
        'company', 'company__industry', 'location_city', 'location_country', 'created_by'
    ).prefetch_related(
        'required_skills', 'technologies'
    ).order_by('-created_at')

    # Filter by status
    job_status = request.query_params.get('status')
    if job_status:
        jobs = jobs.filter(status=job_status)

    # Filter by company
    company_id = request.query_params.get('company')
    if company_id:
        jobs = jobs.filter(company_id=company_id)

    # Search by title
    search = request.query_params.get('search')
    if search:
        jobs = jobs.filter(
            Q(title__icontains=search) |
            Q(company__name__icontains=search)
        )

    serializer = JobListSerializer(jobs, many=True)
    return Response(serializer.data)


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
        applications = applications.filter(current_stage_order=int(stage))

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

        return Response(ApplicationSerializer(application).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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

    # Validate stage exists
    job_stages = application.job.interview_stages or []
    max_stage = max((s.get('order', 0) for s in job_stages), default=0)

    if stage_order < 0 or stage_order > max_stage:
        return Response(
            {'error': f'Invalid stage_order. Must be between 0 and {max_stage}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Capture previous state before change
    previous_status = application.status
    previous_stage = application.current_stage_order

    application.current_stage_order = stage_order
    if stage_order > 0:
        application.status = ApplicationStatus.IN_PROGRESS
    else:
        application.status = ApplicationStatus.APPLIED

    # Clear rejection fields when moving to a non-rejected stage
    application.rejection_reason = ''
    application.rejection_feedback = ''
    application.rejected_at = None

    application.save()

    # Get stage name for the activity log
    stage_name = ''
    for stage in job_stages:
        if stage.get('order') == stage_order:
            stage_name = stage.get('name', '')
            break

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


# =============================================================================
# Activity Log Helper & Endpoints
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
    # This handles cases where stage templates were added after the application was created
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
            from django.contrib.auth import get_user_model
            User = get_user_model()
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
                # Get company address
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
            from django.contrib.auth import get_user_model
            User = get_user_model()
            participants = User.objects.filter(id__in=participant_ids)
            instance.participants.set(participants)

        # Create calendar event with auto-generated meeting link if requested
        # (must happen BEFORE activity logging so meeting_link is captured)
        if data.get('send_calendar_invite', False) and interviewer:
            try:
                connection = UserCalendarConnection.objects.filter(
                    user=interviewer,
                    is_active=True
                ).first()

                if connection:
                    # Build attendee list
                    attendees = [application.candidate.user.email]
                    for participant in instance.participants.all():
                        if participant.email and participant.email not in attendees:
                            attendees.append(participant.email)

                    # Create calendar event with auto-generated meeting link
                    result = CalendarService.create_event_with_meeting_link(
                        connection=connection,
                        stage_instance=instance,
                        attendees=attendees,
                    )

                    # Reload instance to get updated meeting_link
                    instance.refresh_from_db()
            except CalendarServiceError as e:
                # Log error but don't fail the scheduling
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to create calendar event: {e}")

        # Log activity (after calendar event so meeting_link is captured)
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
            # Log error but don't fail the scheduling
            import logging
            logger = logging.getLogger(__name__)
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
            from django.contrib.auth import get_user_model
            User = get_user_model()
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
            from django.contrib.auth import get_user_model
            User = get_user_model()
            participant_ids = data.get('participant_ids', [])
            if participant_ids:
                participants = User.objects.filter(id__in=participant_ids)
                instance.participants.set(participants)
            else:
                instance.participants.clear()

        # Update calendar event if requested and interviewer has connected calendar
        # (must happen BEFORE activity logging so any meeting_link updates are captured)
        if data.get('send_calendar_invite', False) and instance.interviewer:
            try:
                connection = UserCalendarConnection.objects.filter(
                    user=instance.interviewer,
                    is_active=True
                ).first()

                if connection and (instance.google_calendar_event_id or instance.microsoft_calendar_event_id):
                    # Build attendee list
                    attendees = [application.candidate.user.email]
                    for participant in instance.participants.all():
                        if participant.email and participant.email not in attendees:
                            attendees.append(participant.email)

                    # Update calendar event
                    CalendarService.update_calendar_event(
                        connection=connection,
                        stage_instance=instance,
                        attendees=attendees,
                    )
                    # Reload instance to get any updates
                    instance.refresh_from_db()
            except CalendarServiceError as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to update calendar event: {e}")

        # Log activity (after calendar event update so meeting_link is captured)
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

        # Send rescheduled notification to candidate
        try:
            notification_service = NotificationService()
            notification_service.send_interview_rescheduled(
                instance,
                old_time=old_time,
                reason=data.get('reschedule_reason', '')
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
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
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to delete calendar event: {e}")

    # Send cancellation notification
    try:
        notification_service = NotificationService()
        notification_service.send_interview_cancelled(instance)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
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

    # Determine the new status based on whether it was scheduled before
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

        # TODO: Send notification if data.get('send_notification', True)

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

        # Log activity (as system since candidate submitted)
        log_activity(
            application=application,
            user=request.user,
            activity_type=ActivityType.STAGE_CHANGED,
            new_stage=instance.stage_template.order,
            stage_name=instance.stage_template.name,
            metadata={'action': 'assessment_submitted'}
        )

        # TODO: Send notification to recruiter

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

    return Response({
        'application': ApplicationSerializer(application).data,
        'stage_instance': ApplicationStageInstanceSerializer(instance).data,
    })


# =============================================================================
# Notification Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """
    List notifications for the current user.
    """
    notifications = Notification.objects.filter(
        recipient=request.user
    ).order_by('-sent_at')

    # Filter by read status
    is_read = request.query_params.get('is_read')
    if is_read is not None:
        notifications = notifications.filter(is_read=is_read.lower() == 'true')

    # Limit
    limit = request.query_params.get('limit', 50)
    notifications = notifications[:int(limit)]

    serializer = NotificationListSerializer(notifications, many=True)

    # Also return unread count
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

    return Response({
        'notifications': serializer.data,
        'unread_count': unread_count,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification(request, notification_id):
    """
    Get a single notification and mark it as read.
    """
    try:
        notification = Notification.objects.get(id=notification_id, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    # Mark as read
    notification.mark_as_read()

    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    """
    Mark notification(s) as read.
    If notification_ids is empty or not provided, marks all as read.
    """
    serializer = MarkNotificationReadSerializer(data=request.data)
    if serializer.is_valid():
        notification_ids = serializer.validated_data.get('notification_ids', [])

        if notification_ids:
            Notification.objects.filter(
                id__in=notification_ids,
                recipient=request.user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
        else:
            Notification.objects.filter(
                recipient=request.user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())

        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': unread_count})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """
    Get the count of unread notifications.
    """
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({'unread_count': unread_count})


# =============================================================================
# Interviewer Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_job_interviewers(request, job_id):
    """
    List potential interviewers for a job.
    Includes company team members AND recruiters/admins.
    Returns users with their calendar connection status.
    """
    try:
        job = Job.objects.select_related('company').get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission - must be company member or staff
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        is_active=True
    ).exists()

    if not is_staff and not is_company_member:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    # Collect all potential interviewers
    all_user_ids = set()
    user_roles = {}  # user_id -> role label

    # 1. Get all active company users
    company_users = CompanyUser.objects.filter(
        company=job.company,
        is_active=True
    ).select_related('user')

    for cu in company_users:
        all_user_ids.add(cu.user.id)
        user_roles[cu.user.id] = cu.role

    # 2. Also include recruiters and admins (only visible to other staff users)
    if is_staff:
        staff_users = User.objects.filter(
            role__in=[UserRole.ADMIN, UserRole.RECRUITER],
            is_active=True
        )

        for user in staff_users:
            all_user_ids.add(user.id)
            if user.id not in user_roles:
                user_roles[user.id] = user.role  # 'admin' or 'recruiter'

    # Get all users in one query
    all_users = User.objects.filter(id__in=all_user_ids)

    # Get users with calendar connections
    users_with_calendar = set(
        UserCalendarConnection.objects.filter(
            user_id__in=all_user_ids,
            is_active=True
        ).values_list('user_id', flat=True)
    )

    # Build response
    interviewers = []
    for user in all_users:
        interviewers.append({
            'id': str(user.id),
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'email': user.email,
            'role': user_roles.get(user.id, 'member'),
            'has_calendar': user.id in users_with_calendar,
        })

    # Sort: users with calendar first, then by name
    interviewers.sort(key=lambda x: (not x['has_calendar'], x['full_name']))

    return Response(interviewers)


# =============================================================================
# Calendar Connection Endpoints (OAuth Placeholder)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_calendar_connections(request):
    """
    List the current user's calendar connections.
    """
    connections = UserCalendarConnection.objects.filter(user=request.user)
    serializer = UserCalendarConnectionSerializer(connections, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def initiate_calendar_oauth(request, provider):
    """
    Initiate OAuth flow for a calendar provider.
    Returns the OAuth authorization URL.
    """
    from django.conf import settings
    from jobs.services import CalendarService

    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    # Build redirect URI for OAuth callback
    if provider == 'google':
        redirect_uri = settings.GOOGLE_CALENDAR_REDIRECT_URI
        if not settings.GOOGLE_CLIENT_ID:
            return Response({'error': 'Google Calendar not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        auth_url = CalendarService.get_google_auth_url(
            user_id=str(request.user.id),
            redirect_uri=redirect_uri
        )
    else:
        redirect_uri = settings.MICROSOFT_CALENDAR_REDIRECT_URI
        if not settings.MICROSOFT_CLIENT_ID:
            return Response({'error': 'Microsoft Calendar not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        auth_url = CalendarService.get_microsoft_auth_url(
            user_id=str(request.user.id),
            redirect_uri=redirect_uri
        )

    return Response({'auth_url': auth_url})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calendar_oauth_callback(request, provider):
    """
    Handle OAuth callback from calendar provider.
    Exchange authorization code for tokens.
    """
    from django.conf import settings
    from jobs.services import CalendarService, CalendarServiceError

    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    code = request.data.get('code')
    if not code:
        return Response({'error': 'Authorization code not provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if provider == 'google':
            redirect_uri = settings.GOOGLE_CALENDAR_REDIRECT_URI
            connection = CalendarService.exchange_google_code(
                code=code,
                redirect_uri=redirect_uri,
                user=request.user
            )
        else:
            redirect_uri = settings.MICROSOFT_CALENDAR_REDIRECT_URI
            connection = CalendarService.exchange_microsoft_code(
                code=code,
                redirect_uri=redirect_uri,
                user=request.user
            )

        return Response({
            'message': f'{provider} calendar connected successfully',
            'provider': provider,
            'email': connection.provider_email,
        })
    except CalendarServiceError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'Failed to connect calendar'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def disconnect_calendar(request, provider):
    """
    Disconnect a calendar provider.
    """
    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    deleted, _ = UserCalendarConnection.objects.filter(
        user=request.user,
        provider=provider
    ).delete()

    if deleted:
        return Response({'message': f'{provider} calendar disconnected'})
    return Response({'error': 'No connection found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_available_calendars(request, provider):
    """
    List available calendars for a provider connection.
    Used to let users select which calendar to use for availability.
    """
    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        connection = UserCalendarConnection.objects.get(
            user=request.user,
            provider=provider,
            is_active=True
        )
    except UserCalendarConnection.DoesNotExist:
        return Response({'error': 'No active connection found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        from jobs.services.calendar_service import CalendarService
        calendars = CalendarService.list_calendars(connection)
        return Response({
            'calendars': calendars,
            'current_calendar_id': connection.calendar_id,
        })
    except Exception as e:
        return Response({
            'error': f'Failed to list calendars: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_calendar_settings(request, provider):
    """
    Update calendar connection settings (selected calendar, booking settings).
    """
    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        connection = UserCalendarConnection.objects.get(
            user=request.user,
            provider=provider,
            is_active=True
        )
    except UserCalendarConnection.DoesNotExist:
        return Response({'error': 'No active connection found'}, status=status.HTTP_404_NOT_FOUND)

    from jobs.serializers import CalendarConnectionUpdateSerializer
    serializer = CalendarConnectionUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Update fields if provided
    if 'calendar_id' in data:
        connection.calendar_id = data['calendar_id']
    if 'calendar_name' in data:
        connection.calendar_name = data['calendar_name']
    if 'booking_days_ahead' in data:
        connection.booking_days_ahead = data['booking_days_ahead']
    if 'business_hours_start' in data:
        connection.business_hours_start = data['business_hours_start']
    if 'business_hours_end' in data:
        connection.business_hours_end = data['business_hours_end']
    if 'min_notice_hours' in data:
        connection.min_notice_hours = data['min_notice_hours']
    if 'buffer_minutes' in data:
        connection.buffer_minutes = data['buffer_minutes']
    if 'available_days' in data:
        # Convert list to comma-separated string
        connection.available_days = ','.join(str(d) for d in data['available_days'])
    if 'timezone' in data:
        connection.timezone = data['timezone']

    connection.save()

    from jobs.serializers import UserCalendarConnectionSerializer
    return Response(UserCalendarConnectionSerializer(connection).data)


# =============================================================================
# Candidate Self-Booking Endpoints (Calendly-like)
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_booking_info(request, token):
    """
    Get booking info and available slots for a booking token.
    Public endpoint - no authentication required.
    """
    try:
        booking = BookingToken.objects.select_related(
            'stage_instance__application__job__company',
            'stage_instance__application__candidate__user',
            'stage_instance__stage_template',
            'stage_instance__interviewer',
        ).get(token=token)
    except BookingToken.DoesNotExist:
        return Response({'error': 'Booking link not found or expired'}, status=status.HTTP_404_NOT_FOUND)

    # Check if token is valid
    if not booking.is_valid:
        return Response({
            'error': 'This booking link has expired or already been used'
        }, status=status.HTTP_410_GONE)

    instance = booking.stage_instance
    application = instance.application
    job = application.job
    company = job.company
    template = instance.stage_template

    # Get interviewer availability
    available_slots = []
    calendar_error = None
    interviewer_timezone = None
    if instance.interviewer:
        try:
            # Get interviewer's calendar connection for settings
            connection = UserCalendarConnection.objects.filter(
                user=instance.interviewer,
                is_active=True
            ).first()

            # Use interviewer's booking settings or defaults
            days_ahead = connection.booking_days_ahead if connection else 14
            interviewer_timezone = connection.timezone if connection else None

            start_date = timezone.now()
            end_date = start_date + timedelta(days=days_ahead)

            available_slots = CalendarService.get_free_busy(
                user=instance.interviewer,
                start_date=start_date,
                end_date=end_date,
                duration_minutes=template.default_duration_minutes or 60,
            )
        except CalendarServiceError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Calendar service error for booking {token}: {e}")
            calendar_error = str(e)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Unexpected error getting availability for booking {token}: {e}")
            calendar_error = "Failed to load calendar availability"

    # If no slots returned but interviewer has calendar, log it for debugging
    if instance.interviewer and not available_slots:
        import logging
        logger = logging.getLogger(__name__)
        # Check if interviewer has a calendar connection
        has_connection = UserCalendarConnection.objects.filter(
            user=instance.interviewer,
            is_active=True
        ).exists()
        logger.info(
            f"Booking {token}: interviewer={instance.interviewer.id}, "
            f"has_connection={has_connection}, slots_count={len(available_slots)}, "
            f"error={calendar_error}"
        )

    # Build location string
    location = instance.location or template.custom_location or ''
    if not location and template.use_company_address:
        address_parts = [
            company.billing_address or '',
            str(company.billing_city) if company.billing_city else '',
            str(company.billing_country) if company.billing_country else '',
        ]
        location = ', '.join(filter(None, address_parts))

    response_data = {
        'company_name': company.name,
        'company_logo': company.logo.url if company.logo else None,
        'job_title': job.title,
        'stage_name': template.name,
        'stage_type': template.stage_type,
        'duration_minutes': template.default_duration_minutes or 60,
        'interviewer_name': instance.interviewer.full_name if instance.interviewer else None,
        'location': location,
        'available_slots': available_slots,
        'expires_at': booking.expires_at.isoformat(),
        'interviewer_timezone': interviewer_timezone,
    }

    # Include calendar error if any (for debugging)
    if calendar_error:
        response_data['calendar_error'] = calendar_error

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def book_slot(request, token):
    """
    Candidate books a specific time slot.
    Public endpoint - no authentication required.
    """
    try:
        booking = BookingToken.objects.select_related(
            'stage_instance__application__job__company',
            'stage_instance__application__candidate__user',
            'stage_instance__stage_template',
            'stage_instance__interviewer',
        ).get(token=token)
    except BookingToken.DoesNotExist:
        return Response({'error': 'Booking link not found or expired'}, status=status.HTTP_404_NOT_FOUND)

    # Check if token is valid
    if not booking.is_valid:
        return Response({
            'error': 'This booking link has expired or already been used'
        }, status=status.HTTP_410_GONE)

    scheduled_at = request.data.get('scheduled_at')
    if not scheduled_at:
        return Response({'error': 'scheduled_at is required'}, status=status.HTTP_400_BAD_REQUEST)

    from django.utils.dateparse import parse_datetime
    scheduled_datetime = parse_datetime(scheduled_at)
    if not scheduled_datetime:
        return Response({'error': 'Invalid datetime format'}, status=status.HTTP_400_BAD_REQUEST)

    instance = booking.stage_instance
    application = instance.application
    template = instance.stage_template

    # Update the stage instance
    instance.scheduled_at = scheduled_datetime
    instance.duration_minutes = template.default_duration_minutes or 60
    instance.status = StageInstanceStatus.SCHEDULED
    instance.save()

    # Create calendar event with auto-generated meeting link
    if instance.interviewer:
        try:
            connection = UserCalendarConnection.objects.filter(
                user=instance.interviewer,
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
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to create calendar event during booking: {e}")

    # Mark token as used
    booking.mark_as_used()

    # Log activity (performed by candidate via booking link)
    log_activity(
        application=application,
        user=application.candidate.user,  # The candidate
        activity_type=ActivityType.INTERVIEW_BOOKED,
        new_stage=template.order,
        stage_name=template.name,
        metadata={
            'stage_name': template.name,
            'stage_type': template.stage_type,
            'scheduled_at': scheduled_datetime.isoformat(),
            'duration_minutes': instance.duration_minutes,
            'interviewer_name': instance.interviewer.full_name if instance.interviewer else None,
            'meeting_link': instance.meeting_link or None,
            'location': instance.location or None,
        }
    )

    # Send confirmation notification
    try:
        notification_service = NotificationService()
        notification_service.send_interview_scheduled(instance)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to send booking confirmation: {e}")

    return Response({
        'success': True,
        'scheduled_at': instance.scheduled_at.isoformat(),
        'duration_minutes': instance.duration_minutes,
        'meeting_link': instance.meeting_link or None,
        'location': instance.location or None,
        'message': 'Your interview has been scheduled! Check your email for confirmation.',
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

    # Get interviewer from request body, instance, or default
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

    # Always update interviewer on instance
    instance.interviewer = interviewer
    instance.save(update_fields=['interviewer'])

    # Delete existing unused booking token if exists
    BookingToken.objects.filter(stage_instance=instance, is_used=False).delete()

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
        import logging
        logger = logging.getLogger(__name__)
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
