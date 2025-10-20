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
