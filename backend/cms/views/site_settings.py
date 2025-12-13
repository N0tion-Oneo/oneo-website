"""Site Settings views."""
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from cms.models import SiteSettings
from cms.serializers import (
    SiteSettingsSerializer,
    AnalyticsSettingsSerializer,
    RobotsTxtSerializer,
    LLMsTxtSerializer,
    SitemapSettingsSerializer,
    PublicAnalyticsSettingsSerializer,
)


def get_or_create_settings():
    """Get or create the singleton settings instance."""
    settings = SiteSettings.objects.first()
    if not settings:
        settings = SiteSettings.objects.create()
    return settings


# ==========================================================================
# Admin Endpoints
# ==========================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_site_settings(request):
    """Get all site settings."""
    settings = get_or_create_settings()
    serializer = SiteSettingsSerializer(settings)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_site_settings(request):
    """Update site settings."""
    settings = get_or_create_settings()
    serializer = SiteSettingsSerializer(
        settings,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def analytics_settings(request):
    """Get or update analytics settings."""
    settings = get_or_create_settings()

    if request.method == 'GET':
        serializer = AnalyticsSettingsSerializer(settings)
        return Response(serializer.data)

    serializer = AnalyticsSettingsSerializer(
        settings,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def robots_txt_settings(request):
    """Get or update robots.txt content."""
    settings = get_or_create_settings()

    if request.method == 'GET':
        serializer = RobotsTxtSerializer(settings)
        return Response(serializer.data)

    serializer = RobotsTxtSerializer(
        settings,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def llms_txt_settings(request):
    """Get or update llms.txt content."""
    settings = get_or_create_settings()

    if request.method == 'GET':
        serializer = LLMsTxtSerializer(settings)
        return Response(serializer.data)

    serializer = LLMsTxtSerializer(
        settings,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def sitemap_settings(request):
    """Get or update sitemap settings."""
    settings = get_or_create_settings()

    if request.method == 'GET':
        serializer = SitemapSettingsSerializer(settings)
        return Response(serializer.data)

    serializer = SitemapSettingsSerializer(
        settings,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================================================
# Public Endpoints
# ==========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_analytics_settings(request):
    """Get analytics settings for frontend (public endpoint)."""
    settings = get_or_create_settings()
    serializer = PublicAnalyticsSettingsSerializer(settings)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def robots_txt(request):
    """Serve robots.txt content."""
    settings = get_or_create_settings()
    return HttpResponse(
        settings.robots_txt_content,
        content_type='text/plain'
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def llms_txt(request):
    """Serve llms.txt content."""
    settings = get_or_create_settings()
    return HttpResponse(
        settings.llms_txt_content,
        content_type='text/plain'
    )
