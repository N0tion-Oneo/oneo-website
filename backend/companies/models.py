from django.db import models
from django.conf import settings
from django.utils.text import slugify
import uuid

from automations.registry import automatable


class CompanySize(models.TextChoices):
    SIZE_1_10 = '1-10', '1-10 employees'
    SIZE_11_50 = '11-50', '11-50 employees'
    SIZE_51_200 = '51-200', '51-200 employees'
    SIZE_201_500 = '201-500', '201-500 employees'
    SIZE_501_1000 = '501-1000', '501-1000 employees'
    SIZE_1000_PLUS = '1000+', '1000+ employees'


class RemoteWorkPolicy(models.TextChoices):
    FULLY_REMOTE = 'fully_remote', 'Fully Remote'
    REMOTE_FIRST = 'remote_first', 'Remote First'
    HYBRID = 'hybrid', 'Hybrid'
    OFFICE_FIRST = 'office_first', 'Office First'
    OFFICE_ONLY = 'office_only', 'Office Only'


class FundingStage(models.TextChoices):
    BOOTSTRAPPED = 'bootstrapped', 'Bootstrapped'
    SEED = 'seed', 'Seed'
    SERIES_A = 'series_a', 'Series A'
    SERIES_B = 'series_b', 'Series B'
    SERIES_C = 'series_c', 'Series C'
    SERIES_D_PLUS = 'series_d_plus', 'Series D+'
    PUBLIC = 'public', 'Public'


class CompanyUserRole(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    EDITOR = 'editor', 'Editor'
    VIEWER = 'viewer', 'Viewer'


class ServiceType(models.TextChoices):
    HEADHUNTING = 'headhunting', 'Headhunting'
    RETAINED = 'retained', 'Retained'


class Country(models.Model):
    """Countries for company headquarters location."""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=3, unique=True)  # ISO 3166-1 alpha-2/3
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'countries'
        ordering = ['name']
        verbose_name_plural = 'Countries'

    def __str__(self):
        return self.name


class City(models.Model):
    """Cities for company headquarters location."""
    name = models.CharField(max_length=100)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='cities')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'cities'
        ordering = ['name']
        verbose_name_plural = 'Cities'
        unique_together = ['name', 'country']

    def __str__(self):
        return f"{self.name}, {self.country.name}"


