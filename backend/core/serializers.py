"""DRF serializers for authentication and domain models."""
from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from .models import (
    Appointment,
    Case,
    CaseAttachment,
    Doctor,
    Patient,
    Prescription,
    PrescriptionAttachment,
    Receptionist,
    User,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role"]


class DoctorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Doctor
        fields = ["id", "user", "specialty", "license_number"]


class ReceptionistSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Receptionist
        fields = ["id", "user", "desk_number"]


class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ["id", "specialty", "license_number"]


class ReceptionistProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receptionist
        fields = ["id", "desk_number"]


class PatientSerializer(serializers.ModelSerializer):
    attending_doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all())
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "date_of_birth",
            "attending_doctor",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by"]


class CaseAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseAttachment
        fields = ["id", "label", "file", "uploaded_at"]
        read_only_fields = ["uploaded_at"]


class PrescriptionAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionAttachment
        fields = ["id", "label", "file", "uploaded_at"]
        read_only_fields = ["uploaded_at"]


class PrescriptionSerializer(serializers.ModelSerializer):
    doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all(), required=False)
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    case = serializers.PrimaryKeyRelatedField(queryset=Case.objects.all())
    attachments = PrescriptionAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "prescription_number",
            "case",
            "doctor",
            "patient",
            "details",
            "attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["prescription_number", "created_at", "updated_at"]

    def validate(self, attrs: dict) -> dict:
        case = attrs.get("case") or getattr(self.instance, "case", None)
        patient = attrs.get("patient") or getattr(self.instance, "patient", None)

        if case and patient and case.patient_id != patient.id:
            raise serializers.ValidationError({"patient": "Patient must match the case patient."})

        # Allow doctors to create prescriptions if they have access to the case
        # The viewset's get_queryset already filters cases appropriately
        request = self.context.get("request")
        if request and getattr(request.user, "role", None) == User.Role.DOCTOR:
            doctor = getattr(request.user, "doctor_profile", None)
            if doctor and case:
                # Check if doctor has access to this case
                is_attending = case.patient.attending_doctor_id == doctor.id
                is_assigned = case.assigned_doctors.filter(id=doctor.id).exists()
                if not (is_attending or is_assigned):
                    raise serializers.ValidationError(
                        {"case": "You do not have access to this case."}
                    )

        return attrs


class CaseSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    assigned_doctors = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all(), many=True, required=False)
    attachments = CaseAttachmentSerializer(many=True, read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    assigned_doctor_names = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            "id",
            "case_number",
            "name",
            "description",
            "symptoms",
            "details",
            "patient",
            "patient_name",
            "created_by",
            "assigned_doctors",
            "assigned_doctor_names",
            "attachments",
            "prescriptions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["case_number", "created_at", "updated_at", "created_by", "patient_name", "assigned_doctor_names"]

    def get_patient_name(self, obj: Case) -> str:
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip()

    def get_assigned_doctor_names(self, obj: Case) -> list[str]:
        return [str(doctor) for doctor in obj.assigned_doctors.all()]

    def create(self, validated_data: dict) -> Case:
        assigned_doctors = validated_data.pop("assigned_doctors", [])
        case = Case.objects.create(**validated_data)
        if not assigned_doctors and case.patient.attending_doctor_id:
            assigned_doctors = [case.patient.attending_doctor]
        if assigned_doctors:
            case.assigned_doctors.set(assigned_doctors)
        return case


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    specialty = serializers.CharField(write_only=True, required=False, allow_blank=True)
    license_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    desk_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "specialty",
            "license_number",
            "desk_number",
        ]

    def validate(self, attrs: dict) -> dict:
        role = attrs.get("role")
        if role == User.Role.DOCTOR and not attrs.get("license_number"):
            raise serializers.ValidationError({"license_number": "Doctor registration requires a license number."})
        return attrs

    @transaction.atomic
    def create(self, validated_data: dict) -> User:
        password = validated_data.pop("password")
        specialty = validated_data.pop("specialty", "")
        license_number = validated_data.pop("license_number", "")
        desk_number = validated_data.pop("desk_number", "")

        role = validated_data.get("role", User.Role.RECEPTIONIST)

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        if role == User.Role.DOCTOR:
            Doctor.objects.create(user=user, specialty=specialty, license_number=license_number)
        elif role == User.Role.RECEPTIONIST:
            Receptionist.objects.create(user=user, desk_number=desk_number)
        return user


class AdminUserDetailSerializer(serializers.ModelSerializer):
    doctor_profile = DoctorProfileSerializer(read_only=True, source="doctor_profile")
    receptionist_profile = ReceptionistProfileSerializer(read_only=True, source="receptionist_profile")

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "doctor_profile",
            "receptionist_profile",
        ]


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    specialty = serializers.CharField(write_only=True, required=False, allow_blank=True)
    license_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    desk_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "password",
            "specialty",
            "license_number",
            "desk_number",
        ]
        extra_kwargs = {"username": {"required": False}}

    def update(self, instance: User, validated_data: dict) -> User:
        password = validated_data.pop("password", None)
        specialty = validated_data.pop("specialty", None)
        license_number = validated_data.pop("license_number", None)
        desk_number = validated_data.pop("desk_number", None)

        role = validated_data.get("role", instance.role)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.role = role
        instance.save()

        if role == User.Role.DOCTOR:
            doctor_profile = getattr(instance, "doctor_profile", None)
            current_license = getattr(doctor_profile, "license_number", "") if doctor_profile else ""
            resolved_license = license_number if license_number is not None else current_license
            resolved_specialty = specialty if specialty is not None else getattr(doctor_profile, "specialty", "")
            if not resolved_license:
                raise serializers.ValidationError({"license_number": "License number required for doctors."})
            Doctor.objects.update_or_create(
                user=instance,
                defaults={"specialty": resolved_specialty, "license_number": resolved_license},
            )
            Receptionist.objects.filter(user=instance).delete()
        elif role == User.Role.RECEPTIONIST:
            receptionist_profile = getattr(instance, "receptionist_profile", None)
            resolved_desk = desk_number if desk_number is not None else getattr(receptionist_profile, "desk_number", "")
            Receptionist.objects.update_or_create(
                user=instance,
                defaults={"desk_number": resolved_desk},
            )
            Doctor.objects.filter(user=instance).delete()
        else:
            Doctor.objects.filter(user=instance).delete()
            Receptionist.objects.filter(user=instance).delete()

        return instance


class AppointmentSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    case = serializers.PrimaryKeyRelatedField(queryset=Case.objects.all(), required=False, allow_null=True)
    doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all())
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    patient_name = serializers.SerializerMethodField()
    case_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_number",
            "patient",
            "patient_name",
            "case",
            "case_name",
            "doctor",
            "doctor_name",
            "created_by",
            "notes",
            "status",
            "scheduled_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["appointment_number", "created_at", "updated_at", "created_by"]

    def get_patient_name(self, obj: Appointment) -> str:
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip()

    def get_case_name(self, obj: Appointment) -> str:
        if obj.case:
            return obj.case.name or obj.case.case_number
        return "New Case"

    def get_doctor_name(self, obj: Appointment) -> str:
        return str(obj.doctor)

