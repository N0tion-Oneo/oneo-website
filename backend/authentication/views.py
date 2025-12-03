from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from drf_spectacular.utils import extend_schema, OpenApiResponse

from datetime import timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404
from users.models import UserRole

from .models import ClientInvitation, RecruiterInvitation
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    VerifyEmailSerializer,
    CreateClientInvitationSerializer,
    ClientInvitationResponseSerializer,
    ClientInvitationListSerializer,
    ValidateInvitationSerializer,
    ClientSignupSerializer,
    CreateRecruiterInvitationSerializer,
    RecruiterInvitationResponseSerializer,
    RecruiterInvitationListSerializer,
    RecruiterSignupSerializer,
)


def get_tokens_for_user(user):
    """Generate JWT tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def set_auth_cookies(response, tokens):
    """Set httpOnly cookies for authentication tokens."""
    # Access token cookie
    response.set_cookie(
        key=settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access_token'),
        value=tokens['access'],
        httponly=settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY', True),
        secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', False),
        samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
        path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/'),
    )
    # Refresh token cookie
    response.set_cookie(
        key=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token'),
        value=tokens['refresh'],
        httponly=settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY', True),
        secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', False),
        samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
        path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/'),
    )
    return response


def clear_auth_cookies(response):
    """Clear authentication cookies."""
    response.delete_cookie(
        key=settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access_token'),
        path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/'),
    )
    response.delete_cookie(
        key=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token'),
        path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/'),
    )
    return response


@extend_schema(
    request=RegisterSerializer,
    responses={
        201: OpenApiResponse(description="User registered successfully"),
        400: OpenApiResponse(description="Validation error"),
    },
    tags=['Authentication'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new candidate user.

    Creates a new user account with candidate role.
    Returns JWT tokens for immediate authentication.
    """
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)

        response_data = {
            'message': 'Registration successful',
            'user': UserProfileSerializer(user).data,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
        }

        response = Response(response_data, status=status.HTTP_201_CREATED)
        return set_auth_cookies(response, tokens)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=LoginSerializer,
    responses={
        200: OpenApiResponse(description="Login successful"),
        400: OpenApiResponse(description="Invalid credentials"),
    },
    tags=['Authentication'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Authenticate a user and return JWT tokens.

    Accepts email and password, returns access and refresh tokens.
    Tokens are also set as httpOnly cookies.
    """
    serializer = LoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)

        response_data = {
            'message': 'Login successful',
            'user': UserProfileSerializer(user).data,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
        }

        response = Response(response_data, status=status.HTTP_200_OK)
        return set_auth_cookies(response, tokens)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={
        200: OpenApiResponse(description="Logout successful"),
    },
    tags=['Authentication'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout the current user.

    Blacklists the refresh token and clears auth cookies.
    """
    try:
        # Try to get refresh token from request body or cookie
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            refresh_token = request.COOKIES.get(
                settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token')
            )

        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except TokenError:
        pass  # Token already blacklisted or invalid

    response = Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    return clear_auth_cookies(response)


@extend_schema(
    responses={
        200: OpenApiResponse(description="Token refreshed successfully"),
        401: OpenApiResponse(description="Invalid or expired refresh token"),
    },
    tags=['Authentication'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """
    Refresh the access token using a refresh token.

    Accepts refresh token from request body or cookie.
    Returns new access and refresh tokens.
    """
    # Get refresh token from body or cookie
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        refresh_token = request.COOKIES.get(
            settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token')
        )

    if not refresh_token:
        return Response(
            {'error': 'Refresh token is required'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        refresh = RefreshToken(refresh_token)
        tokens = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

        response_data = {
            'message': 'Token refreshed successfully',
            'access': tokens['access'],
            'refresh': tokens['refresh'],
        }

        response = Response(response_data, status=status.HTTP_200_OK)
        return set_auth_cookies(response, tokens)

    except TokenError as e:
        return Response(
            {'error': 'Invalid or expired refresh token'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@extend_schema(
    responses={
        200: UserProfileSerializer,
    },
    tags=['Authentication'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Get the current authenticated user's profile.
    """
    serializer = UserProfileSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    request=UserProfileUpdateSerializer,
    responses={
        200: UserProfileSerializer,
        400: OpenApiResponse(description="Validation error"),
    },
    tags=['Authentication'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update the current authenticated user's profile.
    """
    serializer = UserProfileUpdateSerializer(
        request.user,
        data=request.data,
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        return Response(
            UserProfileSerializer(request.user).data,
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=ChangePasswordSerializer,
    responses={
        200: OpenApiResponse(description="Password changed successfully"),
        400: OpenApiResponse(description="Validation error"),
    },
    tags=['Authentication'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change the current user's password.
    """
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={'request': request}
    )
    if serializer.is_valid():
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response(
            {'message': 'Password changed successfully'},
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Stub endpoints for email verification and password reset
# These will be fully implemented when email service is set up

@extend_schema(
    request=VerifyEmailSerializer,
    responses={
        200: OpenApiResponse(description="Email verified successfully"),
        400: OpenApiResponse(description="Invalid token"),
    },
    tags=['Authentication'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """
    Verify user's email address.

    [STUB] - Full implementation requires email service.
    """
    serializer = VerifyEmailSerializer(data=request.data)
    if serializer.is_valid():
        # TODO: Implement actual email verification
        # 1. Find user by verification token
        # 2. Check token is valid and not expired
        # 3. Set user.is_verified = True
        # 4. Clear verification token
        return Response(
            {'message': 'Email verification endpoint (stub)'},
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=ForgotPasswordSerializer,
    responses={
        200: OpenApiResponse(description="Password reset email sent"),
    },
    tags=['Authentication'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    Request a password reset email.

    [STUB] - Full implementation requires email service.
    """
    serializer = ForgotPasswordSerializer(data=request.data)
    if serializer.is_valid():
        # TODO: Implement actual password reset email
        # 1. Find user by email
        # 2. Generate reset token
        # 3. Send reset email
        # Always return success to prevent email enumeration
        return Response(
            {'message': 'If an account exists with this email, a password reset link has been sent.'},
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=ResetPasswordSerializer,
    responses={
        200: OpenApiResponse(description="Password reset successfully"),
        400: OpenApiResponse(description="Invalid token or validation error"),
    },
    tags=['Authentication'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    Reset password using a reset token.

    [STUB] - Full implementation requires email service.
    """
    serializer = ResetPasswordSerializer(data=request.data)
    if serializer.is_valid():
        # TODO: Implement actual password reset
        # 1. Find user by reset token
        # 2. Check token is valid and not expired
        # 3. Set new password
        # 4. Clear reset token
        return Response(
            {'message': 'Password reset endpoint (stub)'},
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Client Invitation Endpoints

@extend_schema(
    responses={
        200: ClientInvitationListSerializer(many=True),
        403: OpenApiResponse(description="Permission denied"),
    },
    tags=['Client Invitations'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invitations(request):
    """
    List all client invitations created by the current user.

    Only Admin or Recruiter users can view invitations.
    Returns invitations ordered by creation date (newest first).
    """
    # Only Admin or Recruiter can view invitations
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Only administrators and recruiters can view client invitations'},
            status=status.HTTP_403_FORBIDDEN
        )

    invitations = ClientInvitation.objects.filter(
        created_by=request.user
    ).order_by('-created_at')

    serializer = ClientInvitationListSerializer(invitations, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    request=CreateClientInvitationSerializer,
    responses={
        201: ClientInvitationResponseSerializer,
        403: OpenApiResponse(description="Permission denied"),
    },
    tags=['Client Invitations'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_client_invitation(request):
    """
    Create a client invitation link.

    Only Admin or Recruiter users can create invitations.
    Returns a token that can be used for client signup.
    Invitation expires in 7 days.
    """
    # Only Admin or Recruiter can create invitations
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Only administrators and recruiters can create client invitations'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = CreateClientInvitationSerializer(data=request.data)
    if serializer.is_valid():
        invitation = ClientInvitation.objects.create(
            email=serializer.validated_data.get('email', ''),
            created_by=request.user,
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Build signup URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        signup_url = f"{frontend_url}/signup/client/{invitation.token}"

        return Response({
            'token': str(invitation.token),
            'email': invitation.email,
            'expires_at': invitation.expires_at,
            'signup_url': signup_url,
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={
        200: ValidateInvitationSerializer,
        400: OpenApiResponse(description="Invalid or expired invitation"),
        404: OpenApiResponse(description="Invitation not found"),
    },
    tags=['Client Invitations'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def validate_invitation(request, token):
    """
    Validate an invitation token.

    Returns whether the invitation is valid and the associated email (if any).
    Used by frontend to check token before showing signup form.
    """
    try:
        invitation = ClientInvitation.objects.get(token=token)
    except ClientInvitation.DoesNotExist:
        return Response(
            {'error': 'Invitation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not invitation.is_valid:
        return Response(
            {'error': 'This invitation has expired or already been used'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        'valid': True,
        'email': invitation.email,
    }, status=status.HTTP_200_OK)


@extend_schema(
    request=ClientSignupSerializer,
    responses={
        201: OpenApiResponse(description="Client user created successfully"),
        400: OpenApiResponse(description="Invalid data or invitation"),
        404: OpenApiResponse(description="Invitation not found"),
    },
    tags=['Client Invitations'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def signup_with_invitation(request, token):
    """
    Sign up as a new CLIENT user using an invitation token.

    Creates a new user with CLIENT role.
    If user's email has a pending company invitation, auto-links them to that company.
    Returns JWT tokens for immediate authentication.
    """
    from companies.models import CompanyInvitation, InvitationStatus, CompanyUser

    try:
        invitation = ClientInvitation.objects.get(token=token)
    except ClientInvitation.DoesNotExist:
        return Response(
            {'error': 'Invitation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not invitation.is_valid:
        return Response(
            {'error': 'This invitation has expired or already been used'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = ClientSignupSerializer(data=request.data)
    if serializer.is_valid():
        # Create the user with CLIENT role
        user = serializer.save()

        # Mark invitation as used
        invitation.used_at = timezone.now()
        invitation.used_by = user
        invitation.save()

        # Check for pending company invitations for this email
        company_invitation = CompanyInvitation.objects.filter(
            email__iexact=user.email,
            status=InvitationStatus.PENDING
        ).first()

        company_data = None
        if company_invitation:
            # Create company membership
            CompanyUser.objects.create(
                user=user,
                company=company_invitation.company,
                role=company_invitation.role,
                invited_by=company_invitation.invited_by,
            )
            # Mark company invitation as accepted
            company_invitation.status = InvitationStatus.ACCEPTED
            company_invitation.accepted_at = timezone.now()
            company_invitation.save()

            company_data = {
                'id': str(company_invitation.company.id),
                'name': company_invitation.company.name,
                'role': company_invitation.role,
            }

        # Generate tokens
        tokens = get_tokens_for_user(user)

        response_data = {
            'message': 'Registration successful',
            'user': UserProfileSerializer(user).data,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
        }

        if company_data:
            response_data['company'] = company_data
            response_data['message'] = f'Registration successful. You have been added to {company_data["name"]}.'

        response = Response(response_data, status=status.HTTP_201_CREATED)
        return set_auth_cookies(response, tokens)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Company Invitation Endpoints (for team member invitations)
# =============================================================================

@extend_schema(
    responses={
        200: OpenApiResponse(description="Company invitation is valid"),
        400: OpenApiResponse(description="Invalid or expired invitation"),
        404: OpenApiResponse(description="Invitation not found"),
    },
    tags=['Company Invitations'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def validate_company_invitation(request, token):
    """
    Validate a company invitation token.

    Returns whether the invitation is valid and the associated company/email.
    Used by frontend to check token before showing signup form.
    """
    from companies.models import CompanyInvitation

    try:
        invitation = CompanyInvitation.objects.select_related('company').get(token=token)
    except CompanyInvitation.DoesNotExist:
        return Response(
            {'error': 'Invitation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not invitation.is_valid:
        return Response(
            {'error': 'This invitation has expired or already been used'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        'valid': True,
        'email': invitation.email,
        'role': invitation.role,
        'company_name': invitation.company.name,
    }, status=status.HTTP_200_OK)


@extend_schema(
    request=ClientSignupSerializer,
    responses={
        201: OpenApiResponse(description="User created and added to company"),
        400: OpenApiResponse(description="Invalid data or invitation"),
        404: OpenApiResponse(description="Invitation not found"),
    },
    tags=['Company Invitations'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def signup_with_company_invitation(request, token):
    """
    Sign up as a new CLIENT user using a company invitation token.

    Creates a new user with CLIENT role and links them to the inviting company.
    Returns JWT tokens for immediate authentication.
    """
    from companies.models import CompanyInvitation, InvitationStatus, CompanyUser

    try:
        invitation = CompanyInvitation.objects.select_related('company').get(token=token)
    except CompanyInvitation.DoesNotExist:
        return Response(
            {'error': 'Invitation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not invitation.is_valid:
        return Response(
            {'error': 'This invitation has expired or already been used'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = ClientSignupSerializer(data=request.data)
    if serializer.is_valid():
        # Verify email matches invitation
        if serializer.validated_data['email'].lower() != invitation.email.lower():
            return Response(
                {'error': 'Email address does not match the invitation'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the user with CLIENT role
        user = serializer.save()

        # Link user to company (job_title comes from signup form, not invitation)
        CompanyUser.objects.create(
            user=user,
            company=invitation.company,
            role=invitation.role,
            job_title=serializer.validated_data.get('job_title', ''),
            invited_by=invitation.invited_by,
        )

        # Mark invitation as accepted
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.save()

        # Generate tokens
        tokens = get_tokens_for_user(user)

        response_data = {
            'message': f'Registration successful. You have been added to {invitation.company.name}.',
            'user': UserProfileSerializer(user).data,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'company': {
                'id': str(invitation.company.id),
                'name': invitation.company.name,
                'role': invitation.role,
            },
        }

        response = Response(response_data, status=status.HTTP_201_CREATED)
        return set_auth_cookies(response, tokens)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Recruiter Invitation Endpoints
# =============================================================================

@extend_schema(
    responses={
        200: RecruiterInvitationListSerializer(many=True),
        403: OpenApiResponse(description="Permission denied"),
    },
    tags=['Recruiter Invitations'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_recruiter_invitations(request):
    """
    List all recruiter invitations.

    Only Admin users can view recruiter invitations.
    Returns invitations ordered by creation date (newest first).
    """
    # Only Admin can view recruiter invitations
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only administrators can view recruiter invitations'},
            status=status.HTTP_403_FORBIDDEN
        )

    invitations = RecruiterInvitation.objects.all().order_by('-created_at')

    serializer = RecruiterInvitationListSerializer(invitations, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    request=CreateRecruiterInvitationSerializer,
    responses={
        201: RecruiterInvitationResponseSerializer,
        403: OpenApiResponse(description="Permission denied"),
    },
    tags=['Recruiter Invitations'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_recruiter_invitation(request):
    """
    Create a recruiter invitation link.

    Only Admin users can create recruiter invitations.
    Returns a token that can be used for recruiter signup.
    Invitation expires in 7 days.
    """
    # Only Admin can create recruiter invitations
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only administrators can create recruiter invitations'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = CreateRecruiterInvitationSerializer(data=request.data)
    if serializer.is_valid():
        invitation = RecruiterInvitation.objects.create(
            email=serializer.validated_data.get('email', ''),
            created_by=request.user,
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Build signup URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        signup_url = f"{frontend_url}/signup/recruiter/{invitation.token}"

        return Response({
            'token': str(invitation.token),
            'email': invitation.email,
            'expires_at': invitation.expires_at,
            'signup_url': signup_url,
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={
        200: ValidateInvitationSerializer,
        400: OpenApiResponse(description="Invalid or expired invitation"),
        404: OpenApiResponse(description="Invitation not found"),
    },
    tags=['Recruiter Invitations'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def validate_recruiter_invitation(request, token):
    """
    Validate a recruiter invitation token.

    Returns whether the invitation is valid and the associated email (if any).
    Used by frontend to check token before showing signup form.
    """
    try:
        invitation = RecruiterInvitation.objects.get(token=token)
    except RecruiterInvitation.DoesNotExist:
        return Response(
            {'error': 'Invitation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not invitation.is_valid:
        return Response(
            {'error': 'This invitation has expired or already been used'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        'valid': True,
        'email': invitation.email,
    }, status=status.HTTP_200_OK)


@extend_schema(
    request=RecruiterSignupSerializer,
    responses={
        201: OpenApiResponse(description="Recruiter user created successfully"),
        400: OpenApiResponse(description="Invalid data or invitation"),
        404: OpenApiResponse(description="Invitation not found"),
    },
    tags=['Recruiter Invitations'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def signup_with_recruiter_invitation(request, token):
    """
    Sign up as a new RECRUITER user using an invitation token.

    Creates a new user with RECRUITER role.
    Returns JWT tokens for immediate authentication.
    """
    try:
        invitation = RecruiterInvitation.objects.get(token=token)
    except RecruiterInvitation.DoesNotExist:
        return Response(
            {'error': 'Invitation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not invitation.is_valid:
        return Response(
            {'error': 'This invitation has expired or already been used'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = RecruiterSignupSerializer(data=request.data)
    if serializer.is_valid():
        # Create the user with RECRUITER role
        user = serializer.save()

        # Mark invitation as used
        invitation.used_at = timezone.now()
        invitation.used_by = user
        invitation.save()

        # Generate tokens
        tokens = get_tokens_for_user(user)

        response_data = {
            'message': 'Registration successful. Welcome to the recruitment team!',
            'user': UserProfileSerializer(user).data,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
        }

        response = Response(response_data, status=status.HTTP_201_CREATED)
        return set_auth_cookies(response, tokens)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