@automatable(
    display_name='Company',
    events=['created', 'updated', 'deleted', 'stage_changed'],
    status_field='onboarding_stage',
)
class Company(models.Model):
    """
    Company profile for client users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Basic Info
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    tagline = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)

    # Details
    industry = models.ForeignKey(
        'candidates.Industry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='companies',
    )
    company_size = models.CharField(
        max_length=20,
        choices=CompanySize.choices,
        blank=True,
    )
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    funding_stage = models.CharField(
        max_length=20,
        choices=FundingStage.choices,
        blank=True,
    )

    # URLs
    website_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)

    # Location - using FK relationships for dropdowns
    headquarters_city = models.ForeignKey(
        City,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headquartered_companies',
    )
    headquarters_country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headquartered_companies',
    )
    locations = models.JSONField(
        default=list,
        blank=True,
        help_text='List of office locations: [{"city": "...", "country": "...", "is_headquarters": true}]',
    )

    # Culture
    culture_description = models.TextField(blank=True)
    values = models.JSONField(
        default=list,
        blank=True,
        help_text='List of company values',
    )
    benefits = models.JSONField(
        default=list,
        blank=True,
        help_text='Structured benefits: [{"category": "Health", "items": ["Medical aid", "Gym"]}]',
    )

    # Tech
    technologies = models.ManyToManyField(
        'candidates.Technology',
        blank=True,
        related_name='companies',
    )

    # Remote
    remote_work_policy = models.CharField(
        max_length=20,
        choices=RemoteWorkPolicy.choices,
        blank=True,
    )

    # Legal/Registration
    legal_name = models.CharField(max_length=300, blank=True, help_text='Official registered business name')
    registration_number = models.CharField(max_length=100, blank=True, help_text='Company registration/incorporation number')
    vat_number = models.CharField(max_length=50, blank=True, help_text='VAT/Tax ID number')

    # Billing Address
    billing_address = models.CharField(max_length=500, blank=True)
    billing_city = models.CharField(max_length=100, blank=True)
    billing_country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='billing_companies',
    )
    billing_postal_code = models.CharField(max_length=20, blank=True)

    # Billing Contact
    billing_contact_name = models.CharField(max_length=200, blank=True)
    billing_contact_email = models.EmailField(blank=True)
    billing_contact_phone = models.CharField(max_length=30, blank=True)

    # Assigned recruiters/admins - dedicated contact points
    assigned_to = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='assigned_companies',
        help_text='Assigned recruiters or admins as dedicated contact points',
    )

    # Onboarding tracking
    onboarding_stage = models.ForeignKey(
        'core.OnboardingStage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'entity_type': 'company'},
        related_name='companies',
    )
    onboarding_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the client completed their onboarding wizard'
    )
    onboarding_steps_completed = models.JSONField(
        default=dict,
        blank=True,
        help_text='Tracks completion of onboarding steps: {"profile": true, "billing": true, ...}'
    )

    # Access permissions
    can_view_all_candidates = models.BooleanField(
        default=False,
        help_text='If enabled, users from this company can view all candidates. Otherwise, they only see applicants to their jobs.',
    )

    # Platform company flag
    is_platform = models.BooleanField(
        default=False,
        help_text='If true, this is the platform company. Staff (admin/recruiter) users are automatically added as members.',
    )

    # Service/Package type
    service_type = models.CharField(
        max_length=20,
        choices=ServiceType.choices,
        null=True,
        blank=True,
        help_text='The recruitment service package for this company (Headhunting or Retained)',
    )

    # Meta
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'companies'
        verbose_name_plural = 'Companies'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            if not base_slug:
                base_slug = 'company'
            slug = base_slug
            counter = 1
            while Company.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def headquarters_location(self):
        parts = []
        if self.headquarters_city:
            parts.append(self.headquarters_city.name)
        if self.headquarters_country:
            parts.append(self.headquarters_country.name)
        return ', '.join(parts)


class CompanyUser(models.Model):
    """
    Links users to companies with role-based access.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='company_memberships',
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='members',
    )
    role = models.CharField(
        max_length=20,
        choices=CompanyUserRole.choices,
        default=CompanyUserRole.VIEWER,
    )
    job_title = models.CharField(max_length=100, blank=True)

    # Meta
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='company_invitations_sent',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'company_users'
        unique_together = ['user', 'company']
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.email} - {self.company.name} ({self.role})"

    @property
    def is_admin(self):
        return self.role == CompanyUserRole.ADMIN

    @property
    def is_editor(self):
        return self.role in [CompanyUserRole.ADMIN, CompanyUserRole.EDITOR]

    @property
    def can_view(self):
        return self.is_active


class InvitationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    ACCEPTED = 'accepted', 'Accepted'
    EXPIRED = 'expired', 'Expired'
    CANCELLED = 'cancelled', 'Cancelled'


