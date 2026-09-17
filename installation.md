# BizSathi — Project Structure & Architecture Setup

You are working on **BizSathi**, a modern multi-tenant SaaS platform for small and medium-sized businesses.

The goal of this task is to establish the **production-ready project structure and architecture foundation**.

## IMPORTANT

Do NOT start implementing complete business modules yet.

Do NOT build CRM, HRM, Payroll, Reports, Subscription, or Communication functionality at this stage.

For now, prepare the project structure, configuration, base architecture, and development foundation so that future phases can be implemented cleanly.

---

# 1. Technology Stack

## Frontend

Use:

* React 19
* TypeScript
* Vite
* React Router
* TanStack Query
* Axios
* Tailwind CSS
* React Hook Form
* Zod
* A reusable component/UI system
* `.tsx` for React components
* `.ts` for TypeScript utilities, services, types, hooks, etc.
* ESLint + Prettier for linting/formatting
* Vitest + React Testing Library for testing
* Node 20 LTS (pin via `.nvmrc` / `package.json` `engines`)

Do NOT use `.jsx` / `.js` for new frontend source files unless technically required by a third-party configuration.

## Backend

Use:

* Python 3.12 (pin via `.python-version`)
* FastAPI
* SQLAlchemy 2.x (async, `asyncpg` driver)
* PostgreSQL
* Pydantic v2
* Alembic
* Redis
* Celery or RQ
* JWT authentication (access + refresh tokens)
* Password hashing via `bcrypt` or `argon2`
* Ruff (or Black + isort) + mypy for linting/formatting/type-checking
* Pytest + pytest-asyncio for testing

Do NOT use Django.

The backend must be API-first and designed to work independently from the React frontend.

---

# 2. Root Project Structure

Create the following monorepo structure:

```text
bizsathi/
│
├── frontend/
├── backend/
├── workers/
├── infrastructure/
├── docs/
├── scripts/
│
├── docker-compose.yml
├── .gitignore
├── .env.example
├── README.md
└── Makefile
```

Keep frontend, backend, workers, infrastructure, documentation, and scripts clearly separated.

---

# 3. Frontend Structure

Create:

```text
frontend/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── App.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── modals/
│   │   ├── charts/
│   │   └── common/
│   │
│   ├── layouts/
│   │   ├── DashboardLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── components/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── crm/
│   │   ├── customers/
│   │   ├── vendors/
│   │   ├── hrm/
│   │   ├── payroll/
│   │   ├── subscriptions/
│   │   ├── reports/
│   │   └── communication/
│   │
│   ├── services/
│   │   ├── api/
│   │   └── auth/
│   │
│   ├── hooks/
│   ├── store/
│   ├── types/
│   ├── utils/
│   └── constants/
│
├── public/
├── .eslintrc / eslint.config.js
├── .prettierrc
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Dockerfile
```

Follow feature-based architecture.

Each future module should be independently maintainable.

For example:

```text
features/
└── crm/
    ├── components/
    ├── pages/
    ├── hooks/
    ├── services/
    ├── schemas/
    ├── types/
    └── index.ts
```

Do not put all application logic inside generic `components/`.

---

# 4. Backend Structure

Use FastAPI.

Create:

```text
backend/
├── app/
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── cors.py
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── auth/
│   │       ├── tenants/
│   │       ├── users/
│   │       ├── crm/
│   │       ├── customers/
│   │       ├── vendors/
│   │       ├── hrm/
│   │       ├── payroll/
│   │       ├── subscriptions/
│   │       ├── reports/
│   │       ├── communication/
│   │       └── health/
│   │
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   ├── middleware/
│   ├── permissions/
│   ├── tasks/
│   └── utils/
│
├── migrations/
├── tests/
├── pyproject.toml (or requirements.txt + ruff/mypy config)
└── Dockerfile
```

Follow this backend flow:

```text
API Router
    ↓
Schema Validation
    ↓
Service Layer
    ↓
Repository Layer
    ↓
SQLAlchemy
    ↓
PostgreSQL
```

Do not put business logic directly inside route handlers.

## 4.1 Health Checks

Add basic health endpoints for load balancer / orchestration use:

```text
GET /health   → liveness check (process is up)
GET /ready    → readiness check (DB + Redis reachable)
```

These are required for AWS ALB/ECS health checks later and should be added now while the core is being scaffolded.

## 4.2 CORS

Configure CORS middleware explicitly for the frontend origin(s) via environment variable (e.g. `ALLOWED_ORIGINS`), rather than wildcard `*`, even in development.

---

# 5. API Architecture

All application APIs must start with:

```text
/api/v1/
```

Example:

```text
/api/v1/auth/login
/api/v1/users
/api/v1/customers
/api/v1/vendors
/api/v1/crm/leads
/api/v1/employees
/api/v1/payroll
/api/v1/subscriptions
/api/v1/reports
/api/v1/health
```

Design the API so future versions such as `/api/v2/` can be introduced without breaking `/api/v1/`.

Use consistent:

* HTTP status codes
* request validation
* response schemas
* error responses
* pagination
* filtering
* sorting
* authentication
* authorization

---

