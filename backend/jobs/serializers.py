from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Job, JobStatus, JobType, WorkMode, Department,
    Application, ApplicationStatus, ApplicationSource, RejectionReason,
    ActivityLog, ActivityNote, ActivityType,
    ApplicationQuestion, ApplicationAnswer, QuestionType,
    QuestionTemplate, TemplateQuestion,
    # Interview Stage System
    StageType, InterviewStageTemplate, StageInstanceStatus, ApplicationStageInstance,
    CalendarProvider, UserCalendarConnection,
    NotificationType, NotificationChannel, Notification,
    BookingToken,
)
from companies.serializers import CompanyListSerializer, CountrySerializer, CitySerializer, BenefitCategorySerializer
from companies.models import Country, City
from candidates.serializers import SkillSerializer, TechnologySerializer, CandidateProfileSerializer
from candidates.models import Skill, Technology, CandidateProfile
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
    current_stage_instance = serializers.SerializerMethodField()

    def get_company_logo(self, obj):
        """Safely get company logo URL."""
        if obj.job.company and obj.job.company.logo:
            return obj.job.company.logo.url
        return None

    def get_current_stage_instance(self, obj):
        """Return the current stage instance with scheduling info."""
        from django.utils import timezone

        # Only return for IN_PROGRESS applications
        if obj.status != ApplicationStatus.IN_PROGRESS or obj.current_stage_order < 1:
            return None

        # Find the stage instance for current stage
        instance = ApplicationStageInstance.objects.filter(
            application=obj,
            stage_template__order=obj.current_stage_order
        ).select_related('stage_template', 'interviewer').first()

        if not instance:
            return None

        # Check for booking token (including used ones for history)
        booking_token = None
        booking = BookingToken.objects.filter(
            stage_instance=instance,
        ).order_by('-created_at').first()
        if booking:
            booking_token = {
                'token': booking.token,
                'booking_url': f"/book/{booking.token}",
                'created_at': booking.created_at.isoformat(),
                'expires_at': booking.expires_at.isoformat(),
                'is_used': booking.is_used,
                'used_at': booking.used_at.isoformat() if booking.used_at else None,
                'is_valid': not booking.is_used and booking.expires_at > timezone.now(),
            }

        # Assessment info
        is_assessment = instance.stage_template.is_assessment
        assessment_info = None
        if is_assessment:
            assessment_info = {
                'deadline': instance.deadline.isoformat() if instance.deadline else None,
                'deadline_passed': instance.is_deadline_passed if hasattr(instance, 'is_deadline_passed') else False,
                'submission_url': instance.submission_url,
                'submitted_at': instance.submitted_at.isoformat() if instance.submitted_at else None,
                'instructions': instance.meeting_notes,  # Instructions stored in meeting_notes
            }

        # Feedback/score for completed stages
        feedback_info = None
        if instance.status == StageInstanceStatus.COMPLETED:
            feedback_info = {
                'feedback': instance.feedback,
                'score': instance.score,
                'recommendation': instance.recommendation,
                'completed_at': instance.completed_at.isoformat() if instance.completed_at else None,
            }

        return {
            'id': str(instance.id),
            'stage_name': instance.stage_template.name,
            'stage_type': instance.stage_template.stage_type,
            'status': instance.status,
            'scheduled_at': instance.scheduled_at.isoformat() if instance.scheduled_at else None,
            'duration_minutes': instance.duration_minutes,
            'meeting_link': instance.meeting_link,
            'location': instance.location,
            'interviewer_id': str(instance.interviewer.id) if instance.interviewer else None,
            'interviewer_name': instance.interviewer.full_name if instance.interviewer else None,
            'booking_token': booking_token,
            'is_assessment': is_assessment,
            'assessment': assessment_info,
            'feedback': feedback_info,
        }

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
            'current_stage_instance',
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
    pending_booking = serializers.SerializerMethodField()
    next_interview = serializers.SerializerMethodField()
    pending_assessment = serializers.SerializerMethodField()

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
            'pending_booking',
            'next_interview',
            'pending_assessment',
        ]
        read_only_fields = fields

    def get_interview_stages(self, obj):
        """Return the job's interview stages."""
        return obj.job.interview_stages or []

    def get_pending_booking(self, obj):
        """Return the pending booking link for this application, if any."""
        from django.utils import timezone

        # Find a valid, unused booking token for this application
        booking = BookingToken.objects.filter(
            stage_instance__application=obj,
            is_used=False,
            expires_at__gt=timezone.now()
        ).select_related('stage_instance__stage_template').first()

        if booking:
            return {
                'booking_url': f"/book/{booking.token}",
                'stage_name': booking.stage_instance.stage_template.name,
                'expires_at': booking.expires_at.isoformat(),
            }
        return None

    def get_next_interview(self, obj):
        """Return the next scheduled interview for this application."""
        from django.utils import timezone

        # Find the next scheduled interview
        instance = ApplicationStageInstance.objects.filter(
            application=obj,
            status=StageInstanceStatus.SCHEDULED,
            scheduled_at__gte=timezone.now()
        ).select_related('stage_template', 'interviewer').order_by('scheduled_at').first()

        if instance:
            return {
                'stage_name': instance.stage_template.name,
                'scheduled_at': instance.scheduled_at.isoformat(),
                'duration_minutes': instance.duration_minutes,
                'meeting_link': instance.meeting_link or None,
                'location': instance.location or None,
                'interviewer_name': instance.interviewer.full_name if instance.interviewer else None,
            }
        return None

    def get_pending_assessment(self, obj):
        """Return pending assessment that needs candidate submission."""
        from django.utils import timezone

        # Find an assessment stage awaiting submission
        instance = ApplicationStageInstance.objects.filter(
            application=obj,
            status=StageInstanceStatus.AWAITING_SUBMISSION
        ).select_related('stage_template').first()

        if instance:
            deadline_passed = False
            if instance.deadline:
                deadline_passed = instance.deadline < timezone.now()

            return {
                'instance_id': str(instance.id),
                'stage_name': instance.stage_template.name,
                'deadline': instance.deadline.isoformat() if instance.deadline else None,
                'deadline_passed': deadline_passed,
                'instructions': instance.meeting_notes or None,
                'external_url': instance.meeting_link or None,
            }
        return None


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


