import asyncio
from datetime import date, time, datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.domain import Tenant, User, TenantMember
from app.models.hrm import (
    Attendance,
    Department,
    Designation,
    Employee,
    Holiday,
    LeaveRequest,
    LeaveType,
    Payroll,
    Payslip,
    SalaryAdvance,
    SalaryStructure,
    WorkSchedule,
)
from app.schemas.hrm import (
    EmployeeCreate,
    LeaveRequestCreate,
    SalaryAdvanceCreate,
    SalaryStructureCreate,
)
from app.services.hrm import HRMService, seed_default_work_schedule, seed_default_leave_types


async def seed_tenant_hrm_data(tenant_id: UUID, admin_user_id: UUID):
    async with AsyncSessionLocal() as db:
        hrm = HRMService(db)

        # 1. Ensure Work Schedule & Leave Types
        sched = await hrm.get_active_schedule(tenant_id)
        if not sched:
            sched = await seed_default_work_schedule(db, tenant_id)

        leave_types = await hrm.list_leave_types(tenant_id)
        if not leave_types:
            leave_types = await seed_default_leave_types(db, tenant_id)

        casual_leave_type = next((lt for lt in leave_types if "casual" in lt.name.lower()), leave_types[0])

        # 2. Setup Departments & Designations
        dept_names = ["Sales", "Accounts", "Operations", "Engineering"]
        dept_map = {}
        for dname in dept_names:
            d = (await db.execute(select(Department).where(Department.tenant_id == tenant_id, Department.name == dname))).scalar_one_or_none()
            if not d:
                d = Department(tenant_id=tenant_id, name=dname)
                db.add(d)
                await db.flush()
            dept_map[dname] = d

        desig_names = [
            ("Senior Developer", dept_map["Engineering"].id),
            ("HR Manager", dept_map["Accounts"].id),
            ("Sales Executive", dept_map["Sales"].id),
            ("Intern", dept_map["Engineering"].id),
        ]
        desig_map = {}
        for dname, dept_id in desig_names:
            des = (await db.execute(select(Designation).where(Designation.tenant_id == tenant_id, Designation.name == dname))).scalar_one_or_none()
            if not des:
                des = Designation(tenant_id=tenant_id, name=dname, department_id=dept_id)
                db.add(des)
                await db.flush()
            desig_map[dname] = des

        # 3. Create/Retrieve the 4 Employees
        emp_configs = [
            {
                "key": "rahul",
                "name": "Rahul Sharma",
                "email": "rahul.sharma@bizsathi.com",
                "phone": "+91 9876543210",
                "dept": dept_map["Sales"].id,
                "desig": desig_map["Senior Developer"].id,
                "type": "Full-time",
                "login": True,
                "base": 25000.0,
                "hra": 5000.0,
                "allowance": 0.0,
            },
            {
                "key": "priya",
                "name": "Priya Verma",
                "email": "priya.verma@bizsathi.com",
                "phone": "+91 9876543211",
                "dept": dept_map["Accounts"].id,
                "desig": desig_map["HR Manager"].id,
                "type": "Full-time",
                "login": True,
                "base": 30000.0,
                "hra": 6000.0,
                "allowance": 2000.0,
            },
            {
                "key": "amit",
                "name": "Amit Singh",
                "email": "amit.singh@bizsathi.com",
                "phone": "+91 9876543212",
                "dept": dept_map["Operations"].id,
                "desig": desig_map["Sales Executive"].id,
                "type": "Full-time",
                "login": False,
                "base": 20000.0,
                "hra": 4000.0,
                "allowance": 0.0,
            },
            {
                "key": "neha",
                "name": "Neha Joshi",
                "email": "neha.joshi@bizsathi.com",
                "phone": "+91 9876543213",
                "dept": dept_map["Engineering"].id,
                "desig": desig_map["Intern"].id,
                "type": "Part-time",
                "login": True,
                "base": 15000.0,
                "hra": 0.0,
                "allowance": 0.0,
            },
        ]

        employees = {}
        for cfg in emp_configs:
            existing = (await db.execute(select(Employee).where(Employee.tenant_id == tenant_id, Employee.email == cfg["email"]))).scalar_one_or_none()
            if not existing:
                emp = await hrm.create_employee(
                    tenant_id,
                    EmployeeCreate(
                        name=cfg["name"],
                        email=cfg["email"],
                        phone=cfg["phone"],
                        department_id=cfg["dept"],
                        designation_id=cfg["desig"],
                        employment_type=cfg["type"],
                        joining_date=date(2026, 1, 1),
                        status="Active",
                    ),
                    admin_user_id,
                )
            else:
                emp = existing
            employees[cfg["key"]] = emp

            # Set Salary Structure
            struct_existing = (await db.execute(select(SalaryStructure).where(SalaryStructure.employee_id == emp.id, SalaryStructure.effective_to.is_(None)))).scalar_one_or_none()
            if not struct_existing:
                await hrm.set_salary_structure(
                    tenant_id,
                    emp.id,
                    SalaryStructureCreate(
                        basic=cfg["base"],
                        hra=cfg["hra"],
                        other_allowances=cfg["allowance"],
                        effective_from=date(2026, 1, 1),
                    ),
                    admin_user_id,
                )

            # Setup User account if login enabled
            if cfg["login"] and not emp.user_id:
                u_existing = (await db.execute(select(User).where(User.email == cfg["email"]))).scalar_one_or_none()
                if not u_existing:
                    u_existing = User(
                        id=uuid4(),
                        email=cfg["email"],
                        password_hash=hash_password("Password123!"),
                        full_name=cfg["name"],
                        is_active=True,
                        is_verified=True,
                    )
                    db.add(u_existing)
                    await db.flush()
                
                # Tenant member link
                tm_existing = (await db.execute(select(TenantMember).where(TenantMember.user_id == u_existing.id, TenantMember.tenant_id == tenant_id))).scalar_one_or_none()
                if not tm_existing:
                    db.add(TenantMember(user_id=u_existing.id, tenant_id=tenant_id, status="active"))
                    await db.flush()

                emp.user_id = u_existing.id
                await db.flush()

        # 4. August 2026 Leave Requests (Priya)
        priya_emp = employees["priya"]
        existing_leave = (await db.execute(select(LeaveRequest).where(LeaveRequest.employee_id == priya_emp.id, LeaveRequest.start_date == date(2026, 8, 17)))).scalar_one_or_none()
        if not existing_leave:
            req = await hrm.create_leave_request(
                tenant_id,
                LeaveRequestCreate(
                    employee_id=priya_emp.id,
                    leave_type_id=casual_leave_type.id,
                    start_date=date(2026, 8, 17),
                    end_date=date(2026, 8, 18),
                    reason="Family event",
                ),
                admin_user_id,
            )
            await hrm.approve_leave(tenant_id, req.id, admin_user_id)

        # 5. August 2026 Attendance Records (21 Mon-Fri Working Days)
        working_days = [
            date(2026, 8, d)
            for d in [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 31]
        ]

        def dt(d: date, t: time):
            return datetime.combine(d, t, tzinfo=timezone.utc)

        for d in working_days:
            # Rahul: LATE on 5, 12, 19; ABSENT on 24, 25; HALF_DAY on 28; rest PRESENT
            rahul_emp = employees["rahul"]
            r_att = (await db.execute(select(Attendance).where(Attendance.employee_id == rahul_emp.id, Attendance.attendance_date == d))).scalar_one_or_none()
            if not r_att:
                if d in [date(2026, 8, 24), date(2026, 8, 25)]:
                    db.add(Attendance(tenant_id=tenant_id, employee_id=rahul_emp.id, attendance_date=d, status="ABSENT", check_in_at=None, check_out_at=None))
                elif d == date(2026, 8, 28):
                    db.add(Attendance(tenant_id=tenant_id, employee_id=rahul_emp.id, attendance_date=d, status="HALF_DAY", check_in_at=dt(d, time(9, 30)), check_out_at=dt(d, time(13, 30))))
                elif d in [date(2026, 8, 5), date(2026, 8, 12), date(2026, 8, 19)]:
                    db.add(Attendance(tenant_id=tenant_id, employee_id=rahul_emp.id, attendance_date=d, status="LATE", check_in_at=dt(d, time(10, 15)), check_out_at=dt(d, time(18, 30))))
                else:
                    db.add(Attendance(tenant_id=tenant_id, employee_id=rahul_emp.id, attendance_date=d, status="PRESENT", check_in_at=dt(d, time(9, 30)), check_out_at=dt(d, time(18, 30))))

            # Priya: LEAVE on 17, 18; rest PRESENT
            p_att = (await db.execute(select(Attendance).where(Attendance.employee_id == priya_emp.id, Attendance.attendance_date == d))).scalar_one_or_none()
            if not p_att:
                if d in [date(2026, 8, 17), date(2026, 8, 18)]:
                    db.add(Attendance(tenant_id=tenant_id, employee_id=priya_emp.id, attendance_date=d, status="LEAVE", check_in_at=None, check_out_at=None))
                else:
                    db.add(Attendance(tenant_id=tenant_id, employee_id=priya_emp.id, attendance_date=d, status="PRESENT", check_in_at=dt(d, time(9, 30)), check_out_at=dt(d, time(18, 30))))

            # Amit: LATE on 6, 13; ABSENT on 20; rest PRESENT
            amit_emp = employees["amit"]
            a_att = (await db.execute(select(Attendance).where(Attendance.employee_id == amit_emp.id, Attendance.attendance_date == d))).scalar_one_or_none()
            if not a_att:
                if d == date(2026, 8, 20):
                    db.add(Attendance(tenant_id=tenant_id, employee_id=amit_emp.id, attendance_date=d, status="ABSENT", check_in_at=None, check_out_at=None))
                elif d in [date(2026, 8, 6), date(2026, 8, 13)]:
                    db.add(Attendance(tenant_id=tenant_id, employee_id=amit_emp.id, attendance_date=d, status="LATE", check_in_at=dt(d, time(10, 10)), check_out_at=dt(d, time(18, 30))))
                else:
                    db.add(Attendance(tenant_id=tenant_id, employee_id=amit_emp.id, attendance_date=d, status="PRESENT", check_in_at=dt(d, time(9, 30)), check_out_at=dt(d, time(18, 30))))

            # Neha: HALF_DAY on 14; ABSENT on 21; rest PRESENT
            neha_emp = employees["neha"]
            n_att = (await db.execute(select(Attendance).where(Attendance.employee_id == neha_emp.id, Attendance.attendance_date == d))).scalar_one_or_none()
            if not n_att:
                if d == date(2026, 8, 21):
                    db.add(Attendance(tenant_id=tenant_id, employee_id=neha_emp.id, attendance_date=d, status="ABSENT", check_in_at=None, check_out_at=None))
                elif d == date(2026, 8, 14):
                    db.add(Attendance(tenant_id=tenant_id, employee_id=neha_emp.id, attendance_date=d, status="HALF_DAY", check_in_at=dt(d, time(9, 30)), check_out_at=dt(d, time(13, 30))))
                else:
                    db.add(Attendance(tenant_id=tenant_id, employee_id=neha_emp.id, attendance_date=d, status="PRESENT", check_in_at=dt(d, time(9, 30)), check_out_at=dt(d, time(18, 30))))

        await db.flush()

        # 6. Salary Advance for Rahul (₹3,000)
        rahul_emp = employees["rahul"]
        existing_adv = (await db.execute(select(SalaryAdvance).where(SalaryAdvance.employee_id == rahul_emp.id, SalaryAdvance.payroll_period == "2026-08"))).scalar_one_or_none()
        if not existing_adv:
            await hrm.create_salary_advance(
                tenant_id,
                SalaryAdvanceCreate(
                    amount=3000.0,
                    reason="Festival expense",
                    payroll_period="2026-08",
                    employee_id=rahul_emp.id,
                    advance_date=date(2026, 8, 10),
                ),
                admin_user_id,
            )

        # 7. Run Payroll for August 2026
        existing_payroll = (await db.execute(select(Payroll).where(Payroll.tenant_id == tenant_id, Payroll.payroll_period == "2026-08"))).scalar_one_or_none()
        if not existing_payroll:
            payroll = await hrm.run_payroll(tenant_id, "2026-08", admin_user_id)
            print(f"Payroll executed for tenant {tenant_id}, Payroll ID: {payroll.id}")
        else:
            print(f"Payroll already exists for tenant {tenant_id}, ID: {existing_payroll.id}")

        await db.commit()
        print(f"Successfully seeded HRM data for tenant {tenant_id}!")


async def main():
    admin_user_id = UUID("11111111-1111-1111-1111-111111111111")
    async with AsyncSessionLocal() as db:
        tenants = (await db.execute(select(Tenant))).scalars().all()
        for t in tenants:
            if t.id == UUID("00000000-0000-0000-0000-000000000000") or "Verification" not in t.name:
                print(f"Seeding tenant: {t.name} ({t.id})...")
                await seed_tenant_hrm_data(t.id, admin_user_id)


if __name__ == "__main__":
    asyncio.run(main())
