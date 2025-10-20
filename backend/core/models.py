"""Database models for medical records management."""
from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with role information."""

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        DOCTOR = "DOCTOR", "Doctor"
        RECEPTIONIST = "RECEPTIONIST", "Receptionist"

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.RECEPTIONIST)


class Doctor(models.Model):
    """Represents a physician using the system."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    specialty = models.CharField(max_length=255, blank=True)
    license_number = models.CharField(max_length=128, unique=True)

    def __str__(self) -> str:
        return f"Dr. {self.user.get_full_name() or self.user.username}"


class Receptionist(models.Model):
    """Tracks receptionist details for auditing."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="receptionist_profile")
    desk_number = models.CharField(max_length=32, blank=True)

    def __str__(self) -> str:
        return self.user.get_full_name() or self.user.username


class Patient(models.Model):
    """Stores patient demographic and clinical information."""

    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    medical_history = models.TextField(blank=True)
    attending_doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name="patients")
    created_by = models.ForeignKey(
        Receptionist,
        on_delete=models.SET_NULL,
        related_name="registered_patients",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return f"{self.last_name}, {self.first_name}"
