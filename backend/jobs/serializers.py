from rest_framework import serializers
from .models import Job, JobStatus, JobType, WorkMode, Department, Application, ApplicationStatus, ApplicationSource, RejectionReason
from companies.serializers import CompanyListSerializer, CountrySerializer, CitySerializer, BenefitCategorySerializer
from companies.models import Country, City
from candidates.serializers import SkillSerializer, TechnologySerializer, CandidateProfileSerializer
from candidates.models import Skill, Technology, CandidateProfile
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


# ==================== Application Serializers ====================


class ApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for application list view (minimal data)."""
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_slug = serializers.CharField(source='job.slug', read_only=True)
    company_name = serializers.CharField(source='job.company.name', read_only=True)
    company_logo = serializers.SerializerMethodField()
    current_stage_name = serializers.CharField(read_only=True)
    candidate_name = serializers.CharField(source='candidate.full_name', read_only=True)
    candidate_email = serializers.CharField(source='candidate.email', read_only=True)

    def get_company_logo(self, obj):
        """Safely get company logo URL."""
        if obj.job.company and obj.job.company.logo:
            return obj.job.company.logo.url
        return None

    class Meta:
        model = Application
        fields = [
            'id',
            'job',
            'job_title',
            'job_slug',
            'company_name',
            'company_logo',
            'candidate',
            'candidate_name',
            'candidate_email',
            'status',
            'current_stage_order',
            'current_stage_name',
            'source',
            'applied_at',
            'shortlisted_at',
            'last_status_change',
            'rejection_reason',
        ]
        read_only_fields = ['id', 'applied_at', 'shortlisted_at', 'last_status_change']


class ApplicationSerializer(serializers.ModelSerializer):
    """Full application serializer with job interview stages."""
    job = JobListSerializer(read_only=True)
    candidate = CandidateProfileSerializer(read_only=True)
    referrer = UserProfileSerializer(read_only=True)
    current_stage_name = serializers.CharField(read_only=True)
    interview_stages = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id',
            'job',
            'candidate',
            'referrer',
            'covering_statement',
            'resume_url',
            'status',
            'current_stage_order',
            'current_stage_name',
            'stage_notes',
            'interview_stages',
            'source',
            # Offer fields
            'offer_details',
            'offer_made_at',
            'offer_accepted_at',
            'final_offer_details',
            # Rejection fields
            'rejection_reason',
            'rejection_feedback',
            'rejected_at',
            # Other
            'feedback',
            'applied_at',
            'shortlisted_at',
            'last_status_change',
        ]
        read_only_fields = ['id', 'applied_at', 'shortlisted_at', 'last_status_change']

    def get_interview_stages(self, obj):
        """Return the job's interview stages."""
        return obj.job.interview_stages or []


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new application."""
    job_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Application
        fields = [
            'job_id',
            'covering_statement',
            'resume_url',
        ]

    def validate_job_id(self, value):
        """Validate job exists and is open for applications."""
        try:
            job = Job.objects.get(id=value)
        except Job.DoesNotExist:
            raise serializers.ValidationError('Job not found.')

        if job.status != JobStatus.PUBLISHED:
            raise serializers.ValidationError('This job is not accepting applications.')

        return value

    def validate(self, data):
        """Validate candidate hasn't already applied."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError('Authentication required.')

        try:
            candidate = CandidateProfile.objects.get(user=request.user)
        except CandidateProfile.DoesNotExist:
            raise serializers.ValidationError('Candidate profile not found.')

        job_id = data.get('job_id')
        if Application.objects.filter(job_id=job_id, candidate=candidate).exists():
            raise serializers.ValidationError('You have already applied to this job.')

        data['candidate'] = candidate
        return data

    def create(self, validated_data):
        """Create the application."""
        job_id = validated_data.pop('job_id')
        job = Job.objects.get(id=job_id)

        application = Application.objects.create(
            job=job,
            **validated_data
        )

        # Increment job applications count
        job.applications_count += 1
        job.save(update_fields=['applications_count'])

        return application


class ApplicationStageUpdateSerializer(serializers.Serializer):
    """Serializer for updating application stage (advance)."""
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class OfferDetailsSerializer(serializers.Serializer):
    """Serializer for offer details when making an offer."""
    salary = serializers.IntegerField(required=False, allow_null=True)
    currency = serializers.ChoiceField(
        choices=[('ZAR', 'ZAR'), ('USD', 'USD'), ('EUR', 'EUR'), ('GBP', 'GBP')],
        required=False,
        default='ZAR'
    )
    start_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    benefits = serializers.CharField(required=False, allow_blank=True, default='')
    equity = serializers.CharField(required=False, allow_blank=True, default='')


class MakeOfferSerializer(serializers.Serializer):
    """Serializer for making an offer."""
    offer_details = OfferDetailsSerializer(required=True)


class AcceptOfferSerializer(serializers.Serializer):
    """Serializer for accepting an offer with final details."""
    final_offer_details = OfferDetailsSerializer(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class RejectApplicationSerializer(serializers.Serializer):
    """Serializer for rejecting an application with structured reason."""
    rejection_reason = serializers.ChoiceField(
        choices=RejectionReason.choices,
        required=True
    )
    rejection_feedback = serializers.CharField(required=False, allow_blank=True, default='')


class CandidateApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for candidate viewing their applications (includes job details)."""
    job = JobListSerializer(read_only=True)
    current_stage_name = serializers.CharField(read_only=True)
    interview_stages = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id',
            'job',
            'status',
            'current_stage_order',
            'current_stage_name',
            'interview_stages',
            'covering_statement',
            'applied_at',
            'last_status_change',
        ]
        read_only_fields = fields

    def get_interview_stages(self, obj):
        """Return the job's interview stages."""
        return obj.job.interview_stages or []
