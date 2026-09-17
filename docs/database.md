# Database plan

This project uses PostgreSQL as the system of record. Initial tables are envisioned for tenants, users, roles, permissions, sessions, refresh tokens, audit logs, subscriptions, and usage records.

## Design principles

- Shared database / shared schema
- `tenant_id` on tenant-owned entities
- Service/repository-level isolation
- Future Alembic migrations for schema evolution
