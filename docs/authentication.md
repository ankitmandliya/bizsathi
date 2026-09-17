# Authentication plan

Authentication is built around JWT access and refresh tokens, bcrypt-based password hashing, and tenant-aware session handling.

## Planned workflow

- Register and verify email
- Login and issue access/refresh tokens
- Revoke sessions on logout
- Manage tenant membership and invitations
- Apply RBAC checks in the backend service layer
