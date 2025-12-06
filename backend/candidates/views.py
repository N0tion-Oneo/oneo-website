from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from users.models import UserRole
from .models import Skill, Industry, Technology, CandidateProfile, ProfileVisibility, Experience, Education
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
        serializer.save()
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
        'user', 'city_rel', 'country_rel'
    ).prefetch_related(
        'industries',
        'experiences',
        'experiences__industry',
        'experiences__skills',
        'experiences__technologies',
        'education',
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
    valid_orderings = ['created_at', '-created_at', 'profile_completeness', '-profile_completeness',
                       'years_of_experience', '-years_of_experience', 'user__first_name', '-user__first_name']
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
            serializer.save()
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
    else:
        # Anonymous users get sanitized profile
        serializer = CandidateProfileSanitizedSerializer(profile, context={'request': request})

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
        serializer.save()
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
        serializer.save()
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
