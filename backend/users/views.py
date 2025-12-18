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
    responses={200: OpenApiResponse(description='List of staff users with full profiles')},
    tags=['Users'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_staff_with_profiles(request):
    """
    List all staff users (recruiters and admins) with their full RecruiterProfile data.
    Admin-only endpoint for team management.

    Query params:
    - include_archived: If 'true', includes archived/deactivated staff members
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check if we should include archived users
    include_archived = request.query_params.get('include_archived', '').lower() == 'true'

    # Build the base queryset
    queryset = User.objects.filter(
        role__in=[UserRole.RECRUITER, UserRole.ADMIN],
    )

    if not include_archived:
        queryset = queryset.filter(is_active=True)

    # Get all staff users with their profiles prefetched
    staff_users = queryset.select_related('recruiter_profile').prefetch_related(
        'recruiter_profile__industries',
        'recruiter_profile__country',
        'recruiter_profile__city',
    ).order_by('is_active', 'first_name', 'last_name')  # Active users first

    data = []
    for user in staff_users:
        profile = getattr(user, 'recruiter_profile', None)
        user_data = {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name,
            'avatar': request.build_absolute_uri(user.avatar.url) if user.avatar else None,
            'phone': user.phone,
            'role': user.role,
            'is_active': user.is_active,
            'archived_at': user.archived_at.isoformat() if user.archived_at else None,
            'profile': None,
        }

        if profile:
            user_data['profile'] = {
                'id': str(profile.id),
                'professional_title': profile.professional_title,
                'bio': profile.bio,
                'linkedin_url': profile.linkedin_url,
                'years_of_experience': profile.years_of_experience,
                'timezone': profile.timezone,
                'country': {
                    'id': profile.country.id,
                    'name': profile.country.name,
                    'code': profile.country.code,
                } if profile.country else None,
                'city': {
                    'id': profile.city.id,
                    'name': profile.city.name,
                } if profile.city else None,
                'industries': [
                    {'id': ind.id, 'name': ind.name}
                    for ind in profile.industries.all()
                ],
            }

        data.append(user_data)

    return Response(data)


@extend_schema(
    request={'application/json': {'type': 'object', 'properties': {
        'role': {'type': 'string', 'enum': ['admin', 'recruiter']},
        'first_name': {'type': 'string'},
        'last_name': {'type': 'string'},
        'phone': {'type': 'string'},
    }}},
    responses={
        200: OpenApiResponse(description='Updated staff user'),
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Admin access required'),
        404: OpenApiResponse(description='User not found'),
    },
    tags=['Users'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_staff_user(request, user_id):
    """
    Update a staff user's role or profile info.
    Admin-only endpoint.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Only admins can update staff users
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can update staff users'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        staff_user = User.objects.get(
            id=user_id,
            role__in=[UserRole.RECRUITER, UserRole.ADMIN],
            is_active=True,
        )
    except User.DoesNotExist:
        return Response(
            {'error': 'Staff user not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Prevent admins from demoting themselves
    if staff_user.id == request.user.id and request.data.get('role') == 'recruiter':
        return Response(
            {'error': 'You cannot demote yourself'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update allowed fields
    if 'role' in request.data:
        new_role = request.data['role']
        if new_role not in ['admin', 'recruiter']:
            return Response(
                {'error': 'Role must be admin or recruiter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        staff_user.role = new_role

    if 'first_name' in request.data:
        staff_user.first_name = request.data['first_name']

    if 'last_name' in request.data:
        staff_user.last_name = request.data['last_name']

    if 'phone' in request.data:
        staff_user.phone = request.data['phone']

    staff_user.save()

    return Response({
        'id': str(staff_user.id),
        'email': staff_user.email,
        'first_name': staff_user.first_name,
        'last_name': staff_user.last_name,
        'phone': staff_user.phone,
        'role': staff_user.role,
        'full_name': staff_user.full_name,
    })


@extend_schema(
    request=RecruiterProfileUpdateSerializer,
    responses={
        200: RecruiterProfileSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Admin access required'),
        404: OpenApiResponse(description='Profile not found'),
    },
    tags=['Recruiter Profile'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_recruiter_profile(request, user_id):
    """
    Update another staff user's recruiter profile.
    Admin-only endpoint for team management.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Only admins can update other users' profiles
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can update other users\' profiles'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Find the target user
    try:
        target_user = User.objects.get(
            id=user_id,
            role__in=[UserRole.RECRUITER, UserRole.ADMIN],
            is_active=True,
        )
    except User.DoesNotExist:
        return Response(
            {'error': 'Staff user not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get or create their profile
    profile, created = RecruiterProfile.objects.get_or_create(user=target_user)

    serializer = RecruiterProfileUpdateSerializer(
        profile,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()
        return Response(RecruiterProfileSerializer(profile).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


@extend_schema(
    responses={
        200: OpenApiResponse(description='Staff user deactivated successfully'),
        400: OpenApiResponse(description='Cannot deactivate yourself'),
        403: OpenApiResponse(description='Admin access required'),
        404: OpenApiResponse(description='Staff user not found'),
    },
    tags=['Users'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deactivate_staff_user(request, user_id):
    """
    Deactivate (archive) a staff user.
    Admin-only endpoint.

    This soft-deletes the user by:
    - Setting archived_at timestamp
    - Setting archived_by to the requesting admin
    - Setting is_active to False (prevents login)

    The user's data (bookings, meeting types, etc.) is preserved.
    """
    from django.contrib.auth import get_user_model
    from django.utils import timezone

    User = get_user_model()

    # Only admins can deactivate staff
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can deactivate staff members'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        staff_user = User.objects.get(
            id=user_id,
            role__in=[UserRole.RECRUITER, UserRole.ADMIN],
            is_active=True,
        )
    except User.DoesNotExist:
        return Response(
            {'error': 'Staff user not found or already deactivated'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Prevent admins from deactivating themselves
    if staff_user.id == request.user.id:
        return Response(
            {'error': 'You cannot deactivate yourself'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Soft-delete: set archive fields and deactivate
    staff_user.archived_at = timezone.now()
    staff_user.archived_by = request.user
    staff_user.is_active = False
    staff_user.save(update_fields=['archived_at', 'archived_by', 'is_active'])

    return Response({
        'message': f'{staff_user.full_name} has been deactivated',
        'user': {
            'id': str(staff_user.id),
            'email': staff_user.email,
            'full_name': staff_user.full_name,
            'archived_at': staff_user.archived_at.isoformat(),
        }
    })


@extend_schema(
    responses={
        200: OpenApiResponse(description='Staff user reactivated successfully'),
        403: OpenApiResponse(description='Admin access required'),
        404: OpenApiResponse(description='Archived staff user not found'),
    },
    tags=['Users'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reactivate_staff_user(request, user_id):
    """
    Reactivate a previously deactivated (archived) staff user.
    Admin-only endpoint.

    This restores the user by:
    - Clearing archived_at timestamp
    - Clearing archived_by reference
    - Setting is_active to True (allows login)
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()

    # Only admins can reactivate staff
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only admins can reactivate staff members'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        staff_user = User.objects.get(
            id=user_id,
            role__in=[UserRole.RECRUITER, UserRole.ADMIN],
            is_active=False,
            archived_at__isnull=False,
        )
    except User.DoesNotExist:
        return Response(
            {'error': 'Archived staff user not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Reactivate: clear archive fields and activate
    staff_user.archived_at = None
    staff_user.archived_by = None
    staff_user.is_active = True
    staff_user.save(update_fields=['archived_at', 'archived_by', 'is_active'])

    return Response({
        'message': f'{staff_user.full_name} has been reactivated',
        'user': {
            'id': str(staff_user.id),
            'email': staff_user.email,
            'full_name': staff_user.full_name,
            'role': staff_user.role,
        }
    })
