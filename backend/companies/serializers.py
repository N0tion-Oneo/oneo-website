from rest_framework import serializers
from .models import Company, CompanyUser, CompanySize, FundingStage, CompanyUserRole, Country, City, RemoteWorkPolicy
from candidates.serializers import IndustrySerializer, TechnologySerializer
from candidates.models import Industry, Technology


class CompanyLocationSerializer(serializers.Serializer):
    """Serializer for company location objects."""
    city = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100)
    is_headquarters = serializers.BooleanField(default=False)


class BenefitCategorySerializer(serializers.Serializer):
    """Serializer for structured benefits."""
    category = serializers.CharField(max_length=100)
    items = serializers.ListField(child=serializers.CharField(max_length=200))


class CountrySerializer(serializers.ModelSerializer):
    """Serializer for Country model."""
    class Meta:
        model = Country
        fields = ['id', 'name', 'code']


class CitySerializer(serializers.ModelSerializer):
    """Serializer for City model."""
    country = CountrySerializer(read_only=True)
    country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.filter(is_active=True),
        source='country',
        write_only=True,
        required=False,
    )

    class Meta:
        model = City
        fields = ['id', 'name', 'country', 'country_id']


class CompanyListSerializer(serializers.ModelSerializer):
    """Serializer for company list view (minimal data)."""
    industry = IndustrySerializer(read_only=True)
    headquarters_location = serializers.CharField(read_only=True)

    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'slug',
            'logo',
            'tagline',
            'industry',
            'company_size',
            'headquarters_location',
            'is_published',
        ]
        read_only_fields = ['id', 'slug']


class CompanyAdminListSerializer(serializers.ModelSerializer):
    """Serializer for admin company list view with job counts."""
    industry = IndustrySerializer(read_only=True)
    headquarters_location = serializers.CharField(read_only=True)
    jobs_total = serializers.IntegerField(read_only=True)
    jobs_draft = serializers.IntegerField(read_only=True)
    jobs_published = serializers.IntegerField(read_only=True)
    jobs_closed = serializers.IntegerField(read_only=True)
    jobs_filled = serializers.IntegerField(read_only=True)

    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'slug',
            'logo',
            'tagline',
            'industry',
            'company_size',
            'headquarters_location',
            'is_published',
            'created_at',
            'jobs_total',
            'jobs_draft',
            'jobs_published',
            'jobs_closed',
            'jobs_filled',
        ]
        read_only_fields = ['id', 'slug', 'created_at']


class CompanyDetailSerializer(serializers.ModelSerializer):
    """Serializer for company detail view (full data)."""
    industry = IndustrySerializer(read_only=True)
    industry_id = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.filter(is_active=True),
        source='industry',
        write_only=True,
        required=False,
        allow_null=True,
    )
    headquarters_city = CitySerializer(read_only=True)
    headquarters_country = CountrySerializer(read_only=True)
    headquarters_location = serializers.CharField(read_only=True)
    billing_country = CountrySerializer(read_only=True)
    locations = CompanyLocationSerializer(many=True, required=False)
    benefits = BenefitCategorySerializer(many=True, required=False)
    technologies = TechnologySerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'slug',
            'logo',
            'tagline',
            'description',
            'industry',
            'industry_id',
            'company_size',
            'founded_year',
            'funding_stage',
            'website_url',
            'linkedin_url',
            'headquarters_city',
            'headquarters_country',
            'headquarters_location',
            'locations',
            'culture_description',
            'values',
            'benefits',
            'technologies',
            'remote_work_policy',
            # Legal/Registration
            'legal_name',
            'registration_number',
            'vat_number',
            # Billing
            'billing_address',
            'billing_city',
            'billing_country',
            'billing_postal_code',
            'billing_contact_name',
            'billing_contact_email',
            'billing_contact_phone',
            # Meta
            'is_published',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class CompanyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating company."""
    industry_id = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.filter(is_active=True),
        source='industry',
        write_only=True,
        required=False,
        allow_null=True,
    )
    headquarters_city_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.filter(is_active=True),
        source='headquarters_city',
        write_only=True,
        required=False,
        allow_null=True,
    )
    headquarters_country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.filter(is_active=True),
        source='headquarters_country',
        write_only=True,
        required=False,
        allow_null=True,
    )
    technology_ids = serializers.PrimaryKeyRelatedField(
        queryset=Technology.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )
    billing_country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.filter(is_active=True),
        source='billing_country',
        write_only=True,
        required=False,
        allow_null=True,
    )
    locations = CompanyLocationSerializer(many=True, required=False)
    benefits = BenefitCategorySerializer(many=True, required=False)

    class Meta:
        model = Company
        fields = [
            'name',
            'logo',
            'tagline',
            'description',
            'industry_id',
            'company_size',
            'founded_year',
            'funding_stage',
            'website_url',
            'linkedin_url',
            'headquarters_city_id',
            'headquarters_country_id',
            'locations',
            'culture_description',
            'values',
            'benefits',
            'technology_ids',
            'remote_work_policy',
            # Legal/Registration
            'legal_name',
            'registration_number',
            'vat_number',
            # Billing
            'billing_address',
            'billing_city',
            'billing_country_id',
            'billing_postal_code',
            'billing_contact_name',
            'billing_contact_email',
            'billing_contact_phone',
            # Meta
            'is_published',
        ]

    def validate_locations(self, value):
        """Validate locations format."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Locations must be a list.")
        return value

    def validate_benefits(self, value):
        """Validate benefits format."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Benefits must be a list.")
        return value

    def validate_values(self, value):
        """Validate values format."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Values must be a list.")
        return value

    def update(self, instance, validated_data):
        """Handle M2M technology_ids separately."""
        technology_ids = validated_data.pop('technology_ids', None)
        instance = super().update(instance, validated_data)
        if technology_ids is not None:
            instance.technologies.set(technology_ids)
        return instance


