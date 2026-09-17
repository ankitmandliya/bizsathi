# Architecture

BizSathi is structured as a monorepo with a React + TypeScript frontend, a FastAPI backend, asynchronous workers, and infrastructure placeholders. The system is designed for multi-tenancy, modular growth, and AWS deployment readiness.

## Layers

- Frontend: app shell, routing, dashboard, and future domain modules
- Backend: API, validation, services, repositories, permissions, and core configuration
- Workers: asynchronous communication and reporting tasks
- Infrastructure: deployment and cloud configuration placeholders

## Multi-tenancy

Tenant isolation is enforced in service/repository logic via `tenant_id` from the authenticated user context. PostgreSQL RLS is intentionally deferred for this foundation phase.
