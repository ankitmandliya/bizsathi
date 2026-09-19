# HRM Module V1 — Task Tracker

## Layer 0 — Models
- [x] Create `backend/app/models/hrm.py`
- [x] Update `backend/app/models/__init__.py`

## Layer 1 — Migration
- [x] Create `backend/migrations/versions/004_hrm_module.py`

## Layer 2 — Schemas
- [x] Create `backend/app/schemas/hrm.py`

## Layer 3 — Repositories
- [x] Create `backend/app/repositories/hrm.py`

## Layer 4 — Services
- [x] Create `backend/app/services/hrm.py`
- [x] Create `backend/app/tasks/hrm_eod.py`

## Layer 5 — API Routes
- [x] Replace `backend/app/api/v1/hrm/routes.py`

## Layer 6 — Frontend
- [x] Create `frontend/src/features/hrm/services/hrmApi.ts`
- [x] Create `frontend/src/features/hrm/pages/EmployeesPage.tsx`
- [x] Create `frontend/src/features/hrm/pages/AttendancePage.tsx`
- [x] Create `frontend/src/features/hrm/pages/LeavePage.tsx`
- [x] Create `frontend/src/features/hrm/pages/SalaryAdvancePage.tsx`
- [x] Create `frontend/src/features/hrm/pages/PayrollPage.tsx`
- [x] Update `frontend/src/features/hrm/index.ts`
- [x] Update `frontend/src/app/router/index.tsx`

## Layer 7 — Tests
- [x] Create `backend/tests/test_hrm.py`
- [x] Create `frontend/src/test/hrm.test.tsx`

## Verification
- [x] Run backend tests (66/66 passed)
- [x] Run frontend unit tests (9/9 passed)
- [x] Run frontend TypeScript type-check (`tsc -b`)
- [x] Build frontend production bundle (`vite build`)
