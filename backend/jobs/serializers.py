from rest_framework import serializers
from .models import Job, JobStatus, JobType, WorkMode, Department
from companies.serializers import CompanyListSerializer, CountrySerializer, CitySerializer, BenefitCategorySerializer
from companies.models import Country, City
from candidates.serializers import SkillSerializer, TechnologySerializer
from candidates.models import Skill, Technology
from authentication.serializers import UserProfileSerializer


class JobListSerializer(serializers.ModelSerializer):
    """Serializer for job list view (minimal data for cards)."""
    company = CompanyListSerializer(read_only=True)
    location_city = CitySerializer(read_only=True)
    location_country = CountrySerializer(read_only=True)
    location_display = serializers.CharField(read_only=True)
    salary_display = serializers.CharField(read_only=True)
    required_skills = SkillSerializer(many=True, read_only=True)
    technologies = TechnologySerializer(many=True, read_only=True)

    class Meta:
        model = Job
        fields = [
            'id',
            'slug',
            'title',
            'company',
            'seniority',
            'job_type',
            'status',
            'department',
            'summary',
            'location_city',
            'location_country',
            'location_display',
            'work_mode',
            'salary_min',
            'salary_max',
            'salary_currency',
            'salary_visible',
            'salary_display',
            'equity_offered',
            'required_skills',
            'technologies',
            'views_count',
            'applications_count',
            'published_at',
            'application_deadline',
            'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'views_count', 'applications_count']


class JobDetailSerializer(serializers.ModelSerializer):
    """Serializer for job detail view (full data)."""
    company = CompanyListSerializer(read_only=True)
    created_by = UserProfileSerializer(read_only=True)
    assigned_recruiter = UserProfileSerializer(read_only=True)
    location_city = CitySerializer(read_only=True)
    location_country = CountrySerializer(read_only=True)
    location_display = serializers.CharField(read_only=True)
    salary_display = serializers.CharField(read_only=True)
    required_skills = SkillSerializer(many=True, read_only=True)
    nice_to_have_skills = SkillSerializer(many=True, read_only=True)
    technologies = TechnologySerializer(many=True, read_only=True)
    benefits = BenefitCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Job
        fields = [
            'id',
            'slug',
            'title',
            'company',
            'created_by',
            'assigned_recruiter',
            'seniority',
            'job_type',
            'status',
            'department',
            'summary',
            'description',
            'requirements',
            'nice_to_haves',
            'responsibilities',
            'location_city',
            'location_country',
            'location_display',
            'work_mode',
            'remote_regions',
            'salary_min',
            'salary_max',
            'salary_currency',
            'salary_visible',
            'salary_display',
            'equity_offered',
            'benefits',
            'required_skills',
            'nice_to_have_skills',
            'technologies',
            'interview_stages',
            'views_count',
            'applications_count',
            'published_at',
            'application_deadline',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'slug', 'created_at', 'updated_at',
            'views_count', 'applications_count', 'published_at'
        ]


class InterviewStageSerializer(serializers.Serializer):
    """Serializer for interview stage structure."""
    name = serializers.CharField(max_length=100)
    order = serializers.IntegerField(min_value=1)
    description = serializers.CharField(required=False, allow_blank=True, default='')


class JobCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new job."""
    location_city_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.filter(is_active=True),
        source='location_city',
        write_only=True,
        required=False,
        allow_null=True,
    )
    location_country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.filter(is_active=True),
        source='location_country',
        write_only=True,
        required=False,
        allow_null=True,
    )
    required_skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )
    nice_to_have_skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )
    technology_ids = serializers.PrimaryKeyRelatedField(
        queryset=Technology.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )
    # Benefits is a JSONField, so use ListField for write operations
    benefits = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    # Interview stages configuration
    interview_stages = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )

    class Meta:
        model = Job
        fields = [
            'title',
            'seniority',
            'job_type',
            'department',
            'summary',
            'description',
            'requirements',
            'nice_to_haves',
            'responsibilities',
            'location_city_id',
            'location_country_id',
            'work_mode',
            'remote_regions',
            'salary_min',
            'salary_max',
            'salary_currency',
            'salary_visible',
            'equity_offered',
            'benefits',
            'interview_stages',
            'required_skill_ids',
            'nice_to_have_skill_ids',
            'technology_ids',
            'application_deadline',
        ]

    def validate_interview_stages(self, value):
        """Validate interview stages structure."""
        for i, stage in enumerate(value):
            if 'name' not in stage or not stage['name']:
                raise serializers.ValidationError(f'Stage {i+1} must have a name.')
            if 'order' not in stage:
                stage['order'] = i + 1
        return value

    def validate(self, data):
        """Validate salary range."""
        salary_min = data.get('salary_min')
        salary_max = data.get('salary_max')
        if salary_min and salary_max and salary_min > salary_max:
            raise serializers.ValidationError({
                'salary_max': 'Maximum salary must be greater than minimum salary.'
            })
        return data

    def create(self, validated_data):
        """Handle M2M fields separately."""
        required_skill_ids = validated_data.pop('required_skill_ids', [])
        nice_to_have_skill_ids = validated_data.pop('nice_to_have_skill_ids', [])
        technology_ids = validated_data.pop('technology_ids', [])

        job = Job.objects.create(**validated_data)

        if required_skill_ids:
            job.required_skills.set(required_skill_ids)
        if nice_to_have_skill_ids:
            job.nice_to_have_skills.set(nice_to_have_skill_ids)
        if technology_ids:
            job.technologies.set(technology_ids)

        return job


class JobUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating an existing job."""
    location_city_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.filter(is_active=True),
        source='location_city',
        write_only=True,
        required=False,
        allow_null=True,
    )
    location_country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.filter(is_active=True),
        source='location_country',
        write_only=True,
        required=False,
        allow_null=True,
    )
    required_skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )
    nice_to_have_skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )
    technology_ids = serializers.PrimaryKeyRelatedField(
        queryset=Technology.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
    )
    # Benefits is a JSONField, so use ListField for write operations
    benefits = serializers.ListField(child=serializers.DictField(), required=False)
    # Interview stages configuration
    interview_stages = serializers.ListField(
        child=serializers.DictField(),
        required=False,
    )

    class Meta:
        model = Job
        fields = [
            'title',
            'seniority',
            'job_type',
            'department',
            'summary',
            'description',
            'requirements',
            'nice_to_haves',
            'responsibilities',
            'location_city_id',
            'location_country_id',
            'work_mode',
            'remote_regions',
            'salary_min',
            'salary_max',
            'salary_currency',
            'salary_visible',
            'equity_offered',
            'benefits',
            'interview_stages',
            'required_skill_ids',
            'nice_to_have_skill_ids',
            'technology_ids',
            'application_deadline',
        ]

    def validate_interview_stages(self, value):
        """Validate interview stages structure."""
        for i, stage in enumerate(value):
            if 'name' not in stage or not stage['name']:
                raise serializers.ValidationError(f'Stage {i+1} must have a name.')
            if 'order' not in stage:
                stage['order'] = i + 1
        return value

    def validate(self, data):
        """Validate salary range."""
        salary_min = data.get('salary_min', getattr(self.instance, 'salary_min', None))
        salary_max = data.get('salary_max', getattr(self.instance, 'salary_max', None))
        if salary_min and salary_max and salary_min > salary_max:
            raise serializers.ValidationError({
                'salary_max': 'Maximum salary must be greater than minimum salary.'
            })
        return data

    def update(self, instance, validated_data):
        """Handle M2M fields separately."""
        required_skill_ids = validated_data.pop('required_skill_ids', None)
        nice_to_have_skill_ids = validated_data.pop('nice_to_have_skill_ids', None)
        technology_ids = validated_data.pop('technology_ids', None)

        instance = super().update(instance, validated_data)

        if required_skill_ids is not None:
            instance.required_skills.set(required_skill_ids)
        if nice_to_have_skill_ids is not None:
            instance.nice_to_have_skills.set(nice_to_have_skill_ids)
        if technology_ids is not None:
            instance.technologies.set(technology_ids)

        return instance


class JobStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating job status (publish/close/etc)."""
    status = serializers.ChoiceField(choices=JobStatus.choices)
