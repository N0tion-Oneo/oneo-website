from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from itertools import chain
from operator import attrgetter

from users.models import UserRole
from companies.models import CompanyUser
from subscriptions.utils import company_has_feature
from .models import (
    Skill, Industry, Technology, CandidateProfile, ProfileVisibility,
    Experience, Education, CandidateActivity, CandidateActivityNote,
    ProfileSuggestion, ProfileSuggestionStatus,
)
from .services import (
    log_profile_updated, log_profile_viewed, log_experience_added, log_experience_updated,
    log_education_added, log_education_updated, detect_profile_changes,
    detect_experience_changes, detect_education_changes,
)
from jobs.models import Application, ActivityLog, Job
from jobs.serializers.activity import ActivityNoteSerializer
from jobs.serializers.applications import ApplicationListSerializer
from .serializers import (
    SkillSerializer,
    IndustrySerializer,
    TechnologySerializer,
    CandidateProfileSerializer,
    CandidateProfileSanitizedSerializer,
    CandidateProfileUpdateSerializer,
    CandidateAdminListSerializer,
    ExperienceSerializer,
    ExperienceCreateUpdateSerializer,
    EducationSerializer,
    EducationCreateUpdateSerializer,
    ReorderSerializer,
    ProfileSuggestionSerializer,
    ProfileSuggestionCreateSerializer,
    ProfileSuggestionDeclineSerializer,
)


class CandidatePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ============ Skills Endpoints ============