@automatable(
    display_name='Company Invitation',
    events=['created', 'accepted'],
    status_field='status',
)
class CompanyInvitation(models.Model):
    """
    Pending invitations to join a company.
    User receives a unique signup link. When they sign up, they are linked to the company.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='invitations',
    )
    email = models.EmailField()
    role = models.CharField(
        max_length=20,
        choices=CompanyUserRole.choices,
        default=CompanyUserRole.VIEWER,
    )
    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING,
    )

    # Who invited them
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invitations_created',
    )

    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'company_invitations'
        ordering = ['-created_at']
        # Prevent duplicate pending invites to same email for same company
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'email'],
                condition=models.Q(status='pending'),
                name='unique_pending_invitation'
            )
        ]

    def __str__(self):
        return f"{self.email} invited to {self.company.name} ({self.status})"

    @property
    def is_pending(self):
        return self.status == InvitationStatus.PENDING

    @property
    def is_expired(self):
        from django.utils import timezone
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return self.status == InvitationStatus.PENDING and not self.is_expired


class CompanyActivityType(models.TextChoices):
    """Types of activities that can be logged for a company."""
    NOTE_ADDED = 'note_added', 'Note Added'
    CALL_LOGGED = 'call_logged', 'Call Logged'
    EMAIL_SENT = 'email_sent', 'Email Sent'
    MEETING_SCHEDULED = 'meeting_scheduled', 'Meeting Scheduled'
    MEETING_COMPLETED = 'meeting_completed', 'Meeting Completed'
    MEETING_CANCELLED = 'meeting_cancelled', 'Meeting Cancelled'
    ASSIGNED = 'assigned', 'Assigned'
    STATUS_CHANGED = 'status_changed', 'Status Changed'


class CompanyActivity(models.Model):
    """
    Activity log for companies - tracks all interactions and notes.
    Similar to LeadActivity but for client companies.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core relation
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='activities',
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='company_activities',
        help_text='User who performed this action',
    )

    # Activity details
    activity_type = models.CharField(
        max_length=30,
        choices=CompanyActivityType.choices,
    )

    # For notes
    content = models.TextField(
        blank=True,
        help_text='Note content or activity description',
    )

    # Additional metadata (JSON field for flexible storage)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional activity-specific data',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'company_activities'
        ordering = ['-created_at']
        verbose_name_plural = 'Company activities'

    def __str__(self):
        return f"{self.company.name} - {self.get_activity_type_display()}"


class TermsAcceptanceContext(models.TextChoices):
    COMPANY_CREATION = 'company_creation', 'Company Creation'
    SERVICE_TYPE_CHANGE = 'service_type_change', 'Service Type Change'
    CONTRACT_RENEWAL = 'contract_renewal', 'Contract Renewal'


class TermsAcceptance(models.Model):
    """
    Audit trail for terms and conditions acceptances.
    Records when users accept terms during company creation, service changes, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who and what
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='terms_acceptances',
    )
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='terms_acceptances',
    )

    # Optional subscription reference (for service type changes)
    subscription = models.ForeignKey(
        'subscriptions.Subscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='terms_acceptances',
    )

    # Document details
    document_slug = models.CharField(max_length=255)
    document_title = models.CharField(max_length=255, blank=True)
    document_version = models.CharField(max_length=50, blank=True)

    # Context
    context = models.CharField(
        max_length=30,
        choices=TermsAcceptanceContext.choices,
        default=TermsAcceptanceContext.COMPANY_CREATION,
    )
    service_type = models.CharField(
        max_length=20,
        choices=ServiceType.choices,
        blank=True,
    )

    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    accepted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'terms_acceptances'
        ordering = ['-accepted_at']

    def __str__(self):
        return f"{self.company.name} - {self.document_slug} ({self.context})"


class LeadSource(models.TextChoices):
    """How the lead was acquired."""
    REFERRAL = 'referral', 'Referral'
    WEBSITE = 'website', 'Website'
    LINKEDIN = 'linkedin', 'LinkedIn'
    COLD_OUTREACH = 'cold_outreach', 'Cold Outreach'
    EVENT = 'event', 'Event/Conference'
    INBOUND = 'inbound', 'Inbound Inquiry'
    OTHER = 'other', 'Other'


@automatable(
    display_name='Lead',
    events=['created', 'updated', 'deleted', 'stage_changed', 'converted'],
    status_field='onboarding_stage',
)
class Lead(models.Model):
    """
    Prospecting lead - a person at a company we're trying to convert to a client.

    Leads progress through early pipeline stages (Lead → Qualified → Sales Meeting Booked).
    When an invitation is sent, the lead is linked to a ClientInvitation.
    When the lead signs up, they become a Client user and create a Company.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Contact information
    name = models.CharField(max_length=255, help_text='Contact name')
    email = models.EmailField(help_text='Contact email')
    phone = models.CharField(max_length=30, blank=True)
    job_title = models.CharField(max_length=100, blank=True)

    # Company information (text - company may not exist in system yet)
    company_name = models.CharField(max_length=255, help_text='Company they work at')
    company_website = models.URLField(blank=True)
    company_size = models.CharField(
        max_length=20,
        choices=CompanySize.choices,
        blank=True,
    )
    industry = models.ForeignKey(
        'candidates.Industry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
    )

    # Pipeline tracking
    onboarding_stage = models.ForeignKey(
        'core.OnboardingStage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
        limit_choices_to={'entity_type': 'lead'},
    )

    # Source and notes
    source = models.CharField(
        max_length=20,
        choices=LeadSource.choices,
        default=LeadSource.OTHER,
    )
    source_detail = models.CharField(
        max_length=255,
        blank=True,
        help_text='Additional source details (e.g., referrer name, event name)',
    )
    source_page = models.CharField(
        max_length=255,
        blank=True,
        help_text='Page URL where inbound lead submitted contact form',
    )
    subject = models.CharField(
        max_length=200,
        blank=True,
        help_text='Subject/reason for contact (for inbound leads)',
    )
    notes = models.TextField(blank=True)

    # Admin workflow (for inbound leads)
    is_read = models.BooleanField(default=False)
    is_replied = models.BooleanField(default=False)

    # Assignment - multiple recruiters can work on a lead
    assigned_to = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='assigned_leads',
        help_text='Recruiters/admins managing this lead',
    )

    # Conversion tracking
    converted_to_company = models.ForeignKey(
        'Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_lead',
        help_text='Company created when lead converted',
    )
    converted_to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_lead',
        help_text='User created when lead signed up',
    )
    converted_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='leads_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'leads'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} at {self.company_name}"

    @property
    def is_converted(self):
        """Whether this lead has been converted to a client."""
        return self.converted_at is not None


