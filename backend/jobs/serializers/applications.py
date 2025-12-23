from rest_framework import serializers
from django.contrib.auth import get_user_model

from ..models import (
    Job, JobStatus,
    Application, ApplicationStatus, RejectionReason,
    ApplicationQuestion, ApplicationAnswer,
    StageInstanceStatus, ApplicationStageInstance,
    InterviewStageTemplate,
    ReplacementRequest,
)
from scheduling.models import BookingToken
from companies.serializers import CompanyListSerializer
from candidates.serializers import CandidateProfileSerializer
from candidates.models import CandidateProfile
from authentication.serializers import UserProfileSerializer
from .jobs import JobListSerializer

User = get_user_model()


class ApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for application list view (minimal data)."""
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_slug = serializers.CharField(source='job.slug', read_only=True)
    company_name = serializers.CharField(source='job.company.name', read_only=True)
    company_logo = serializers.SerializerMethodField()
    current_stage_order = serializers.IntegerField(read_only=True)
    current_stage_name = serializers.CharField(read_only=True)
    current_stage_id = serializers.UUIDField(source='current_stage.id', read_only=True, allow_null=True)
    candidate_name = serializers.CharField(source='candidate.full_name', read_only=True)
    candidate_email = serializers.CharField(source='candidate.email', read_only=True)
    current_stage_instance = serializers.SerializerMethodField()
    assigned_recruiters = serializers.SerializerMethodField()

    def get_company_logo(self, obj):
        """Safely get company logo URL."""
        if obj.job.company and obj.job.company.logo:
            return obj.job.company.logo.url
        return None

    def get_assigned_recruiters(self, obj):
        """Return assigned recruiters for this application."""
        recruiters = obj.assigned_recruiters.all()
        return [
            {
                'id': r.id,
                'email': r.email,
                'first_name': r.first_name,
                'last_name': r.last_name,
                'full_name': r.full_name,
            }
            for r in recruiters
        ]

    def get_current_stage_instance(self, obj):
        """Return the current stage instance with scheduling info."""
        from django.utils import timezone

        # Only return for IN_PROGRESS applications with a current stage
        if obj.status != ApplicationStatus.IN_PROGRESS or not obj.current_stage:
            return None

        # Find the stage instance for current stage
        instance = ApplicationStageInstance.objects.filter(
            application=obj,
            stage_template=obj.current_stage
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
            'current_stage',
            'current_stage_id',
            'current_stage_order',
            'current_stage_name',
            'current_stage_instance',
            'assigned_recruiters',
            'source',
            'applied_at',
            'shortlisted_at',
            'last_status_change',
            'rejection_reason',
        ]
        read_only_fields = ['id', 'applied_at', 'shortlisted_at', 'last_status_change']


class EmbeddedReplacementRequestSerializer(serializers.ModelSerializer):
    """Simplified serializer for embedding replacement request in application."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reason_category_display = serializers.CharField(source='get_reason_category_display', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    original_offer_details = serializers.SerializerMethodField()
    original_start_date = serializers.SerializerMethodField()
    original_invoiced_amount = serializers.SerializerMethodField()

    class Meta:
        model = ReplacementRequest
        fields = [
            'id',
            'reason_category',
            'reason_category_display',
            'reason_details',
            'status',
            'status_display',
            'discount_percentage',
            'requested_by_name',
            'requested_at',
            'reviewed_by_name',
            'reviewed_at',
            'review_notes',
            'original_offer_details',
            'original_start_date',
            'original_invoiced_amount',
        ]
        read_only_fields = fields

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.email
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None

    def get_original_offer_details(self, obj):
        """Get the original offer details from the application."""
        base = obj.application.offer_details or {}
        final = obj.application.final_offer_details or {}
        merged = {**base}
        for key, value in final.items():
            if value is not None and value != '' and value != []:
                merged[key] = value
        return merged if merged else None

    def get_original_start_date(self, obj):
        """Get the start date from offer details."""
        final = obj.application.final_offer_details or {}
        start_date = final.get('start_date')
        if not start_date:
            offer = obj.application.offer_details or {}
            start_date = offer.get('start_date')
        return start_date

    def get_original_invoiced_amount(self, obj):
        """Get the invoiced amount (ex VAT) for the original placement."""
        from subscriptions.models import Invoice, InvoiceType, InvoiceStatus
        invoice = Invoice.objects.filter(
            placement=obj.application,
            invoice_type=InvoiceType.PLACEMENT,
        ).exclude(
            status=InvoiceStatus.CANCELLED
        ).first()
        if invoice:
            return float(invoice.subtotal)
        return None