@extend_schema(
    responses={200: SkillSerializer(many=True)},
    tags=['Skills'],
    parameters=[
        OpenApiParameter(
            name='category',
            description='Filter by skill category',
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name='search',
            description='Search skills by name',
            required=False,
            type=str,
        ),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def list_skills(request):
    """
    List all active skills.
    Optional filters: category, search
    """
    skills = Skill.objects.filter(is_active=True)

    # Filter by category
    category = request.query_params.get('category')
    if category:
        skills = skills.filter(category=category)

    # Search by name
    search = request.query_params.get('search')
    if search:
        skills = skills.filter(name__icontains=search)

    serializer = SkillSerializer(skills, many=True)
    return Response(serializer.data)


# ============ Industries Endpoints ============

@extend_schema(
    responses={200: IndustrySerializer(many=True)},
    tags=['Industries'],
    parameters=[
        OpenApiParameter(
            name='search',
            description='Search industries by name',
            required=False,
            type=str,
        ),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def list_industries(request):
    """
    List all active industries.
    Optional filter: search
    """
    industries = Industry.objects.filter(is_active=True)

    # Search by name
    search = request.query_params.get('search')
    if search:
        industries = industries.filter(name__icontains=search)

    serializer = IndustrySerializer(industries, many=True)
    return Response(serializer.data)


# ============ Technologies Endpoints ============

@extend_schema(
    responses={200: TechnologySerializer(many=True)},
    tags=['Technologies'],
    parameters=[
        OpenApiParameter(
            name='category',
            description='Filter by technology category',
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name='search',
            description='Search technologies by name',
            required=False,
            type=str,
        ),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def list_technologies(request):
    """
    List all active technologies.
    Optional filters: category, search
    """
    technologies = Technology.objects.filter(is_active=True)

    # Filter by category
    category = request.query_params.get('category')
    if category:
        technologies = technologies.filter(category=category)

    # Search by name
    search = request.query_params.get('search')
    if search:
        technologies = technologies.filter(name__icontains=search)

    serializer = TechnologySerializer(technologies, many=True)
    return Response(serializer.data)


# ============ Candidate Profile Endpoints ============

@extend_schema(
    responses={
        200: CandidateProfileSerializer,
        404: OpenApiResponse(description='Profile not found'),
    },
    tags=['Candidates'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_profile(request):
    """
    Get the current authenticated candidate's profile.
    Creates a profile if one doesn't exist.
    """
    # Check if user is a candidate
    if request.user.role != UserRole.CANDIDATE:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get or create profile
    profile, created = CandidateProfile.objects.get_or_create(user=request.user)

    serializer = CandidateProfileSerializer(profile, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    request=CandidateProfileUpdateSerializer,
    responses={
        200: CandidateProfileSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Not a candidate'),
    },
    tags=['Candidates'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_my_profile(request):
    """
    Update the current authenticated candidate's profile.
    """
    # Check if user is a candidate
    if request.user.role != UserRole.CANDIDATE:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get or create profile
    profile, created = CandidateProfile.objects.get_or_create(user=request.user)

    serializer = CandidateProfileUpdateSerializer(
        profile,
        data=request.data,
        partial=True,
        context={'request': request}
    )

    if serializer.is_valid():
        # Detect actual changes BEFORE saving
        changes = detect_profile_changes(profile, serializer.validated_data)

        serializer.save()

        # Log the profile update activity (only if there were actual changes)
        log_profile_updated(
            candidate=profile,
            performed_by=request.user,
            changes=changes,
        )

        # Return full profile data
        return Response(
            CandidateProfileSerializer(profile, context={'request': request}).data
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: CandidateProfileSanitizedSerializer(many=True)},
    tags=['Candidates'],
    parameters=[
        OpenApiParameter(name='seniority', description='Filter by seniority level', required=False, type=str),
        OpenApiParameter(name='work_preference', description='Filter by work preference', required=False, type=str),
        OpenApiParameter(name='country', description='Filter by country', required=False, type=str),
        OpenApiParameter(name='city', description='Filter by city', required=False, type=str),
        OpenApiParameter(name='industries', description='Filter by industry IDs (comma-separated)', required=False, type=str),
        OpenApiParameter(name='search', description='Search in title, headline, summary', required=False, type=str),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def list_candidates(request):
    """
    List public candidate profiles (sanitized).
    Only shows profiles with public_sanitised visibility.
    """
    candidates = CandidateProfile.objects.filter(
        visibility=ProfileVisibility.PUBLIC_SANITISED,
        profile_completeness__gte=30,  # Only show profiles with some completion
    ).select_related('user').prefetch_related('industries')

    # Filter by seniority
    seniority = request.query_params.get('seniority')
    if seniority:
        candidates = candidates.filter(seniority=seniority)

    # Filter by work preference
    work_preference = request.query_params.get('work_preference')
    if work_preference:
        candidates = candidates.filter(work_preference=work_preference)

    # Filter by country
    country = request.query_params.get('country')
    if country:
        candidates = candidates.filter(country__icontains=country)

    # Filter by city
    city = request.query_params.get('city')
    if city:
        candidates = candidates.filter(city__icontains=city)

    # Filter by industries
    industries = request.query_params.get('industries')
    if industries:
        industry_ids = [int(i) for i in industries.split(',') if i.isdigit()]
        if industry_ids:
            candidates = candidates.filter(industries__id__in=industry_ids).distinct()

    # Search
    search = request.query_params.get('search')
    if search:
        candidates = candidates.filter(
            Q(professional_title__icontains=search) |
            Q(headline__icontains=search) |
            Q(professional_summary__icontains=search)
        )

    # Pagination
    paginator = CandidatePagination()
    page = paginator.paginate_queryset(candidates, request)

    serializer = CandidateProfileSanitizedSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@extend_schema(
    responses={200: CandidateAdminListSerializer(many=True)},
    tags=['Candidates'],
    parameters=[
        OpenApiParameter(name='seniority', description='Filter by seniority level', required=False, type=str),
        OpenApiParameter(name='work_preference', description='Filter by work preference', required=False, type=str),
        OpenApiParameter(name='visibility', description='Filter by profile visibility', required=False, type=str),
        OpenApiParameter(name='country', description='Filter by country', required=False, type=str),
        OpenApiParameter(name='city', description='Filter by city', required=False, type=str),
        OpenApiParameter(name='industries', description='Filter by industry IDs (comma-separated)', required=False, type=str),
        OpenApiParameter(name='min_experience', description='Minimum years of experience', required=False, type=int),
        OpenApiParameter(name='max_experience', description='Maximum years of experience', required=False, type=int),
        OpenApiParameter(name='min_completeness', description='Minimum profile completeness %', required=False, type=int),
        OpenApiParameter(name='min_salary', description='Minimum salary expectation', required=False, type=int),
        OpenApiParameter(name='max_salary', description='Maximum salary expectation', required=False, type=int),
        OpenApiParameter(name='salary_currency', description='Filter by salary currency (ZAR, USD, EUR, GBP)', required=False, type=str),
        OpenApiParameter(name='notice_period_min', description='Minimum notice period in days', required=False, type=int),
        OpenApiParameter(name='notice_period_max', description='Maximum notice period in days', required=False, type=int),
        OpenApiParameter(name='created_after', description='Created after date (ISO format)', required=False, type=str),
        OpenApiParameter(name='created_before', description='Created before date (ISO format)', required=False, type=str),
        OpenApiParameter(name='willing_to_relocate', description='Filter by willingness to relocate (true/false)', required=False, type=bool),
        OpenApiParameter(name='has_resume', description='Filter by resume presence (true/false)', required=False, type=bool),
        OpenApiParameter(name='search', description='Search in name, title, headline', required=False, type=str),
        OpenApiParameter(name='ordering', description='Order by field (e.g., -created_at, profile_completeness)', required=False, type=str),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_candidates(request):
    """
    List all candidate profiles for admin/recruiter management.
    Shows full candidate information regardless of visibility settings.
    Restricted to admin and recruiter users only.
    """
    # Check if user is admin or recruiter
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidates = CandidateProfile.objects.select_related(
        'user', 'city_rel', 'country_rel', 'onboarding_stage'
    ).prefetch_related(
        'industries',
        'experiences',
        'experiences__industry',
        'experiences__skills',
        'experiences__technologies',
        'education',
        'assigned_to',
    )

    # Filter by seniority
    seniority = request.query_params.get('seniority')
    if seniority:
        candidates = candidates.filter(seniority=seniority)

    # Filter by work preference
    work_preference = request.query_params.get('work_preference')
    if work_preference:
        candidates = candidates.filter(work_preference=work_preference)

    # Filter by visibility
    visibility = request.query_params.get('visibility')
    if visibility:
        candidates = candidates.filter(visibility=visibility)

    # Filter by country
    country = request.query_params.get('country')
    if country:
        candidates = candidates.filter(
            Q(country__icontains=country) | Q(country_rel__name__icontains=country)
        )

    # Filter by city
    city = request.query_params.get('city')
    if city:
        candidates = candidates.filter(
            Q(city__icontains=city) | Q(city_rel__name__icontains=city)
        )

    # Filter by industries
    industries = request.query_params.get('industries')
    if industries:
        industry_ids = [int(i) for i in industries.split(',') if i.isdigit()]
        if industry_ids:
            candidates = candidates.filter(industries__id__in=industry_ids).distinct()

    # Filter by years of experience
    min_experience = request.query_params.get('min_experience')
    if min_experience:
        candidates = candidates.filter(years_of_experience__gte=int(min_experience))

    max_experience = request.query_params.get('max_experience')
    if max_experience:
        candidates = candidates.filter(years_of_experience__lte=int(max_experience))

    # Filter by profile completeness
    min_completeness = request.query_params.get('min_completeness')
    if min_completeness:
        candidates = candidates.filter(profile_completeness__gte=int(min_completeness))

    # Filter by salary expectations
    min_salary = request.query_params.get('min_salary')
    if min_salary:
        candidates = candidates.filter(salary_expectation_min__gte=int(min_salary))

    max_salary = request.query_params.get('max_salary')
    if max_salary:
        candidates = candidates.filter(salary_expectation_max__lte=int(max_salary))

    salary_currency = request.query_params.get('salary_currency')
    if salary_currency:
        candidates = candidates.filter(salary_currency=salary_currency.upper())

    # Filter by notice period
    notice_period_min = request.query_params.get('notice_period_min')
    if notice_period_min:
        candidates = candidates.filter(notice_period_days__gte=int(notice_period_min))

    notice_period_max = request.query_params.get('notice_period_max')
    if notice_period_max:
        candidates = candidates.filter(notice_period_days__lte=int(notice_period_max))

    # Filter by created date range
    created_after = request.query_params.get('created_after')
    if created_after:
        candidates = candidates.filter(created_at__gte=created_after)

    created_before = request.query_params.get('created_before')
    if created_before:
        candidates = candidates.filter(created_at__lte=created_before)

    # Filter by willingness to relocate
    willing_to_relocate = request.query_params.get('willing_to_relocate')
    if willing_to_relocate is not None:
        if willing_to_relocate.lower() == 'true':
            candidates = candidates.filter(willing_to_relocate=True)
        elif willing_to_relocate.lower() == 'false':
            candidates = candidates.filter(willing_to_relocate=False)

    # Filter by resume presence
    has_resume = request.query_params.get('has_resume')
    if has_resume is not None:
        if has_resume.lower() == 'true':
            candidates = candidates.exclude(Q(resume_url__isnull=True) | Q(resume_url=''))
        elif has_resume.lower() == 'false':
            candidates = candidates.filter(Q(resume_url__isnull=True) | Q(resume_url=''))

    # Search
    search = request.query_params.get('search')
    if search:
        candidates = candidates.filter(
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(user__email__icontains=search) |
            Q(professional_title__icontains=search) |
            Q(headline__icontains=search)
        ).distinct()

    # Ordering
    ordering = request.query_params.get('ordering', '-created_at')
    valid_orderings = [
        'created_at', '-created_at',
        'updated_at', '-updated_at',
        'profile_completeness', '-profile_completeness',
        'years_of_experience', '-years_of_experience',
        'user__first_name', '-user__first_name',
        'professional_title', '-professional_title',
        'headline', '-headline',
        'seniority', '-seniority',
        'city', '-city',
        'work_preference', '-work_preference',
        'willing_to_relocate', '-willing_to_relocate',
        'notice_period_days', '-notice_period_days',
        'has_resume', '-has_resume',
        'visibility', '-visibility',
    ]
    if ordering in valid_orderings:
        candidates = candidates.order_by(ordering)
    else:
        candidates = candidates.order_by('-created_at')

    # Pagination
    paginator = CandidatePagination()
    page = paginator.paginate_queryset(candidates, request)

    serializer = CandidateAdminListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@extend_schema(
    description='List candidates who have applied to jobs for the current user\'s company.',
    responses={
        200: CandidateAdminListSerializer(many=True),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Company not found'),
    },
    parameters=[
        OpenApiParameter(name='seniority', description='Filter by seniority level', required=False, type=str),
        OpenApiParameter(name='work_preference', description='Filter by work preference', required=False, type=str),
        OpenApiParameter(name='search', description='Search in name, title, headline', required=False, type=str),
        OpenApiParameter(name='ordering', description='Order by field (e.g., -created_at)', required=False, type=str),
        OpenApiParameter(name='page', description='Page number', required=False, type=int),
        OpenApiParameter(name='page_size', description='Results per page', required=False, type=int),
    ],
    tags=['Candidates'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_company_candidates(request):
    """
    List candidates for the current user's company.
    Restricted to clients who are members of a company.
    If company.can_view_all_candidates is enabled, shows all candidates.
    Otherwise, shows only candidates who have applied to the company's jobs.
    """
    # Check if user is a client
    if request.user.role != UserRole.CLIENT:
        return Response(
            {'error': 'Permission denied. Client access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get user's company membership
    company_membership = CompanyUser.objects.filter(
        user=request.user,
        is_active=True
    ).select_related('company').first()

    if not company_membership:
        return Response(
            {'error': 'You are not associated with any company.'},
            status=status.HTTP_404_NOT_FOUND
        )

    company = company_membership.company

    # Check if this company has the Talent Directory feature
    if company_has_feature(company, 'talent-directory'):
        # Show all candidates
        candidates = CandidateProfile.objects.all()
    else:
        # Show only candidates who have applied to this company's jobs
        from jobs.models import Job
        company_job_ids = Job.objects.filter(company=company).values_list('id', flat=True)

        candidate_ids = Application.objects.filter(
            job_id__in=company_job_ids
        ).values_list('candidate_id', flat=True).distinct()

        candidates = CandidateProfile.objects.filter(
            id__in=candidate_ids
        )

    candidates = candidates.select_related(
        'user', 'city_rel', 'country_rel', 'onboarding_stage'
    ).prefetch_related(
        'industries',
        'experiences',
        'experiences__industry',
        'experiences__skills',
        'experiences__technologies',
        'education',
        'assigned_to',
    )

    # Filter by seniority
    seniority = request.query_params.get('seniority')
    if seniority:
        candidates = candidates.filter(seniority=seniority)

    # Filter by work preference
    work_preference = request.query_params.get('work_preference')
    if work_preference:
        candidates = candidates.filter(work_preference=work_preference)

    # Filter by years of experience
    min_experience = request.query_params.get('min_experience')
    if min_experience:
        candidates = candidates.filter(years_of_experience__gte=int(min_experience))

    max_experience = request.query_params.get('max_experience')
    if max_experience:
        candidates = candidates.filter(years_of_experience__lte=int(max_experience))

    # Search
    search = request.query_params.get('search')
    if search:
        candidates = candidates.filter(
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(user__email__icontains=search) |
            Q(professional_title__icontains=search) |
            Q(headline__icontains=search)
        ).distinct()

    # Ordering
    ordering = request.query_params.get('ordering', '-created_at')
    valid_orderings = [
        'created_at', '-created_at',
        'updated_at', '-updated_at',
        'profile_completeness', '-profile_completeness',
        'years_of_experience', '-years_of_experience',
        'user__first_name', '-user__first_name',
        'professional_title', '-professional_title',
        'headline', '-headline',
        'seniority', '-seniority',
        'city', '-city',
        'work_preference', '-work_preference',
        'willing_to_relocate', '-willing_to_relocate',
        'notice_period_days', '-notice_period_days',
        'has_resume', '-has_resume',
        'visibility', '-visibility',
    ]
    if ordering in valid_orderings:
        candidates = candidates.order_by(ordering)
    else:
        candidates = candidates.order_by('-created_at')

    # Pagination
    paginator = CandidatePagination()
    page = paginator.paginate_queryset(candidates, request)

    serializer = CandidateAdminListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@extend_schema(
    responses={
        200: CandidateProfileSerializer,
        404: OpenApiResponse(description='Candidate not found'),
    },
    tags=['Candidates'],
)
@api_view(['GET', 'PATCH'])
@permission_classes([AllowAny])
def get_candidate(request, slug):
    """
    Get or update a candidate profile by slug.
    GET: Returns full profile if authenticated, sanitized otherwise.
    PATCH: Admin/Recruiter only - update candidate profile.
    """
    profile = get_object_or_404(
        CandidateProfile.objects.select_related('user').prefetch_related('industries'),
        slug=slug
    )

    if request.method == 'PATCH':
        # Only admin/recruiter can update other candidates' profiles
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
            return Response(
                {'error': 'Permission denied. Admin or Recruiter access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CandidateProfileUpdateSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            # Detect actual changes BEFORE saving
            changes = detect_profile_changes(profile, serializer.validated_data)

            serializer.save()

            # Log the profile update activity (only if there were actual changes)
            log_profile_updated(
                candidate=profile,
                performed_by=request.user,
                changes=changes,
            )

            return Response(
                CandidateProfileSerializer(profile, context={'request': request}).data
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # GET request
    # Check visibility
    if profile.visibility == ProfileVisibility.PRIVATE:
        # Only the owner or admin/recruiter can see private profiles
        if not request.user.is_authenticated:
            return Response(
                {'error': 'This profile is private'},
                status=status.HTTP_404_NOT_FOUND
            )
        if request.user != profile.user and request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
            return Response(
                {'error': 'This profile is private'},
                status=status.HTTP_404_NOT_FOUND
            )

    # Determine which serializer to use
    if request.user.is_authenticated:
        # Authenticated users get full profile (for recruiters/clients viewing candidates)
        serializer = CandidateProfileSerializer(profile, context={'request': request})
        view_type = 'staff' if request.user.role in [UserRole.ADMIN, UserRole.RECRUITER] else 'public'
    else:
        # Anonymous users get sanitized profile
        serializer = CandidateProfileSanitizedSerializer(profile, context={'request': request})
        view_type = 'public'

    # Log profile view (with debouncing built into the service)
    log_profile_viewed(
        candidate=profile,
        viewed_by=request.user if request.user.is_authenticated else None,
        view_type=view_type,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT'),
    )

    return Response(serializer.data)


# ============ Experience Endpoints ============

def get_candidate_profile_or_403(user):
    """Helper to get candidate profile or return 403."""
    if user.role != UserRole.CANDIDATE:
        return None
    profile, _ = CandidateProfile.objects.get_or_create(user=user)
    return profile


def get_profile_for_editing(request, slug=None):
    """
    Get candidate profile for editing.
    - If slug is None: candidate editing their own profile
    - If slug is provided: admin/recruiter editing any candidate
    Returns (profile, error_response) tuple.
    """
    if slug:
        # Admin/recruiter editing another candidate's profile
        if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
            return None, Response(
                {'error': 'Permission denied. Admin or Recruiter access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        profile = get_object_or_404(CandidateProfile, slug=slug)
        return profile, None
    else:
        # Candidate editing their own profile
        if request.user.role != UserRole.CANDIDATE:
            return None, Response(
                {'error': 'Only candidates can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
        return profile, None


@extend_schema(
    responses={200: ExperienceSerializer(many=True)},
    tags=['Experiences'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_experiences(request, slug=None):
    """
    List all experiences for a candidate.
    - Without slug: returns current candidate's experiences
    - With slug: returns specified candidate's experiences (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    experiences = profile.experiences.all()
    serializer = ExperienceSerializer(experiences, many=True)
    return Response(serializer.data)


@extend_schema(
    request=ExperienceCreateUpdateSerializer,
    responses={
        201: ExperienceSerializer,
        400: OpenApiResponse(description='Validation error'),
    },
    tags=['Experiences'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_experience(request, slug=None):
    """
    Create a new experience for a candidate.
    - Without slug: creates for current candidate
    - With slug: creates for specified candidate (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    serializer = ExperienceCreateUpdateSerializer(
        data=request.data,
        context={'candidate': profile, 'request': request}
    )

    if serializer.is_valid():
        experience = serializer.save()

        # Log experience added activity
        log_experience_added(
            candidate=profile,
            job_title=experience.job_title,
            company_name=experience.company_name,
            performed_by=request.user,
        )

        return Response(
            ExperienceSerializer(experience).data,
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=ExperienceCreateUpdateSerializer,
    responses={
        200: ExperienceSerializer,
        400: OpenApiResponse(description='Validation error'),
        404: OpenApiResponse(description='Experience not found'),
    },
    tags=['Experiences'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_experience(request, experience_id, slug=None):
    """
    Update an experience for a candidate.
    - Without slug: updates for current candidate
    - With slug: updates for specified candidate (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    experience = get_object_or_404(Experience, id=experience_id, candidate=profile)

    serializer = ExperienceCreateUpdateSerializer(
        experience,
        data=request.data,
        partial=True,
        context={'candidate': profile, 'request': request}
    )

    if serializer.is_valid():
        # Detect actual changes BEFORE saving
        changes = detect_experience_changes(experience, serializer.validated_data)
        serializer.save()

        # Log experience updated activity (only if there were actual changes)
        log_experience_updated(
            candidate=profile,
            job_title=experience.job_title,
            company_name=experience.company_name,
            performed_by=request.user,
            changes=changes,
        )

        return Response(ExperienceSerializer(experience).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={
        204: OpenApiResponse(description='Experience deleted'),
        404: OpenApiResponse(description='Experience not found'),
    },
    tags=['Experiences'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_experience(request, experience_id, slug=None):
    """
    Delete an experience for a candidate.
    - Without slug: deletes for current candidate
    - With slug: deletes for specified candidate (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    experience = get_object_or_404(Experience, id=experience_id, candidate=profile)
    experience.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    request=ReorderSerializer,
    responses={
        200: ExperienceSerializer(many=True),
        400: OpenApiResponse(description='Validation error'),
    },
    tags=['Experiences'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reorder_experiences(request, slug=None):
    """
    Reorder experiences for a candidate.
    Expects: { "ordered_ids": ["uuid1", "uuid2", ...] }
    - Without slug: reorders for current candidate
    - With slug: reorders for specified candidate (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    serializer = ReorderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    ordered_ids = serializer.validated_data['ordered_ids']

    # Verify all IDs belong to this candidate
    experiences = profile.experiences.filter(id__in=ordered_ids)
    if experiences.count() != len(ordered_ids):
        return Response(
            {'error': 'Some experience IDs are invalid or do not belong to this candidate'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update order
    for index, exp_id in enumerate(ordered_ids):
        Experience.objects.filter(id=exp_id, candidate=profile).update(order=index)

    # Return updated list
    experiences = profile.experiences.all()
    return Response(ExperienceSerializer(experiences, many=True).data)


# ============ Education Endpoints ============

@extend_schema(
    responses={200: EducationSerializer(many=True)},
    tags=['Education'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_education(request, slug=None):
    """
    List all education entries for a candidate.
    - Without slug: returns current candidate's education
    - With slug: returns specified candidate's education (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    education = profile.education.all()
    serializer = EducationSerializer(education, many=True)
    return Response(serializer.data)


@extend_schema(
    request=EducationCreateUpdateSerializer,
    responses={
        201: EducationSerializer,
        400: OpenApiResponse(description='Validation error'),
    },
    tags=['Education'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_education(request, slug=None):
    """
    Create a new education entry for a candidate.
    - Without slug: creates for current candidate
    - With slug: creates for specified candidate (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    serializer = EducationCreateUpdateSerializer(
        data=request.data,
        context={'candidate': profile, 'request': request}
    )

    if serializer.is_valid():
        education = serializer.save()

        # Log education added activity
        log_education_added(
            candidate=profile,
            institution=education.institution,
            degree=education.degree,
            performed_by=request.user,
        )

        return Response(
            EducationSerializer(education).data,
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=EducationCreateUpdateSerializer,
    responses={
        200: EducationSerializer,
        400: OpenApiResponse(description='Validation error'),
        404: OpenApiResponse(description='Education not found'),
    },
    tags=['Education'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_education(request, education_id, slug=None):
    """
    Update an education entry for a candidate.
    - Without slug: updates for current candidate
    - With slug: updates for specified candidate (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    education = get_object_or_404(Education, id=education_id, candidate=profile)

    serializer = EducationCreateUpdateSerializer(
        education,
        data=request.data,
        partial=True,
        context={'candidate': profile, 'request': request}
    )

    if serializer.is_valid():
        # Detect actual changes BEFORE saving
        changes = detect_education_changes(education, serializer.validated_data)
        serializer.save()

        # Log education updated activity (only if there were actual changes)
        log_education_updated(
            candidate=profile,
            institution=education.institution,
            degree=education.degree,
            performed_by=request.user,
            changes=changes,
        )

        return Response(EducationSerializer(education).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={
        204: OpenApiResponse(description='Education deleted'),
        404: OpenApiResponse(description='Education not found'),
    },
    tags=['Education'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_education(request, education_id, slug=None):
    """
    Delete an education entry for a candidate.
    - Without slug: deletes for current candidate
    - With slug: deletes for specified candidate (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    education = get_object_or_404(Education, id=education_id, candidate=profile)
    education.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    request=ReorderSerializer,
    responses={
        200: EducationSerializer(many=True),
        400: OpenApiResponse(description='Validation error'),
    },
    tags=['Education'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reorder_education(request, slug=None):
    """
    Reorder education entries for a candidate.
    Expects: { "ordered_ids": ["uuid1", "uuid2", ...] }
    - Without slug: reorders for current candidate
    - With slug: reorders for specified candidate (admin/recruiter only)
    """
    profile, error = get_profile_for_editing(request, slug)
    if error:
        return error

    serializer = ReorderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    ordered_ids = serializer.validated_data['ordered_ids']

    # Verify all IDs belong to this candidate
    education_entries = profile.education.filter(id__in=ordered_ids)
    if education_entries.count() != len(ordered_ids):
        return Response(
            {'error': 'Some education IDs are invalid or do not belong to this candidate'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update order
    for index, edu_id in enumerate(ordered_ids):
        Education.objects.filter(id=edu_id, candidate=profile).update(order=index)

    # Return updated list
    education = profile.education.all()
    return Response(EducationSerializer(education, many=True).data)


# ============ Admin Skills Management ============

@extend_schema(
    responses={200: SkillSerializer(many=True)},
    parameters=[
        OpenApiParameter(name='include_inactive', type=bool, description='Include inactive skills'),
        OpenApiParameter(name='needs_review', type=bool, description='Filter by needs_review status'),
        OpenApiParameter(name='category', type=str, description='Filter by category'),
        OpenApiParameter(name='search', type=str, description='Search by name'),
    ],
    tags=['Admin - Skills'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_skills(request):
    """
    List all skills for admin management (includes inactive).
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    skills = Skill.objects.all()

    # Filter by active status
    include_inactive = request.query_params.get('include_inactive', 'true').lower() == 'true'
    if not include_inactive:
        skills = skills.filter(is_active=True)

    # Filter by needs_review
    needs_review = request.query_params.get('needs_review')
    if needs_review is not None:
        skills = skills.filter(needs_review=needs_review.lower() == 'true')

    # Filter by category
    category = request.query_params.get('category')
    if category:
        skills = skills.filter(category=category)

    # Search by name
    search = request.query_params.get('search')
    if search:
        skills = skills.filter(name__icontains=search)

    skills = skills.order_by('-needs_review', 'category', 'name')
    serializer = SkillSerializer(skills, many=True)
    return Response(serializer.data)


@extend_schema(
    request=SkillSerializer,
    responses={201: SkillSerializer},
    tags=['Admin - Skills'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_create_skill(request):
    """
    Create a new skill.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = SkillSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=SkillSerializer,
    responses={200: SkillSerializer},
    tags=['Admin - Skills'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_skill(request, skill_id):
    """
    Update a skill.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    skill = get_object_or_404(Skill, id=skill_id)
    serializer = SkillSerializer(skill, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['Admin - Skills'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_skill(request, skill_id):
    """
    Delete a skill (soft delete by setting is_active=False).
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    skill = get_object_or_404(Skill, id=skill_id)
    skill.is_active = False
    skill.save()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    request={'application/json': {'type': 'object', 'properties': {'target_id': {'type': 'integer'}}}},
    responses={200: SkillSerializer},
    tags=['Admin - Skills'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_merge_skill(request, skill_id):
    """
    Merge a skill into another (reassign all references, then delete source).
    Request body: { "target_id": <id of skill to merge into> }
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    source_skill = get_object_or_404(Skill, id=skill_id)
    target_id = request.data.get('target_id')

    if not target_id:
        return Response({'error': 'target_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    if int(target_id) == skill_id:
        return Response({'error': 'Cannot merge skill into itself'}, status=status.HTTP_400_BAD_REQUEST)

    target_skill = get_object_or_404(Skill, id=target_id)

    # Get all experiences with the source skill and add target skill
    for experience in Experience.objects.filter(skills=source_skill):
        experience.skills.remove(source_skill)
        experience.skills.add(target_skill)

    # Delete source skill
    source_skill.delete()

    return Response(SkillSerializer(target_skill).data)


# ============ Admin Technologies Management ============

@extend_schema(
    responses={200: TechnologySerializer(many=True)},
    parameters=[
        OpenApiParameter(name='include_inactive', type=bool, description='Include inactive technologies'),
        OpenApiParameter(name='needs_review', type=bool, description='Filter by needs_review status'),
        OpenApiParameter(name='category', type=str, description='Filter by category'),
        OpenApiParameter(name='search', type=str, description='Search by name'),
    ],
    tags=['Admin - Technologies'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_technologies(request):
    """
    List all technologies for admin management (includes inactive).
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    technologies = Technology.objects.all()

    # Filter by active status
    include_inactive = request.query_params.get('include_inactive', 'true').lower() == 'true'
    if not include_inactive:
        technologies = technologies.filter(is_active=True)

    # Filter by needs_review
    needs_review = request.query_params.get('needs_review')
    if needs_review is not None:
        technologies = technologies.filter(needs_review=needs_review.lower() == 'true')

    # Filter by category
    category = request.query_params.get('category')
    if category:
        technologies = technologies.filter(category=category)

    # Search by name
    search = request.query_params.get('search')
    if search:
        technologies = technologies.filter(name__icontains=search)

    technologies = technologies.order_by('-needs_review', 'category', 'name')
    serializer = TechnologySerializer(technologies, many=True)
    return Response(serializer.data)


@extend_schema(
    request=TechnologySerializer,
    responses={201: TechnologySerializer},
    tags=['Admin - Technologies'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_create_technology(request):
    """
    Create a new technology.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = TechnologySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=TechnologySerializer,
    responses={200: TechnologySerializer},
    tags=['Admin - Technologies'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_technology(request, technology_id):
    """
    Update a technology.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    technology = get_object_or_404(Technology, id=technology_id)
    serializer = TechnologySerializer(technology, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['Admin - Technologies'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_technology(request, technology_id):
    """
    Delete a technology (soft delete by setting is_active=False).
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    technology = get_object_or_404(Technology, id=technology_id)
    technology.is_active = False
    technology.save()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    request={'application/json': {'type': 'object', 'properties': {'target_id': {'type': 'integer'}}}},
    responses={200: TechnologySerializer},
    tags=['Admin - Technologies'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_merge_technology(request, technology_id):
    """
    Merge a technology into another (reassign all references, then delete source).
    Request body: { "target_id": <id of technology to merge into> }
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    source_tech = get_object_or_404(Technology, id=technology_id)
    target_id = request.data.get('target_id')

    if not target_id:
        return Response({'error': 'target_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    if int(target_id) == technology_id:
        return Response({'error': 'Cannot merge technology into itself'}, status=status.HTTP_400_BAD_REQUEST)

    target_tech = get_object_or_404(Technology, id=target_id)

    # Get all experiences with the source technology and add target technology
    for experience in Experience.objects.filter(technologies=source_tech):
        experience.technologies.remove(source_tech)
        experience.technologies.add(target_tech)

    # Delete source technology
    source_tech.delete()

    return Response(TechnologySerializer(target_tech).data)


# ============================================================================
# Candidate Activity
# ============================================================================

def serialize_candidate_activity_note(note):
    """Serialize a CandidateActivityNote to match ActivityNote format."""
    return {
        'id': str(note.id),
        'author': str(note.author_id) if note.author_id else None,
        'author_name': note.author.full_name if note.author else 'Unknown',
        'author_email': note.author.email if note.author else None,
        'author_avatar': note.author.avatar.url if note.author and note.author.avatar else None,
        'content': note.content,
        'created_at': note.created_at.isoformat(),
        'updated_at': note.updated_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def candidate_activity(request, candidate_id):
    """
    Get unified activity feed for a specific candidate.
    Merges CandidateActivity (profile events) and ActivityLog (application events).
    Returns data in ActivityLogEntry format for frontend compatibility.

    Query params:
        - job_id: Filter to activities for a specific job application
                  Use 'none' to filter for activities with no job association
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidate = get_object_or_404(CandidateProfile, id=candidate_id)
    job_id_filter = request.query_params.get('job_id')

    # Build unified activity list in ActivityLogEntry format
    activities = []

    # -------------------------------------------------------------------------
    # 1. Get CandidateActivity entries (profile updates, logins, job views, etc.)
    # -------------------------------------------------------------------------
    candidate_activities = CandidateActivity.objects.filter(
        candidate=candidate
    ).select_related('performed_by', 'job', 'job__company').prefetch_related('notes', 'notes__author')

    # Filter by job if specified
    if job_id_filter == 'none':
        # Only activities with no job association (profile-level activities)
        candidate_activities = candidate_activities.filter(job__isnull=True)
    elif job_id_filter:
        # Include activities for that job OR activities with no job
        candidate_activities = candidate_activities.filter(
            Q(job_id=job_id_filter) | Q(job__isnull=True)
        )

    for activity in candidate_activities[:100]:
        # Build metadata
        metadata = dict(activity.metadata) if activity.metadata else {}
        if activity.job:
            metadata['job_id'] = str(activity.job_id)
            metadata['job_title'] = activity.job.title
            metadata['company_name'] = activity.job.company.name if activity.job.company else None

        # Serialize notes
        notes = [serialize_candidate_activity_note(note) for note in activity.notes.all()]

        activities.append({
            'id': str(activity.id),
            'activity_type': activity.activity_type,
            'application': None,  # No application for candidate-level activities
            'performed_by': str(activity.performed_by_id) if activity.performed_by_id else None,
            'performed_by_name': activity.performer_name,
            'performed_by_email': activity.performed_by.email if activity.performed_by else None,
            'performed_by_avatar': activity.performed_by.avatar.url if activity.performed_by and activity.performed_by.avatar else None,
            'previous_status': None,
            'new_status': None,
            'previous_stage': None,
            'new_stage': None,
            'stage_name': None,
            'metadata': metadata,
            'created_at': activity.created_at.isoformat(),
            'notes': notes,
            'notes_count': len(notes),
            # Extra fields for candidate activity context
            'job_id': str(activity.job_id) if activity.job_id else None,
            'job_title': activity.job.title if activity.job else None,
            'source': 'candidate',  # To distinguish from application activities
        })

    # -------------------------------------------------------------------------
    # 2. Get Application ActivityLog entries
    # -------------------------------------------------------------------------
    # Skip application activities when filtering for "no job" activities
    if job_id_filter != 'none':
        applications = Application.objects.filter(candidate=candidate)
        if job_id_filter:
            applications = applications.filter(job_id=job_id_filter)

        application_ids = list(applications.values_list('id', flat=True))
    else:
        application_ids = []

    if application_ids:
        activity_logs = ActivityLog.objects.filter(
            application_id__in=application_ids
        ).select_related(
            'performed_by', 'application', 'application__job', 'application__job__company'
        ).prefetch_related('notes', 'notes__author').order_by('-created_at')[:100]

        for log in activity_logs:
            # Serialize notes using the existing serializer format
            notes = []
            for note in log.notes.all():
                notes.append({
                    'id': str(note.id),
                    'author': str(note.author_id) if note.author_id else None,
                    'author_name': note.author.full_name if note.author else 'Unknown',
                    'author_email': note.author.email if note.author else None,
                    'author_avatar': note.author.avatar.url if note.author and note.author.avatar else None,
                    'content': note.content,
                    'created_at': note.created_at.isoformat(),
                    'updated_at': note.updated_at.isoformat(),
                })

            # Build metadata including job info
            metadata = dict(log.metadata) if log.metadata else {}
            if log.application and log.application.job:
                metadata['job_id'] = str(log.application.job_id)
                metadata['job_title'] = log.application.job.title
                metadata['company_name'] = log.application.job.company.name if log.application.job.company else None
            metadata['application_id'] = str(log.application_id) if log.application_id else None

            activities.append({
                'id': str(log.id),
                'activity_type': log.activity_type,
                'application': str(log.application_id) if log.application_id else None,
                'performed_by': str(log.performed_by_id) if log.performed_by_id else None,
                'performed_by_name': log.performer_name,
                'performed_by_email': log.performed_by.email if log.performed_by else None,
                'performed_by_avatar': log.performed_by.avatar.url if log.performed_by and log.performed_by.avatar else None,
                'previous_status': log.previous_status or None,
                'new_status': log.new_status or None,
                'previous_stage': log.previous_stage,
                'new_stage': log.new_stage,
                'stage_name': log.stage_name,
                'metadata': metadata,
                'created_at': log.created_at.isoformat(),
                'notes': notes,
                'notes_count': len(notes),
                # Extra fields for context
                'job_id': str(log.application.job_id) if log.application and log.application.job else None,
                'job_title': log.application.job.title if log.application and log.application.job else None,
                'source': 'application',
            })

    # -------------------------------------------------------------------------
    # 3. Sort by created_at (newest first) and return
    # -------------------------------------------------------------------------
    activities.sort(key=lambda x: x['created_at'], reverse=True)

    # Return the most recent 100 activities
    return Response(activities[:100])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_candidate_activity_note(request, candidate_id, activity_id):
    """
    Add a note to a candidate activity.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidate = get_object_or_404(CandidateProfile, id=candidate_id)
    activity = get_object_or_404(CandidateActivity, id=activity_id, candidate=candidate)

    content = request.data.get('content', '').strip()
    if not content:
        return Response(
            {'error': 'Note content is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    note = CandidateActivityNote.objects.create(
        activity=activity,
        author=request.user,
        content=content,
    )

    return Response({
        'id': str(note.id),
        'author': str(note.author_id),
        'author_name': note.author.full_name,
        'author_email': note.author.email,
        'author_avatar': note.author.avatar.url if note.author.avatar else None,
        'content': note.content,
        'created_at': note.created_at.isoformat(),
        'updated_at': note.updated_at.isoformat(),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_profile_view(request, candidate_id):
    """
    Record that someone viewed a candidate's profile.
    Used by the admin panel when opening a candidate preview.
    Includes debouncing (same viewer won't log multiple times within 1 hour).
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidate = get_object_or_404(CandidateProfile, id=candidate_id)

    # Log the view (debouncing is handled inside log_profile_viewed)
    activity = log_profile_viewed(
        candidate=candidate,
        viewed_by=request.user,
        view_type='staff',
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT'),
    )

    if activity:
        return Response({'logged': True}, status=status.HTTP_201_CREATED)
    else:
        # Debounced - already logged recently
        return Response({'logged': False, 'message': 'Already logged recently'}, status=status.HTTP_200_OK)


# ============================================================================
# Profile Suggestions
# ============================================================================

@extend_schema(
    responses={200: ProfileSuggestionSerializer(many=True)},
    tags=['Admin - Profile Suggestions'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_suggestions(request, candidate_id):
    """
    List all profile suggestions for a candidate.
    Admin/Recruiter only.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidate = get_object_or_404(CandidateProfile, id=candidate_id)
    suggestions = ProfileSuggestion.objects.filter(
        candidate=candidate
    ).select_related('created_by', 'resolved_by', 'reopened_by').order_by('-created_at')

    serializer = ProfileSuggestionSerializer(suggestions, many=True)
    return Response(serializer.data)


@extend_schema(
    request=ProfileSuggestionCreateSerializer,
    responses={201: ProfileSuggestionSerializer},
    tags=['Admin - Profile Suggestions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_create_suggestion(request, candidate_id):
    """
    Create a profile suggestion for a candidate.
    Admin/Recruiter only.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidate = get_object_or_404(CandidateProfile, id=candidate_id)

    serializer = ProfileSuggestionCreateSerializer(
        data=request.data,
        context={'candidate': candidate, 'request': request}
    )

    if serializer.is_valid():
        suggestion = serializer.save()
        # TODO: Send notification email to candidate
        return Response(
            ProfileSuggestionSerializer(suggestion).data,
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: ProfileSuggestionSerializer},
    tags=['Admin - Profile Suggestions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reopen_suggestion(request, candidate_id, suggestion_id):
    """
    Reopen a resolved or declined suggestion.
    Admin/Recruiter only.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidate = get_object_or_404(CandidateProfile, id=candidate_id)
    suggestion = get_object_or_404(
        ProfileSuggestion,
        id=suggestion_id,
        candidate=candidate
    )

    if suggestion.status == ProfileSuggestionStatus.PENDING:
        return Response(
            {'error': 'Suggestion is already pending.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    suggestion.status = ProfileSuggestionStatus.PENDING
    suggestion.reopened_at = timezone.now()
    suggestion.reopened_by = request.user
    suggestion.save()

    # TODO: Send notification email to candidate
    return Response(ProfileSuggestionSerializer(suggestion).data)


@extend_schema(
    responses={200: ProfileSuggestionSerializer},
    tags=['Admin - Profile Suggestions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_close_suggestion(request, candidate_id, suggestion_id):
    """
    Close a suggestion (no longer relevant).
    Admin/Recruiter only.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidate = get_object_or_404(CandidateProfile, id=candidate_id)
    suggestion = get_object_or_404(
        ProfileSuggestion,
        id=suggestion_id,
        candidate=candidate
    )

    suggestion.status = ProfileSuggestionStatus.CLOSED
    suggestion.save()

    return Response(ProfileSuggestionSerializer(suggestion).data)


# ============================================================================
# Candidate Profile Suggestions (Candidate-facing)
# ============================================================================

@extend_schema(
    responses={200: ProfileSuggestionSerializer(many=True)},
    tags=['Candidate - Profile Suggestions'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def candidate_list_suggestions(request):
    """
    List all pending profile suggestions for the authenticated candidate.
    """
    if request.user.role != UserRole.CANDIDATE:
        return Response(
            {'error': 'Only candidates can access this endpoint.'},
            status=status.HTTP_403_FORBIDDEN
        )

    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    suggestions = ProfileSuggestion.objects.filter(
        candidate=profile,
        status=ProfileSuggestionStatus.PENDING
    ).select_related('created_by', 'resolved_by', 'reopened_by').order_by('-created_at')

    serializer = ProfileSuggestionSerializer(suggestions, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: ProfileSuggestionSerializer},
    tags=['Candidate - Profile Suggestions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def candidate_resolve_suggestion(request, suggestion_id):
    """
    Mark a suggestion as resolved.
    Candidate has made the suggested change.
    """
    if request.user.role != UserRole.CANDIDATE:
        return Response(
            {'error': 'Only candidates can access this endpoint.'},
            status=status.HTTP_403_FORBIDDEN
        )

    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    suggestion = get_object_or_404(
        ProfileSuggestion,
        id=suggestion_id,
        candidate=profile,
        status=ProfileSuggestionStatus.PENDING
    )

    suggestion.status = ProfileSuggestionStatus.RESOLVED
    suggestion.resolved_at = timezone.now()
    suggestion.resolved_by = request.user
    suggestion.save()

    # TODO: Send notification email to admin/recruiter who created the suggestion
    return Response(ProfileSuggestionSerializer(suggestion).data)


@extend_schema(
    request=ProfileSuggestionDeclineSerializer,
    responses={200: ProfileSuggestionSerializer},
    tags=['Candidate - Profile Suggestions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def candidate_decline_suggestion(request, suggestion_id):
    """
    Decline a suggestion with a reason.
    """
    if request.user.role != UserRole.CANDIDATE:
        return Response(
            {'error': 'Only candidates can access this endpoint.'},
            status=status.HTTP_403_FORBIDDEN
        )

    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    suggestion = get_object_or_404(
        ProfileSuggestion,
        id=suggestion_id,
        candidate=profile,
        status=ProfileSuggestionStatus.PENDING
    )

    serializer = ProfileSuggestionDeclineSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    suggestion.status = ProfileSuggestionStatus.DECLINED
    suggestion.resolved_at = timezone.now()
    suggestion.resolved_by = request.user
    suggestion.resolution_note = serializer.validated_data['reason']
    suggestion.save()

    # TODO: Send notification email to admin/recruiter who created the suggestion
    return Response(ProfileSuggestionSerializer(suggestion).data)


# ============================================================================
# Candidate Applications (Admin/Client View)
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_candidate_applications(request, candidate_id):
    """
    List all applications for a specific candidate.

    - Admin/Recruiter: See all applications
    - Client: Only see applications to their company's jobs
    """
    candidate = get_object_or_404(CandidateProfile, id=candidate_id)

    # Check permissions
    if request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]:
        # Admin/Recruiter sees all applications
        applications = Application.objects.filter(
            candidate=candidate
        ).select_related(
            'job', 'job__company', 'current_stage'
        ).prefetch_related('assigned_recruiters').order_by('-applied_at')
    elif request.user.role == UserRole.CLIENT:
        # Client only sees applications to their company's jobs
        company_membership = CompanyUser.objects.filter(
            user=request.user,
            is_active=True
        ).select_related('company').first()

        if not company_membership:
            return Response(
                {'error': 'No company membership found.'},
                status=status.HTTP_403_FORBIDDEN
            )

        applications = Application.objects.filter(
            candidate=candidate,
            job__company=company_membership.company
        ).select_related(
            'job', 'job__company', 'current_stage'
        ).prefetch_related('assigned_recruiters').order_by('-applied_at')
    else:
        return Response(
            {'error': 'Permission denied.'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ApplicationListSerializer(applications, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_candidate_application(request, candidate_id):
    """
    Create an application for a candidate (Admin/Recruiter sourcing).

    This allows recruiters to add candidates to jobs without the candidate
    having to apply themselves.

    Required body:
    - job_id: UUID of the job to apply for
    Optional body:
    - covering_statement: Cover letter/note about why they're a fit
    - source: 'direct' (default), 'referral', or 'recruiter'
    """
    from jobs.models import ApplicationStatus, InterviewStageTemplate, StageInstanceStatus, ApplicationStageInstance, JobStatus

    # Only admin/recruiter can source candidates
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidate = get_object_or_404(CandidateProfile, id=candidate_id)

    job_id = request.data.get('job_id')
    if not job_id:
        return Response(
            {'error': 'job_id is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response(
            {'error': 'Job not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check job is accepting applications
    if job.status not in [JobStatus.PUBLISHED, JobStatus.DRAFT]:
        return Response(
            {'error': 'This job is not accepting applications.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check candidate hasn't already applied
    if Application.objects.filter(job=job, candidate=candidate).exists():
        return Response(
            {'error': 'This candidate has already been added to this job.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the application
    application = Application.objects.create(
        job=job,
        candidate=candidate,
        covering_statement=request.data.get('covering_statement', ''),
        source=request.data.get('source', 'recruiter'),
        referrer=request.user,  # Track who sourced them
        status=ApplicationStatus.APPLIED,
    )

    # Create stage instances for all job stage templates
    stage_templates = InterviewStageTemplate.objects.filter(job=job).order_by('order')
    for template in stage_templates:
        ApplicationStageInstance.objects.create(
            application=application,
            stage_template=template,
            status=StageInstanceStatus.NOT_STARTED,
        )

    # Increment job applications count
    job.applications_count += 1
    job.save(update_fields=['applications_count'])

    serializer = ApplicationListSerializer(application)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
