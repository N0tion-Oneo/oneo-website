import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings


class ClientInvitation(models.Model):
    """
    Invitation for new users to sign up as CLIENT role.
    Created by Admin/Recruiter, used once by a new user.
    """
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    email = models.EmailField(blank=True, help_text="Optional - can pre-fill signup form")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='client_invitations_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='client_invitation_used'
    )

    class Meta:
        db_table = 'client_invitations'
        ordering = ['-created_at']

    def __str__(self):
        status = "Used" if self.used_at else ("Expired" if self.is_expired else "Active")
        return f"Invitation {self.token} ({status})"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return self.used_at is None and not self.is_expired


class RecruiterInvitation(models.Model):
    """
    Invitation for new users to sign up as RECRUITER role.
    Created by Admin only, used once by a new user.
    """
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    email = models.EmailField(blank=True, help_text="Optional - can pre-fill signup form")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='recruiter_invitations_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recruiter_invitation_used'
    )

    class Meta:
        db_table = 'recruiter_invitations'
        ordering = ['-created_at']

    def __str__(self):
        status = "Used" if self.used_at else ("Expired" if self.is_expired else "Active")
        return f"Recruiter Invitation {self.token} ({status})"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return self.used_at is None and not self.is_expired


class CandidateInvitation(models.Model):
    """
    Invitation for new users to sign up as CANDIDATE role.
    Created automatically when someone books a meeting and doesn't have an account.
    """
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    email = models.EmailField(help_text="Email of the invitee")
    name = models.CharField(max_length=255, blank=True, help_text="Name from booking form")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='candidate_invitations_created',
        help_text="Recruiter/admin who the meeting was booked with"
    )
    # Reference to the booking that triggered this invitation
    booking = models.ForeignKey(
        'scheduling.Booking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidate_invitations',
        help_text="The booking that triggered this invitation"
    )
    # Pending user created at booking time (before signup is complete)
    pending_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidate_invitation_pending',
        help_text="The pending user created when booking was made (before signup completion)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='candidate_invitation_used'
    )

    class Meta:
        db_table = 'candidate_invitations'
        ordering = ['-created_at']

    def __str__(self):
        status = "Used" if self.used_at else ("Expired" if self.is_expired else "Active")
        return f"Candidate Invitation for {self.email} ({status})"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return self.used_at is None and not self.is_expired
