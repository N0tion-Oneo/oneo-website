from rest_framework import serializers
from django.contrib.auth import get_user_model

from ..models import (
    Job, JobStatus, JobType, WorkMode, Department,
    ApplicationQuestion, QuestionTemplate,
)
from companies.serializers import CompanyListSerializer, CountrySerializer, CitySerializer, BenefitCategorySerializer
from companies.models import Country, City
from candidates.serializers import SkillSerializer, TechnologySerializer
from candidates.models import Skill, Technology
from authentication.serializers import UserProfileSerializer

User = get_user_model()


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
    questions = serializers.SerializerMethodField()

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
            'questions',
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

    def get_questions(self, obj):
        """Return the job's application questions."""
        from .questions import ApplicationQuestionSerializer
        questions = obj.questions.all().order_by('order')
        return ApplicationQuestionSerializer(questions, many=True).data


class InterviewStageSerializer(serializers.Serializer):
    """Serializer for interview stage structure."""
    name = serializers.CharField(max_length=100)
    order = serializers.IntegerField(min_value=1)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    assessment_url = serializers.URLField(required=False, allow_blank=True, default='')
    assessment_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')


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
    benefits = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    interview_stages = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )
    questions = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        write_only=True,
    )
    question_template_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

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
            'questions',
            'question_template_id',
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

    def validate_questions(self, value):
        """Validate questions structure."""
        for i, q in enumerate(value):
            if 'question_text' not in q or not q['question_text']:
                raise serializers.ValidationError(f'Question {i+1} must have text.')
            question_type = q.get('question_type', 'text')
            if question_type in ['select', 'multi_select']:
                if 'options' not in q or not q['options']:
                    raise serializers.ValidationError(
                        f'Question {i+1} requires options for select/multi-select type.'
                    )
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
        """Handle M2M fields and questions separately."""
        required_skill_ids = validated_data.pop('required_skill_ids', [])
        nice_to_have_skill_ids = validated_data.pop('nice_to_have_skill_ids', [])
        technology_ids = validated_data.pop('technology_ids', [])
        questions_data = validated_data.pop('questions', [])
        template_id = validated_data.pop('question_template_id', None)

        job = Job.objects.create(**validated_data)

        if required_skill_ids:
            job.required_skills.set(required_skill_ids)
        if nice_to_have_skill_ids:
            job.nice_to_have_skills.set(nice_to_have_skill_ids)
        if technology_ids:
            job.technologies.set(technology_ids)

        # Create questions from template if provided
        if template_id:
            try:
                template = QuestionTemplate.objects.get(id=template_id)
                for tq in template.questions.all():
                    ApplicationQuestion.objects.create(
                        job=job,
                        question_text=tq.question_text,
                        question_type=tq.question_type,
                        options=tq.options,
                        placeholder=tq.placeholder,
                        helper_text=tq.helper_text,
                        is_required=tq.is_required,
                        order=tq.order,
                    )
            except QuestionTemplate.DoesNotExist:
                pass

        # Create questions from direct input (overrides template if both provided)
        if questions_data:
            job.questions.all().delete()
            for i, q_data in enumerate(questions_data):
                ApplicationQuestion.objects.create(
                    job=job,
                    question_text=q_data.get('question_text', ''),
                    question_type=q_data.get('question_type', 'text'),
                    options=q_data.get('options', []),
                    placeholder=q_data.get('placeholder', ''),
                    helper_text=q_data.get('helper_text', ''),
                    is_required=q_data.get('is_required', False),
                    order=q_data.get('order', i + 1),
                )

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
    benefits = serializers.ListField(child=serializers.DictField(), required=False)
    interview_stages = serializers.ListField(
        child=serializers.DictField(),
        required=False,
    )
    questions = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True,
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
            'questions',
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

    def validate_questions(self, value):
        """Validate questions structure."""
        for i, q in enumerate(value):
            if 'question_text' not in q or not q['question_text']:
                raise serializers.ValidationError(f'Question {i+1} must have text.')
            question_type = q.get('question_type', 'text')
            if question_type in ['select', 'multi_select']:
                if 'options' not in q or not q['options']:
                    raise serializers.ValidationError(
                        f'Question {i+1} requires options for select/multi-select type.'
                    )
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
        """Handle M2M fields and questions separately."""
        required_skill_ids = validated_data.pop('required_skill_ids', None)
        nice_to_have_skill_ids = validated_data.pop('nice_to_have_skill_ids', None)
        technology_ids = validated_data.pop('technology_ids', None)
        questions_data = validated_data.pop('questions', None)

        instance = super().update(instance, validated_data)

        if required_skill_ids is not None:
            instance.required_skills.set(required_skill_ids)
        if nice_to_have_skill_ids is not None:
            instance.nice_to_have_skills.set(nice_to_have_skill_ids)
        if technology_ids is not None:
            instance.technologies.set(technology_ids)

        if questions_data is not None:
            instance.questions.all().delete()
            for i, q_data in enumerate(questions_data):
                ApplicationQuestion.objects.create(
                    job=instance,
                    question_text=q_data.get('question_text', ''),
                    question_type=q_data.get('question_type', 'text'),
                    options=q_data.get('options', []),
                    placeholder=q_data.get('placeholder', ''),
                    helper_text=q_data.get('helper_text', ''),
                    is_required=q_data.get('is_required', False),
                    order=q_data.get('order', i + 1),
                )

        return instance


class JobStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating job status (publish/close/etc)."""
    status = serializers.ChoiceField(choices=JobStatus.choices)
