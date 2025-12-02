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
        OpenApiParameter(name='skills', description='Filter by skill IDs (comma-separated)', required=False, type=str),
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
    ).select_related('user').prefetch_related('skills', 'industries')

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

    # Filter by skills
    skills = request.query_params.get('skills')
    if skills:
        skill_ids = [int(s) for s in skills.split(',') if s.isdigit()]
        if skill_ids:
            candidates = candidates.filter(skills__id__in=skill_ids).distinct()

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
    responses={
        200: CandidateProfileSerializer,
        404: OpenApiResponse(description='Candidate not found'),
    },
    tags=['Candidates'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_candidate(request, slug):
    """
    Get a single candidate profile by slug.
    Returns full profile if authenticated, sanitized otherwise.
    """
    profile = get_object_or_404(
        CandidateProfile.objects.select_related('user').prefetch_related('skills', 'industries'),
        slug=slug
    )

    # Check visibility
    if profile.visibility == ProfileVisibility.PRIVATE:
        # Only the owner can see private profiles
        if not request.user.is_authenticated or request.user != profile.user:
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


@extend_schema(
    responses={200: ExperienceSerializer(many=True)},
    tags=['Experiences'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_experiences(request):
    """
    List all experiences for the current candidate.
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

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
def create_experience(request):
    """
    Create a new experience for the current candidate.
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

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
def update_experience(request, experience_id):
    """
    Update an experience for the current candidate.
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

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
def delete_experience(request, experience_id):
    """
    Delete an experience for the current candidate.
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

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
def reorder_experiences(request):
    """
    Reorder experiences for the current candidate.
    Expects: { "ordered_ids": ["uuid1", "uuid2", ...] }
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ReorderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    ordered_ids = serializer.validated_data['ordered_ids']

    # Verify all IDs belong to this candidate
    experiences = profile.experiences.filter(id__in=ordered_ids)
    if experiences.count() != len(ordered_ids):
        return Response(
            {'error': 'Some experience IDs are invalid or do not belong to you'},
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
def list_education(request):
    """
    List all education entries for the current candidate.
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

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
def create_education(request):
    """
    Create a new education entry for the current candidate.
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

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
def update_education(request, education_id):
    """
    Update an education entry for the current candidate.
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

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
def delete_education(request, education_id):
    """
    Delete an education entry for the current candidate.
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

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
def reorder_education(request):
    """
    Reorder education entries for the current candidate.
    Expects: { "ordered_ids": ["uuid1", "uuid2", ...] }
    """
    profile = get_candidate_profile_or_403(request.user)
    if not profile:
        return Response(
            {'error': 'Only candidates can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ReorderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    ordered_ids = serializer.validated_data['ordered_ids']

    # Verify all IDs belong to this candidate
    education_entries = profile.education.filter(id__in=ordered_ids)
    if education_entries.count() != len(ordered_ids):
        return Response(
            {'error': 'Some education IDs are invalid or do not belong to you'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update order
    for index, edu_id in enumerate(ordered_ids):
        Education.objects.filter(id=edu_id, candidate=profile).update(order=index)

    # Return updated list
    education = profile.education.all()
    return Response(EducationSerializer(education, many=True).data)
