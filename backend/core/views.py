"""REST API views for authentication and medical records."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Doctor, Patient, User
from .permissions import IsAdmin, PatientAccessPermission
from .serializers import (
    AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
    DoctorSerializer,
    PatientSerializer,
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
