from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils import timezone
import uuid


class JobStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'
    CLOSED = 'closed', 'Closed'
    FILLED = 'filled', 'Filled'
    ARCHIVED = 'archived', 'Archived'


class JobType(models.TextChoices):
    FULL_TIME = 'full_time', 'Full-time'
    PART_TIME = 'part_time', 'Part-time'
    CONTRACT = 'contract', 'Contract'
    FREELANCE = 'freelance', 'Freelance'


class WorkMode(models.TextChoices):
    REMOTE = 'remote', 'Remote'
    HYBRID = 'hybrid', 'Hybrid'
    ONSITE = 'onsite', 'On-site'


class Department(models.TextChoices):
    ENGINEERING = 'engineering', 'Engineering'
    MARKETING = 'marketing', 'Marketing'
    SALES = 'sales', 'Sales'
    OPERATIONS = 'operations', 'Operations'
    DESIGN = 'design', 'Design'
    PRODUCT = 'product', 'Product'
    HR = 'hr', 'Human Resources'
    FINANCE = 'finance', 'Finance'
    DATA = 'data', 'Data & Analytics'
    LEGAL = 'legal', 'Legal'
    CUSTOMER_SUCCESS = 'customer_success', 'Customer Success'
    OTHER = 'other', 'Other'


