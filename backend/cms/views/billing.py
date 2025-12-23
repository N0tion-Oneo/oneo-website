"""Billing Configuration views."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from cms.models import BillingConfig
from cms.serializers import (
    BillingConfigSerializer,
    BillingConfigUpdateSerializer,
    PaymentTermsPublicSerializer,
)


def get_or_create_billing_config():
    """Get or create the singleton billing config instance."""
    config = BillingConfig.objects.first()
    if not config:
        config = BillingConfig.objects.create()
    return config


# ==========================================================================
# Public Endpoints
# ==========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_payment_terms(request):
    """Get available payment terms options (public endpoint for dropdowns)."""
    config = get_or_create_billing_config()
    serializer = PaymentTermsPublicSerializer(config)
    return Response(serializer.data)


# ==========================================================================
# Admin Endpoints
# ==========================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_billing_config(request):
    """Get billing configuration (admin)."""
    config = get_or_create_billing_config()
    serializer = BillingConfigSerializer(config)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_billing_config(request):
    """Update billing configuration."""
    config = get_or_create_billing_config()
    serializer = BillingConfigUpdateSerializer(
        config,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        # Return full serializer with updated_by_name
        return Response(BillingConfigSerializer(config).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
