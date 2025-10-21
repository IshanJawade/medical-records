"""URL patterns for the core app."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminPatientViewSet,
    AdminUserViewSet,
    AppointmentViewSet,
    CaseViewSet,
    DoctorViewSet,
    LoginView,
    LogoutView,
    PatientViewSet,
    PrescriptionViewSet,
    ProfileView,
    SignupView,
)

router = DefaultRouter()
router.register("patients", PatientViewSet, basename="patients")
router.register("doctors", DoctorViewSet, basename="doctors")
router.register("cases", CaseViewSet, basename="cases")
router.register("prescriptions", PrescriptionViewSet, basename="prescriptions")
router.register("appointments", AppointmentViewSet, basename="appointments")

admin_router = DefaultRouter()
admin_router.register("users", AdminUserViewSet, basename="admin-users")
admin_router.register("patients", AdminPatientViewSet, basename="admin-patients")

urlpatterns = [
    path("auth/signup/", SignupView.as_view(), name="signup"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", ProfileView.as_view(), name="profile"),
    path("", include(router.urls)),
    path("admin/", include(admin_router.urls)),
]
