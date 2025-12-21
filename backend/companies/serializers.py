from rest_framework import serializers
from .models import Company, CompanyUser, CompanySize, FundingStage, CompanyUserRole, Country, City, RemoteWorkPolicy, ServiceType
from candidates.serializers import IndustrySerializer, TechnologySerializer
from candidates.models import Industry, Technology
from core.serializers import OnboardingStageMinimalSerializer
from core.models import OnboardingStage


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
            'service_type',
        ]
        read_only_fields = ['id', 'slug']


class CompanyJobSummarySerializer(serializers.Serializer):
    """Minimal job serializer for company admin list view."""
    id = serializers.UUIDField()
    title = serializers.CharField()
    slug = serializers.CharField()
    status = serializers.CharField()
    applications_count = serializers.IntegerField()


class AssignedUserSerializer(serializers.Serializer):
    """Minimal serializer for assigned user info."""
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.CharField()
    booking_slug = serializers.SerializerMethodField()

    def get_booking_slug(self, obj):
        """Get booking_slug from recruiter_profile if available."""
        if hasattr(obj, 'recruiter_profile') and obj.recruiter_profile:
            return obj.recruiter_profile.booking_slug
        return None


class CompanyAdminListSerializer(serializers.ModelSerializer):
    """Serializer for admin company list view with job counts and job list."""
    industry = IndustrySerializer(read_only=True)
    headquarters_location = serializers.CharField(read_only=True)
    jobs_total = serializers.IntegerField(read_only=True)
    jobs_draft = serializers.IntegerField(read_only=True)
    jobs_published = serializers.IntegerField(read_only=True)
    jobs_closed = serializers.IntegerField(read_only=True)
    jobs_filled = serializers.IntegerField(read_only=True)
    jobs = serializers.SerializerMethodField()
    assigned_to = AssignedUserSerializer(many=True, read_only=True)
    onboarding_stage = OnboardingStageMinimalSerializer(read_only=True)

    # Subscription info
    subscription = serializers.SerializerMethodField()
    # Primary contact
    primary_contact = serializers.SerializerMethodField()
    # Pricing info
    pricing = serializers.SerializerMethodField()

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
            'is_platform',
            'service_type',
            'created_at',
            'jobs_total',
            'jobs_draft',
            'jobs_published',
            'jobs_closed',
            'jobs_filled',
            'jobs',
            'assigned_to',
            'onboarding_stage',
            'subscription',
            'primary_contact',
            'pricing',
        ]
        read_only_fields = ['id', 'slug', 'created_at']

    def get_jobs(self, obj):
        """Return a list of jobs with their status and applications count."""
        # Get jobs from prefetched data if available, otherwise query
        jobs = getattr(obj, 'prefetched_jobs', None)
        if jobs is None:
            jobs = obj.jobs.all()

        return CompanyJobSummarySerializer([
            {
                'id': job.id,
                'title': job.title,
                'slug': job.slug,
                'status': job.status,
                'applications_count': job.applications_count,  # Field on Job model
            }
            for job in jobs
        ], many=True).data

    def get_subscription(self, obj):
        """Return active subscription info if exists."""
        from subscriptions.models import Subscription, SubscriptionServiceType
        # Get the most recent active or paused subscription for retained/headhunting
        subscription = Subscription.objects.filter(
            company=obj,
            service_type__in=[SubscriptionServiceType.RETAINED, SubscriptionServiceType.HEADHUNTING]
        ).order_by('-created_at').first()

        if not subscription:
            return None

        # Get billing mode from most recent invoice, if any
        from subscriptions.models import Invoice
        latest_invoice = Invoice.objects.filter(subscription=subscription).order_by('-created_at').first()
        billing_mode = latest_invoice.billing_mode if latest_invoice else 'in_system'

        return {
            'id': str(subscription.id),
            'status': subscription.status,
            'service_type': subscription.service_type,
            'contract_start_date': subscription.contract_start_date.isoformat() if subscription.contract_start_date else None,
            'contract_end_date': subscription.contract_end_date.isoformat() if subscription.contract_end_date else None,
            'auto_renew': subscription.auto_renew,
            'billing_mode': billing_mode,
            'days_until_renewal': subscription.days_until_renewal,
        }

    def get_primary_contact(self, obj):
        """Return the primary contact (first admin) for the company."""
        admin_user = obj.members.filter(
            role='admin',
            is_active=True
        ).select_related('user').first()

        if not admin_user:
            return None

        user = admin_user.user
        return {
            'id': str(user.id),
            'name': user.full_name or user.email,
            'email': user.email,
        }

    def get_pricing(self, obj):
        """Return company pricing info. Returns None if no custom pricing set."""
        from subscriptions.models import CompanyPricing
        try:
            pricing = CompanyPricing.objects.get(company=obj)
            # Only return pricing if at least one custom value is set
            if not pricing.monthly_retainer and not pricing.placement_fee and not pricing.csuite_placement_fee:
                return None
            return {
                'monthly_retainer': str(pricing.monthly_retainer) if pricing.monthly_retainer else None,
                'placement_fee': str(pricing.placement_fee) if pricing.placement_fee else None,
                'csuite_placement_fee': str(pricing.csuite_placement_fee) if pricing.csuite_placement_fee else None,
            }
        except CompanyPricing.DoesNotExist:
            return None


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
    assigned_to = serializers.SerializerMethodField()
    onboarding_stage = OnboardingStageMinimalSerializer(read_only=True)

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
            'is_platform',
            # Assigned staff (for admin view)
            'assigned_to',
            # Onboarding
            'onboarding_stage',
            # Access permissions
            'can_view_all_candidates',
            # Service type
            'service_type',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_assigned_to(self, obj):
        from users.models import UserRole
        from .models import CompanyUser
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []

        user = request.user

        # Return assigned_to for:
        # 1. Staff users (admin/recruiter) - full visibility
        # 2. Client users who are members of this company (for dashboard scheduling card)
        is_staff = user.role in [UserRole.ADMIN, UserRole.RECRUITER]
        is_company_member = user.role == UserRole.CLIENT and CompanyUser.objects.filter(
            user=user, company=obj
        ).exists()

        if is_staff or is_company_member:
            result = []
            for assigned_user in obj.assigned_to.select_related('recruiter_profile').all():
                data = {
                    'id': assigned_user.id,
                    'email': assigned_user.email,
                    'first_name': assigned_user.first_name,
                    'last_name': assigned_user.last_name,
                    'full_name': assigned_user.full_name,
                }
                # Include booking_slug if the assigned user has a recruiter profile
                if hasattr(assigned_user, 'recruiter_profile') and assigned_user.recruiter_profile:
                    data['booking_slug'] = assigned_user.recruiter_profile.booking_slug
                result.append(data)
            return result
        return []


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
    onboarding_stage_id = serializers.PrimaryKeyRelatedField(
        queryset=OnboardingStage.objects.filter(entity_type='company', is_active=True),
        source='onboarding_stage',
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
            # Onboarding
            'onboarding_stage_id',
            # Access permissions
            'can_view_all_candidates',
            # Service type
            'service_type',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add assigned_to_ids field dynamically to avoid circular import
        from django.contrib.auth import get_user_model
        from users.models import UserRole
        User = get_user_model()
        self.fields['assigned_to_ids'] = serializers.PrimaryKeyRelatedField(
            queryset=User.objects.filter(
                role__in=[UserRole.RECRUITER, UserRole.ADMIN],
                is_active=True,
            ),
            many=True,
            write_only=True,
            required=False,
        )

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
        """Handle M2M fields, onboarding stage history, and service type changes."""
        from core.models import OnboardingHistory

        technology_ids = validated_data.pop('technology_ids', None)
        assigned_to_ids = validated_data.pop('assigned_to_ids', None)

        # Track onboarding stage change before update
        old_stage = instance.onboarding_stage
        new_stage = validated_data.get('onboarding_stage')

        # Handle service_type change - automatically update can_view_all_candidates
        new_service_type = validated_data.get('service_type')
        if new_service_type is not None and new_service_type != instance.service_type:
            # Retained clients get access to full talent directory
            # Headhunting clients only see their job applicants
            validated_data['can_view_all_candidates'] = (new_service_type == ServiceType.RETAINED)

        instance = super().update(instance, validated_data)

        # Create history record if stage changed
        if new_stage is not None and new_stage != old_stage:
            request = self.context.get('request')
            OnboardingHistory.objects.create(
                entity_type='company',
                entity_id=instance.id,
                from_stage=old_stage,
                to_stage=new_stage,
                changed_by=request.user if request else None,
            )

        if technology_ids is not None:
            instance.technologies.set(technology_ids)
        if assigned_to_ids is not None:
            instance.assigned_to.set(assigned_to_ids)
        return instance


class CompanyUserSerializer(serializers.ModelSerializer):
    """Serializer for company user."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
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
            'user_role',
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
    service_type = serializers.ChoiceField(
        choices=ServiceType.choices,
        required=True,
        help_text='The recruitment service package for this company (headhunting or retained)',
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
            'service_type',
        ]

    def validate_name(self, value):
        """Ensure company name is unique."""
        if Company.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A company with this name already exists.")
        return value

    def create(self, validated_data):
        """
        Create company and automatically set can_view_all_candidates based on service_type.
        - Retained: can_view_all_candidates = True (access to full talent directory)
        - Headhunting: can_view_all_candidates = False (only see job applicants)
        """
        service_type = validated_data.get('service_type')
        if service_type == ServiceType.RETAINED:
            validated_data['can_view_all_candidates'] = True
        else:
            validated_data['can_view_all_candidates'] = False
        return super().create(validated_data)
