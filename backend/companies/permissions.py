from rest_framework import permissions
from .models import CompanyUser, CompanyUserRole


class IsCompanyMember(permissions.BasePermission):
    """
    Permission to check if user is a member of a company.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return CompanyUser.objects.filter(
            user=request.user,
            is_active=True
        ).exists()


class IsCompanyAdmin(permissions.BasePermission):
    """
    Permission to check if user is an admin of their company,
    OR if they are a platform admin/recruiter (who can manage any company).
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Platform admins/recruiters can manage any company
        if request.user.role in ['admin', 'recruiter']:
            return True
        # Company admins can manage their own company
        return CompanyUser.objects.filter(
            user=request.user,
            role=CompanyUserRole.ADMIN,
            is_active=True
        ).exists()


class IsCompanyEditor(permissions.BasePermission):
    """
    Permission to check if user is an editor (or admin) of their company.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return CompanyUser.objects.filter(
            user=request.user,
            role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
            is_active=True
        ).exists()


class IsCompanyAdminOrReadOnly(permissions.BasePermission):
    """
    Permission to allow read access to all, but write access only to company admins.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return CompanyUser.objects.filter(
            user=request.user,
            role=CompanyUserRole.ADMIN,
            is_active=True
        ).exists()


class IsCompanyEditorOrReadOnly(permissions.BasePermission):
    """
    Permission to allow read access to all, but write access only to company editors/admins.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return CompanyUser.objects.filter(
            user=request.user,
            role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
            is_active=True
        ).exists()


def get_user_company(user):
    """
    Helper function to get the user's company.
    Returns the first company the user is a member of.
    """
    try:
        membership = CompanyUser.objects.filter(
            user=user,
            is_active=True
        ).select_related('company').first()
        return membership.company if membership else None
    except CompanyUser.DoesNotExist:
        return None


def get_user_company_role(user, company=None):
    """
    Helper function to get the user's role in a company.
    """
    try:
        filters = {'user': user, 'is_active': True}
        if company:
            filters['company'] = company
        membership = CompanyUser.objects.filter(**filters).first()
        return membership.role if membership else None
    except CompanyUser.DoesNotExist:
        return None