class CompanyUserSerializer(serializers.ModelSerializer):
    """Serializer for company user."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)

    class Meta:
        model = CompanyUser
        fields = [
            'id',
            'user',
            'user_email',
            'user_first_name',
            'user_last_name',
            'user_avatar',
            'user_phone',
            'company',
            'role',
            'job_title',
            'joined_at',
            'invited_by',
            'invited_by_email',
            'is_active',
        ]
        read_only_fields = ['id', 'joined_at', 'invited_by']


class CompanyUserCreateSerializer(serializers.Serializer):
    """Serializer for inviting a user to a company (legacy - checks if user exists)."""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=CompanyUserRole.choices, default=CompanyUserRole.VIEWER)

    def validate_email(self, value):
        """Check if email is valid."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user found with this email address.")
        return value


class CompanyInvitationSerializer(serializers.ModelSerializer):
    """Serializer for reading company invitations."""
    invited_by_email = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    signup_url = serializers.SerializerMethodField()

    class Meta:
        from .models import CompanyInvitation
        model = CompanyInvitation
        fields = [
            'id',
            'token',
            'email',
            'role',
            'status',
            'company_name',
            'invited_by',
            'invited_by_email',
            'created_at',
            'expires_at',
            'accepted_at',
            'signup_url',
        ]
        read_only_fields = ['id', 'token', 'status', 'invited_by', 'created_at', 'accepted_at']

    def get_invited_by_email(self, obj):
        return obj.invited_by.email if obj.invited_by else None

    def get_company_name(self, obj):
        return obj.company.name

    def get_signup_url(self, obj):
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return f"{frontend_url}/signup/company/{obj.token}"


class CompanyInvitationCreateSerializer(serializers.Serializer):
    """Serializer for creating a new company invitation."""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=CompanyUserRole.choices, default=CompanyUserRole.VIEWER)


class CompanyUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating company user role, job title, and user profile."""
    # User profile fields (write-only, stored on User model)
    user_first_name = serializers.CharField(max_length=150, required=False, write_only=True)
    user_last_name = serializers.CharField(max_length=150, required=False, write_only=True)
    user_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = CompanyUser
        fields = ['role', 'job_title', 'is_active', 'user_first_name', 'user_last_name', 'user_phone']

    def update(self, instance, validated_data):
        # Extract user profile fields
        user_first_name = validated_data.pop('user_first_name', None)
        user_last_name = validated_data.pop('user_last_name', None)
        user_phone = validated_data.pop('user_phone', None)

        # Update User model if any profile fields provided
        user = instance.user
        if user_first_name is not None:
            user.first_name = user_first_name
        if user_last_name is not None:
            user.last_name = user_last_name
        if user_phone is not None:
            user.phone = user_phone if user_phone else None
        user.save()

        # Update CompanyUser model
        return super().update(instance, validated_data)


class CompanyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new company."""
    industry_id = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.filter(is_active=True),
        source='industry',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Company
        fields = [
            'name',
            'tagline',
            'description',
            'industry_id',
            'company_size',
            'headquarters_city',
            'headquarters_country',
        ]

    def validate_name(self, value):
        """Ensure company name is unique."""
        if Company.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A company with this name already exists.")
        return value
