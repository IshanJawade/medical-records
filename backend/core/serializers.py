"""DRF serializers for authentication and domain models."""
from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from .models import Doctor, Patient, Receptionist, User


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
            "medical_history",
            "attending_doctor",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by"]


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
