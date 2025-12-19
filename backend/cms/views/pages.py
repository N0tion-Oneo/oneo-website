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
        OpenApiParameter(name='document_type', description='Filter by document type', required=False, type=str),
        OpenApiParameter(name='service_type', description='Filter by service type (all, retained, headhunting)', required=False, type=str),
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

    document_type = request.query_params.get('document_type')
    if document_type:
        pages = pages.filter(document_type=document_type)

    service_type_filter = request.query_params.get('service_type')
    if service_type_filter:
        pages = pages.filter(service_type=service_type_filter)

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
    responses={200: PageListSerializer(many=True)},
    tags=['CMS - Pages (Public)'],
    parameters=[
        OpenApiParameter(name='service_type', description='Filter by service type (retained, headhunting)', required=False, type=str),
        OpenApiParameter(name='include_all', description='Include documents that apply to all service types (default: false)', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def list_public_pages(request):
    """List all published pages (public). Can filter by service_type."""
    pages = Page.objects.filter(status=ContentStatus.PUBLISHED)

    service_type_filter = request.query_params.get('service_type')
    include_all = request.query_params.get('include_all', 'false').lower() == 'true'

    if service_type_filter:
        if include_all:
            # Include documents that match the specific service type OR apply to all
            from django.db.models import Q
            pages = pages.filter(
                Q(service_type=service_type_filter) | Q(service_type='all')
            )
        else:
            # Only show documents specifically assigned to this service type
            # Fall back to 'all' if no specific documents exist
            specific_pages = pages.filter(service_type=service_type_filter)
            if specific_pages.exists():
                pages = specific_pages
            else:
                pages = pages.filter(service_type='all')

    serializer = PageListSerializer(pages, many=True)
    return Response(serializer.data)


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
