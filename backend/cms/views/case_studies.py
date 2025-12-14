"""Views for CaseStudy model."""
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from users.models import UserRole
from ..models import CaseStudy, ContentStatus
from ..serializers import (
    CaseStudyListSerializer,
    CaseStudyDetailSerializer,
    CaseStudyCreateUpdateSerializer,
    CaseStudyPublicSerializer,
)


def is_staff_user(user):
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# =============================================================================
# Admin/Staff Endpoints
# =============================================================================

@extend_schema(
    responses={200: CaseStudyListSerializer(many=True)},
    tags=['CMS - Case Studies (Admin)'],
    parameters=[
        OpenApiParameter(name='industry', description='Filter by industry', required=False, type=str),
        OpenApiParameter(name='status', description='Filter by status', required=False, type=str),
        OpenApiParameter(name='is_featured', description='Filter by featured', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_case_studies(request):
    """List all case studies (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    studies = CaseStudy.objects.all()

    industry = request.query_params.get('industry')
    if industry:
        studies = studies.filter(industry=industry)

    status_filter = request.query_params.get('status')
    if status_filter:
        studies = studies.filter(status=status_filter)

    is_featured = request.query_params.get('is_featured')
    if is_featured is not None:
        studies = studies.filter(is_featured=is_featured.lower() == 'true')

    serializer = CaseStudyListSerializer(studies, many=True, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    responses={200: CaseStudyDetailSerializer},
    tags=['CMS - Case Studies (Admin)'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_case_study(request, study_id):
    """Get case study by ID (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        study = CaseStudy.objects.get(id=study_id)
    except CaseStudy.DoesNotExist:
        return Response({'error': 'Case study not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CaseStudyDetailSerializer(study, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    request=CaseStudyCreateUpdateSerializer,
    responses={201: CaseStudyDetailSerializer},
    tags=['CMS - Case Studies (Admin)'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_case_study(request):
    """Create a new case study (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = CaseStudyCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        study = serializer.save()
        if study.status == ContentStatus.PUBLISHED and not study.published_at:
            study.published_at = timezone.now()
            study.save()
        return Response(CaseStudyDetailSerializer(study, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=CaseStudyCreateUpdateSerializer,
    responses={200: CaseStudyDetailSerializer},
    tags=['CMS - Case Studies (Admin)'],
)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_case_study(request, study_id):
    """Update a case study (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        study = CaseStudy.objects.get(id=study_id)
    except CaseStudy.DoesNotExist:
        return Response({'error': 'Case study not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CaseStudyCreateUpdateSerializer(
        study, data=request.data, partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        study = serializer.save()
        if study.status == ContentStatus.PUBLISHED and not study.published_at:
            study.published_at = timezone.now()
            study.save()
        return Response(CaseStudyDetailSerializer(study, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['CMS - Case Studies (Admin)'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_case_study(request, study_id):
    """Delete a case study (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        study = CaseStudy.objects.get(id=study_id)
    except CaseStudy.DoesNotExist:
        return Response({'error': 'Case study not found'}, status=status.HTTP_404_NOT_FOUND)

    study.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Public Endpoints
# =============================================================================

@extend_schema(
    responses={200: CaseStudyPublicSerializer(many=True)},
    tags=['CMS - Case Studies (Public)'],
    parameters=[
        OpenApiParameter(name='industry', description='Filter by industry', required=False, type=str),
        OpenApiParameter(name='featured', description='Only featured studies', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def list_public_case_studies(request):
    """List published case studies (public)."""
    studies = CaseStudy.objects.filter(status=ContentStatus.PUBLISHED)

    industry = request.query_params.get('industry')
    if industry:
        studies = studies.filter(industry=industry)

    featured = request.query_params.get('featured')
    if featured is not None:
        studies = studies.filter(is_featured=featured.lower() == 'true')

    serializer = CaseStudyPublicSerializer(studies, many=True, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    responses={200: CaseStudyPublicSerializer},
    tags=['CMS - Case Studies (Public)'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_case_study(request, slug):
    """Get published case study by slug (public)."""
    try:
        study = CaseStudy.objects.get(slug=slug, status=ContentStatus.PUBLISHED)
    except CaseStudy.DoesNotExist:
        return Response({'error': 'Case study not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CaseStudyPublicSerializer(study, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    responses={200: dict},
    tags=['CMS - Case Studies (Public)'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_case_study_industries(request):
    """Get list of industries with case study counts."""
    studies = CaseStudy.objects.filter(status=ContentStatus.PUBLISHED)
    industries = studies.values_list('industry', flat=True).distinct()
    result = []
    for ind in industries:
        if ind:
            count = studies.filter(industry=ind).count()
            result.append({'name': ind, 'count': count})
    return Response(result)