# ==================== Interview Stage System Serializers ====================


class InterviewStageTemplateSerializer(serializers.ModelSerializer):
    """Serializer for reading interview stage templates."""
    stage_type_display = serializers.CharField(source='get_stage_type_display', read_only=True)
    default_interviewer_id = serializers.PrimaryKeyRelatedField(
        source='default_interviewer',
        read_only=True,
    )
    default_interviewer_name = serializers.SerializerMethodField()
    requires_scheduling = serializers.BooleanField(read_only=True)
    requires_location = serializers.BooleanField(read_only=True)
    is_assessment = serializers.BooleanField(read_only=True)

    class Meta:
        model = InterviewStageTemplate
        fields = [
            'id',
            'job',
            'stage_type',
            'stage_type_display',
            'name',
            'order',
            'description',
            'default_duration_minutes',
            'default_interviewer',
            'default_interviewer_id',
            'default_interviewer_name',
            'assessment_instructions',
            'assessment_instructions_file',
            'assessment_external_url',
            'assessment_provider_name',
            'deadline_days',
            'use_company_address',
            'custom_location',
            'requires_scheduling',
            'requires_location',
            'is_assessment',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'job', 'created_at', 'updated_at']

    def get_default_interviewer_name(self, obj):
        if obj.default_interviewer:
            return obj.default_interviewer.full_name or obj.default_interviewer.email
        return None


class InterviewStageTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating interview stage templates."""
    # Accept default_interviewer_id from frontend and map to default_interviewer
    default_interviewer_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='default_interviewer',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = InterviewStageTemplate
        fields = [
            'stage_type',
            'name',
            'order',
            'description',
            'default_duration_minutes',
            'default_interviewer',
            'default_interviewer_id',
            'assessment_instructions',
            'assessment_instructions_file',
            'assessment_external_url',
            'assessment_provider_name',
            'deadline_days',
            'use_company_address',
            'custom_location',
        ]
        extra_kwargs = {
            'default_interviewer': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        """Validate based on stage type requirements."""
        stage_type = data.get('stage_type', StageType.CUSTOM)

        # Validate duration for scheduling types
        requires_scheduling = stage_type in [
            StageType.PHONE_SCREENING,
            StageType.VIDEO_CALL,
            StageType.IN_PERSON_INTERVIEW,
            StageType.IN_PERSON_ASSESSMENT,
        ]
        if requires_scheduling and not data.get('default_duration_minutes'):
            # Will be auto-filled by model.save()
            pass

        # Validate deadline for take-home assessments
        if stage_type == StageType.TAKE_HOME_ASSESSMENT:
            if not data.get('deadline_days') and not data.get('assessment_external_url'):
                # Either deadline_days or external_url should be provided
                pass  # Not strictly required, can be set per instance

        return data


class InterviewStageTemplateBulkSerializer(serializers.Serializer):
    """Serializer for bulk creating/updating stage templates for a job."""
    stages = InterviewStageTemplateCreateSerializer(many=True)

    def validate_stages(self, value):
        """Validate stage orders are unique and sequential."""
        orders = [s.get('order', 0) for s in value]
        if len(orders) != len(set(orders)):
            raise serializers.ValidationError('Stage orders must be unique.')
        return value


class BookingTokenSerializer(serializers.ModelSerializer):
    """Serializer for booking tokens (candidate self-scheduling links)."""
    is_valid = serializers.BooleanField(read_only=True)
    booking_url = serializers.SerializerMethodField()

    class Meta:
        model = BookingToken
        fields = [
            'id',
            'token',
            'expires_at',
            'is_used',
            'used_at',
            'is_valid',
            'booking_url',
            'created_at',
        ]
        read_only_fields = fields

    def get_booking_url(self, obj):
        """Generate the full booking URL for this token."""
        request = self.context.get('request')
        if request:
            # Use the frontend URL pattern for booking
            base_url = request.build_absolute_uri('/').rstrip('/')
            # Assuming frontend is on same domain or we use a relative path
            return f"/booking/{obj.token}"
        return f"/booking/{obj.token}"


class ApplicationStageInstanceSerializer(serializers.ModelSerializer):
    """Serializer for reading application stage instances."""
    stage_template = InterviewStageTemplateSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    interviewer_name = serializers.SerializerMethodField()
    interviewer_email = serializers.SerializerMethodField()
    participants_list = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    booking_token = BookingTokenSerializer(read_only=True)

    class Meta:
        model = ApplicationStageInstance
        fields = [
            'id',
            'application',
            'stage_template',
            'status',
            'status_display',
            'scheduled_at',
            'duration_minutes',
            'interviewer',
            'interviewer_name',
            'interviewer_email',
            'participants',
            'participants_list',
            'meeting_link',
            'location',
            'meeting_notes',
            'google_calendar_event_id',
            'microsoft_calendar_event_id',
            'calendar_invite_sent',
            'deadline',
            'submission_url',
            'submission_file',
            'submitted_at',
            'recruiter_notes',
            'feedback',
            'score',
            'recommendation',
            'notification_sent_at',
            'reminder_sent_at',
            'is_overdue',
            'booking_token',
            'created_at',
            'updated_at',
            'completed_at',
        ]
        read_only_fields = [
            'id', 'application', 'created_at', 'updated_at', 'completed_at',
            'notification_sent_at', 'reminder_sent_at',
        ]

    def get_interviewer_name(self, obj):
        if obj.interviewer:
            return obj.interviewer.full_name or obj.interviewer.email
        return None

    def get_interviewer_email(self, obj):
        if obj.interviewer:
            return obj.interviewer.email
        return None

    def get_participants_list(self, obj):
        """Return list of participant details."""
        return [
            {
                'id': str(p.id),
                'full_name': p.full_name or p.email,
                'email': p.email,
            }
            for p in obj.participants.all()
        ]


class ScheduleStageSerializer(serializers.Serializer):
    """Serializer for scheduling an interview stage."""
    scheduled_at = serializers.DateTimeField(required=True)
    duration_minutes = serializers.IntegerField(required=False, min_value=15, max_value=480)
    interviewer_id = serializers.UUIDField(required=False, allow_null=True)
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        help_text='Additional participant user IDs',
    )
    meeting_link = serializers.URLField(required=False, allow_blank=True, default='')
    location = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    meeting_notes = serializers.CharField(required=False, allow_blank=True, default='')
    send_notification = serializers.BooleanField(default=True)
    create_calendar_event = serializers.BooleanField(default=True)

    def validate_scheduled_at(self, value):
        """Ensure scheduled time is in the future."""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError('Scheduled time must be in the future.')
        return value


class RescheduleStageSerializer(serializers.Serializer):
    """Serializer for rescheduling an interview."""
    scheduled_at = serializers.DateTimeField(required=True)
    duration_minutes = serializers.IntegerField(required=False, min_value=15, max_value=480)
    interviewer_id = serializers.UUIDField(required=False, allow_null=True)
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text='Additional participant user IDs (replaces existing participants)',
    )
    meeting_link = serializers.URLField(required=False, allow_blank=True)
    location = serializers.CharField(max_length=500, required=False, allow_blank=True)
    meeting_notes = serializers.CharField(required=False, allow_blank=True)
    reschedule_reason = serializers.CharField(required=False, allow_blank=True, default='')
    send_notification = serializers.BooleanField(default=True)
    update_calendar_event = serializers.BooleanField(default=True)


class AssignAssessmentSerializer(serializers.Serializer):
    """Serializer for assigning a take-home assessment."""
    deadline = serializers.DateTimeField(required=True)
    instructions = serializers.CharField(required=False, allow_blank=True, default='')
    external_url = serializers.URLField(required=False, allow_blank=True, default='')
    send_notification = serializers.BooleanField(default=True)

    def validate_deadline(self, value):
        """Ensure deadline is in the future."""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError('Deadline must be in the future.')
        return value


class SubmitAssessmentSerializer(serializers.Serializer):
    """Serializer for candidate submitting an assessment."""
    submission_url = serializers.URLField(required=False, allow_blank=True, default='')
    submission_file = serializers.FileField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        """Ensure at least one submission method is provided."""
        if not data.get('submission_url') and not data.get('submission_file'):
            raise serializers.ValidationError(
                'Either a submission URL or file must be provided.'
            )
        return data

    def validate_submission_file(self, value):
        """Validate file type and size."""
        if value:
            max_size = 25 * 1024 * 1024  # 25MB
            if value.size > max_size:
                raise serializers.ValidationError('File size must be less than 25MB.')

            allowed_extensions = ['pdf', 'doc', 'docx', 'zip', 'tar', 'gz', 'txt', 'md']
            ext = value.name.split('.')[-1].lower() if '.' in value.name else ''
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f'File type not allowed. Allowed: {", ".join(allowed_extensions)}'
                )
        return value


class CompleteStageSerializer(serializers.Serializer):
    """Serializer for completing a stage with feedback."""
    feedback = serializers.CharField(required=False, allow_blank=True, default='')
    score = serializers.IntegerField(required=False, min_value=1, max_value=5, allow_null=True)
    recommendation = serializers.ChoiceField(
        choices=[
            ('strong_yes', 'Strong Yes'),
            ('yes', 'Yes'),
            ('maybe', 'Maybe'),
            ('no', 'No'),
            ('strong_no', 'Strong No'),
        ],
        required=False,
        allow_blank=True,
    )


# ==================== Calendar Integration Serializers ====================


class UserCalendarConnectionSerializer(serializers.ModelSerializer):
    """Serializer for user calendar connections (read)."""
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    is_token_expired = serializers.BooleanField(read_only=True)
    available_days_list = serializers.SerializerMethodField()

    class Meta:
        model = UserCalendarConnection
        fields = [
            'id',
            'provider',
            'provider_display',
            'provider_email',
            'calendar_id',
            'calendar_name',
            'is_active',
            'is_token_expired',
            # Booking settings
            'booking_days_ahead',
            'business_hours_start',
            'business_hours_end',
            'min_notice_hours',
            'buffer_minutes',
            'available_days',
            'available_days_list',
            'timezone',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_available_days_list(self, obj):
        """Convert comma-separated days to list of integers."""
        if obj.available_days:
            return [int(d) for d in obj.available_days.split(',') if d.strip()]
        return []


class CalendarConnectionUpdateSerializer(serializers.Serializer):
    """Serializer for updating calendar connection settings."""
    calendar_id = serializers.CharField(required=False)
    calendar_name = serializers.CharField(required=False, allow_blank=True)
    booking_days_ahead = serializers.IntegerField(min_value=1, max_value=90, required=False)
    business_hours_start = serializers.IntegerField(min_value=0, max_value=23, required=False)
    business_hours_end = serializers.IntegerField(min_value=0, max_value=23, required=False)
    min_notice_hours = serializers.IntegerField(min_value=0, max_value=168, required=False)  # max 1 week
    buffer_minutes = serializers.IntegerField(min_value=0, max_value=60, required=False)
    available_days = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        required=False,
    )
    timezone = serializers.CharField(max_length=50, required=False)

    def validate(self, data):
        # Ensure business_hours_end > business_hours_start
        start = data.get('business_hours_start')
        end = data.get('business_hours_end')
        if start is not None and end is not None and end <= start:
            raise serializers.ValidationError({
                'business_hours_end': 'End hour must be after start hour'
            })
        return data


class CalendarConnectionCreateSerializer(serializers.Serializer):
    """Serializer for initiating calendar connection (OAuth)."""
    provider = serializers.ChoiceField(choices=CalendarProvider.choices)
    redirect_uri = serializers.URLField(required=False)


# ==================== Notification Serializers ====================


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'channel',
            'application',
            'stage_instance',
            'title',
            'body',
            'action_url',
            'is_read',
            'read_at',
            'email_sent',
            'email_sent_at',
            'sent_at',
        ]
        read_only_fields = fields


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification list."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'title',
            'body',
            'action_url',
            'is_read',
            'sent_at',
        ]
        read_only_fields = fields


class MarkNotificationReadSerializer(serializers.Serializer):
    """Serializer for marking notification(s) as read."""
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text='List of notification IDs to mark as read. If empty, marks all as read.'
    )
