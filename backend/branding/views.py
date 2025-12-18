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


# =============================================================================
# Platform Company Management
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_platform_company(request):
    """
    Get the platform company if it exists.
    Admins only.
    """
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can view platform company settings'},
            status=status.HTTP_403_FORBIDDEN
        )

    from companies.models import Company

    platform_company = Company.objects.filter(is_platform=True).first()

    if not platform_company:
        return Response({'platform_company': None})

    # Return basic company info
    return Response({
        'platform_company': {
            'id': str(platform_company.id),
            'name': platform_company.name,
            'slug': platform_company.slug,
            'tagline': platform_company.tagline,
            'logo': platform_company.logo.url if platform_company.logo else None,
            'is_published': platform_company.is_published,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_or_update_platform_company(request):
    """
    Create or update the platform company.
    Pre-populates from branding settings if creating new.
    Admins only.
    """
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can manage platform company'},
            status=status.HTTP_403_FORBIDDEN
        )

    from companies.models import Company, CompanyUser, CompanyUserRole

    # Get branding settings for defaults
    branding = BrandingSettings.get_settings()

    # Check if platform company already exists
    platform_company = Company.objects.filter(is_platform=True).first()

    if platform_company:
        # Update existing platform company
        name = request.data.get('name', platform_company.name)
        tagline = request.data.get('tagline', platform_company.tagline)

        platform_company.name = name
        platform_company.tagline = tagline
        platform_company.is_platform = True
        platform_company.is_published = True
        platform_company.save()
    else:
        # Create new platform company with branding defaults
        name = request.data.get('name') or branding.company_name
        tagline = request.data.get('tagline') or branding.tagline

        platform_company = Company.objects.create(
            name=name,
            tagline=tagline,
            is_platform=True,
            is_published=True,
            website_url=branding.website_url or '',
        )

        # Copy logo from branding if available
        if branding.logo:
            platform_company.logo = branding.logo
            platform_company.save()

        # Add current admin as company admin
        CompanyUser.objects.create(
            user=request.user,
            company=platform_company,
            role=CompanyUserRole.ADMIN,
            job_title='Platform Admin'
        )

    return Response({
        'platform_company': {
            'id': str(platform_company.id),
            'name': platform_company.name,
            'slug': platform_company.slug,
            'tagline': platform_company.tagline,
            'logo': platform_company.logo.url if platform_company.logo else None,
            'is_published': platform_company.is_published,
        }
    }, status=status.HTTP_201_CREATED if not platform_company else status.HTTP_200_OK)