class ApplicationSerializer(serializers.ModelSerializer):
    """Full application serializer with job interview stages."""
    job = JobListSerializer(read_only=True)
    candidate = CandidateProfileSerializer(read_only=True)
    referrer = UserProfileSerializer(read_only=True)
    current_stage_order = serializers.IntegerField(read_only=True)
    current_stage_name = serializers.CharField(read_only=True)
    current_stage_id = serializers.UUIDField(source='current_stage.id', read_only=True, allow_null=True)
    interview_stages = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()
    answers = serializers.SerializerMethodField()
    # Replacement fields
    is_replacement = serializers.BooleanField(read_only=True)
    replacement_request = serializers.SerializerMethodField()

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
            'current_stage',
            'current_stage_id',
            'current_stage_order',
            'current_stage_name',
            'stage_notes',
            'interview_stages',
            'questions',
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
            # Stage-specific feedback
            'applied_feedback',
            'applied_score',
            'shortlisted_feedback',
            'shortlisted_score',
            # Replacement fields
            'is_replacement',
            'replacement_request',
        ]
        read_only_fields = ['id', 'applied_at', 'shortlisted_at', 'last_status_change']

    def get_replacement_request(self, obj):
        """Return the replacement request if one exists."""
        try:
            request = obj.replacement_request
            return EmbeddedReplacementRequestSerializer(request).data
        except ReplacementRequest.DoesNotExist:
            return None

    def get_interview_stages(self, obj):
        """Return the job's interview stages from InterviewStageTemplate model."""
        templates = InterviewStageTemplate.objects.filter(job=obj.job).order_by('order')
        return [
            {
                'order': t.order,
                'name': t.name,
                'stage_type': t.stage_type,
                'duration_minutes': t.default_duration_minutes,
            }
            for t in templates
        ]

    def get_questions(self, obj):
        """Return the job's application questions."""
        questions = ApplicationQuestion.objects.filter(job=obj.job).order_by('order')
        return [
            {
                'id': str(q.id),
                'question_text': q.question_text,
                'question_type': q.question_type,
                'options': q.options,
                'placeholder': q.placeholder,
                'helper_text': q.helper_text,
                'is_required': q.is_required,
                'order': q.order,
            }
            for q in questions
        ]

    def get_answers(self, obj):
        """Return the application's answers."""
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


class BenefitSerializer(serializers.Serializer):
    """Serializer for individual benefit with annual cost."""
    name = serializers.CharField(max_length=200)
    annual_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class EquitySerializer(serializers.Serializer):
    """Serializer for equity details."""
    vesting_years = serializers.IntegerField(min_value=1, max_value=10)
    shares = serializers.IntegerField(min_value=0)
    share_value = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class OfferDetailsSerializer(serializers.Serializer):
    """Serializer for offer details when making an offer."""
    annual_salary = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, min_value=0
    )
    currency = serializers.ChoiceField(
        choices=[('ZAR', 'ZAR'), ('USD', 'USD'), ('EUR', 'EUR'), ('GBP', 'GBP')],
        required=False,
        default='ZAR'
    )
    start_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    benefits = BenefitSerializer(many=True, required=False, default=list)
    equity = EquitySerializer(required=False, allow_null=True)

    def to_representation(self, instance):
        """Add computed fields to output."""
        data = super().to_representation(instance)

        # Calculate total benefits cost
        benefits = data.get('benefits') or []
        total_benefits_cost = sum(
            float(b.get('annual_cost', 0) or 0) for b in benefits
        )
        data['total_benefits_cost'] = total_benefits_cost

        # Calculate year 1 equity value
        equity = data.get('equity')
        if equity and equity.get('shares') and equity.get('share_value') and equity.get('vesting_years'):
            total_equity_value = float(equity['shares']) * float(equity['share_value'])
            year_1_equity_value = total_equity_value / float(equity['vesting_years'])
        else:
            year_1_equity_value = 0
        data['year_1_equity_value'] = year_1_equity_value

        # Calculate total cost to company
        annual_salary = float(data.get('annual_salary') or 0)
        data['total_cost_to_company'] = annual_salary + total_benefits_cost + year_1_equity_value

        return data


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
    current_stage_order = serializers.IntegerField(read_only=True)
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
            'current_stage',
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
        """Return the job's interview stages from InterviewStageTemplate model."""
        templates = InterviewStageTemplate.objects.filter(job=obj.job).order_by('order')
        return [
            {
                'order': t.order,
                'name': t.name,
                'stage_type': t.stage_type,
                'duration_minutes': t.default_duration_minutes,
            }
            for t in templates
        ]

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
