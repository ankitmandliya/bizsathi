"""004_hrm_module.py — HRM Module V1

Creates all HRM tables: departments, designations, work_schedules, holidays,
employees, salary_structures, attendances, leave_types, leave_requests,
salary_advances, payrolls, payslips.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004_hrm_module"
down_revision = "003_sales_module"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- departments ---
    op.create_table(
        "departments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_departments_tenant", "departments", ["tenant_id"])

    # --- designations ---
    op.create_table(
        "designations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_designations_tenant", "designations", ["tenant_id"])

    # --- work_schedules ---
    op.create_table(
        "work_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("working_days", sa.String(50), nullable=False, server_default="0,1,2,3,4"),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("late_after_minutes", sa.Integer, nullable=False, server_default="15"),
        sa.Column("half_day_threshold_hours", sa.Integer, nullable=False, server_default="4"),
        sa.Column("effective_from", sa.Date, nullable=False),
        sa.Column("effective_to", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_work_schedules_tenant", "work_schedules", ["tenant_id"])

    # --- holidays ---
    op.create_table(
        "holidays",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("holiday_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_holidays_tenant_date", "holidays", ["tenant_id", "holiday_date"])

    # --- employees ---
    op.create_table(
        "employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("designation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("designations.id"), nullable=True),
        sa.Column("joining_date", sa.Date, nullable=True),
        sa.Column("employment_type", sa.String(50), nullable=False, server_default="Full-time"),
        sa.Column("status", sa.String(50), nullable=False, server_default="Active"),
        sa.Column("bank_account_number", sa.String(100), nullable=True),
        sa.Column("bank_ifsc", sa.String(20), nullable=True),
        sa.Column("emergency_contact_name", sa.String(255), nullable=True),
        sa.Column("emergency_contact_phone", sa.String(50), nullable=True),
        sa.Column("pf_number", sa.String(100), nullable=True),
        sa.Column("esi_number", sa.String(100), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_employees_email", "employees", ["email"])
    op.create_index("ix_employees_tenant_dept", "employees", ["tenant_id", "department_id"])
    op.create_index("ix_employees_tenant_status", "employees", ["tenant_id", "status"])

    # --- salary_structures ---
    op.create_table(
        "salary_structures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("basic", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("hra", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("other_allowances", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("pf_deduction", sa.Numeric(12, 2), nullable=True),
        sa.Column("other_deductions", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("effective_from", sa.Date, nullable=False),
        sa.Column("effective_to", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_salary_structures_tenant_employee", "salary_structures", ["tenant_id", "employee_id"])

    # --- attendances ---
    op.create_table(
        "attendances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("attendance_date", sa.Date, nullable=False),
        sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("working_minutes", sa.Integer, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="ABSENT"),
        sa.Column("source", sa.String(10), nullable=False, server_default="MANUAL"),
        sa.Column("remarks", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("tenant_id", "employee_id", "attendance_date", name="uq_attendance_tenant_emp_date"),
    )
    op.create_index("ix_attendances_tenant_employee", "attendances", ["tenant_id", "employee_id"])
    op.create_index("ix_attendances_tenant_date", "attendances", ["tenant_id", "attendance_date"])
    op.create_index("ix_attendances_tenant_status", "attendances", ["tenant_id", "status"])

    # --- leave_types ---
    op.create_table(
        "leave_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_paid", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("default_annual_days", sa.Integer, nullable=False, server_default="12"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # --- leave_requests ---
    op.create_table(
        "leave_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("leave_type_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("approved_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_leave_requests_tenant_employee", "leave_requests", ["tenant_id", "employee_id"])
    op.create_index("ix_leave_requests_tenant_status", "leave_requests", ["tenant_id", "status"])

    # --- payrolls ---
    op.create_table(
        "payrolls",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payroll_period", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processed_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("tenant_id", "payroll_period", name="uq_payroll_tenant_period"),
    )
    op.create_index("ix_payrolls_tenant_period", "payrolls", ["tenant_id", "payroll_period"])

    # --- salary_advances (depends on payrolls) ---
    op.create_table(
        "salary_advances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("advance_date", sa.Date, nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("payroll_period", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("payroll_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payrolls.id"), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_salary_advances_tenant_employee", "salary_advances", ["tenant_id", "employee_id"])
    op.create_index("ix_salary_advances_tenant_period", "salary_advances", ["tenant_id", "payroll_period"])

    # --- payslips ---
    op.create_table(
        "payslips",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payroll_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payrolls.id"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("gross_salary", sa.Numeric(12, 2), nullable=False),
        sa.Column("basic", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("hra", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("other_allowances", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("working_days_in_period", sa.Integer, nullable=False),
        sa.Column("unpaid_absence_days", sa.Integer, nullable=False, server_default="0"),
        sa.Column("unpaid_absence_deduction", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("salary_advance_deduction", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("other_deductions", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("net_payable", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_payslips_payroll", "payslips", ["payroll_id"])
    op.create_index("ix_payslips_tenant_employee", "payslips", ["tenant_id", "employee_id"])


def downgrade() -> None:
    op.drop_table("payslips")
    op.drop_table("salary_advances")
    op.drop_table("payrolls")
    op.drop_table("leave_requests")
    op.drop_table("leave_types")
    op.drop_table("attendances")
    op.drop_table("salary_structures")
    op.drop_table("employees")
    op.drop_table("holidays")
    op.drop_table("work_schedules")
    op.drop_table("designations")
    op.drop_table("departments")
