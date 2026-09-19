"""005_hrm_addendum.py — HRM Addendum migration

Adds:
1. user_id column on employees table (with FK to users.id)
2. payday column on work_schedules table
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005_hrm_addendum"
down_revision = "004_hrm_module"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add payday to work_schedules
    op.add_column(
        "work_schedules",
        sa.Column("payday", sa.Integer(), nullable=False, server_default="1"),
    )

    # Add user_id to employees
    op.add_column(
        "employees",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_employees_tenant_user", "employees", ["tenant_id", "user_id"])


def downgrade() -> None:
    op.drop_index("ix_employees_tenant_user", table_name="employees")
    op.drop_column("employees", "user_id")
    op.drop_column("work_schedules", "payday")
