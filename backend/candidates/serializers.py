from rest_framework import serializers
from .models import (
    Skill,
    Industry,
    Technology,
    CandidateProfile,
    Experience,
    Education,
    Seniority,
    WorkPreference,
    Currency,
    ProfileVisibility,
    SkillCategory,
    TechnologyCategory,
    CompanySize,
)
from companies.models import City, Country
from core.serializers import OnboardingStageMinimalSerializer
from core.models import OnboardingStage


class CountrySerializer(serializers.ModelSerializer):
    """Serializer for Country model (used in candidate profiles)."""

    class Meta:
        model = Country
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'name', 'code']


class CitySerializer(serializers.ModelSerializer):
    """Serializer for City model (used in candidate profiles)."""
    country = CountrySerializer(read_only=True)

    class Meta:
        model = City
        fields = ['id', 'name', 'country']
        read_only_fields = ['id', 'name', 'country']


class SkillSerializer(serializers.ModelSerializer):
    """Serializer for Skill model."""

    class Meta:
        model = Skill
        fields = ['id', 'name', 'slug', 'category', 'is_active', 'needs_review']
        read_only_fields = ['id', 'slug']


class IndustrySerializer(serializers.ModelSerializer):
    """Serializer for Industry model."""

    class Meta:
        model = Industry
        fields = ['id', 'name', 'slug']
        read_only_fields = ['id', 'slug']


class TechnologySerializer(serializers.ModelSerializer):
    """Serializer for Technology model."""

    class Meta:
        model = Technology
        fields = ['id', 'name', 'slug', 'category', 'is_active', 'needs_review']
        read_only_fields = ['id', 'slug']


class CandidateProfileSerializer(serializers.ModelSerializer):
    """
    Full serializer for CandidateProfile - used for authenticated users
    viewing their own profile or profiles of users who set visibility to public.
    """
    industries = IndustrySerializer(many=True, read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    location = serializers.CharField(read_only=True)
    avatar = serializers.SerializerMethodField()

    # Location FK relationships
    city_rel = CitySerializer(read_only=True)
    country_rel = CountrySerializer(read_only=True)

    # Nested user info
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)

    # Nested experiences and education
    experiences = serializers.SerializerMethodField()
    education = serializers.SerializerMethodField()

    # Calculated years of experience
    years_of_experience = serializers.SerializerMethodField()

    # Assigned staff (for admin view)
    assigned_to = serializers.SerializerMethodField()

    # Onboarding stage
    onboarding_stage = OnboardingStageMinimalSerializer(read_only=True)

    class Meta:
        model = CandidateProfile
        fields = [
            'id',
            'slug',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone',
            'avatar',
            'professional_title',
            'headline',
            'seniority',
            'professional_summary',
            'years_of_experience',
            'city',
            'country',
            'region',
            'city_rel',
            'country_rel',
            'location',
            'work_preference',
            'willing_to_relocate',
            'preferred_locations',
            'salary_expectation_min',
            'salary_expectation_max',
            'salary_currency',
            'notice_period_days',
            'portfolio_links',
            'resume_url',
            'industries',
            'experiences',
            'education',
            'visibility',
            'profile_completeness',
            'assigned_to',
            'onboarding_stage',
            'created_at',
            'updated_at',
        ]

    def get_experiences(self, obj):
        from .serializers import ExperienceSerializer
        experiences = obj.experiences.all().order_by('order', '-start_date')
        return ExperienceSerializer(experiences, many=True).data

    def get_education(self, obj):
        from .serializers import EducationSerializer
        education = obj.education.all().order_by('order', '-start_date')
        return EducationSerializer(education, many=True).data

    def get_avatar(self, obj):
        if obj.user.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
            return obj.user.avatar.url
        return None

    def get_years_of_experience(self, obj):
        return obj.calculated_years_of_experience

    def get_assigned_to(self, obj):
        from users.models import UserRole
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []

        user = request.user

        # Return assigned_to for:
        # 1. Staff users (admin/recruiter) - full visibility
        # 2. The candidate themselves (for dashboard scheduling card)
        is_staff = user.role in [UserRole.ADMIN, UserRole.RECRUITER]
        is_own_profile = hasattr(obj, 'user') and obj.user_id == user.id

        if is_staff or is_own_profile:
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


