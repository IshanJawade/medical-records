from django.contrib import admin

from . import models


@admin.register(models.User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "role", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("username", "email")


@admin.register(models.Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("user", "specialty", "license_number")
    search_fields = ("user__username", "license_number")


@admin.register(models.Receptionist)
class ReceptionistAdmin(admin.ModelAdmin):
    list_display = ("user", "desk_number")
    search_fields = ("user__username",)


@admin.register(models.Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "last_name",
        "first_name",
        "date_of_birth",
        "attending_doctor",
        "created_by",
        "created_at",
    )
    list_filter = ("attending_doctor", "created_at")
    search_fields = ("last_name", "first_name")


class CaseAttachmentInline(admin.TabularInline):
    model = models.CaseAttachment
    extra = 0


class PrescriptionAttachmentInline(admin.TabularInline):
    model = models.PrescriptionAttachment
    extra = 0


@admin.register(models.Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = (
        "case_number",
        "name",
        "patient",
        "created_by",
        "created_at",
    )
    list_filter = ("created_at", "assigned_doctors")
    search_fields = ("case_number", "name", "patient__last_name")
    filter_horizontal = ("assigned_doctors",)
    inlines = (CaseAttachmentInline,)


@admin.register(models.Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        "prescription_number",
        "case",
        "doctor",
        "patient",
        "created_at",
    )
    list_filter = ("created_at", "doctor")
    search_fields = ("prescription_number", "case__case_number", "patient__last_name")
    inlines = (PrescriptionAttachmentInline,)
