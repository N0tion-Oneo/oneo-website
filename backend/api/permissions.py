from rest_framework import permissions
from users.models import UserRole


class IsCandidate(permissions.BasePermission):
    """
    Permission class that only allows candidates to access.
    """
    message = "Only candidates can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.CANDIDATE
        )


class IsClient(permissions.BasePermission):
    """
    Permission class that only allows client users to access.
    """
    message = "Only client users can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.CLIENT
        )


class IsRecruiter(permissions.BasePermission):
    """
    Permission class that only allows recruiters to access.
    """
    message = "Only recruiters can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.RECRUITER
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission class that only allows admin users to access.
    """
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsRecruiterOrAdmin(permissions.BasePermission):
    """
    Permission class that allows recruiters or admin users to access.
    """
    message = "Only recruiters or administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in [UserRole.RECRUITER, UserRole.ADMIN]
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has a `user` attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner
        return obj.user == request.user


class IsVerified(permissions.BasePermission):
    """
    Permission class that only allows verified users to access.
    """
    message = "You must verify your email to perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_verified
        )
