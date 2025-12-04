from rest_framework import serializers
from .models import (
    Job, JobStatus, JobType, WorkMode, Department,
    Application, ApplicationStatus, ApplicationSource, RejectionReason,
    ActivityLog, ActivityNote, ActivityType,
    ApplicationQuestion, ApplicationAnswer, QuestionType,
    QuestionTemplate, TemplateQuestion,
)
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
        from .serializers import ApplicationQuestionSerializer
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
    # Benefits is a JSONField, so use ListField for write operations
    benefits = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    # Interview stages configuration
    interview_stages = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )
    # Application questions
    questions = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        write_only=True,
    )
    # Template ID to apply questions from
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
            from .models import QuestionTemplate
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
                pass  # Template not found, skip

        # Create questions from direct input (overrides template if both provided)
        if questions_data:
            # Clear any template-created questions first
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
    # Benefits is a JSONField, so use ListField for write operations
    benefits = serializers.ListField(child=serializers.DictField(), required=False)
    # Interview stages configuration
    interview_stages = serializers.ListField(
        child=serializers.DictField(),
        required=False,
    )
    # Application questions
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

        # Update questions if provided
        if questions_data is not None:
            # Delete existing questions
            instance.questions.all().delete()

            # Create new questions
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
    answers = serializers.SerializerMethodField()

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
            'answers',
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

    def get_answers(self, obj):
        """Return the application's answers."""
        from .models import ApplicationAnswer
        answers = ApplicationAnswer.objects.filter(application=obj).select_related('question')
        result = []
        for answer in answers:
            result.append({
                'id': str(answer.id),
                'question': {
                    'id': str(answer.question.id),
                    'question_text': answer.question.question_text,
                    'question_type': answer.question.question_type,
                    'options': answer.question.options,
                    'is_required': answer.question.is_required,
                    'order': answer.question.order,
                },
                'answer_text': answer.answer_text,
                'answer_file': answer.answer_file.url if answer.answer_file else None,
                'created_at': answer.created_at.isoformat(),
            })
        return result


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new application."""
    job_id = serializers.UUIDField(write_only=True)
    answers = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        write_only=True,
    )

    class Meta:
        model = Application
        fields = [
            'job_id',
            'covering_statement',
            'resume_url',
            'answers',
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
        """Validate candidate hasn't already applied and validate answers."""
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

        # Validate answers against job questions
        job = Job.objects.get(id=job_id)
        answers_data = data.get('answers', [])
        questions = {str(q.id): q for q in job.questions.all()}

        # Check required questions are answered
        for q_id, question in questions.items():
            if question.is_required:
                answer = next((a for a in answers_data if str(a.get('question_id')) == q_id), None)
                if not answer:
                    raise serializers.ValidationError(
                        f'Required question "{question.question_text[:50]}..." must be answered.'
                    )
                # Check if answer has content
                if not answer.get('answer_text') and not answer.get('answer_file'):
                    raise serializers.ValidationError(
                        f'Required question "{question.question_text[:50]}..." must be answered.'
                    )

        data['candidate'] = candidate
        data['job'] = job
        return data

    def create(self, validated_data):
        """Create the application with answers."""
        job_id = validated_data.pop('job_id')
        job = validated_data.pop('job')
        answers_data = validated_data.pop('answers', [])

        application = Application.objects.create(
            job=job,
            **validated_data
        )

        # Create answers
        questions = {str(q.id): q for q in job.questions.all()}
        for answer_data in answers_data:
            question_id = str(answer_data.get('question_id'))
            if question_id in questions:
                ApplicationAnswer.objects.create(
                    application=application,
                    question=questions[question_id],
                    answer_text=answer_data.get('answer_text', ''),
                    answer_file=answer_data.get('answer_file'),
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


# ==================== Activity Log Serializers ====================


class ActivityNoteSerializer(serializers.ModelSerializer):
    """Serializer for activity notes (threaded comments)."""
    author_name = serializers.SerializerMethodField()
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ActivityNote
        fields = [
            'id',
            'author',
            'author_name',
            'author_email',
            'author_avatar',
            'content',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        """Get the author's full name."""
        if obj.author:
            return obj.author.full_name or obj.author.email
        return 'Unknown'

    def get_author_avatar(self, obj):
        """Get the author's avatar URL."""
        if obj.author and hasattr(obj.author, 'avatar') and obj.author.avatar:
            return obj.author.avatar.url
        return None


class ActivityNoteCreateSerializer(serializers.Serializer):
    """Serializer for creating a note on an activity."""
    content = serializers.CharField(required=True, min_length=1)


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for activity log entries with nested notes."""
    performed_by_name = serializers.SerializerMethodField()
    performed_by_email = serializers.EmailField(source='performed_by.email', read_only=True)
    performed_by_avatar = serializers.SerializerMethodField()
    notes = ActivityNoteSerializer(many=True, read_only=True)
    notes_count = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'application',
            'performed_by',
            'performed_by_name',
            'performed_by_email',
            'performed_by_avatar',
            'activity_type',
            'previous_status',
            'new_status',
            'previous_stage',
            'new_stage',
            'stage_name',
            'metadata',
            'created_at',
            'notes',
            'notes_count',
        ]
        read_only_fields = fields

    def get_performed_by_name(self, obj):
        """Get the performer's full name."""
        if obj.performed_by:
            return obj.performed_by.full_name or obj.performed_by.email
        return 'System'

    def get_performed_by_avatar(self, obj):
        """Get the performer's avatar URL."""
        if obj.performed_by and hasattr(obj.performed_by, 'avatar') and obj.performed_by.avatar:
            return obj.performed_by.avatar.url
        return None

    def get_notes_count(self, obj):
        """Get the count of notes on this activity."""
        return obj.notes.count()


# ==================== Application Questions Serializers ====================


class ApplicationQuestionSerializer(serializers.ModelSerializer):
    """Serializer for application questions."""

    class Meta:
        model = ApplicationQuestion
        fields = [
            'id',
            'job',
            'question_text',
            'question_type',
            'options',
            'placeholder',
            'helper_text',
            'is_required',
            'order',
        ]
        read_only_fields = ['id', 'job']


class ApplicationQuestionCreateSerializer(serializers.Serializer):
    """Serializer for creating questions when creating/updating a job."""
    question_text = serializers.CharField(max_length=500)
    question_type = serializers.ChoiceField(choices=QuestionType.choices, default=QuestionType.TEXT)
    options = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    placeholder = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    helper_text = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    is_required = serializers.BooleanField(default=False)
    order = serializers.IntegerField(default=0)

    def validate(self, data):
        """Validate that select types have options."""
        question_type = data.get('question_type')
        options = data.get('options', [])
        if question_type in [QuestionType.SELECT, QuestionType.MULTI_SELECT] and not options:
            raise serializers.ValidationError({
                'options': 'Options are required for select/multi-select questions.'
            })
        return data


class ApplicationAnswerSerializer(serializers.ModelSerializer):
    """Serializer for application answers (read)."""
    question = ApplicationQuestionSerializer(read_only=True)

    class Meta:
        model = ApplicationAnswer
        fields = [
            'id',
            'application',
            'question',
            'answer_text',
            'answer_file',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'application', 'created_at', 'updated_at']


class ApplicationAnswerCreateSerializer(serializers.Serializer):
    """Serializer for submitting answers when applying."""
    question_id = serializers.UUIDField()
    answer_text = serializers.CharField(required=False, allow_blank=True, default='')
    answer_file = serializers.FileField(required=False, allow_null=True)

    def validate_answer_file(self, value):
        """Validate file type and size."""
        if value:
            # Max 25MB
            max_size = 25 * 1024 * 1024
            if value.size > max_size:
                raise serializers.ValidationError('File size must be less than 25MB.')

            # Allowed extensions
            allowed_extensions = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'zip']
            ext = value.name.split('.')[-1].lower() if '.' in value.name else ''
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f'File type not allowed. Allowed types: {", ".join(allowed_extensions)}'
                )
        return value