class Job(models.Model):
    """
    Job posting by a company.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relations
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='jobs',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='jobs_created',
    )
    assigned_recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jobs_assigned',
    )

    # Basic Info
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, unique=True, blank=True)
    seniority = models.CharField(
        max_length=20,
        choices=[
            ('intern', 'Intern'),
            ('junior', 'Junior'),
            ('mid', 'Mid-Level'),
            ('senior', 'Senior'),
            ('lead', 'Lead'),
            ('principal', 'Principal'),
            ('executive', 'Executive'),
        ],
        blank=True,
    )
    job_type = models.CharField(
        max_length=20,
        choices=JobType.choices,
        default=JobType.FULL_TIME,
    )
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.DRAFT,
    )
    department = models.CharField(
        max_length=20,
        choices=Department.choices,
        blank=True,
    )

    # Content
    summary = models.TextField(
        blank=True,
        help_text='Brief summary for job listings (2-3 sentences)',
    )
    description = models.TextField(
        blank=True,
        help_text='Full job description',
    )
    requirements = models.TextField(
        blank=True,
        help_text='Required qualifications and experience',
    )
    nice_to_haves = models.TextField(
        blank=True,
        help_text='Nice-to-have qualifications',
    )
    responsibilities = models.TextField(
        blank=True,
        help_text='Key responsibilities and duties',
    )

    # Location
    location_city = models.ForeignKey(
        'companies.City',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jobs',
    )
    location_country = models.ForeignKey(
        'companies.Country',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jobs',
    )
    work_mode = models.CharField(
        max_length=20,
        choices=WorkMode.choices,
        blank=True,
    )
    remote_regions = models.JSONField(
        default=list,
        blank=True,
        help_text='Regions where remote work is accepted',
    )

    # Compensation
    salary_min = models.PositiveIntegerField(null=True, blank=True)
    salary_max = models.PositiveIntegerField(null=True, blank=True)
    salary_currency = models.CharField(
        max_length=3,
        choices=[
            ('ZAR', 'South African Rand'),
            ('USD', 'US Dollar'),
            ('EUR', 'Euro'),
            ('GBP', 'British Pound'),
        ],
        default='ZAR',
    )
    salary_visible = models.BooleanField(
        default=True,
        help_text='Show salary on public job listing',
    )
    equity_offered = models.BooleanField(default=False)

    # Benefits
    benefits = models.JSONField(
        default=list,
        blank=True,
        help_text='Structured benefits: [{"category": "Health", "items": ["Medical aid"]}]',
    )

    # Interview Pipeline
    interview_stages = models.JSONField(
        default=list,
        blank=True,
        help_text='Interview stages: [{"name": "Phone Screen", "order": 1, "description": "..."}]',
    )

    # Skills & Tech
    required_skills = models.ManyToManyField(
        'candidates.Skill',
        related_name='jobs_required',
        blank=True,
    )
    nice_to_have_skills = models.ManyToManyField(
        'candidates.Skill',
        related_name='jobs_nice_to_have',
        blank=True,
    )
    technologies = models.ManyToManyField(
        'candidates.Technology',
        related_name='jobs',
        blank=True,
    )

    # Statistics
    views_count = models.PositiveIntegerField(default=0)
    applications_count = models.PositiveIntegerField(default=0)

    # Dates
    published_at = models.DateTimeField(null=True, blank=True)
    application_deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'jobs'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(f"{self.company.name}-{self.title}")[:200]
            if not base_slug:
                base_slug = 'job'
            slug = base_slug
            counter = 1
            while Job.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} at {self.company.name}"

    def publish(self):
        """Publish the job listing."""
        self.status = JobStatus.PUBLISHED
        self.published_at = timezone.now()
        self.save()

    def close(self):
        """Close the job listing."""
        self.status = JobStatus.CLOSED
        self.save()

    def increment_views(self):
        """Increment the views count."""
        self.views_count += 1
        self.save(update_fields=['views_count'])

    @property
    def is_published(self):
        return self.status == JobStatus.PUBLISHED

    @property
    def is_open(self):
        return self.status in [JobStatus.PUBLISHED]

    @property
    def location_display(self):
        """Returns formatted location string."""
        parts = []
        if self.location_city:
            parts.append(self.location_city.name)
        if self.location_country:
            parts.append(self.location_country.name)
        return ', '.join(parts) if parts else 'Remote'

    @property
    def salary_display(self):
        """Returns formatted salary string."""
        if not self.salary_min and not self.salary_max:
            return None
        if self.salary_min and self.salary_max:
            return f"{self.salary_currency} {self.salary_min:,} - {self.salary_max:,}"
        if self.salary_min:
            return f"{self.salary_currency} {self.salary_min:,}+"
        return f"Up to {self.salary_currency} {self.salary_max:,}"


class ApplicationStatus(models.TextChoices):
    APPLIED = 'applied', 'Applied'
    SHORTLISTED = 'shortlisted', 'Shortlisted'
    IN_PROGRESS = 'in_progress', 'In Progress'
    OFFER_MADE = 'offer_made', 'Offer Made'
    OFFER_ACCEPTED = 'offer_accepted', 'Offer Accepted'
    REJECTED = 'rejected', 'Rejected'


class RejectionReason(models.TextChoices):
    INTERNAL_REJECTION = 'internal_rejection', 'Internal Rejection'
    CLIENT_REJECTION = 'client_rejection', 'Client Rejection'
    WITHDRAWN = 'withdrawn', 'Withdrawn'
    INVALID_SHORTLIST = 'invalid_shortlist', 'Invalid Shortlist'
    CANDIDATE_NOT_INTERESTED = 'candidate_not_interested', 'Candidate Not Interested'


class ApplicationSource(models.TextChoices):
    DIRECT = 'direct', 'Direct'
    REFERRAL = 'referral', 'Referral'
    RECRUITER = 'recruiter', 'Recruiter'


class Application(models.Model):
    """
    Job application from a candidate.
    Tracks the candidate's progress through the job's interview stages.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relations
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='applications',
    )
    candidate = models.ForeignKey(
        'candidates.CandidateProfile',
        on_delete=models.CASCADE,
        related_name='applications',
    )
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrals',
    )

    # Application Content
    covering_statement = models.TextField(
        blank=True,
        help_text='Cover letter or statement from the candidate',
    )
    resume_url = models.FileField(
        upload_to='applications/resumes/',
        null=True,
        blank=True,
        help_text='Resume uploaded with this application (or uses profile resume)',
    )

    # Status & Stage Tracking
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.APPLIED,
    )
    current_stage_order = models.PositiveIntegerField(
        default=0,
        help_text='0=applied, 1+=corresponds to job.interview_stages[].order',
    )
    stage_notes = models.JSONField(
        default=dict,
        blank=True,
        help_text='Notes per stage: {"1": {"notes": "...", "updated_at": "..."}}',
    )

    # Metadata
    source = models.CharField(
        max_length=20,
        choices=ApplicationSource.choices,
        default=ApplicationSource.DIRECT,
    )

    # Offer Details
    offer_details = models.JSONField(
        default=dict,
        blank=True,
        help_text='Offer details: {"salary": 50000, "currency": "ZAR", "start_date": "2024-01-15", "notes": "..."}',
    )
    offer_made_at = models.DateTimeField(null=True, blank=True)
    offer_accepted_at = models.DateTimeField(null=True, blank=True)
    final_offer_details = models.JSONField(
        default=dict,
        blank=True,
        help_text='Final confirmed offer details after acceptance',
    )

    # Rejection Details
    rejection_reason = models.CharField(
        max_length=30,
        choices=RejectionReason.choices,
        blank=True,
        help_text='Structured rejection reason',
    )
    rejection_feedback = models.TextField(
        blank=True,
        help_text='Custom feedback/notes for the rejection',
    )
    rejected_at = models.DateTimeField(null=True, blank=True)

    # Internal Notes
    feedback = models.TextField(
        blank=True,
        help_text='Internal notes about the application',
    )

    # Dates
    applied_at = models.DateTimeField(auto_now_add=True)
    shortlisted_at = models.DateTimeField(null=True, blank=True)
    last_status_change = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'applications'
        ordering = ['-applied_at']
        unique_together = ['job', 'candidate']

    def __str__(self):
        return f"{self.candidate.user.get_full_name()} - {self.job.title}"

    def shortlist(self):
        """Move application to shortlisted status."""
        self.status = ApplicationStatus.SHORTLISTED
        self.shortlisted_at = timezone.now()
        # Clear rejection fields when shortlisting
        self.rejection_reason = ''
        self.rejection_feedback = ''
        self.rejected_at = None
        self.save()

    def reject(self, reason='', feedback=''):
        """Reject the application."""
        self.status = ApplicationStatus.REJECTED
        self.rejection_reason = reason
        self.rejection_feedback = feedback
        self.rejected_at = timezone.now()
        self.save()

    def make_offer(self, offer_details=None):
        """Make an offer to the candidate."""
        self.status = ApplicationStatus.OFFER_MADE
        self.offer_details = offer_details or {}
        self.offer_made_at = timezone.now()
        self.save()

    def accept_offer(self, final_details=None):
        """Confirm offer acceptance with final details."""
        self.status = ApplicationStatus.OFFER_ACCEPTED
        self.final_offer_details = final_details or self.offer_details
        self.offer_accepted_at = timezone.now()
        self.save()

    @property
    def current_stage_name(self):
        """Get the name of the current interview stage."""
        if self.current_stage_order == 0:
            return 'Applied'
        job_stages = self.job.interview_stages or []
        for stage in job_stages:
            if stage.get('order') == self.current_stage_order:
                return stage.get('name', f'Stage {self.current_stage_order}')
        return f'Stage {self.current_stage_order}'