# 6. Multi-Tenancy

BizSathi is a multi-tenant SaaS application.

Use:

```text
Shared Database
       ↓
Shared Schema
       ↓
tenant_id
```

Most business entities must belong to a tenant.

Examples:

```text
customers
vendors
employees
leads
deals
payroll_records
reports
```

must be tenant-scoped.

IMPORTANT:

Never trust `tenant_id` coming directly from the frontend.

Tenant context must be derived from the authenticated user/session.

Every tenant-owned database query must enforce tenant isolation at the service/repository layer.

**RLS timing:** Do NOT enable PostgreSQL Row Level Security in this step. Build tenant scoping into the repository layer first (every query explicitly filtered by `tenant_id` from the authenticated session). Design tables and migrations so RLS policies can be added as a defense-in-depth layer in a later step once core models exist — leave this noted in `docs/multi-tenancy.md` as a planned follow-up, not done now.

---

# 7. Authentication & Authorization

Prepare architecture for:

* User registration
* Login
* Logout
* JWT authentication
* Access token
* Refresh token
* Password hashing (bcrypt or argon2)
* Password reset
* Email verification
* Session management
* Tenant membership
* User invitations

Use role-based access control.

Permissions should be action-based.

Examples:

```text
crm.lead.view
crm.lead.create
crm.lead.update
crm.lead.delete

payroll.view
payroll.process

customer.view
customer.create
customer.update
customer.delete

report.view
report.export
```

Do not rely only on frontend route protection.

Authorization must also happen on the backend.

---

# 8. Core Future Modules

Prepare folders and architecture for:

### CRM
* Leads
* Contacts
* Deals
* Pipelines
* Activities
* Follow-ups
* Notes
* Tasks

### Customer Management
* Customers
* Customer profiles
* Addresses
* Contacts
* Customer history

### Vendor Management
* Vendors
* Vendor contacts
* Vendor transactions
* Vendor history

### HRM
* Employees
* Departments
* Designations
* Attendance
* Leave
* Holidays
* Employee documents

### Payroll
* Salary structures
* Payroll processing
* Payroll periods
* Earnings
* Deductions
* Taxes
* Payslips

Payroll must use historical/snapshot-based records so previously generated payslips do not change when an employee's salary structure changes later.

### SaaS Subscription

Prepare architecture for:

```text
TRIAL
  ↓
ACTIVE
  ↓
PAST_DUE
  ↓
GRACE_PERIOD
  ↓
SUSPENDED
  ↓
CANCELLED
```

Successful payment should allow recovery to `ACTIVE`.

Prepare for:
* Plans
* Features
* Subscriptions
* Billing cycles
* Usage limits
* Subscription status
* Payment records

### Reports

Create a reusable reporting architecture supporting:
* Date filters
* Search
* Sorting
* Pagination
* Module-specific filters
* Export
* Permission checks

Reports should not be designed as one isolated feature only. Each major module should be able to expose reporting data.

### Communication

Prepare architecture for:
* Email
* WhatsApp
* In-app notifications
* SMS in future
* Webhooks
* Notification templates

External communication should preferably run through background workers instead of blocking API requests.

---

# 9. Redis Architecture

Redis will NOT be the primary database.

PostgreSQL is the source of truth.

Redis can be used for:
* Cache
* Background job queues
* Temporary data
* Rate limiting
* Short-lived session-related data
* OTP/verification data where appropriate

Do not store critical permanent business records only in Redis.

---

# 10. Background Workers

Create:

```text
workers/
├── tasks/
│   ├── email.py
│   ├── notifications.py
│   ├── reports.py
│   ├── webhooks.py
│   └── communication.py
│
├── worker.py
├── requirements.txt
└── Dockerfile
```

Future use cases:

```text
FastAPI
   ↓
Redis Queue
   ↓
Worker
   ↓
Email / WhatsApp / Notifications / Reports / Webhooks
```

The API should not wait unnecessarily for slow third-party operations.

---

# 11. Infrastructure

Prepare:

```text
infrastructure/
├── docker/
├── aws/
│   ├── ecs/
│   ├── rds/
│   ├── redis/
│   ├── s3/
│   └── cloudfront/
└── nginx/
```

Production architecture should be compatible with:
* AWS ECS
* AWS RDS PostgreSQL
* AWS ElastiCache Redis
* AWS S3
* AWS CloudFront
* Application Load Balancer
* GitHub Actions
* Sentry or equivalent monitoring

Do NOT deploy anything yet. Only prepare the architecture/configuration placeholders.

---

# 12. Docker Development Environment

Create a development-ready Docker setup.

Expected services:

```text
frontend
backend
postgres
redis
worker
```

The environment should be easy to start with:

```bash
docker compose up --build
```

Use environment variables.

Never hardcode:
* database passwords
* JWT secrets
* API keys
* third-party credentials
* production secrets

Provide `.env.example` with safe placeholder values.

---

# 13. Documentation

Create/update:

```text
docs/
├── architecture.md
├── api.md
├── database.md
├── multi-tenancy.md
├── authentication.md
├── permissions.md
├── development.md
└── deployment.md
```

Document important architectural decisions, including the RLS-deferred decision noted in Section 6.

