from django.db import models
from django.conf import settings
from django.utils.text import slugify
import uuid


class CandidateActivityType(models.TextChoices):
    """Activity types specific to candidate-level events (not application-specific)."""
    PROFILE_UPDATED = 'profile_updated', 'Profile Updated'
    PROFILE_VIEWED = 'profile_viewed', 'Profile Viewed'
    JOB_VIEWED = 'job_viewed', 'Job Viewed'
    LOGGED_IN = 'logged_in', 'Logged In'
    RESUME_UPLOADED = 'resume_uploaded', 'Resume Uploaded'
    RESUME_PARSED = 'resume_parsed', 'Resume Parsed'
    EXPERIENCE_ADDED = 'experience_added', 'Experience Added'
    EXPERIENCE_UPDATED = 'experience_updated', 'Experience Updated'
    EDUCATION_ADDED = 'education_added', 'Education Added'
    EDUCATION_UPDATED = 'education_updated', 'Education Updated'


class Seniority(models.TextChoices):
    INTERN = 'intern', 'Intern'
    JUNIOR = 'junior', 'Junior'
    MID = 'mid', 'Mid-Level'
    SENIOR = 'senior', 'Senior'
    LEAD = 'lead', 'Lead'
    PRINCIPAL = 'principal', 'Principal'
    EXECUTIVE = 'executive', 'Executive'


class WorkPreference(models.TextChoices):
    REMOTE = 'remote', 'Remote'
    HYBRID = 'hybrid', 'Hybrid'
    ONSITE = 'onsite', 'On-site'
    FLEXIBLE = 'flexible', 'Flexible'


class Currency(models.TextChoices):
    ZAR = 'ZAR', 'South African Rand'
    USD = 'USD', 'US Dollar'
    EUR = 'EUR', 'Euro'
    GBP = 'GBP', 'British Pound'


class ProfileVisibility(models.TextChoices):
    PRIVATE = 'private', 'Private'
    PUBLIC_SANITISED = 'public_sanitised', 'Public (Sanitised)'


class SkillCategory(models.TextChoices):
    LEADERSHIP = 'leadership', 'Leadership & Management'
    COMMUNICATION = 'communication', 'Communication'
    PROJECT_MANAGEMENT = 'project_management', 'Project Management'
    ANALYTICAL = 'analytical', 'Analytical & Problem Solving'
    INTERPERSONAL = 'interpersonal', 'Interpersonal'
    BUSINESS = 'business', 'Business & Strategy'
    DOMAIN = 'domain', 'Domain Expertise'
    OTHER = 'other', 'Other'


class TechnologyCategory(models.TextChoices):
    LANGUAGE = 'language', 'Programming Languages'
    FRAMEWORK = 'framework', 'Frameworks & Libraries'
    DATABASE = 'database', 'Databases'
    CLOUD = 'cloud', 'Cloud & Infrastructure'
    DEVOPS = 'devops', 'DevOps & CI/CD'
    TOOL = 'tool', 'Development Tools'
    OTHER = 'other', 'Other'