class ActivityType(models.TextChoices):
    """Types of activities that can be logged for an application."""
    APPLIED = 'applied', 'Applied'
    SHORTLISTED = 'shortlisted', 'Shortlisted'
    STAGE_CHANGED = 'stage_changed', 'Stage Changed'
    OFFER_MADE = 'offer_made', 'Offer Made'
    OFFER_UPDATED = 'offer_updated', 'Offer Updated'
    OFFER_ACCEPTED = 'offer_accepted', 'Offer Accepted'
    REJECTED = 'rejected', 'Rejected'
    WITHDRAWN = 'withdrawn', 'Withdrawn'
    APPLICATION_VIEWED = 'application_viewed', 'Application Viewed'
    # Booking/Scheduling activities
    BOOKING_LINK_SENT = 'booking_link_sent', 'Booking Link Sent'
    INTERVIEW_BOOKED = 'interview_booked', 'Interview Booked'
    INTERVIEW_SCHEDULED = 'interview_scheduled', 'Interview Scheduled'
    INTERVIEW_RESCHEDULED = 'interview_rescheduled', 'Interview Rescheduled'
    INTERVIEW_CANCELLED = 'interview_cancelled', 'Interview Cancelled'


class ActivityLog(models.Model):
    """
    Audit log for application activities.
    Tracks all state changes and user interactions with full attribution.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core relations
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='activity_logs',
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='application_activities',
        help_text='User who performed this action',
    )

    # Activity details
    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices,
    )

    # State tracking (for stage/status changes)
    previous_status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        blank=True,
    )
    new_status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        blank=True,
    )
    previous_stage = models.PositiveIntegerField(null=True, blank=True)
    new_stage = models.PositiveIntegerField(null=True, blank=True)
    stage_name = models.CharField(max_length=100, blank=True)

    # Additional metadata (for offer changes, rejection reasons, etc.)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context: offer_details, rejection_reason, etc.',
    )

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'application_activity_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['application', '-created_at']),
            models.Index(fields=['activity_type']),
        ]

    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.application}"

    @property
    def performer_name(self):
        """Return the name of the user who performed the action."""
        if self.performed_by:
            return self.performed_by.full_name or self.performed_by.email
        return 'System'


class ActivityNote(models.Model):
    """
    Threaded notes attached to activity log entries.
    Allows multiple comments per activity.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    activity = models.ForeignKey(
        ActivityLog,
        on_delete=models.CASCADE,
        related_name='notes',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_notes',
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application_activity_notes'
        ordering = ['created_at']

    def __str__(self):
        author_name = self.author.full_name if self.author else 'Unknown'
        return f"Note by {author_name} on {self.activity}"


# ============================================================================
# Application Questions & Stages (Phase 7)
# ============================================================================

class QuestionType(models.TextChoices):
    TEXT = 'text', 'Short Text'
    TEXTAREA = 'textarea', 'Long Text'
    SELECT = 'select', 'Single Select'
    MULTI_SELECT = 'multi_select', 'Multi Select'
    FILE = 'file', 'File Upload'
    EXTERNAL_LINK = 'external_link', 'External Link'


class ApplicationQuestion(models.Model):
    """
    Custom application questions defined by a company for a specific job.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='questions',
    )

    question_text = models.CharField(max_length=500)
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.TEXT,
    )
    options = models.JSONField(
        default=list,
        blank=True,
        help_text='Options for select/multi_select types: ["Option 1", "Option 2"]',
    )
    placeholder = models.CharField(
        max_length=200,
        blank=True,
        help_text='Placeholder text for text/textarea inputs',
    )
    helper_text = models.CharField(
        max_length=300,
        blank=True,
        help_text='Help text shown below the question',
    )
    is_required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application_questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.question_text[:50]} ({self.job.title})"


class ApplicationAnswer(models.Model):
    """
    Candidate's answer to an application question.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    question = models.ForeignKey(
        ApplicationQuestion,
        on_delete=models.CASCADE,
        related_name='answers',
    )

    answer_text = models.TextField(
        blank=True,
        help_text='Text answer or JSON array for multi_select',
    )
    answer_file = models.FileField(
        upload_to='applications/answers/',
        null=True,
        blank=True,
        help_text='File upload for file type questions',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application_answers'
        unique_together = ['application', 'question']

    def __str__(self):
        return f"Answer to '{self.question.question_text[:30]}'"


class ApplicationStage(models.Model):
    """
    Custom pipeline stages for a job's application process.
    Replaces the JSON-based interview_stages field for better querying.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='stages',
    )

    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    is_default = models.BooleanField(
        default=False,
        help_text='Default stages that come pre-populated',
    )
    color = models.CharField(
        max_length=7,
        default='#6B7280',
        help_text='Hex color code for UI display',
    )
    description = models.TextField(
        blank=True,
        help_text='Description of what happens at this stage',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application_stages'
        ordering = ['order']
        unique_together = ['job', 'order']

    def __str__(self):
        return f"{self.name} (Stage {self.order}) - {self.job.title}"


# ============================================================================
# Question Templates (Company-level reusable question sets)
# ============================================================================

class QuestionTemplate(models.Model):
    """
    Company-level question template that can be reused across jobs.
    Contains a set of questions that can be applied to new job postings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='question_templates',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='question_templates_created',
    )

    name = models.CharField(
        max_length=100,
        help_text='Template name (e.g., "Engineering Questions", "Sales Assessment")',
    )
    description = models.TextField(
        blank=True,
        help_text='Description of when to use this template',
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'question_templates'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class TemplateQuestion(models.Model):
    """
    A question that belongs to a QuestionTemplate.
    When a template is applied to a job, these become ApplicationQuestions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    template = models.ForeignKey(
        QuestionTemplate,
        on_delete=models.CASCADE,
        related_name='questions',
    )

    question_text = models.CharField(max_length=500)
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.TEXT,
    )
    options = models.JSONField(
        default=list,
        blank=True,
        help_text='Options for select/multi_select types: ["Option 1", "Option 2"]',
    )
    placeholder = models.CharField(
        max_length=200,
        blank=True,
        help_text='Placeholder text for text/textarea inputs',
    )
    helper_text = models.CharField(
        max_length=300,
        blank=True,
        help_text='Help text shown below the question',
    )
    is_required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'template_questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.question_text[:50]} ({self.template.name})"


# ============================================================================
# Interview Stage Types & Templates (Phase 8 - Refined Stages System)
# ============================================================================

class StageType(models.TextChoices):
    """
    Predefined interview stage types with specific requirements.
    """
    APPLICATION_SCREEN = 'application_screen', 'Application Screen'
    PHONE_SCREENING = 'phone_screening', 'Phone Screening'
    VIDEO_CALL = 'video_call', 'Video Call Interview'
    IN_PERSON_INTERVIEW = 'in_person_interview', 'In-Person Interview'
    TAKE_HOME_ASSESSMENT = 'take_home_assessment', 'Take-Home Assessment'
    IN_PERSON_ASSESSMENT = 'in_person_assessment', 'In-Person Assessment'
    CUSTOM = 'custom', 'Custom'


# Default stage names and durations by type
STAGE_TYPE_DEFAULTS = {
    StageType.APPLICATION_SCREEN: {'name': 'Application Screen', 'duration': None},
    StageType.PHONE_SCREENING: {'name': 'Phone Screening', 'duration': 30},
    StageType.VIDEO_CALL: {'name': 'Video Call Interview', 'duration': 45},
    StageType.IN_PERSON_INTERVIEW: {'name': 'In-Person Interview', 'duration': 60},
    StageType.TAKE_HOME_ASSESSMENT: {'name': 'Take-Home Assessment', 'duration': None},
    StageType.IN_PERSON_ASSESSMENT: {'name': 'In-Person Assessment', 'duration': 90},
    StageType.CUSTOM: {'name': 'Custom Stage', 'duration': 60},
}


class InterviewStageTemplate(models.Model):
    """
    Defines a stage in a job's interview pipeline.
    Replaces the JSON-based interview_stages field with a typed model.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='stage_templates',
    )

    # Stage definition
    stage_type = models.CharField(
        max_length=30,
        choices=StageType.choices,
        default=StageType.CUSTOM,
    )
    name = models.CharField(
        max_length=100,
        help_text='Stage name (auto-filled from type or custom)',
    )
    order = models.PositiveIntegerField(
        help_text='Position in the interview pipeline (1-indexed)',
    )
    description = models.TextField(
        blank=True,
        help_text='Description of what happens at this stage',
    )

    # Scheduling defaults (for interview types)
    default_duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Default interview duration in minutes',
    )
    default_interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_interview_stages',
        help_text='Default interviewer for this stage',
    )

    # Assessment configuration (for assessment types)
    assessment_instructions = models.TextField(
        blank=True,
        help_text='Instructions for the candidate (Markdown supported)',
    )
    assessment_instructions_file = models.FileField(
        upload_to='stage_instructions/',
        null=True,
        blank=True,
        help_text='PDF or document with detailed instructions',
    )
    assessment_external_url = models.URLField(
        blank=True,
        help_text='External assessment URL (e.g., Codility, HackerRank)',
    )
    assessment_provider_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Assessment provider name (e.g., "Codility", "HackerRank")',
    )
    deadline_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Days from assignment to deadline for assessments',
    )

    # Location configuration (for in-person types)
    use_company_address = models.BooleanField(
        default=True,
        help_text='Use company office address by default',
    )
    custom_location = models.CharField(
        max_length=500,
        blank=True,
        help_text='Custom location if not using company address',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interview_stage_templates'
        ordering = ['order']
        unique_together = ['job', 'order']

    def __str__(self):
        return f"{self.name} (Stage {self.order}) - {self.job.title}"

    def save(self, *args, **kwargs):
        # Auto-fill name and duration from stage type defaults if not set
        if not self.name and self.stage_type in STAGE_TYPE_DEFAULTS:
            self.name = STAGE_TYPE_DEFAULTS[self.stage_type]['name']
        if self.default_duration_minutes is None and self.stage_type in STAGE_TYPE_DEFAULTS:
            self.default_duration_minutes = STAGE_TYPE_DEFAULTS[self.stage_type]['duration']
        super().save(*args, **kwargs)

    @property
    def requires_scheduling(self):
        """Returns True if this stage type requires scheduling."""
        return self.stage_type in [
            StageType.PHONE_SCREENING,
            StageType.VIDEO_CALL,
            StageType.IN_PERSON_INTERVIEW,
            StageType.IN_PERSON_ASSESSMENT,
        ]

    @property
    def requires_location(self):
        """Returns True if this stage type requires a location."""
        return self.stage_type in [
            StageType.IN_PERSON_INTERVIEW,
            StageType.IN_PERSON_ASSESSMENT,
        ]

    @property
    def is_assessment(self):
        """Returns True if this is an assessment stage."""
        return self.stage_type in [
            StageType.TAKE_HOME_ASSESSMENT,
            StageType.IN_PERSON_ASSESSMENT,
        ]


class StageInstanceStatus(models.TextChoices):
    """Status of a candidate's progress through a specific stage."""
    NOT_STARTED = 'not_started', 'Not Started'
    SCHEDULED = 'scheduled', 'Scheduled'
    IN_PROGRESS = 'in_progress', 'In Progress'
    AWAITING_SUBMISSION = 'awaiting_submission', 'Awaiting Submission'
    SUBMITTED = 'submitted', 'Submitted'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    NO_SHOW = 'no_show', 'No Show'


class ApplicationStageInstance(models.Model):
    """
    Instance of a stage for a specific candidate/application.
    Tracks scheduling details, submission info, and status.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='stage_instances',
    )
    stage_template = models.ForeignKey(
        InterviewStageTemplate,
        on_delete=models.CASCADE,
        related_name='instances',
    )

    # Status
    status = models.CharField(
        max_length=30,
        choices=StageInstanceStatus.choices,
        default=StageInstanceStatus.NOT_STARTED,
    )

    # Scheduling fields (for interview types)
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Scheduled date and time for the interview',
    )
    duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Actual duration (may differ from template default)',
    )
    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interviews_assigned',
        help_text='Primary interviewer',
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='interview_participations',
        help_text='Additional participants (besides the primary interviewer)',
    )

    # Meeting details
    meeting_link = models.URLField(
        blank=True,
        help_text='Video meeting link (Zoom, Teams, Google Meet, etc.)',
    )
    location = models.CharField(
        max_length=500,
        blank=True,
        help_text='Physical location for in-person interviews',
    )
    meeting_notes = models.TextField(
        blank=True,
        help_text='Additional meeting notes visible to candidate',
    )

    # Calendar integration
    google_calendar_event_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Google Calendar event ID for syncing',
    )
    microsoft_calendar_event_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Microsoft 365 Calendar event ID for syncing',
    )
    calendar_invite_sent = models.BooleanField(
        default=False,
        help_text='Whether calendar invite was sent to participants',
    )

    # Assessment submission (for take-home types)
    deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Deadline for assessment submission',
    )
    submission_url = models.URLField(
        blank=True,
        help_text='External submission link or completed assessment URL',
    )
    submission_file = models.FileField(
        upload_to='assessment_submissions/',
        null=True,
        blank=True,
        help_text='Uploaded submission file',
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the candidate submitted their work',
    )

    # Recruiter notes (internal)
    recruiter_notes = models.TextField(
        blank=True,
        help_text='Internal notes for recruiters (not visible to candidate)',
    )

    # Feedback/scoring (after stage completion)
    feedback = models.TextField(
        blank=True,
        help_text='Interviewer feedback after the stage',
    )
    score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text='Score or rating (1-5 scale)',
    )
    recommendation = models.CharField(
        max_length=20,
        choices=[
            ('strong_yes', 'Strong Yes'),
            ('yes', 'Yes'),
            ('maybe', 'Maybe'),
            ('no', 'No'),
            ('strong_no', 'Strong No'),
        ],
        blank=True,
        help_text='Interviewer recommendation',
    )

    # Notification tracking
    notification_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When initial notification was sent',
    )
    reminder_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When reminder notification was sent',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the stage was marked as completed',
    )

    class Meta:
        db_table = 'application_stage_instances'
        ordering = ['stage_template__order']
        unique_together = ['application', 'stage_template']

    def __str__(self):
        return f"{self.application.candidate} - {self.stage_template.name}"

    def schedule(self, scheduled_at, interviewer=None, duration_minutes=None, meeting_link='', location=''):
        """Schedule the stage instance."""
        self.scheduled_at = scheduled_at
        self.interviewer = interviewer or self.stage_template.default_interviewer
        self.duration_minutes = duration_minutes or self.stage_template.default_duration_minutes
        self.meeting_link = meeting_link
        self.location = location or (
            self.stage_template.custom_location if not self.stage_template.use_company_address else ''
        )
        self.status = StageInstanceStatus.SCHEDULED
        self.save()

    def complete(self, feedback='', score=None, recommendation=''):
        """Mark the stage as completed."""
        self.status = StageInstanceStatus.COMPLETED
        self.feedback = feedback
        self.score = score
        self.recommendation = recommendation
        self.completed_at = timezone.now()
        self.save()

    def cancel(self):
        """Cancel the scheduled stage."""
        self.status = StageInstanceStatus.CANCELLED
        self.save()

    @property
    def is_overdue(self):
        """Check if assessment deadline has passed."""
        if self.deadline and self.status == StageInstanceStatus.AWAITING_SUBMISSION:
            return timezone.now() > self.deadline
        return False


# ============================================================================
# Calendar Integration
# ============================================================================

class CalendarProvider(models.TextChoices):
    """Supported calendar providers for OAuth integration."""
    GOOGLE = 'google', 'Google Calendar'
    MICROSOFT = 'microsoft', 'Microsoft 365'


class UserCalendarConnection(models.Model):
    """
    OAuth connection to a user's calendar.
    Stores tokens securely for calendar event management.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_connections',
    )

    provider = models.CharField(
        max_length=20,
        choices=CalendarProvider.choices,
    )

    # OAuth tokens (should be encrypted in production)
    access_token = models.TextField(
        help_text='OAuth access token (encrypted)',
    )
    refresh_token = models.TextField(
        blank=True,
        help_text='OAuth refresh token (encrypted)',
    )
    token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the access token expires',
    )

    # User info from provider
    provider_user_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='User ID from the calendar provider',
    )
    provider_email = models.EmailField(
        blank=True,
        help_text='Email associated with the calendar account',
    )

    # Settings
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this connection is active',
    )
    calendar_id = models.CharField(
        max_length=255,
        default='primary',
        help_text='Which calendar to use (primary or specific calendar ID)',
    )
    calendar_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Display name of the selected calendar',
    )

    # Booking availability settings
    booking_days_ahead = models.PositiveIntegerField(
        default=14,
        help_text='How many days in advance bookings are allowed',
    )
    business_hours_start = models.PositiveSmallIntegerField(
        default=9,
        help_text='Start hour for availability (0-23)',
    )
    business_hours_end = models.PositiveSmallIntegerField(
        default=18,
        help_text='End hour for availability (0-23)',
    )
    min_notice_hours = models.PositiveIntegerField(
        default=24,
        help_text='Minimum hours notice required before booking',
    )
    buffer_minutes = models.PositiveIntegerField(
        default=0,
        help_text='Buffer time between meetings in minutes',
    )
    # Days available: comma-separated day numbers (0=Monday, 6=Sunday)
    available_days = models.CharField(
        max_length=20,
        default='0,1,2,3,4',  # Monday to Friday
        help_text='Available days (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)',
    )
    timezone = models.CharField(
        max_length=50,
        default='Africa/Johannesburg',
        help_text='Timezone for availability display',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_calendar_connections'
        unique_together = ['user', 'provider']

    def __str__(self):
        return f"{self.user.email} - {self.get_provider_display()}"

    @property
    def is_token_expired(self):
        """Check if the access token has expired."""
        if self.token_expires_at:
            return timezone.now() >= self.token_expires_at
        return True


# ============================================================================
# Notifications
# ============================================================================

class NotificationType(models.TextChoices):
    """Types of notifications that can be sent."""
    # Stage/Interview notifications
    STAGE_SCHEDULED = 'stage_scheduled', 'Interview Scheduled'
    STAGE_REMINDER = 'stage_reminder', 'Interview Reminder'
    STAGE_RESCHEDULED = 'stage_rescheduled', 'Interview Rescheduled'
    STAGE_CANCELLED = 'stage_cancelled', 'Interview Cancelled'
    # Assessment notifications
    ASSESSMENT_ASSIGNED = 'assessment_assigned', 'Assessment Assigned'
    ASSESSMENT_REMINDER = 'assessment_reminder', 'Assessment Deadline Reminder'
    SUBMISSION_RECEIVED = 'submission_received', 'Submission Received'
    # Application notifications
    APPLICATION_RECEIVED = 'application_received', 'Application Received'
    APPLICATION_SHORTLISTED = 'application_shortlisted', 'Application Shortlisted'
    APPLICATION_REJECTED = 'application_rejected', 'Application Rejected'
    OFFER_RECEIVED = 'offer_received', 'Offer Received'


class NotificationChannel(models.TextChoices):
    """Channels through which notifications can be sent."""
    EMAIL = 'email', 'Email'
    IN_APP = 'in_app', 'In-App'
    BOTH = 'both', 'Email & In-App'


class Notification(models.Model):
    """
    Notification record for users.
    Supports both email and in-app notifications.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
    )
    channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.choices,
        default=NotificationChannel.BOTH,
    )

    # Related objects (optional)
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    stage_instance = models.ForeignKey(
        ApplicationStageInstance,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )

    # Content
    title = models.CharField(max_length=200)
    body = models.TextField()
    action_url = models.URLField(
        blank=True,
        help_text='URL to navigate to when notification is clicked',
    )

    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Email tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_error = models.TextField(
        blank=True,
        help_text='Error message if email sending failed',
    )

    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['recipient', '-sent_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.get_notification_type_display()} for {self.recipient.email}"

    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


# ============================================================================
# Booking Tokens (Calendly-like self-scheduling)
# ============================================================================

class BookingToken(models.Model):
    """
    Token for candidate self-booking (like Calendly public links).
    Allows candidates to select a time slot from interviewer's availability.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    stage_instance = models.OneToOneField(
        ApplicationStageInstance,
        on_delete=models.CASCADE,
        related_name='booking_token',
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        help_text='Secure random token for booking URL',
    )
    expires_at = models.DateTimeField(
        help_text='Token expiration time (default: 7 days from creation)',
    )

    is_used = models.BooleanField(
        default=False,
        help_text='Whether the token has been used to book',
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the candidate completed the booking',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'booking_tokens'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Booking token for {self.stage_instance}"

    @property
    def is_valid(self):
        """Check if token is still valid (not used and not expired)."""
        return not self.is_used and timezone.now() < self.expires_at

    def mark_as_used(self):
        """Mark the token as used."""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])
