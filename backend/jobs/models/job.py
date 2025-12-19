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
    assigned_recruiters = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='jobs_assigned',
        help_text='Recruiters and admins assigned to manage this job',
    )
    assigned_client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jobs_as_client',
        help_text='Client user assigned to this job for notifications',
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
            ('executive', 'Executive / C-Suite'),
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

    # Hiring
    positions_to_fill = models.PositiveIntegerField(
        default=1,
        help_text='Number of positions to fill for this job',
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

    @property
    def is_csuite(self):
        """Check if this is a C-Suite/Executive level position."""
        return self.seniority == 'executive'

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

    @property
    def hired_count(self):
        """Returns count of hired candidates (OFFER_ACCEPTED applications)."""
        from .application import ApplicationStatus
        return self.applications.filter(status=ApplicationStatus.OFFER_ACCEPTED).count()

    @property
    def is_fully_filled(self):
        """Returns True if hired count has reached positions_to_fill."""
        return self.hired_count >= self.positions_to_fill

    @property
    def remaining_positions(self):
        """Returns the number of positions still to be filled."""
        return max(0, self.positions_to_fill - self.hired_count)

    def update_fill_status(self):
        """
        Update job status based on hired count vs positions_to_fill.
        - Marks as FILLED if hired_count >= positions_to_fill and job is PUBLISHED
        - Marks as PUBLISHED if positions_to_fill increased and job was FILLED but now has open spots
        Returns True if status changed, False otherwise.
        """
        if self.is_fully_filled:
            if self.status == JobStatus.PUBLISHED:
                self.status = JobStatus.FILLED
                self.save(update_fields=['status'])
                return True
        else:
            if self.status == JobStatus.FILLED:
                self.status = JobStatus.PUBLISHED
                self.save(update_fields=['status'])
                return True
        return False
