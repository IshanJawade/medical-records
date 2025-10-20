# Medical Records Management App

This repository contains a React frontend and Django REST backend for a HIPAA-conscious medical records management system. The application supports staff onboarding, JWT-based authentication, and role-aware patient workflows.

## Stack Overview

- **Backend:** Django 5.1, Django REST Framework 3.15, Simple JWT, custom user model, role-based permissions, PostgreSQL via psycopg.
- **Frontend:** React (Vite) with React Router and Axios for API communication.
- **Auth:** JSON Web Tokens with refresh flow and token blacklisting on logout.

## Backend Setup (`backend/`)

1. Create and activate a Python virtual environment (optional but recommended).
2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Generate and apply migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
4. Create a superuser for admin access (optional):
   ```bash
   python manage.py createsuperuser
   ```
5. Run the API server:
   ```bash
   python manage.py runserver
   ```

Environment variables to consider:
- `DJANGO_SECRET_KEY` – override the default development secret.
- `DJANGO_DEBUG` – set to `true` in development.
- `DJANGO_ALLOWED_HOSTS` – comma-separated list of hosts.
- `POSTGRES_DB` – database name (defaults to `medical_records`).
- `POSTGRES_USER` / `POSTGRES_PASSWORD` – credentials (default `postgres`/`postgres`).
- `POSTGRES_HOST` / `POSTGRES_PORT` – connection details (defaults `localhost`/`5432`).

## Frontend Setup (`frontend/`)

1. Install dependencies (generates a new `package-lock.json`):
   ```bash
   cd frontend
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```

The frontend expects the backend at `http://localhost:8000/api/`. Override with `VITE_API_BASE_URL` if needed.

## Key Features

- Staff signup with doctor, receptionist, and admin profiles.
- JWT login, refresh, and logout with token blacklisting.
- Receptionist workflow to register patients and assign doctors.
- Doctor dashboard listing assigned patients.
- Admin console to manage staff accounts and patient records.
- Context-aware React client with protected routes per role.
- CORS configuration for local development.

## Testing

Backend smoke tests:
```bash
cd backend
python manage.py test
```

_This codebase provides a foundation for HIPAA compliance; ensure production deployments include TLS termination, audited logging, role management, and data retention controls tailored to your organization._
