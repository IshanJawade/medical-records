"""Custom permission classes for role based access control."""
from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import User


class IsReceptionist(BasePermission):
    """Allow access only to receptionists."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.RECEPTIONIST)


class IsDoctor(BasePermission):
    """Allow access only to doctors."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.DOCTOR)


class IsAdmin(BasePermission):
    """Allow access only to administrators."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.ADMIN)


class PatientAccessPermission(BasePermission):
    """Control patient record operations based on staff roles."""

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == User.Role.ADMIN:
            return True

        if request.method in SAFE_METHODS:
            return user.role in {User.Role.DOCTOR, User.Role.RECEPTIONIST}
        if request.method == "POST":
            return user.role == User.Role.RECEPTIONIST
        if request.method in {"PUT", "PATCH"}:
            return user.role in {User.Role.DOCTOR, User.Role.RECEPTIONIST}
        return False

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == User.Role.ADMIN:
            return True

        if request.method in SAFE_METHODS:
            if user.role == User.Role.DOCTOR:
                return True
            if user.role == User.Role.RECEPTIONIST:
                receptionist_profile = getattr(user, "receptionist_profile", None)
                return receptionist_profile is not None and obj.created_by_id == receptionist_profile.id
            return False
        if request.method in {"PUT", "PATCH"}:
            if user.role == User.Role.DOCTOR:
                return True
            if user.role == User.Role.RECEPTIONIST:
                receptionist_profile = getattr(user, "receptionist_profile", None)
                return receptionist_profile is not None and obj.created_by_id == receptionist_profile.id
            return False
        return False