---

# 14. Code Quality Rules

1. Use TypeScript strictly on frontend.
2. Use `.tsx` for React components.
3. Use `.ts` for non-component TypeScript files.
4. Avoid unnecessary `any`.
5. Keep components small and reusable.
6. Keep business logic outside UI components.
7. Keep FastAPI route handlers thin.
8. Use service/repository separation.
9. Use Pydantic schemas for API validation.
10. Use SQLAlchemy models for database entities.
11. Use Alembic for migrations.
12. Never expose secrets.
13. Never trust tenant IDs from the frontend.
14. Apply backend authorization to every protected operation.
15. Use consistent API response/error structures.
16. Add tests for important business logic (Vitest/RTL frontend, Pytest backend).
17. Avoid premature over-engineering.
18. Do not duplicate shared functionality.
19. Keep modules independently maintainable.
20. Do not modify unrelated existing code.
21. Run ESLint/Prettier (frontend) and Ruff/mypy (backend) as part of the workflow.

---

# 15. Initial UI Foundation

For the frontend foundation, create only the basic application shell:

* Login placeholder
* Dashboard placeholder
* Sidebar
* Header
* Main content area
* Routing structure
* Responsive layout
* Loading state
* Error state
* Empty state
* Basic reusable UI components

Do NOT implement complete CRM/HRM/payroll functionality yet.

The design should be modern, professional, clean, and SaaS-oriented. Avoid excessive animations or decorative elements that hurt usability.

---

# 16. Environment Strategy

Prepare environments conceptually as:

```text
Development
     ↓
Staging
     ↓
Production
```

Use separate environment configurations. Never commit `.env`. Commit only `.env.example`.

---

# 17. Database Foundation

At this stage, prepare the database architecture for future core entities such as:

```text
tenants
users
roles
permissions
user_roles
tenant_members
invitations
sessions
refresh_tokens
audit_logs
plans
subscriptions
usage_records
```

Do not implement every business table yet.

The database design must allow future modules to connect cleanly through `tenant_id`.

---

# 18. Audit Logging

Prepare architecture for audit logs.

Sensitive actions should eventually be trackable, including:
* Login
* Logout
* Password changes
* User creation
* Permission changes
* Payroll processing
* Subscription changes
* Important customer/vendor changes
* Administrative actions

---

# 19. README

Create a useful root README containing:
* Project overview
* Architecture
* Tech stack
* Folder structure
* Local setup
* Docker commands
* Environment setup
* Development commands
* Testing commands
* API information
* Future module roadmap

---

# 20. Implementation Process

Follow this exact order:

### Step 1
Inspect the current project.

### Step 2
Identify whether a frontend/backend already exists.

### Step 3
Do not destroy existing working code unnecessarily.

### Step 4
Create the target structure.

### Step 5
Configure frontend React 19 + TypeScript + Vite (+ ESLint/Prettier/Vitest).

### Step 6
Configure FastAPI backend (+ Ruff/mypy/Pytest).

### Step 7
Configure PostgreSQL connection.

### Step 8
Configure Redis.

### Step 9
Configure worker infrastructure.

### Step 10
Configure Docker Compose.

### Step 11
Configure environment variables.

### Step 12
Create basic authentication architecture (JWT, password hashing).

### Step 13
Create API `/api/v1` foundation, including `/health` and `/ready`.

### Step 14
Create frontend routing/layout foundation.

### Step 15
Create documentation.

### Step 16
Run lint/type checks/tests/build.

### Step 17
Fix only issues caused by this setup.

---

# 21. Definition of Done

This phase is complete only when:

* Frontend starts successfully.
* TypeScript compiles successfully.
* Backend starts successfully.
* FastAPI `/api/v1` foundation works, including `/health` and `/ready`.
* PostgreSQL connection works.
* Redis connection works.
* Worker can start.
* Docker Compose works.
* Frontend can communicate with backend.
* CORS is configured for the frontend origin.
* Environment variables are configured correctly.
* No secrets are committed.
* Folder structure matches the architecture.
* Lint/type-check tooling (ESLint/Prettier/Ruff/mypy) runs cleanly.
* README contains setup instructions.
* Documentation exists.
* Basic routing works.
* Basic dashboard shell works.
* No major lint/type/build errors remain.

---

# 22. VERY IMPORTANT — Scope Control

This is a foundation/setup task.

Do NOT:
* Build the complete CRM.
* Build complete HRM.
* Build complete Payroll.
* Build payment gateway.
* Build WhatsApp integration.
* Build advanced reports.
* Build complex dashboards.
* Add unnecessary libraries.
* Change the chosen stack.
* Replace FastAPI with Django.
* Replace TypeScript with JavaScript.
* Enable PostgreSQL RLS at this stage (deferred per Section 6).
* Rename the architecture without a strong technical reason.
* Add unrelated features.

Keep the implementation clean, modular, scalable, and ready for the next development phase.

At the end, provide a concise report containing:

1. What was created
2. What was configured
3. Current folder structure
4. Commands to run the project
5. Any remaining issues
6. Recommended next phase

Do not claim something works unless you actually test it.