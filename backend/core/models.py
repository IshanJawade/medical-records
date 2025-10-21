"""Database models for medical records management."""
from __future__ import annotations

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


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
    # Removed medical_history; symptoms will be handled in Case
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


def generate_case_number() -> str:
    """Produce a unique, human-readable case identifier."""

    timestamp = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"CASE-{timestamp}-{uuid.uuid4().hex[:6].upper()}"


def case_attachment_upload_path(instance: "CaseAttachment", filename: str) -> str:
    """Generate a deterministic storage path for case related uploads."""

    return f"cases/{instance.case.case_number}/{uuid.uuid4().hex}_{filename}"


def prescription_attachment_upload_path(instance: "PrescriptionAttachment", filename: str) -> str:
    """Generate a deterministic storage path for prescription uploads."""

    return f"prescriptions/{instance.prescription.prescription_number}/{uuid.uuid4().hex}_{filename}"


class Case(models.Model):
    """Represents a medical case for a patient."""

    case_number = models.CharField(max_length=64, unique=True, default=generate_case_number, editable=False)
    name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    symptoms = models.TextField(blank=True)
    details = models.TextField(blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="cases")
    created_by = models.ForeignKey(
        Receptionist,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_cases",
    )
    assigned_doctors = models.ManyToManyField(Doctor, related_name="assigned_cases", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        if self.name:
            return f"{self.case_number} · {self.name}"
        return self.case_number


class CaseAttachment(models.Model):
    """File uploads associated with a case."""

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to=case_attachment_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    label = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return self.label or self.file.name


class Prescription(models.Model):
    """Stores prescription details linked to a case."""

    prescription_number = models.CharField(max_length=64, unique=True)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="prescriptions")
    doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name="prescriptions")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="prescriptions")
    details = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Prescription {self.prescription_number}"


class PrescriptionAttachment(models.Model):
    """File uploads attached to a prescription."""

    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to=prescription_attachment_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    label = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return self.label or self.file.name