class Skill(models.Model):
    """
    Skills that candidates can add to their profile.
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    category = models.CharField(
        max_length=20,
        choices=SkillCategory.choices,
        default=SkillCategory.OTHER,
    )
    is_active = models.BooleanField(default=True)
    needs_review = models.BooleanField(
        default=False,
        help_text='True if auto-imported from resume and needs admin review'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'skills'
        ordering = ['category', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            # Handle special characters like C#, C++
            name_for_slug = self.name.replace('#', '-sharp').replace('++', '-plus-plus').replace('.', '-')
            base_slug = slugify(name_for_slug)
            if not base_slug:
                base_slug = 'skill'
            slug = base_slug
            counter = 1
            while Skill.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Industry(models.Model):
    """
    Industries that candidates can associate with.
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'industries'
        verbose_name_plural = 'Industries'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Technology(models.Model):
    """
    Technologies and tools that candidates can associate with their experience.
    Distinct from Skills, which represent professional/soft skills.
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    category = models.CharField(
        max_length=20,
        choices=TechnologyCategory.choices,
        default=TechnologyCategory.OTHER,
    )
    is_active = models.BooleanField(default=True)
    needs_review = models.BooleanField(
        default=False,
        help_text='True if auto-imported from resume and needs admin review'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'technologies'
        ordering = ['category', 'name']
        verbose_name_plural = 'Technologies'

    def save(self, *args, **kwargs):
        if not self.slug:
            # Handle special characters like C#, C++, .NET
            name_for_slug = self.name.replace('#', '-sharp').replace('++', '-plus-plus').replace('.', '-')
            base_slug = slugify(name_for_slug)
            if not base_slug:
                base_slug = 'tech'
            slug = base_slug
            counter = 1
            while Technology.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CandidateProfile(models.Model):
    """
    Extended profile for candidate users with all professional details.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='candidate_profile',
    )
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    # Professional info
    professional_title = models.CharField(max_length=200, blank=True)
    headline = models.CharField(max_length=300, blank=True)
    seniority = models.CharField(
        max_length=20,
        choices=Seniority.choices,
        blank=True,
    )
    professional_summary = models.TextField(blank=True)
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)

    # Location (ForeignKey relationships)
    city_rel = models.ForeignKey(
        'companies.City',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidates',
    )
    country_rel = models.ForeignKey(
        'companies.Country',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidates',
    )
    # Legacy location fields (kept for backward compatibility)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)

    # Work preferences
    work_preference = models.CharField(
        max_length=20,
        choices=WorkPreference.choices,
        blank=True,
    )
    willing_to_relocate = models.BooleanField(default=False)
    preferred_locations = models.JSONField(default=list, blank=True)

    # Compensation
    salary_expectation_min = models.PositiveIntegerField(null=True, blank=True)
    salary_expectation_max = models.PositiveIntegerField(null=True, blank=True)
    salary_currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.ZAR,
    )
    notice_period_days = models.PositiveIntegerField(null=True, blank=True)

    # Portfolio & Resume
    portfolio_links = models.JSONField(default=list, blank=True)
    resume_url = models.FileField(
        upload_to='resumes/',
        blank=True,
        null=True,
    )

    # Industries (ManyToMany)
    industries = models.ManyToManyField(
        Industry,
        related_name='candidates',
        blank=True,
    )

    # Visibility & Completeness
    visibility = models.CharField(
        max_length=20,
        choices=ProfileVisibility.choices,
        default=ProfileVisibility.PUBLIC_SANITISED,
    )
    profile_completeness = models.PositiveIntegerField(default=0)

    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_profiles'
        verbose_name = 'Candidate Profile'
        verbose_name_plural = 'Candidate Profiles'

    def save(self, *args, **kwargs):
        if not self.slug:
            # Generate unique slug from user's name
            base_slug = slugify(f"{self.user.first_name}-{self.user.last_name}")
            slug = base_slug
            counter = 1
            while CandidateProfile.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        # Calculate profile completeness
        self.profile_completeness = self.calculate_completeness()
        super().save(*args, **kwargs)

    def calculate_completeness(self):
        """Calculate profile completeness as a percentage."""
        fields_to_check = [
            ('professional_title', 10),
            ('headline', 5),
            ('seniority', 10),
            ('professional_summary', 15),
            ('work_preference', 5),
            ('salary_expectation_min', 5),
            ('salary_expectation_max', 5),
            ('notice_period_days', 5),
            ('resume_url', 10),
        ]

        score = 0
        for field, weight in fields_to_check:
            value = getattr(self, field, None)
            if value:
                score += weight

        # Check location (FK or legacy fields) - 10% total (5% each for city and country)
        if self.city_rel or self.city:
            score += 5
        if self.country_rel or self.country:
            score += 5

        # Check experiences (5% for having work experience)
        if hasattr(self, 'pk') and self.pk:
            if self.experiences.exists():
                score += 5

        # Check industries (up to 5%)
        if hasattr(self, 'pk') and self.pk:
            industry_count = self.industries.count()
            if industry_count >= 2:
                score += 5
            elif industry_count > 0:
                score += industry_count * 2

        return min(score, 100)

    def __str__(self):
        return f"{self.user.full_name}'s Profile"

    @property
    def full_name(self):
        return self.user.full_name

    @property
    def email(self):
        return self.user.email

    @property
    def location(self):
        # Prefer FK relationships if available, fallback to legacy fields
        city_name = self.city_rel.name if self.city_rel else self.city
        country_name = self.country_rel.name if self.country_rel else self.country
        parts = [city_name, country_name]
        return ', '.join(filter(None, parts))

    @property
    def calculated_years_of_experience(self):
        """Calculate total years of experience from all experiences.
        Returns a formatted string like '3 years 6 months' or '8 months'.
        """
        if not hasattr(self, 'pk') or not self.pk:
            return None

        from datetime import date

        total_months = 0
        experiences = self.experiences.all()

        for exp in experiences:
            start = exp.start_date
            if exp.is_current:
                end = date.today()
            elif exp.end_date:
                end = exp.end_date
            else:
                end = date.today()

            # Calculate months between dates using standard library
            months = (end.year - start.year) * 12 + (end.month - start.month)
            total_months += max(0, months)

        if total_months == 0:
            return None

        years = total_months // 12
        remaining_months = total_months % 12

        # Format the result
        if years == 0:
            return f"{remaining_months} month{'s' if remaining_months != 1 else ''}"
        elif remaining_months == 0:
            return f"{years} year{'s' if years != 1 else ''}"
        else:
            return f"{years} year{'s' if years != 1 else ''} {remaining_months} month{'s' if remaining_months != 1 else ''}"


