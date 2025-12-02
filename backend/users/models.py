from django.contrib.auth.models import AbstractUser
from django.db import models


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
