import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from companies.models import Country, City


class UserRole(models.TextChoices):
    CANDIDATE = 'candidate', 'Candidate'
    CLIENT = 'client', 'Client'
    RECRUITER = 'recruiter', 'Recruiter'
    ADMIN = 'admin', 'Admin'


class User(AbstractUser):
    """
    Custom User model extending AbstractUser with additional fields
    for the Oneo recruitment platform.
    """
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CANDIDATE,
    )
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=255, blank=True, null=True)

    # Use email as the username field for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class RecruiterProfile(models.Model):
    """
    Extended profile for recruiters and admins.
    Contains professional information displayed on their public profile.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recruiter_profile',
    )

    # Public booking URL slug (e.g., /meet/josh-cowan/)
    booking_slug = models.SlugField(
        max_length=100,
        unique=True,
        blank=True,
        help_text='URL slug for public booking page (auto-generated from name)',
    )

    # Professional info
    professional_title = models.CharField(
        max_length=100,
        blank=True,
        help_text='e.g., Senior Technical Recruiter',
    )
    bio = models.TextField(
        blank=True,
        help_text='About/bio text for the recruiter profile',
    )
    linkedin_url = models.URLField(
        blank=True,
        help_text='LinkedIn profile URL',
    )
    years_of_experience = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text='Years of recruiting experience',
    )

    # Location
    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recruiters',
        help_text='Country where the recruiter is based',
    )
    city = models.ForeignKey(
        City,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recruiters',
        help_text='City where the recruiter is based',
    )
    timezone = models.CharField(
        max_length=50,
        default='Africa/Johannesburg',
        help_text='Preferred timezone for scheduling',
    )

    # Specializations (M2M with Industry from candidates)
    industries = models.ManyToManyField(
        'candidates.Industry',
        blank=True,
        related_name='recruiters',
        help_text='Industries the recruiter specializes in',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'recruiter_profiles'
        verbose_name = 'Recruiter Profile'
        verbose_name_plural = 'Recruiter Profiles'

    def __str__(self):
        return f"{self.user.full_name} - {self.professional_title or 'Recruiter'}"

    def save(self, *args, **kwargs):
        # Auto-generate booking_slug from user's full name if not set
        if not self.booking_slug:
            from django.utils.text import slugify
            base_slug = slugify(self.user.full_name)
            if not base_slug:
                base_slug = slugify(self.user.email.split('@')[0])

            slug = base_slug
            counter = 1
            while RecruiterProfile.objects.filter(booking_slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.booking_slug = slug

        super().save(*args, **kwargs)