class LeadActivityType(models.TextChoices):
    """Types of activities that can be logged for a lead."""
    NOTE_ADDED = 'note_added', 'Note Added'
    STAGE_CHANGED = 'stage_changed', 'Stage Changed'
    MEETING_SCHEDULED = 'meeting_scheduled', 'Meeting Scheduled'
    MEETING_COMPLETED = 'meeting_completed', 'Meeting Completed'
    MEETING_CANCELLED = 'meeting_cancelled', 'Meeting Cancelled'
    EMAIL_SENT = 'email_sent', 'Email Sent'
    CALL_LOGGED = 'call_logged', 'Call Logged'
    INVITATION_SENT = 'invitation_sent', 'Invitation Sent'
    CONVERTED = 'converted', 'Converted to Client'
    ASSIGNED = 'assigned', 'Assigned'
    CREATED = 'created', 'Lead Created'


class LeadActivity(models.Model):
    """
    Activity log for leads - tracks all interactions and state changes.
    Similar to ApplicationActivityLog but for the lead/sales pipeline.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core relation
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name='activities',
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lead_activities',
        help_text='User who performed this action',
    )

    # Activity details
    activity_type = models.CharField(
        max_length=30,
        choices=LeadActivityType.choices,
    )

    # For notes
    content = models.TextField(
        blank=True,
        help_text='Note content or activity description',
    )

    # State tracking (for stage changes)
    previous_stage = models.ForeignKey(
        'core.OnboardingStage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )
    new_stage = models.ForeignKey(
        'core.OnboardingStage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )

    # Additional metadata (meeting details, email subject, etc.)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context: meeting_id, email_subject, etc.',
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lead_activities'
        ordering = ['-created_at']
        verbose_name_plural = 'Lead activities'
        indexes = [
            models.Index(fields=['lead', '-created_at']),
            models.Index(fields=['activity_type']),
        ]

    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.lead.name}"

    @property
    def performer_name(self):
        """Return the name of the user who performed the action."""
        if self.performed_by:
            return self.performed_by.full_name or self.performed_by.email
        return 'System'
