import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import Job, JobStatus
from ..serializers import (
    JobListSerializer,
    JobDetailSerializer,
    JobCreateSerializer,
    JobUpdateSerializer,
)
from scheduling.models import UserCalendarConnection
from notifications.services.notification_service import NotificationService
from companies.models import Company, CompanyUser, CompanyUserRole
from companies.permissions import get_user_company
from users.models import UserRole

logger = logging.getLogger(__name__)
User = get_user_model()


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
            'company', 'company__industry', 'created_by',
            'location_city', 'location_country'
        ).prefetch_related(
            'required_skills', 'nice_to_have_skills', 'technologies', 'assigned_recruiters'
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
@permission_classes([IsAuthenticated])
def list_company_jobs(request):
    """
    List all jobs for the current user's company.
    Shows jobs in all statuses. Supports pagination and ordering.
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
    )

    # Filter by status
    job_status = request.query_params.get('status')
    if job_status:
        jobs = jobs.filter(status=job_status)

    # Ordering
    ordering = request.query_params.get('ordering', '-created_at')
    allowed_orderings = ['title', '-title', 'created_at', '-created_at',
                         'applications_count', '-applications_count',
                         'views_count', '-views_count']
    if ordering in allowed_orderings:
        jobs = jobs.order_by(ordering)
    else:
        jobs = jobs.order_by('-created_at')

    # Pagination
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    page_size = min(page_size, 100)  # Max 100 items per page

    total_count = jobs.count()
    start = (page - 1) * page_size
    end = start + page_size
    jobs = jobs[start:end]

    serializer = JobListSerializer(jobs, many=True)
    return Response({
        'results': serializer.data,
        'count': total_count,
        'next': page * page_size < total_count,
        'previous': page > 1,
    })


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
            'company', 'created_by',
            'location_city', 'location_country'
        ).prefetch_related(
            'required_skills', 'nice_to_have_skills', 'technologies', 'assigned_recruiters'
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
            # Notification handled by automation rule: [Auto] Job Updated - Notify Active Applicants
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

    # Notification handled by automation rule: [Auto] Job Published - Notify Client

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

    # Notification handled by automation rule: [Auto] Job Closed - Notify Client/Recruiter

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

    # Notification handled by automation rule: [Auto] Job Filled - Notify Client

    return Response(JobDetailSerializer(job).data)


# =============================================================================
# Admin/Recruiter Endpoints (access to ALL jobs)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_jobs(request):
    """
    List jobs based on user role:
    - Admin/Recruiter: ALL jobs across all companies
    - Client: Jobs for their company only
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.CLIENT]:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    jobs = Job.objects.select_related(
        'company', 'company__industry', 'location_city', 'location_country', 'created_by'
    ).prefetch_related(
        'required_skills', 'technologies'
    ).order_by('-created_at')

    # Clients can only see their company's jobs
    if request.user.role == UserRole.CLIENT:
        # Get user's company through CompanyUser membership
        company_membership = request.user.company_memberships.first()
        if company_membership:
            jobs = jobs.filter(company=company_membership.company)
        else:
            jobs = jobs.none()

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