class CandidateProfileSanitizedSerializer(serializers.ModelSerializer):
    """
    Sanitized serializer for CandidateProfile - hides sensitive information
    like exact name, email, phone, and salary expectations.
    Used for public directory listings.
    """
    industries = IndustrySerializer(many=True, read_only=True)
    location = serializers.CharField(read_only=True)

    # Display initials instead of full name
    initials = serializers.SerializerMethodField()

    # Calculated years of experience
    years_of_experience = serializers.SerializerMethodField()

    class Meta:
        model = CandidateProfile
        fields = [
            'id',
            'slug',
            'initials',
            'professional_title',
            'headline',
            'seniority',
            'professional_summary',
            'years_of_experience',
            'city',
            'country',
            'location',
            'work_preference',
            'willing_to_relocate',
            'industries',
            'profile_completeness',
        ]
        read_only_fields = fields

    def get_initials(self, obj):
        first_initial = obj.user.first_name[0].upper() if obj.user.first_name else ''
        last_initial = obj.user.last_name[0].upper() if obj.user.last_name else ''
        return f"{first_initial}{last_initial}"

    def get_years_of_experience(self, obj):
        return obj.calculated_years_of_experience


class CandidateProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating candidate profile.
    Handles both profile fields and M2M relationships.
    """
    industry_ids = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )

    # Location FK fields for writing
    city_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.filter(is_active=True),
        write_only=True,
        required=False,
        allow_null=True,
        source='city_rel',
    )
    country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.filter(is_active=True),
        write_only=True,
        required=False,
        allow_null=True,
        source='country_rel',
    )

    # User fields that can be updated through profile
    first_name = serializers.CharField(required=False, write_only=True)
    last_name = serializers.CharField(required=False, write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)

    # Onboarding stage
    onboarding_stage_id = serializers.PrimaryKeyRelatedField(
        queryset=OnboardingStage.objects.filter(entity_type='candidate', is_active=True),
        source='onboarding_stage',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = CandidateProfile
        fields = [
            'first_name',
            'last_name',
            'phone',
            'professional_title',
            'headline',
            'seniority',
            'professional_summary',
            'city',
            'country',
            'region',
            'city_id',
            'country_id',
            'work_preference',
            'willing_to_relocate',
            'preferred_locations',
            'salary_expectation_min',
            'salary_expectation_max',
            'salary_currency',
            'notice_period_days',
            'portfolio_links',
            'resume_url',
            'industry_ids',
            'visibility',
            'onboarding_stage_id',
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

    def validate_salary_expectation_max(self, value):
        """Ensure max salary is greater than min salary."""
        min_salary = self.initial_data.get('salary_expectation_min')
        if min_salary and value and int(value) < int(min_salary):
            raise serializers.ValidationError(
                "Maximum salary must be greater than minimum salary."
            )
        return value

    def update(self, instance, validated_data):
        from core.models import OnboardingHistory

        # Handle user fields
        user = instance.user
        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
        if 'phone' in validated_data:
            user.phone = validated_data.pop('phone')
        user.save()

        # Handle M2M relationships
        if 'industry_ids' in validated_data:
            industries = validated_data.pop('industry_ids')
            instance.industries.set(industries)

        # Handle assigned_to M2M
        if 'assigned_to_ids' in validated_data:
            assigned_users = validated_data.pop('assigned_to_ids')
            instance.assigned_to.set(assigned_users)

        # Track onboarding stage change
        old_stage = instance.onboarding_stage
        new_stage = validated_data.get('onboarding_stage')

        # Update remaining profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Create history record if stage changed
        if new_stage is not None and new_stage != old_stage:
            request = self.context.get('request')
            OnboardingHistory.objects.create(
                entity_type='candidate',
                entity_id=str(instance.id),
                from_stage=old_stage,
                to_stage=new_stage,
                changed_by=request.user if request else None,
            )

        return instance


class CandidateProfileCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a candidate profile.
    Profile is typically auto-created when candidate registers,
    but this handles explicit creation.
    """

    class Meta:
        model = CandidateProfile
        fields = [
            'professional_title',
            'headline',
            'seniority',
            'professional_summary',
            'city',
            'country',
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        # Check if profile already exists
        if hasattr(user, 'candidate_profile'):
            raise serializers.ValidationError(
                "Candidate profile already exists for this user."
            )
        return CandidateProfile.objects.create(user=user, **validated_data)


# ============================================================================
# Experience Serializers
# ============================================================================

class ExperienceSerializer(serializers.ModelSerializer):
    """
    Full serializer for Experience - includes all details.
    """
    industry = IndustrySerializer(read_only=True)
    industry_id = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.filter(is_active=True),
        write_only=True,
        required=False,
        allow_null=True,
        source='industry',
    )
    technologies = TechnologySerializer(many=True, read_only=True)
    skills = SkillSerializer(many=True, read_only=True)

    class Meta:
        model = Experience
        fields = [
            'id',
            'job_title',
            'company_name',
            'company_size',
            'industry',
            'industry_id',
            'start_date',
            'end_date',
            'is_current',
            'description',
            'achievements',
            'technologies_used',
            'technologies',
            'skills',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate date logic."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        is_current = data.get('is_current', False)

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })

        if is_current and end_date:
            raise serializers.ValidationError({
                'end_date': 'Current positions should not have an end date.'
            })

        return data


