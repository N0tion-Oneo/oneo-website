"""Pricing Configuration views."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from cms.models import PricingConfig, PricingFeature
from cms.serializers import (
    PricingConfigSerializer,
    PricingConfigUpdateSerializer,
    PricingFeatureSerializer,
    PricingFeatureCreateUpdateSerializer,
    PricingFeatureReorderSerializer,
)


def get_or_create_pricing_config():
    """Get or create the singleton pricing config instance."""
    config = PricingConfig.objects.first()
    if not config:
        config = PricingConfig.objects.create()
    return config


# ==========================================================================
# Public Endpoints
# ==========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_pricing_config(request):
    """Get pricing configuration for the calculator (public endpoint)."""
    config = get_or_create_pricing_config()
    serializer = PricingConfigSerializer(config)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_public_pricing_features(request):
    """Get active pricing features for the calculator (public endpoint)."""
    features = PricingFeature.objects.filter(is_active=True).order_by('order', 'name')
    serializer = PricingFeatureSerializer(features, many=True)
    return Response(serializer.data)


# ==========================================================================
# Admin Endpoints - Pricing Config
# ==========================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pricing_config(request):
    """Get pricing configuration (admin)."""
    config = get_or_create_pricing_config()
    serializer = PricingConfigSerializer(config)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_pricing_config(request):
    """Update pricing configuration."""
    config = get_or_create_pricing_config()
    serializer = PricingConfigUpdateSerializer(
        config,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        # Return full serializer with updated_by_name
        return Response(PricingConfigSerializer(config).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================================================
# Admin Endpoints - Pricing Features
# ==========================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_pricing_features(request):
    """List all pricing features or create a new one."""
    if request.method == 'GET':
        features = PricingFeature.objects.all().order_by('order', 'name')
        serializer = PricingFeatureSerializer(features, many=True)
        return Response(serializer.data)

    # POST - Create new feature
    serializer = PricingFeatureCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        feature = serializer.save()
        return Response(
            PricingFeatureSerializer(feature).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def pricing_feature_detail(request, feature_id):
    """Get, update, or delete a pricing feature."""
    try:
        feature = PricingFeature.objects.get(pk=feature_id)
    except PricingFeature.DoesNotExist:
        return Response(
            {'error': 'Feature not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = PricingFeatureSerializer(feature)
        return Response(serializer.data)

    if request.method == 'DELETE':
        feature.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT or PATCH - Update feature
    serializer = PricingFeatureCreateUpdateSerializer(
        feature,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        feature = serializer.save()
        return Response(PricingFeatureSerializer(feature).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reorder_pricing_features(request):
    """Reorder pricing features."""
    serializer = PricingFeatureReorderSerializer(data=request.data)
    if serializer.is_valid():
        feature_ids = serializer.validated_data['feature_ids']

        # Update order for each feature
        for index, feature_id in enumerate(feature_ids):
            PricingFeature.objects.filter(pk=feature_id).update(order=index)

        # Return updated list
        features = PricingFeature.objects.all().order_by('order', 'name')
        return Response(PricingFeatureSerializer(features, many=True).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
