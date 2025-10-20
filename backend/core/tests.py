"""Minimal smoke tests for API endpoints."""
from __future__ import annotations

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthenticationTests(APITestCase):
    def test_signup_requires_license_for_doctor(self):
        response = self.client.post(
            reverse("signup"),
            {
                "username": "doc1",
                "password": "securePass123",
                "role": "DOCTOR",
                "license_number": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signup_receptionist_success(self):
        response = self.client.post(
            reverse("signup"),
            {
                "username": "recept1",
                "password": "securePass123",
                "role": "RECEPTIONIST",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="recept1").exists())
