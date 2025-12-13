"""Views for FAQ and FAQCategory models."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from users.models import UserRole
from ..models import FAQ, FAQCategory
from ..serializers import (
    FAQCategorySerializer,
    FAQCategoryCreateUpdateSerializer,
    FAQSerializer,
    FAQCreateUpdateSerializer,
    FAQPublicSerializer,
    FAQCategoryWithFAQsSerializer,
)


def is_staff_user(user):
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# =============================================================================
# FAQ Category Admin Endpoints
# =============================================================================

@extend_schema(
    responses={200: FAQCategorySerializer(many=True)},
    tags=['CMS - FAQs (Admin)'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_faq_categories(request):
    """List all FAQ categories (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    categories = FAQCategory.objects.all()
    serializer = FAQCategorySerializer(categories, many=True)
    return Response(serializer.data)


@extend_schema(
    request=FAQCategoryCreateUpdateSerializer,
    responses={201: FAQCategorySerializer},
    tags=['CMS - FAQs (Admin)'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_faq_category(request):
    """Create a new FAQ category (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = FAQCategoryCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        category = serializer.save()
        return Response(FAQCategorySerializer(category).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=FAQCategoryCreateUpdateSerializer,
    responses={200: FAQCategorySerializer},
    tags=['CMS - FAQs (Admin)'],
)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_faq_category(request, category_id):
    """Update an FAQ category (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        category = FAQCategory.objects.get(id=category_id)
    except FAQCategory.DoesNotExist:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = FAQCategoryCreateUpdateSerializer(
        category, data=request.data, partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        category = serializer.save()
        return Response(FAQCategorySerializer(category).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['CMS - FAQs (Admin)'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_faq_category(request, category_id):
    """Delete an FAQ category (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        category = FAQCategory.objects.get(id=category_id)
    except FAQCategory.DoesNotExist:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)

    category.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# FAQ Admin Endpoints
# =============================================================================

@extend_schema(
    responses={200: FAQSerializer(many=True)},
    tags=['CMS - FAQs (Admin)'],
    parameters=[
        OpenApiParameter(name='category', description='Filter by category ID', required=False, type=str),
        OpenApiParameter(name='is_active', description='Filter by active status', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_faqs(request):
    """List all FAQs (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    faqs = FAQ.objects.select_related('category').all()

    category = request.query_params.get('category')
    if category:
        faqs = faqs.filter(category_id=category)

    is_active = request.query_params.get('is_active')
    if is_active is not None:
        faqs = faqs.filter(is_active=is_active.lower() == 'true')

    serializer = FAQSerializer(faqs, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: FAQSerializer},
    tags=['CMS - FAQs (Admin)'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_faq(request, faq_id):
    """Get FAQ by ID (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        faq = FAQ.objects.select_related('category').get(id=faq_id)
    except FAQ.DoesNotExist:
        return Response({'error': 'FAQ not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = FAQSerializer(faq)
    return Response(serializer.data)


@extend_schema(
    request=FAQCreateUpdateSerializer,
    responses={201: FAQSerializer},
    tags=['CMS - FAQs (Admin)'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_faq(request):
    """Create a new FAQ (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = FAQCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        faq = serializer.save()
        return Response(FAQSerializer(faq).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=FAQCreateUpdateSerializer,
    responses={200: FAQSerializer},
    tags=['CMS - FAQs (Admin)'],
)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_faq(request, faq_id):
    """Update an FAQ (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        faq = FAQ.objects.get(id=faq_id)
    except FAQ.DoesNotExist:
        return Response({'error': 'FAQ not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = FAQCreateUpdateSerializer(
        faq, data=request.data, partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        faq = serializer.save()
        return Response(FAQSerializer(faq).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['CMS - FAQs (Admin)'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_faq(request, faq_id):
    """Delete an FAQ (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        faq = FAQ.objects.get(id=faq_id)
    except FAQ.DoesNotExist:
        return Response({'error': 'FAQ not found'}, status=status.HTTP_404_NOT_FOUND)

    faq.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Public Endpoints
# =============================================================================

@extend_schema(
    responses={200: FAQCategoryWithFAQsSerializer(many=True)},
    tags=['CMS - FAQs (Public)'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_faqs(request):
    """Get all FAQs grouped by category (public)."""
    categories = FAQCategory.objects.filter(is_active=True).prefetch_related('faqs')
    serializer = FAQCategoryWithFAQsSerializer(categories, many=True)

    uncategorized_faqs = FAQ.objects.filter(is_active=True, category__isnull=True)
    result = serializer.data
    if uncategorized_faqs.exists():
        result.append({
            'id': None,
            'name': 'General',
            'slug': 'general',
            'description': '',
            'order': 999,
            'faqs': FAQPublicSerializer(uncategorized_faqs, many=True).data,
        })

    return Response(result)


@extend_schema(
    responses={200: FAQPublicSerializer(many=True)},
    tags=['CMS - FAQs (Public)'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_featured_faqs(request):
    """Get featured FAQs (public)."""
    faqs = FAQ.objects.filter(is_active=True, is_featured=True)
    serializer = FAQPublicSerializer(faqs, many=True)
    return Response(serializer.data)