# ==================== Question Templates Serializers ====================


class TemplateQuestionSerializer(serializers.ModelSerializer):
    """Serializer for template questions."""

    class Meta:
        model = TemplateQuestion
        fields = [
            'id',
            'template',
            'question_text',
            'question_type',
            'options',
            'placeholder',
            'helper_text',
            'is_required',
            'order',
        ]
        read_only_fields = ['id', 'template']


class TemplateQuestionCreateSerializer(serializers.Serializer):
    """Serializer for creating/updating template questions."""
    id = serializers.UUIDField(required=False)  # For updates
    question_text = serializers.CharField(max_length=500)
    question_type = serializers.ChoiceField(choices=QuestionType.choices, default=QuestionType.TEXT)
    options = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    placeholder = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    helper_text = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    is_required = serializers.BooleanField(default=False)
    order = serializers.IntegerField(default=0)

    def validate(self, data):
        """Validate that select types have options."""
        question_type = data.get('question_type')
        options = data.get('options', [])
        if question_type in [QuestionType.SELECT, QuestionType.MULTI_SELECT] and not options:
            raise serializers.ValidationError({
                'options': 'Options are required for select/multi-select questions.'
            })
        return data


class QuestionTemplateListSerializer(serializers.ModelSerializer):
    """Serializer for listing question templates."""
    questions_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuestionTemplate
        fields = [
            'id',
            'company',
            'name',
            'description',
            'is_active',
            'questions_count',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_by', 'created_at', 'updated_at']

    def get_questions_count(self, obj):
        return obj.questions.count()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.email
        return None


class QuestionTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for question template detail (with questions)."""
    questions = TemplateQuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuestionTemplate
        fields = [
            'id',
            'company',
            'name',
            'description',
            'is_active',
            'questions',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.email
        return None


class QuestionTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a question template."""
    questions = TemplateQuestionCreateSerializer(many=True, required=False, default=list)

    class Meta:
        model = QuestionTemplate
        fields = [
            'name',
            'description',
            'is_active',
            'questions',
        ]

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        template = QuestionTemplate.objects.create(**validated_data)

        for i, question_data in enumerate(questions_data):
            question_data.pop('id', None)  # Remove id if present
            if 'order' not in question_data or question_data['order'] == 0:
                question_data['order'] = i + 1
            TemplateQuestion.objects.create(template=template, **question_data)

        return template


class QuestionTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a question template."""
    questions = TemplateQuestionCreateSerializer(many=True, required=False)

    class Meta:
        model = QuestionTemplate
        fields = [
            'name',
            'description',
            'is_active',
            'questions',
        ]

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)

        # Update template fields
        instance = super().update(instance, validated_data)

        # Update questions if provided
        if questions_data is not None:
            # Delete existing questions
            instance.questions.all().delete()

            # Create new questions
            for i, question_data in enumerate(questions_data):
                question_data.pop('id', None)  # Remove id if present
                if 'order' not in question_data or question_data['order'] == 0:
                    question_data['order'] = i + 1
                TemplateQuestion.objects.create(template=instance, **question_data)

        return instance
