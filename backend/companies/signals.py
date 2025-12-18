"""Signals for Companies app."""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

from users.models import UserRole
from .models import Company, CompanyUser, CompanyUserRole


def get_company_role_for_staff(user_role):
    """Map system role to company role for platform company membership."""
    if user_role == UserRole.ADMIN:
        return CompanyUserRole.ADMIN
    elif user_role == UserRole.RECRUITER:
        return CompanyUserRole.VIEWER
    return CompanyUserRole.VIEWER


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def add_staff_to_platform_company(sender, instance, created, **kwargs):
    """
    Automatically add admin and recruiter users to the platform company.

    When a user is created or updated to be an admin/recruiter, they are
    automatically added as a member of the platform company (if one exists).

    Role mapping:
    - System Admin → Company Admin
    - System Recruiter → Company Viewer
    """
    # Check if user is staff (admin or recruiter)
    if instance.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return

    # Find the platform company
    platform_company = Company.objects.filter(is_platform=True).first()
    if not platform_company:
        return

    # Determine the appropriate company role
    company_role = get_company_role_for_staff(instance.role)

    # Check if membership already exists
    existing_membership = CompanyUser.objects.filter(
        user=instance,
        company=platform_company
    ).first()

    if existing_membership:
        # Update role if it changed
        if existing_membership.role != company_role:
            existing_membership.role = company_role
            existing_membership.save(update_fields=['role'])
    else:
        # Create membership with appropriate role
        CompanyUser.objects.create(
            user=instance,
            company=platform_company,
            role=company_role,
            job_title='Staff Member'
        )


@receiver(post_save, sender=Company)
def add_existing_staff_to_platform_company(sender, instance, created, **kwargs):
    """
    When a company is marked as the platform company, add all existing
    admin and recruiter users as members.

    Role mapping:
    - System Admin → Company Admin
    - System Recruiter → Company Viewer
    """
    if not instance.is_platform:
        return

    # Only run when is_platform is True (could be initial set or update)
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Get all staff users (admin and recruiter)
    staff_users = User.objects.filter(role__in=[UserRole.ADMIN, UserRole.RECRUITER])

    for user in staff_users:
        # Determine the appropriate company role
        company_role = get_company_role_for_staff(user.role)

        # Check if membership already exists
        existing_membership = CompanyUser.objects.filter(
            user=user,
            company=instance
        ).first()

        if existing_membership:
            # Update role if it changed
            if existing_membership.role != company_role:
                existing_membership.role = company_role
                existing_membership.save(update_fields=['role'])
        else:
            CompanyUser.objects.create(
                user=user,
                company=instance,
                role=company_role,
                job_title='Staff Member'
            )
