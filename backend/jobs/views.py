from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import Job, JobStatus
from .serializers import (
    JobListSerializer,
    JobDetailSerializer,
    JobCreateSerializer,
    JobUpdateSerializer,
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