class ExperienceSanitizedSerializer(serializers.ModelSerializer):
    """
    Sanitized serializer for Experience - hides company name for public profiles.
    """
    industry = IndustrySerializer(read_only=True)
    technologies = TechnologySerializer(many=True, read_only=True)
    skills = SkillSerializer(many=True, read_only=True)

    class Meta:
        model = Experience
        fields = [
            'id',
            'job_title',
            'company_size',
            'industry',
            'start_date',
            'end_date',
            'is_current',
            'description',
            'achievements',
            'technologies_used',
            'technologies',
            'skills',
            'order',
        ]
        read_only_fields = fields


class ExperienceCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating experiences.
    """
    industry_id = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    technology_ids = serializers.PrimaryKeyRelatedField(
        queryset=Technology.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = Experience
        fields = [
            'job_title',
            'company_name',
            'company_size',
            'industry_id',
            'start_date',
            'end_date',
            'is_current',
            'description',
            'achievements',
            'technologies_used',
            'technology_ids',
            'skill_ids',
            'order',
        ]

    def validate(self, data):
        """Validate date logic."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        is_current = data.get('is_current', False)

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })

        if is_current and end_date:
            raise serializers.ValidationError({
                'end_date': 'Current positions should not have an end date.'
            })

        return data

    def create(self, validated_data):
        industry = validated_data.pop('industry_id', None)
        technology_ids = validated_data.pop('technology_ids', [])
        skill_ids = validated_data.pop('skill_ids', [])
        candidate = self.context['candidate']
        experience = Experience.objects.create(
            candidate=candidate,
            industry=industry,
            **validated_data
        )
        if technology_ids:
            experience.technologies.set(technology_ids)
        if skill_ids:
            experience.skills.set(skill_ids)
        return experience

    def update(self, instance, validated_data):
        if 'industry_id' in validated_data:
            instance.industry = validated_data.pop('industry_id')
        if 'technology_ids' in validated_data:
            instance.technologies.set(validated_data.pop('technology_ids'))
        if 'skill_ids' in validated_data:
            instance.skills.set(validated_data.pop('skill_ids'))
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# ============================================================================
# Education Serializers
# ============================================================================

class EducationSerializer(serializers.ModelSerializer):
    """
    Full serializer for Education.
    """

    class Meta:
        model = Education
        fields = [
            'id',
            'institution',
            'degree',
            'field_of_study',
            'start_date',
            'end_date',
            'is_current',
            'grade',
            'description',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate date logic."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        is_current = data.get('is_current', False)

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })

        if is_current and end_date:
            raise serializers.ValidationError({
                'end_date': 'Current education should not have an end date.'
            })

        return data


class EducationCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating education entries.
    """

    class Meta:
        model = Education
        fields = [
            'institution',
            'degree',
            'field_of_study',
            'start_date',
            'end_date',
            'is_current',
            'grade',
            'description',
            'order',
        ]

    def validate(self, data):
        """Validate date logic."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        is_current = data.get('is_current', False)

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })

        if is_current and end_date:
            raise serializers.ValidationError({
                'end_date': 'Current education should not have an end date.'
            })

        return data

    def create(self, validated_data):
        candidate = self.context['candidate']
        education = Education.objects.create(candidate=candidate, **validated_data)
        return education


# ============================================================================
# Reorder Serializers
# ============================================================================

class ReorderSerializer(serializers.Serializer):
    """
    Serializer for reordering items (experiences or education).
    Expects a list of IDs in the desired order.
    """
    ordered_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
    )


class ExperienceListSerializer(serializers.ModelSerializer):
    """
    Serializer for Experience list display in admin candidates view.
    """
    industry = IndustrySerializer(read_only=True)
    skills = SkillSerializer(many=True, read_only=True)
    technologies = TechnologySerializer(many=True, read_only=True)

    class Meta:
        model = Experience
        fields = [
            'id',
            'job_title',
            'company_name',
            'company_size',
            'industry',
            'start_date',
            'end_date',
            'is_current',
            'description',
            'achievements',
            'skills',
            'technologies',
            'order',
        ]
        read_only_fields = fields