class CompanySize(models.TextChoices):
    SIZE_1_10 = '1-10', '1-10 employees'
    SIZE_11_50 = '11-50', '11-50 employees'
    SIZE_51_200 = '51-200', '51-200 employees'
    SIZE_201_500 = '201-500', '201-500 employees'
    SIZE_501_1000 = '501-1000', '501-1000 employees'
    SIZE_1000_PLUS = '1000+', '1000+ employees'


class Experience(models.Model):
    """
    Work experience entries for a candidate profile.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='experiences',
    )

    # Job details
    job_title = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200)
    company_size = models.CharField(
        max_length=20,
        choices=CompanySize.choices,
        blank=True,
    )
    industry = models.ForeignKey(
        Industry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='experiences',
    )

    # Dates
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)

    # Details
    description = models.TextField(blank=True)
    achievements = models.TextField(blank=True)
    technologies_used = models.JSONField(default=list, blank=True)  # Deprecated, kept for migration

    # Technologies & Skills (ManyToMany)
    technologies = models.ManyToManyField(
        Technology,
        related_name='experiences',
        blank=True,
    )
    skills = models.ManyToManyField(
        Skill,
        related_name='experiences',
        blank=True,
    )

    # Ordering
    order = models.PositiveIntegerField(default=0)

    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_experiences'
        ordering = ['order', '-start_date']

    def __str__(self):
        return f"{self.job_title} at {self.company_name}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({'end_date': 'End date must be after start date.'})
        if self.is_current and self.end_date:
            raise ValidationError({'end_date': 'Current positions should not have an end date.'})


class Education(models.Model):
    """
    Education entries for a candidate profile.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='education',
    )

    # Institution details
    institution = models.CharField(max_length=200)
    degree = models.CharField(max_length=200)
    field_of_study = models.CharField(max_length=200)

    # Dates
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)

    # Details
    grade = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)

    # Ordering
    order = models.PositiveIntegerField(default=0)

    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_education'
        ordering = ['order', '-start_date']
        verbose_name_plural = 'Education'

    def __str__(self):
        return f"{self.degree} in {self.field_of_study} at {self.institution}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({'end_date': 'End date must be after start date.'})
        if self.is_current and self.end_date:
            raise ValidationError({'end_date': 'Current education should not have an end date.'})


class CandidateActivity(models.Model):
    """
    Activity log for candidate-level events (not tied to specific applications).
    Tracks profile updates, job views, logins, resume uploads, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core relations
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='activities',
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidate_activities_performed',
        help_text='User who performed this action (may differ from candidate for admin actions)',
    )

    # Activity details
    activity_type = models.CharField(
        max_length=30,
        choices=CandidateActivityType.choices,
    )

    # Optional job reference (for job_viewed events)
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidate_views',
    )

    # Flexible metadata for additional context
    metadata = models.JSONField(default=dict, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'candidate_activities'
        ordering = ['-created_at']
        verbose_name = 'Candidate Activity'
        verbose_name_plural = 'Candidate Activities'
        indexes = [
            models.Index(fields=['candidate', '-created_at']),
            models.Index(fields=['activity_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.candidate.full_name} - {self.get_activity_type_display()}"

    @property
    def performer_name(self):
        """Get the name of who performed the action."""
        if self.performed_by:
            return self.performed_by.full_name or self.performed_by.email
        return 'System'


class CandidateActivityNote(models.Model):
    """
    Notes attached to candidate activity log entries.
    Allows recruiters/admins to add comments on any candidate activity.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    activity = models.ForeignKey(
        CandidateActivity,
        on_delete=models.CASCADE,
        related_name='notes',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidate_activity_notes',
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_activity_notes'
        ordering = ['created_at']

    def __str__(self):
        author_name = self.author.full_name if self.author else 'Unknown'
        return f"Note by {author_name} on {self.activity}"
