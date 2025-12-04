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
