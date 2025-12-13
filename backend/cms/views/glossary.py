"""Views for GlossaryTerm model."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from users.models import UserRole
from ..models import GlossaryTerm
from ..serializers import (
    GlossaryTermListSerializer,
    GlossaryTermDetailSerializer,
    GlossaryTermCreateUpdateSerializer,
    GlossaryTermPublicSerializer,
)


def is_staff_user(user):
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# =============================================================================
# Admin/Staff Endpoints
# =============================================================================

@extend_schema(
    responses={200: GlossaryTermListSerializer(many=True)},
    tags=['CMS - Glossary (Admin)'],
    parameters=[
        OpenApiParameter(name='is_active', description='Filter by active status', required=False, type=bool),
        OpenApiParameter(name='search', description='Search term', required=False, type=str),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_glossary_terms(request):
    """List all glossary terms (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    terms = GlossaryTerm.objects.all()

    is_active = request.query_params.get('is_active')
    if is_active is not None:
        terms = terms.filter(is_active=is_active.lower() == 'true')

    search = request.query_params.get('search')
    if search:
        terms = terms.filter(title__icontains=search)

    serializer = GlossaryTermListSerializer(terms, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: GlossaryTermDetailSerializer},
    tags=['CMS - Glossary (Admin)'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_glossary_term(request, term_id):
    """Get glossary term by ID (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        term = GlossaryTerm.objects.prefetch_related('related_terms').get(id=term_id)
    except GlossaryTerm.DoesNotExist:
        return Response({'error': 'Term not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = GlossaryTermDetailSerializer(term)
    return Response(serializer.data)


@extend_schema(
    request=GlossaryTermCreateUpdateSerializer,
    responses={201: GlossaryTermDetailSerializer},
    tags=['CMS - Glossary (Admin)'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_glossary_term(request):
    """Create a new glossary term (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = GlossaryTermCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        term = serializer.save()
        return Response(GlossaryTermDetailSerializer(term).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=GlossaryTermCreateUpdateSerializer,
    responses={200: GlossaryTermDetailSerializer},
    tags=['CMS - Glossary (Admin)'],
)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_glossary_term(request, term_id):
    """Update a glossary term (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        term = GlossaryTerm.objects.get(id=term_id)
    except GlossaryTerm.DoesNotExist:
        return Response({'error': 'Term not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = GlossaryTermCreateUpdateSerializer(
        term, data=request.data, partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        term = serializer.save()
        return Response(GlossaryTermDetailSerializer(term).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['CMS - Glossary (Admin)'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_glossary_term(request, term_id):
    """Delete a glossary term (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        term = GlossaryTerm.objects.get(id=term_id)
    except GlossaryTerm.DoesNotExist:
        return Response({'error': 'Term not found'}, status=status.HTTP_404_NOT_FOUND)

    term.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Public Endpoints
# =============================================================================

@extend_schema(
    responses={200: GlossaryTermListSerializer(many=True)},
    tags=['CMS - Glossary (Public)'],
    parameters=[
        OpenApiParameter(name='letter', description='Filter by first letter', required=False, type=str),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def list_public_glossary_terms(request):
    """List active glossary terms (public)."""
    terms = GlossaryTerm.objects.filter(is_active=True)

    letter = request.query_params.get('letter')
    if letter:
        terms = terms.filter(title__istartswith=letter)

    serializer = GlossaryTermListSerializer(terms, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: GlossaryTermPublicSerializer},
    tags=['CMS - Glossary (Public)'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_glossary_term(request, slug):
    """Get glossary term by slug (public)."""
    try:
        term = GlossaryTerm.objects.prefetch_related('related_terms').get(
            slug=slug, is_active=True
        )
    except GlossaryTerm.DoesNotExist:
        return Response({'error': 'Term not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = GlossaryTermPublicSerializer(term)
    return Response(serializer.data)


@extend_schema(
    responses={200: dict},
    tags=['CMS - Glossary (Public)'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_glossary_alphabet(request):
    """Get list of letters that have glossary terms."""
    terms = GlossaryTerm.objects.filter(is_active=True).values_list('title', flat=True)
    letters = sorted(set(term[0].upper() for term in terms if term))
    return Response({'letters': letters})
