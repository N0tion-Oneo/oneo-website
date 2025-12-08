from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from users.models import User, UserRole


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration (candidates only).
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'phone',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        """Ensure email is unique and lowercase."""
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs

    def create(self, validated_data):
        """Create a new candidate user."""
        validated_data.pop('password_confirm')

        # Generate username from email
        email = validated_data['email']
        username = email.split('@')[0]

        # Ensure username is unique
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone'),
            role=UserRole.CANDIDATE,  # Default to candidate
            is_verified=False,
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        email = attrs.get('email', '').lower()
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError("Both email and password are required.")

        # Authenticate user
        user = authenticate(
            request=self.context.get('request'),
            username=email,  # We use email as username
            password=password
        )

        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile (read and update).
    """
    full_name = serializers.CharField(read_only=True)
    booking_slug = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'avatar',
            'role',
            'is_verified',
            'date_joined',
            'booking_slug',
        ]
        read_only_fields = ['id', 'username', 'email', 'role', 'is_verified', 'date_joined']

    def get_booking_slug(self, obj):
        """Get booking_slug from recruiter_profile for admins/recruiters."""
        if obj.role in ['admin', 'recruiter']:
            profile = getattr(obj, 'recruiter_profile', None)
            if profile:
                return profile.booking_slug
        return None


class RecruiterListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing recruiters (for dropdowns).
    """
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'avatar',
        ]
        read_only_fields = fields


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    """
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'phone',
            'avatar',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password.
    """
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "New passwords do not match."
            })
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    """
    Serializer for forgot password request.
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower()


class ResetPasswordSerializer(serializers.Serializer):
    """
    Serializer for password reset.
    """
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Passwords do not match."
            })
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    """
    Serializer for email verification.
    """
    token = serializers.CharField(required=True)


class CreateClientInvitationSerializer(serializers.Serializer):
    """
    Serializer for creating a client invitation.
    """
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_email(self, value):
        if value:
            return value.lower()
        return value


class ClientInvitationResponseSerializer(serializers.Serializer):
    """
    Response serializer for created invitation.
    """
    token = serializers.UUIDField()
    email = serializers.EmailField()
    expires_at = serializers.DateTimeField()
    signup_url = serializers.CharField()


class ValidateInvitationSerializer(serializers.Serializer):
    """
    Response serializer for invitation validation.
    """
    valid = serializers.BooleanField()
    email = serializers.EmailField(allow_blank=True)


class ClientInvitationListSerializer(serializers.Serializer):
    """
    Serializer for listing client invitations.
    """
    id = serializers.IntegerField()
    token = serializers.UUIDField()
    email = serializers.EmailField(allow_blank=True)
    created_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField()
    used_at = serializers.DateTimeField(allow_null=True)
    is_valid = serializers.BooleanField()
    is_expired = serializers.BooleanField()
    signup_url = serializers.SerializerMethodField()

    def get_signup_url(self, obj):
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return f"{frontend_url}/signup/client/{obj.token}"


class ClientSignupSerializer(serializers.ModelSerializer):
    """
    Serializer for client signup via invitation.
    Similar to RegisterSerializer but for CLIENT role.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    # job_title is stored on CompanyUser, not User - handled in the view
    job_title = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        write_only=True
    )

    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'phone',
            'job_title',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        """Ensure email is unique and lowercase."""
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs

    def create(self, validated_data):
        """Create a new client user."""
        validated_data.pop('password_confirm')

        # Generate username from email
        email = validated_data['email']
        username = email.split('@')[0]

        # Ensure username is unique
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone'),
            role=UserRole.CLIENT,  # CLIENT role for invited users
            is_verified=False,
        )
        return user


# =============================================================================
# Recruiter Invitation Serializers
# =============================================================================

class CreateRecruiterInvitationSerializer(serializers.Serializer):
    """
    Serializer for creating a recruiter invitation.
    """
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_email(self, value):
        if value:
            return value.lower()
        return value


class RecruiterInvitationResponseSerializer(serializers.Serializer):
    """
    Response serializer for created recruiter invitation.
    """
    token = serializers.UUIDField()
    email = serializers.EmailField()
    expires_at = serializers.DateTimeField()
    signup_url = serializers.CharField()


class RecruiterInvitationListSerializer(serializers.Serializer):
    """
    Serializer for listing recruiter invitations.
    """
    id = serializers.IntegerField()
    token = serializers.UUIDField()
    email = serializers.EmailField(allow_blank=True)
    created_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField()
    used_at = serializers.DateTimeField(allow_null=True)
    is_valid = serializers.BooleanField()
    is_expired = serializers.BooleanField()
    signup_url = serializers.SerializerMethodField()

    def get_signup_url(self, obj):
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return f"{frontend_url}/signup/recruiter/{obj.token}"


class RecruiterSignupSerializer(serializers.ModelSerializer):
    """
    Serializer for recruiter signup via invitation.
    Similar to ClientSignupSerializer but for RECRUITER role.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'phone',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        """Ensure email is unique and lowercase."""
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs

    def create(self, validated_data):
        """Create a new recruiter user."""
        validated_data.pop('password_confirm')

        # Generate username from email
        email = validated_data['email']
        username = email.split('@')[0]

        # Ensure username is unique
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone'),
            role=UserRole.RECRUITER,  # RECRUITER role for invited users
            is_verified=False,
        )
        return user


# =============================================================================
# Candidate Invitation Serializers (for booking-triggered invitations)
# =============================================================================

class CandidateInvitationListSerializer(serializers.Serializer):
    """
    Serializer for listing candidate invitations.
    """
    id = serializers.IntegerField()
    token = serializers.UUIDField()
    email = serializers.EmailField()
    name = serializers.CharField()
    created_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField()
    used_at = serializers.DateTimeField(allow_null=True)
    is_valid = serializers.BooleanField()
    is_expired = serializers.BooleanField()
    signup_url = serializers.SerializerMethodField()
    booking_info = serializers.SerializerMethodField()

    def get_signup_url(self, obj):
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return f"{frontend_url}/signup/candidate/{obj.token}"

    def get_booking_info(self, obj):
        if obj.booking:
            return {
                'id': str(obj.booking.id),
                'meeting_type': obj.booking.meeting_type.name if obj.booking.meeting_type else None,
                'scheduled_at': obj.booking.scheduled_at.isoformat() if obj.booking.scheduled_at else None,
                'status': obj.booking.status,
            }
        return None


class CandidateInvitationValidateSerializer(serializers.Serializer):
    """
    Response serializer for candidate invitation validation.
    """
    valid = serializers.BooleanField()
    email = serializers.EmailField()
    name = serializers.CharField()
    booking_info = serializers.DictField(required=False)


class CandidateInvitationSignupSerializer(serializers.ModelSerializer):
    """
    Serializer for candidate signup via booking invitation.
    Creates a CANDIDATE user and links them to the booking.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'phone',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        """Ensure email is unique and lowercase."""
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs

    def create(self, validated_data):
        """Create a new candidate user."""
        validated_data.pop('password_confirm')

        # Generate username from email
        email = validated_data['email']
        username = email.split('@')[0]

        # Ensure username is unique
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone'),
            role=UserRole.CANDIDATE,
            is_verified=False,
        )
        return user
