"""SEO management views - Redirects and meta tags."""
import fnmatch
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from ..models import Redirect, MetaTagDefaults, PageSEO
from ..serializers import (
    RedirectSerializer,
    MetaTagDefaultsSerializer,
    PageSEOSerializer,
    PageSEOPublicSerializer,
)
from ..middleware import RedirectMiddleware


# ============================================================================
# Redirects
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_redirects(request):
    """List all redirects or create a new one."""
    if request.method == 'GET':
        redirects = Redirect.objects.all()

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            redirects = redirects.filter(is_active=is_active.lower() == 'true')

        # Search
        search = request.query_params.get('search')
        if search:
            redirects = redirects.filter(source_path__icontains=search) | \
                       redirects.filter(destination_url__icontains=search)

        serializer = RedirectSerializer(redirects, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = RedirectSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            RedirectMiddleware.clear_cache()  # Invalidate cache
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def redirect_detail(request, pk):
    """Retrieve, update, or delete a redirect."""
    redirect = get_object_or_404(Redirect, pk=pk)

    if request.method == 'GET':
        serializer = RedirectSerializer(redirect)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = RedirectSerializer(redirect, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            RedirectMiddleware.clear_cache()  # Invalidate cache
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        redirect.delete()
        RedirectMiddleware.clear_cache()  # Invalidate cache
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_delete_redirects(request):
    """Delete multiple redirects at once."""
    ids = request.data.get('ids', [])
    if not ids:
        return Response(
            {'error': 'No redirect IDs provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

    deleted_count = Redirect.objects.filter(id__in=ids).delete()[0]
    RedirectMiddleware.clear_cache()  # Invalidate cache
    return Response({'deleted': deleted_count})


# ============================================================================
# Meta Tag Defaults
# ============================================================================

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def meta_tag_defaults(request):
    """Get or update meta tag defaults (singleton)."""
    # Get or create the singleton instance
    defaults, _ = MetaTagDefaults.objects.get_or_create(pk=MetaTagDefaults.objects.first().pk if MetaTagDefaults.objects.exists() else None)

    if request.method == 'GET':
        serializer = MetaTagDefaultsSerializer(defaults, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = MetaTagDefaultsSerializer(defaults, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_seo_defaults(request):
    """Public endpoint to get SEO defaults for frontend rendering."""
    from branding.models import BrandingSettings

    defaults = MetaTagDefaults.objects.first()
    if not defaults:
        # Return defaults from BrandingSettings if no MetaTagDefaults configured
        branding = BrandingSettings.get_settings()
        company_name = branding.company_name or ''
        tagline = branding.tagline or ''
        return Response({
            'company_name': company_name,
            'tagline': tagline,
            'default_title_suffix': ' | {{company_name}}',
            'resolved_title_suffix': f' | {company_name}' if company_name else '',
            'default_description': '',
            'default_og_image_url': None,
            'google_site_verification': '',
            'bing_site_verification': '',
            'google_analytics_id': '',
            'google_tag_manager_id': '',
        })

    serializer = MetaTagDefaultsSerializer(defaults, context={'request': request})
    return Response(serializer.data)


# ============================================================================
# Page SEO Settings
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_page_seo(request):
    """List all page SEO entries or create a new one."""
    if request.method == 'GET':
        # Auto-sync system pages from shared/seo-routes.json on every list request
        # This ensures new pages are automatically detected without manual sync
        PageSEO.sync_system_pages()

        pages = PageSEO.objects.all()

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            pages = pages.filter(is_active=is_active.lower() == 'true')

        # Search
        search = request.query_params.get('search')
        if search:
            pages = pages.filter(path__icontains=search) | \
                   pages.filter(name__icontains=search)

        serializer = PageSEOSerializer(pages, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = PageSEOSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def page_seo_detail(request, pk):
    """Retrieve, update, or delete a page SEO entry."""
    page_seo = get_object_or_404(PageSEO, pk=pk)

    if request.method == 'GET':
        serializer = PageSEOSerializer(page_seo, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = PageSEOSerializer(page_seo, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Prevent deleting system pages
        if page_seo.is_system:
            return Response(
                {'error': 'System pages cannot be deleted. You can disable them by setting is_active to false.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        page_seo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_system_pages(request):
    """
    Synchronize system pages from the page registry.
    Creates new entries for pages that don't exist.
    Does NOT overwrite existing SEO settings (preserves admin customizations).
    """
    created, existing = PageSEO.sync_system_pages()
    return Response({
        'message': f'Sync completed. Created {created} new pages, {existing} already existed.',
        'created': created,
        'existing': existing,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_page_seo_by_path(request):
    """
    Public endpoint to get SEO settings for a specific path.
    Supports exact matches and wildcard patterns (e.g., /jobs/* matches /jobs/123).
    """
    path = request.query_params.get('path', '/')

    # Normalize path
    if not path.startswith('/'):
        path = '/' + path

    # Try exact match first
    page_seo = PageSEO.objects.filter(path=path, is_active=True).first()

    # If no exact match, try wildcard patterns
    if not page_seo:
        # Get all wildcard patterns (ending with *)
        wildcard_entries = PageSEO.objects.filter(
            path__endswith='*',
            is_active=True
        ).order_by('-path')  # Longer patterns first for more specific matches

        for entry in wildcard_entries:
            # Convert /jobs/* to /jobs/ for prefix matching
            pattern = entry.path.rstrip('*')
            if path.startswith(pattern):
                page_seo = entry
                break

    if not page_seo:
        return Response({'detail': 'No SEO settings found for this path'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PageSEOPublicSerializer(page_seo, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_page_seo_public(request):
    """
    Public endpoint to get all active page SEO entries.
    Used by frontend to cache all SEO settings on app load.
    """
    pages = PageSEO.objects.filter(is_active=True)
    serializer = PageSEOPublicSerializer(pages, many=True, context={'request': request})
    return Response(serializer.data)