class EducationListSerializer(serializers.ModelSerializer):
    """
    Serializer for Education list display in admin candidates view.
    """
    class Meta:
        model = Education
        fields = [
            'id',
            'institution',
            'degree',
            'field_of_study',
            'start_date',
            'end_date',
            'is_current',
            'grade',
            'description',
            'order',
        ]
        read_only_fields = fields


class AssignedUserSerializer(serializers.Serializer):
    """Minimal serializer for assigned user info."""
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.CharField()


class CandidateAdminListSerializer(serializers.ModelSerializer):
    """
    Serializer for admin/recruiter candidate listing.
    Shows full candidate information for management purposes.
    """
    initials = serializers.SerializerMethodField()
    full_name = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    phone = serializers.SerializerMethodField()
    location = serializers.CharField(read_only=True)
    industries = IndustrySerializer(many=True, read_only=True)
    has_resume = serializers.SerializerMethodField()
    experiences = ExperienceListSerializer(many=True, read_only=True)
    education = EducationListSerializer(many=True, read_only=True)
    years_of_experience = serializers.SerializerMethodField()
    assigned_to = AssignedUserSerializer(many=True, read_only=True)
    onboarding_stage = OnboardingStageMinimalSerializer(read_only=True)

    class Meta:
        model = CandidateProfile
        fields = [
            'id',
            'slug',
            'initials',
            'full_name',
            'email',
            'phone',
            'professional_title',
            'headline',
            'seniority',
            'professional_summary',
            'years_of_experience',
            'location',
            'city',
            'country',
            'work_preference',
            'willing_to_relocate',
            'preferred_locations',
            'salary_expectation_min',
            'salary_expectation_max',
            'salary_currency',
            'notice_period_days',
            'has_resume',
            'industries',
            'experiences',
            'education',
            'visibility',
            'profile_completeness',
            'assigned_to',
            'onboarding_stage',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_initials(self, obj):
        first_initial = obj.user.first_name[0].upper() if obj.user.first_name else ''
        last_initial = obj.user.last_name[0].upper() if obj.user.last_name else ''
        return f"{first_initial}{last_initial}"

    def get_phone(self, obj):
        return obj.user.phone if obj.user.phone else None

    def get_has_resume(self, obj):
        return bool(obj.resume_url)

    def get_years_of_experience(self, obj):
        return obj.calculated_years_of_experience


# ============================================================================
# Profile Suggestions Serializers
# ============================================================================

class ProfileSuggestionSerializer(serializers.ModelSerializer):
    """Read serializer for profile suggestions."""
    created_by_name = serializers.SerializerMethodField()
    created_by_email = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()
    reopened_by_name = serializers.SerializerMethodField()

    class Meta:
        from .models import ProfileSuggestion
        model = ProfileSuggestion
        fields = [
            'id',
            'candidate',
            'field_type',
            'field_name',
            'related_object_id',
            'suggestion_text',
            'status',
            'created_by',
            'created_by_name',
            'created_by_email',
            'created_at',
            'resolved_at',
            'resolved_by',
            'resolved_by_name',
            'resolution_note',
            'reopened_at',
            'reopened_by',
            'reopened_by_name',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None

    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None

    def get_resolved_by_name(self, obj):
        return obj.resolved_by.full_name if obj.resolved_by else None

    def get_reopened_by_name(self, obj):
        return obj.reopened_by.full_name if obj.reopened_by else None


class ProfileSuggestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating suggestions (admin/recruiter use)."""

    class Meta:
        from .models import ProfileSuggestion
        model = ProfileSuggestion
        fields = [
            'field_type',
            'field_name',
            'related_object_id',
            'suggestion_text',
        ]

    def validate(self, data):
        # Validate related_object_id is required for experience/education
        if data['field_type'] in ['experience', 'education']:
            if not data.get('related_object_id'):
                raise serializers.ValidationError({
                    'related_object_id': 'Required for experience/education suggestions'
                })
        return data

    def create(self, validated_data):
        from .models import ProfileSuggestion
        candidate = self.context['candidate']
        user = self.context['request'].user
        return ProfileSuggestion.objects.create(
            candidate=candidate,
            created_by=user,
            **validated_data
        )


class ProfileSuggestionDeclineSerializer(serializers.Serializer):
    """Serializer for candidate declining a suggestion."""
    reason = serializers.CharField(required=True, min_length=10)
