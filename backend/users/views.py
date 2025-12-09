from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import RecruiterProfile, UserRole
from .serializers import RecruiterProfileSerializer, RecruiterProfileUpdateSerializer


def is_recruiter_or_admin(user):
    """Check if user is a recruiter or admin."""
    return user.role in [UserRole.RECRUITER, UserRole.ADMIN]


@extend_schema(
    responses={
        200: RecruiterProfileSerializer,
        403: OpenApiResponse(description='Not a recruiter/admin'),
        404: OpenApiResponse(description='Profile not found'),
    },
    tags=['Recruiter Profile'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_recruiter_profile(request):
    """
    Get the current user's recruiter profile.
    Creates one if it doesn't exist (for recruiters/admins only).
    """
    if not is_recruiter_or_admin(request.user):
        return Response(
            {'error': 'Only recruiters and admins have recruiter profiles'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get or create the profile
    profile, created = RecruiterProfile.objects.get_or_create(user=request.user)

    serializer = RecruiterProfileSerializer(profile)
    return Response(serializer.data)


@extend_schema(
    request=RecruiterProfileUpdateSerializer,
    responses={
        200: RecruiterProfileSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Not a recruiter/admin'),
    },
    tags=['Recruiter Profile'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_my_recruiter_profile(request):
    """
    Update the current user's recruiter profile.
    """
    if not is_recruiter_or_admin(request.user):
        return Response(
            {'error': 'Only recruiters and admins have recruiter profiles'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get or create the profile
    profile, created = RecruiterProfile.objects.get_or_create(user=request.user)

    serializer = RecruiterProfileUpdateSerializer(
        profile,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()
        # Return full profile data
        return Response(RecruiterProfileSerializer(profile).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: OpenApiResponse(description='List of staff users')},
    tags=['Users'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_staff_users(request):
    """
    List all recruiters and admins for assignment dropdowns.
    Only accessible to admin and recruiter users.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if not is_recruiter_or_admin(request.user):
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get all users who are recruiters or admins
    staff_users = User.objects.filter(
        role__in=[UserRole.RECRUITER, UserRole.ADMIN],
        is_active=True,
    ).order_by('first_name', 'last_name')

    # Return minimal user info for dropdowns
    data = [
        {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name,
            'avatar': request.build_absolute_uri(user.avatar.url) if user.avatar else None,
            'role': user.role,
        }
        for user in staff_users
    ]

    return Response(data)


@extend_schema(
    responses={
        200: RecruiterProfileSerializer,
        404: OpenApiResponse(description='Profile not found'),
    },
    tags=['Recruiter Profile'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recruiter_profile(request, user_id):
    """
    Get a recruiter's public profile by user ID.
    Available to all authenticated users (for viewing recruiter info on jobs, etc).
    """
    try:
        profile = RecruiterProfile.objects.select_related('user').get(user_id=user_id)
    except RecruiterProfile.DoesNotExist:
        return Response(
            {'error': 'Recruiter profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = RecruiterProfileSerializer(profile)
    return Response(serializer.data)
