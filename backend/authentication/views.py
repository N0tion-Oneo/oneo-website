from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    VerifyEmailSerializer,
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
