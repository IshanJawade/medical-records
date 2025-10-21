"""REST API views for authentication and medical records."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Appointment, Case, Doctor, Patient, Prescription, User
from .permissions import IsAdmin, PatientAccessPermission
from .serializers import (
    AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
    AppointmentSerializer,
    CaseSerializer,
    DoctorSerializer,
    PatientSerializer,
    PrescriptionSerializer,
    SignupSerializer,
    UserSerializer,
)

User = get_user_model()


class SignupView(generics.CreateAPIView):
    """Register a new staff user and create related profile."""

    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]


class RoleAwareTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Include user metadata inside the token response."""

    def validate(self, attrs):  # type: ignore[override]
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    """Authenticate a user and return JWT pair with profile info."""

    serializer_class = RoleAwareTokenObtainPairSerializer


class LogoutView(generics.GenericAPIView):
    """Blacklist a refresh token to complete logout."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "Refresh token missing."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception as exc:  # noqa: PERF203 broad exception for token errors
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ProfileView(generics.RetrieveAPIView):
    """Return the authenticated user's profile."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class PatientViewSet(viewsets.ModelViewSet):
    """CRUD endpoint for patient records with role-aware permissions."""

    queryset = Patient.objects.select_related("attending_doctor", "created_by").all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, PatientAccessPermission]

    def perform_create(self, serializer: PatientSerializer) -> None:
        if self.request.user.role == User.Role.ADMIN:
            serializer.save(created_by=None)
            return
        receptionist_profile = getattr(self.request.user, "receptionist_profile", None)
        if receptionist_profile is None:
            raise PermissionDenied("Receptionist profile missing.")
        serializer.save(created_by=receptionist_profile)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.DOCTOR:
            doctor_profile = getattr(user, "doctor_profile", None)
            if doctor_profile:
                return queryset.filter(attending_doctor=doctor_profile)
        if user.role == User.Role.RECEPTIONIST:
            receptionist_profile = getattr(user, "receptionist_profile", None)
            if receptionist_profile:
                return queryset.filter(created_by=receptionist_profile)
        return queryset.none()


class AdminUserViewSet(viewsets.ModelViewSet):
    """Allow administrators to manage staff accounts."""

    queryset = User.objects.all().select_related("doctor_profile", "receptionist_profile")
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action in {"update", "partial_update"}:
            return AdminUserUpdateSerializer
        if self.action == "create":
            return SignupSerializer
        return AdminUserDetailSerializer

    def create(self, request, *args, **kwargs):  # type: ignore[override]
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        data = AdminUserDetailSerializer(user, context=self.get_serializer_context()).data
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):  # type: ignore[override]
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = AdminUserUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        data = AdminUserDetailSerializer(user, context=self.get_serializer_context()).data
        return Response(data)


class AdminPatientViewSet(viewsets.ModelViewSet):
    """Admin access to all patient records."""

    queryset = Patient.objects.select_related("attending_doctor", "created_by").all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    """Expose doctor roster for receptionist assignments."""

    queryset = Doctor.objects.select_related("user").all()
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated]


class CaseViewSet(viewsets.ModelViewSet):
    """Manage medical cases with role sensitive access rules."""

    queryset = (
        Case.objects.select_related("patient", "created_by__user")
        .prefetch_related("assigned_doctors__user", "attachments", "prescriptions__attachments")
        .all()
    )
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.DOCTOR:
            doctor_profile = getattr(user, "doctor_profile", None)
            if doctor_profile:
                return queryset.filter(
                    Q(assigned_doctors=doctor_profile) | Q(patient__attending_doctor=doctor_profile)
                ).distinct()
            return queryset.none()
        if user.role == User.Role.RECEPTIONIST:
            receptionist_profile = getattr(user, "receptionist_profile", None)
            if receptionist_profile:
                return queryset.filter(created_by=receptionist_profile)
        return queryset.none()

    def perform_create(self, serializer: CaseSerializer) -> None:
        user = self.request.user
        if user.role not in {User.Role.RECEPTIONIST, User.Role.ADMIN}:
            raise PermissionDenied("Only receptionists or administrators can create cases.")
        if user.role == User.Role.RECEPTIONIST:
            receptionist_profile = getattr(user, "receptionist_profile", None)
            if receptionist_profile is None:
                raise PermissionDenied("Receptionist profile missing.")
            serializer.save(created_by=receptionist_profile)
            return
        serializer.save(created_by=None)

    def perform_update(self, serializer: CaseSerializer) -> None:
        user = self.request.user
        if user.role == User.Role.ADMIN:
            serializer.save()
            return
        if user.role == User.Role.DOCTOR:
            doctor_profile = getattr(user, "doctor_profile", None)
            if doctor_profile is None:
                raise PermissionDenied("Doctor profile missing.")
            assigned_doctors = serializer.instance.assigned_doctors.all()
            if doctor_profile not in assigned_doctors and serializer.instance.patient.attending_doctor != doctor_profile:
                raise PermissionDenied("You are not assigned to this case.")
            if "assigned_doctors" in serializer.validated_data:
                incoming = {doc.id for doc in serializer.validated_data["assigned_doctors"]}
                existing = set(serializer.instance.assigned_doctors.values_list("id", flat=True))
                if incoming != existing:
                    raise PermissionDenied("Only administrators can change doctor assignments.")
            serializer.save()
            return
        raise PermissionDenied("You do not have permission to update this case.")

    def perform_destroy(self, instance: Case) -> None:
        user = self.request.user
        if user.role != User.Role.ADMIN:
            raise PermissionDenied("Only administrators can delete cases.")
        instance.delete()


