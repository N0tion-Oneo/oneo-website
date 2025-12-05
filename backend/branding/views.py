from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from users.models import UserRole
from .models import BrandingSettings
from .serializers import (
    BrandingSettingsSerializer,
    BrandingSettingsUpdateSerializer,
    PublicBrandingSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_branding(request):
    """
    Get public branding settings.
    Available to everyone (no auth required).
    """
    settings = BrandingSettings.get_settings()
    serializer = PublicBrandingSerializer(settings)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_branding_settings(request):
    """
    Get full branding settings.
    Admins only.
    """
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can view full branding settings'},
            status=status.HTTP_403_FORBIDDEN
        )

    settings = BrandingSettings.get_settings()
    serializer = BrandingSettingsSerializer(settings)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_branding_settings(request):
    """
    Update branding settings.
    Admins only.
    """
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can update branding settings'},
            status=status.HTTP_403_FORBIDDEN
        )

    settings = BrandingSettings.get_settings()
    serializer = BrandingSettingsUpdateSerializer(
        settings,
        data=request.data,
        partial=request.method == 'PATCH'
    )

    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        # Return full settings
        return Response(BrandingSettingsSerializer(settings).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_branding_settings(request):
    """
    Reset branding settings to defaults.
    Admins only.
    """
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can reset branding settings'},
            status=status.HTTP_403_FORBIDDEN
        )

    settings = BrandingSettings.get_settings()

    # Reset to defaults
    settings.company_name = 'Oneo'
    settings.tagline = 'Recruitment Made Simple'
    settings.logo_url = ''
    settings.logo_dark_url = ''
    settings.favicon_url = ''
    settings.primary_color = '#111111'
    settings.secondary_color = '#0066cc'
    settings.success_color = '#10b981'
    settings.warning_color = '#f97316'
    settings.error_color = '#ef4444'
    settings.email_background_color = '#f5f5f5'
    settings.email_header_background = '#fafafa'
    settings.email_footer_text = 'If you have any questions, please contact the hiring team directly.'
    settings.website_url = ''
    settings.facebook_url = ''
    settings.twitter_url = ''
    settings.linkedin_url = ''
    settings.instagram_url = ''
    settings.support_email = ''
    settings.contact_phone = ''
    settings.address = ''
    settings.privacy_policy_url = ''
    settings.terms_of_service_url = ''
    settings.custom_css = ''
    settings.updated_by = request.user
    settings.save()

    return Response(BrandingSettingsSerializer(settings).data)
