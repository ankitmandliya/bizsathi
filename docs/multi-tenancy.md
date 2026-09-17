# Multi-tenancy plan

This project uses a shared-database/shared-schema model with a `tenant_id` column on tenant-owned tables.

## Current approach

- Tenant context is derived from the authenticated user session.
- Repository/service queries must filter by the current tenant.
- RLS is not enabled in this step.

## Deferred follow-up

PostgreSQL Row Level Security can be added later as a defense-in-depth layer once the core models are implemented. This is intentionally deferred to keep the initial foundation simpler and easier to reason about.