class PrescriptionViewSet(viewsets.ModelViewSet):
    """Manage prescriptions associated with cases."""

    queryset = (
        Prescription.objects.select_related("case", "doctor__user", "patient")
        .prefetch_related("attachments")
        .all()
    )
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.DOCTOR:
            doctor_profile = getattr(user, "doctor_profile", None)
            if doctor_profile:
                return queryset.filter(Q(doctor=doctor_profile) | Q(case__assigned_doctors=doctor_profile)).distinct()
            return queryset.none()
        if user.role == User.Role.RECEPTIONIST:
            receptionist_profile = getattr(user, "receptionist_profile", None)
            if receptionist_profile:
                return queryset.filter(case__created_by=receptionist_profile)
        return queryset.none()

    def perform_create(self, serializer: PrescriptionSerializer) -> None:
        user = self.request.user
        doctor_profile = getattr(user, "doctor_profile", None)
        if user.role == User.Role.DOCTOR:
            if doctor_profile is None:
                raise PermissionDenied("Doctor profile missing.")
            serializer.save(doctor=doctor_profile)
            return
        if user.role == User.Role.ADMIN:
            assigned_doctor = serializer.validated_data.get("doctor")
            if assigned_doctor is None:
                raise PermissionDenied("Prescriptions created by admins must specify a doctor.")
            serializer.save()
            return
        raise PermissionDenied("Only doctors or administrators can create prescriptions.")

    def perform_update(self, serializer: PrescriptionSerializer) -> None:
        user = self.request.user
        if user.role == User.Role.ADMIN:
            serializer.save()
            return
        if user.role == User.Role.DOCTOR:
            doctor_profile = getattr(user, "doctor_profile", None)
            if doctor_profile is None:
                raise PermissionDenied("Doctor profile missing.")
            if doctor_profile != serializer.instance.doctor:
                raise PermissionDenied("You did not author this prescription.")
            if "case" in serializer.validated_data and serializer.validated_data["case"] != serializer.instance.case:
                raise PermissionDenied("Case cannot be reassigned by doctors.")
            if "patient" in serializer.validated_data and serializer.validated_data["patient"] != serializer.instance.patient:
                raise PermissionDenied("Patient cannot be changed by doctors.")
            serializer.save(doctor=doctor_profile)
            return
        raise PermissionDenied("You do not have permission to update this prescription.")

    def perform_destroy(self, instance: Prescription) -> None:
        user = self.request.user
        if user.role != User.Role.ADMIN:
            raise PermissionDenied("Only administrators can delete prescriptions.")
        instance.delete()


class AppointmentViewSet(viewsets.ModelViewSet):
    """Manage appointments with role-aware permissions."""

    queryset = (
        Appointment.objects.select_related("patient", "case", "doctor__user", "created_by__user")
        .all()
    )
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.DOCTOR:
            doctor_profile = getattr(user, "doctor_profile", None)
            if doctor_profile:
                return queryset.filter(doctor=doctor_profile)
            return queryset.none()
        if user.role == User.Role.RECEPTIONIST:
            receptionist_profile = getattr(user, "receptionist_profile", None)
            if receptionist_profile:
                return queryset.filter(created_by=receptionist_profile)
        return queryset.none()

    def perform_create(self, serializer: AppointmentSerializer) -> None:
        user = self.request.user
        if user.role == User.Role.ADMIN:
            serializer.save(created_by=None)
            return
        if user.role == User.Role.RECEPTIONIST:
            receptionist_profile = getattr(user, "receptionist_profile", None)
            if receptionist_profile is None:
                raise PermissionDenied("Receptionist profile missing.")
            serializer.save(created_by=receptionist_profile)
            return
        raise PermissionDenied("Only receptionists or administrators can create appointments.")

    def perform_update(self, serializer: AppointmentSerializer) -> None:
        user = self.request.user
        if user.role == User.Role.ADMIN:
            serializer.save()
            return
        if user.role == User.Role.DOCTOR:
            # Doctors can update appointment status and notes
            allowed_fields = {"status", "notes"}
            changed_fields = set(serializer.validated_data.keys())
            if not changed_fields.issubset(allowed_fields):
                raise PermissionDenied("Doctors can only update status and notes.")
            serializer.save()
            return
        if user.role == User.Role.RECEPTIONIST:
            serializer.save()
            return
        raise PermissionDenied("You do not have permission to update this appointment.")

    def perform_destroy(self, instance: Appointment) -> None:
        user = self.request.user
        if user.role not in {User.Role.ADMIN, User.Role.RECEPTIONIST}:
            raise PermissionDenied("Only administrators or receptionists can delete appointments.")
        instance.delete()

