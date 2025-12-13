"""Views for Page model."""
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from users.models import UserRole
from ..models import Page, ContentStatus
from ..serializers import (
    PageListSerializer,
    PageDetailSerializer,
    PageCreateUpdateSerializer,
    PagePublicSerializer,
)


def is_staff_user(user):
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# =============================================================================
# Admin/Staff Endpoints
# =============================================================================

@extend_schema(
    responses={200: PageListSerializer(many=True)},
    tags=['CMS - Pages (Admin)'],
    parameters=[
        OpenApiParameter(name='page_type', description='Filter by page type', required=False, type=str),
        OpenApiParameter(name='status', description='Filter by status', required=False, type=str),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_pages(request):
    """List all pages (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    pages = Page.objects.all()

    page_type = request.query_params.get('page_type')
    if page_type:
        pages = pages.filter(page_type=page_type)

    status_filter = request.query_params.get('status')
    if status_filter:
        pages = pages.filter(status=status_filter)

    serializer = PageListSerializer(pages, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: PageDetailSerializer},
    tags=['CMS - Pages (Admin)'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_page(request, page_id):
    """Get page by ID (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        page = Page.objects.get(id=page_id)
    except Page.DoesNotExist:
        return Response({'error': 'Page not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PageDetailSerializer(page)
    return Response(serializer.data)


@extend_schema(
    request=PageCreateUpdateSerializer,
    responses={201: PageDetailSerializer},
    tags=['CMS - Pages (Admin)'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_page(request):
    """Create a new page (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = PageCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        page = serializer.save(created_by=request.user, updated_by=request.user)
        if page.status == ContentStatus.PUBLISHED and not page.published_at:
            page.published_at = timezone.now()
            page.save()
        return Response(PageDetailSerializer(page).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=PageCreateUpdateSerializer,
    responses={200: PageDetailSerializer},
    tags=['CMS - Pages (Admin)'],
)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_page(request, page_id):
    """Update a page (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        page = Page.objects.get(id=page_id)
    except Page.DoesNotExist:
        return Response({'error': 'Page not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PageCreateUpdateSerializer(
        page, data=request.data, partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        page = serializer.save(updated_by=request.user)
        if page.status == ContentStatus.PUBLISHED and not page.published_at:
            page.published_at = timezone.now()
            page.save()
        return Response(PageDetailSerializer(page).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['CMS - Pages (Admin)'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_page(request, page_id):
    """Delete a page (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        page = Page.objects.get(id=page_id)
    except Page.DoesNotExist:
        return Response({'error': 'Page not found'}, status=status.HTTP_404_NOT_FOUND)

    page.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Public Endpoints
# =============================================================================

@extend_schema(
    responses={200: PagePublicSerializer},
    tags=['CMS - Pages (Public)'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_page(request, slug):
    """Get published page by slug (public)."""
    try:
        page = Page.objects.get(slug=slug, status=ContentStatus.PUBLISHED)
    except Page.DoesNotExist:
        return Response({'error': 'Page not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PagePublicSerializer(page)
    return Response(serializer.data)
