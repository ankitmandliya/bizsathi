import csv
from datetime import UTC, datetime
import io
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import Activity, Customer, Deal, Lead, PipelineStage
from app.repositories.crm import (
    ActivityRepository,
    CustomerRepository,
    DealRepository,
    LeadRepository,
    PipelineStageRepository,
)
from app.schemas.crm import (
    ActivityCreate,
    ActivityUpdate,
    CustomerCreate,
    CustomerImportRowError,
    CustomerImportSummary,
    CustomerUpdate,
    DealCreate,
    DealUpdate,
    LeadCreate,
    LeadUpdate,
)
from app.services.audit import log_audit_event


DEFAULT_PIPELINE_STAGES = [
    {"name": "New", "order": 1, "probability": 10, "is_won": False, "is_lost": False},
    {"name": "Contacted", "order": 2, "probability": 25, "is_won": False, "is_lost": False},
    {"name": "Qualified", "order": 3, "probability": 50, "is_won": False, "is_lost": False},
    {"name": "Proposal", "order": 4, "probability": 75, "is_won": False, "is_lost": False},
    {"name": "Won", "order": 5, "probability": 100, "is_won": True, "is_lost": False},
    {"name": "Lost", "order": 6, "probability": 0, "is_won": False, "is_lost": True},
]


async def seed_default_pipeline_stages(db: AsyncSession, tenant_id: UUID) -> list[PipelineStage]:
    stage_repo = PipelineStageRepository(db)
    existing = await stage_repo.list_for_tenant(tenant_id)
    if existing:
        return list(existing)

    stages: list[PipelineStage] = []
    for stage_data in DEFAULT_PIPELINE_STAGES:
        stage = PipelineStage(
            tenant_id=tenant_id,
            name=stage_data["name"],
            order=stage_data["order"],
            probability=stage_data["probability"],
            is_won=stage_data["is_won"],
            is_lost=stage_data["is_lost"],
            is_active=True,
        )
        db.add(stage)
        stages.append(stage)
    
    await db.flush()
    return stages


class CRMService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.lead_repo = LeadRepository(db)
        self.stage_repo = PipelineStageRepository(db)
        self.deal_repo = DealRepository(db)
        self.activity_repo = ActivityRepository(db)
        self.customer_repo = CustomerRepository(db)

    async def list_pipeline_stages(self, tenant_id: UUID) -> list[PipelineStage]:
        stages = await self.stage_repo.list_for_tenant(tenant_id)
        if not stages:
            stages = await seed_default_pipeline_stages(self.db, tenant_id)
            await self.db.commit()
        return list(stages)

    # --- Leads ---
    async def create_lead(
        self,
        tenant_id: UUID,
        user_id: UUID,
        lead_in: LeadCreate,
        ip_address: str | None = None,
    ) -> Lead:
        lead = Lead(
            tenant_id=tenant_id,
            **lead_in.model_dump(),
        )
        created_lead = await self.lead_repo.create(lead)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.lead.create",
            entity_type="lead",
            entity_id=str(created_lead.id),
            details={"name": created_lead.name, "source": created_lead.source, "status": created_lead.status},
            ip_address=ip_address,
        )
        await self.db.commit()
        return created_lead

    async def get_lead(self, tenant_id: UUID, lead_id: UUID) -> Lead:
        lead = await self.lead_repo.get_by_id(tenant_id, lead_id)
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found",
            )
        return lead

    async def list_leads(
        self,
        tenant_id: UUID,
        search: str | None = None,
        lead_status: str | None = None,
        source: str | None = None,
        priority: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Lead], int]:
        items, total = await self.lead_repo.list_leads(
            tenant_id=tenant_id,
            search=search,
            status=lead_status,
            source=source,
            priority=priority,
            skip=skip,
            limit=limit,
        )
        return list(items), total

    async def update_lead(
        self,
        tenant_id: UUID,
        user_id: UUID,
        lead_id: UUID,
        lead_in: LeadUpdate,
        ip_address: str | None = None,
    ) -> Lead:
        lead = await self.get_lead(tenant_id, lead_id)
        update_data = lead_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(lead, key, value)
        
        await self.db.flush()
        await self.db.refresh(lead)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.lead.update",
            entity_type="lead",
            entity_id=str(lead.id),
            details=update_data,
            ip_address=ip_address,
        )
        await self.db.commit()
        return lead

    async def delete_lead(
        self,
        tenant_id: UUID,
        user_id: UUID,
        lead_id: UUID,
        ip_address: str | None = None,
    ) -> bool:
        lead = await self.get_lead(tenant_id, lead_id)
        success = await self.lead_repo.soft_delete(tenant_id, lead_id)
        if success:
            await log_audit_event(
                self.db,
                tenant_id=tenant_id,
                user_id=user_id,
                action="crm.lead.delete",
                entity_type="lead",
                entity_id=str(lead_id),
                details={"name": lead.name},
                ip_address=ip_address,
            )
            await self.db.commit()
        return success

    async def convert_lead_to_customer(
        self,
        tenant_id: UUID,
        user_id: UUID,
        lead_id: UUID,
        ip_address: str | None = None,
    ) -> Customer:
        lead = await self.get_lead(tenant_id, lead_id)

        # Fix 1: Check if lead is already converted
        if lead.converted_customer_id:
            existing_customer = await self.customer_repo.get_by_id(tenant_id, lead.converted_customer_id)
            if existing_customer:
                return existing_customer

        existing_customer = await self.customer_repo.get_by_lead_id(tenant_id, lead_id)
        if existing_customer:
            lead.converted_customer_id = existing_customer.id
            if not lead.converted_at:
                lead.converted_at = datetime.now(UTC)
            lead.status = "Converted"
            await self.db.flush()
            await self.db.commit()
            return existing_customer

        customer = Customer(
            tenant_id=tenant_id,
            name=lead.name,
            company=lead.company,
            email=lead.email,
            phone=lead.phone,
            whatsapp=lead.whatsapp,
            converted_from_lead_id=lead.id,
            assigned_user_id=lead.assigned_user_id,
        )
        created_customer = await self.customer_repo.create(customer)

        lead.converted_customer_id = created_customer.id
        lead.converted_at = datetime.now(UTC)
        lead.status = "Converted"
        await self.db.flush()

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.lead.convert",
            entity_type="lead",
            entity_id=str(lead.id),
            details={"customer_id": str(created_customer.id)},
            ip_address=ip_address,
        )
        await self.db.commit()
        return created_customer

    # --- Deals ---
    async def create_deal(
        self,
        tenant_id: UUID,
        user_id: UUID,
        deal_in: DealCreate,
        ip_address: str | None = None,
    ) -> Deal:
        stage = await self.stage_repo.get_by_id(tenant_id, deal_in.stage_id)
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid pipeline stage for this tenant",
            )

        # Cross-tenant parent validation for Deal
        if deal_in.lead_id:
            lead = await self.lead_repo.get_by_id(tenant_id, deal_in.lead_id)
            if not lead:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Linked lead does not belong to this tenant",
                )

        if deal_in.customer_id:
            customer = await self.customer_repo.get_by_id(tenant_id, deal_in.customer_id)
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Linked customer does not belong to this tenant",
                )

        deal_dict = deal_in.model_dump()
        deal_dict["owner_id"] = user_id if deal_in.owner_id is None else deal_in.owner_id

        if deal_in.probability == 0 and stage.probability > 0:
            deal_dict["probability"] = stage.probability

        if stage.is_won:
            deal_dict["actual_closing_date"] = datetime.now(UTC)
        elif stage.is_lost:
            deal_dict["actual_closing_date"] = datetime.now(UTC)

        deal = Deal(
            tenant_id=tenant_id,
            **deal_dict,
        )
        created_deal = await self.deal_repo.create(deal)

        # Auto-convert lead to customer if stage is won & not already converted/linked
        if stage.is_won:
            if not created_deal.customer_id and created_deal.lead_id:
                converted_cust = await self.convert_lead_to_customer(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    lead_id=created_deal.lead_id,
                    ip_address=ip_address,
                )
                created_deal.customer_id = converted_cust.id
                await self.db.flush()

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.deal.create",
            entity_type="deal",
            entity_id=str(created_deal.id),
            details={"title": created_deal.title, "value": created_deal.value, "stage_id": str(stage.id)},
            ip_address=ip_address,
        )
        await self.db.commit()

        return await self.get_deal(tenant_id, created_deal.id)

    async def get_deal(self, tenant_id: UUID, deal_id: UUID) -> Deal:
        deal = await self.deal_repo.get_by_id(tenant_id, deal_id)
        if not deal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deal not found",
            )
        return deal

    async def list_deals(
        self,
        tenant_id: UUID,
        stage_id: UUID | None = None,
        lead_id: UUID | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Deal], int]:
        items, total = await self.deal_repo.list_deals(
            tenant_id=tenant_id,
            stage_id=stage_id,
            lead_id=lead_id,
            search=search,
            skip=skip,
            limit=limit,
        )
        return list(items), total

    async def update_deal(
        self,
        tenant_id: UUID,
        user_id: UUID,
        deal_id: UUID,
        deal_in: DealUpdate,
        ip_address: str | None = None,
    ) -> Deal:
        deal = await self.get_deal(tenant_id, deal_id)
        update_data = deal_in.model_dump(exclude_unset=True)

        if "lead_id" in update_data and update_data["lead_id"]:
            lead = await self.lead_repo.get_by_id(tenant_id, update_data["lead_id"])
            if not lead:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Linked lead does not belong to this tenant",
                )

        if "customer_id" in update_data and update_data["customer_id"]:
            customer = await self.customer_repo.get_by_id(tenant_id, update_data["customer_id"])
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Linked customer does not belong to this tenant",
                )

        if "stage_id" in update_data and update_data["stage_id"] != deal.stage_id:
            new_stage = await self.stage_repo.get_by_id(tenant_id, update_data["stage_id"])
            if not new_stage:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid pipeline stage for this tenant",
                )
            deal.stage_id = new_stage.id
            deal.probability = new_stage.probability
            if new_stage.is_won:
                deal.actual_closing_date = datetime.now(UTC)
                if not deal.customer_id and deal.lead_id:
                    converted_cust = await self.convert_lead_to_customer(
                        tenant_id=tenant_id,
                        user_id=user_id,
                        lead_id=deal.lead_id,
                        ip_address=ip_address,
                    )
                    deal.customer_id = converted_cust.id
            elif new_stage.is_lost:
                deal.actual_closing_date = datetime.now(UTC)
                # Historical conversion remains intact — do NOT delete or unlink customer!

            await log_audit_event(
                self.db,
                tenant_id=tenant_id,
                user_id=user_id,
                action="crm.deal.stage_change",
                entity_type="deal",
                entity_id=str(deal.id),
                details={"old_stage_id": str(deal.stage_id), "new_stage_id": str(new_stage.id)},
                ip_address=ip_address,
            )

        for key, value in update_data.items():
            if key != "stage_id":
                setattr(deal, key, value)

        await self.db.flush()

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.deal.update",
            entity_type="deal",
            entity_id=str(deal.id),
            details=update_data,
            ip_address=ip_address,
        )
        await self.db.commit()

        return await self.get_deal(tenant_id, deal.id)

    async def delete_deal(
        self,
        tenant_id: UUID,
        user_id: UUID,
        deal_id: UUID,
        ip_address: str | None = None,
    ) -> bool:
        deal = await self.get_deal(tenant_id, deal_id)
        success = await self.deal_repo.soft_delete(tenant_id, deal_id)
        if success:
            await log_audit_event(
                self.db,
                tenant_id=tenant_id,
                user_id=user_id,
                action="crm.deal.delete",
                entity_type="deal",
                entity_id=str(deal_id),
                details={"title": deal.title},
                ip_address=ip_address,
            )
            await self.db.commit()
        return success

    # --- Activities ---
    async def validate_activity_parent(
        self,
        tenant_id: UUID,
        lead_id: UUID | None,
        deal_id: UUID | None,
        customer_id: UUID | None,
    ) -> None:
        if not lead_id and not deal_id and not customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Activity must be linked to at least one lead, deal, or customer",
            )

        if lead_id:
            lead = await self.lead_repo.get_by_id(tenant_id, lead_id)
            if not lead:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or cross-tenant lead_id",
                )

        if deal_id:
            deal = await self.deal_repo.get_by_id(tenant_id, deal_id)
            if not deal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or cross-tenant deal_id",
                )

        if customer_id:
            customer = await self.customer_repo.get_by_id(tenant_id, customer_id)
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or cross-tenant customer_id",
                )

    async def create_activity(
        self,
        tenant_id: UUID,
        user_id: UUID,
        activity_in: ActivityCreate,
    ) -> Activity:
        await self.validate_activity_parent(
            tenant_id,
            activity_in.lead_id,
            activity_in.deal_id,
            activity_in.customer_id,
        )

        activity = Activity(
            tenant_id=tenant_id,
            created_by_id=user_id,
            **activity_in.model_dump(),
        )
        created_activity = await self.activity_repo.create(activity)
        await self.db.commit()
        return created_activity

    async def list_activities(
        self,
        tenant_id: UUID,
        lead_id: UUID | None = None,
        deal_id: UUID | None = None,
        customer_id: UUID | None = None,
    ) -> list[Activity]:
        items = await self.activity_repo.list_activities(
            tenant_id=tenant_id,
            lead_id=lead_id,
            deal_id=deal_id,
            customer_id=customer_id,
        )
        return list(items)

    async def update_activity(
        self,
        tenant_id: UUID,
        activity_id: UUID,
        activity_in: ActivityUpdate,
    ) -> Activity:
        activity = await self.activity_repo.get_by_id(tenant_id, activity_id)
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Activity not found",
            )

        update_data = activity_in.model_dump(exclude_unset=True)

        target_lead_id = update_data.get("lead_id", activity.lead_id)
        target_deal_id = update_data.get("deal_id", activity.deal_id)
        target_customer_id = update_data.get("customer_id", activity.customer_id)

        await self.validate_activity_parent(
            tenant_id,
            target_lead_id,
            target_deal_id,
            target_customer_id,
        )

        for key, value in update_data.items():
            setattr(activity, key, value)
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(activity)
        return activity

    async def get_activity(self, tenant_id: UUID, activity_id: UUID) -> Activity:
        activity = await self.activity_repo.get_by_id(tenant_id, activity_id)
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Activity not found",
            )
        return activity

    # --- Customers ---
    async def list_customers(
        self,
        tenant_id: UUID,
        search: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> tuple[list[Customer], int]:
        skip = (page - 1) * limit
        items, total = await self.customer_repo.list_customers(
            tenant_id, search=search, skip=skip, limit=limit
        )
        return list(items), total

    async def get_customer(self, tenant_id: UUID, customer_id: UUID) -> Customer:
        customer = await self.customer_repo.get_by_id(tenant_id, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )
        return customer

    async def create_customer(
        self,
        tenant_id: UUID,
        user_id: UUID,
        customer_in: CustomerCreate,
        ip_address: str | None = None,
    ) -> Customer:
        if not customer_in.phone or not customer_in.phone.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile Number (phone) is required",
            )

        cust_data = customer_in.model_dump()
        customer = Customer(
            tenant_id=tenant_id,
            **cust_data,
        )
        created_cust = await self.customer_repo.create(customer)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.customer.create",
            entity_type="customer",
            entity_id=str(created_cust.id),
            details={"name": created_cust.name, "phone": created_cust.phone},
            ip_address=ip_address,
        )
        await self.db.commit()
        return created_cust

    async def update_customer(
        self,
        tenant_id: UUID,
        user_id: UUID,
        customer_id: UUID,
        customer_in: CustomerUpdate,
        ip_address: str | None = None,
    ) -> Customer:
        cust = await self.get_customer(tenant_id, customer_id)
        update_data = customer_in.model_dump(exclude_unset=True)

        balance_changed = False
        old_balance_details = {}
        new_balance_details = {}

        if "opening_balance" in update_data or "opening_balance_type" in update_data:
            new_bal = update_data.get("opening_balance", float(cust.opening_balance))
            new_type = update_data.get("opening_balance_type", cust.opening_balance_type)
            if float(cust.opening_balance) != float(new_bal) or cust.opening_balance_type != new_type:
                balance_changed = True
                old_balance_details = {
                    "opening_balance": float(cust.opening_balance),
                    "opening_balance_type": cust.opening_balance_type,
                }
                new_balance_details = {
                    "opening_balance": float(new_bal),
                    "opening_balance_type": new_type,
                }

        for key, value in update_data.items():
            setattr(cust, key, value)

        audit_details: dict[str, str | bool | dict[str, str | float]] = {"name": cust.name}
        if balance_changed:
            audit_details["balance_changed"] = True
            audit_details["old_balance"] = old_balance_details
            audit_details["new_balance"] = new_balance_details

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.customer.update",
            entity_type="customer",
            entity_id=str(cust.id),
            details=audit_details,
            ip_address=ip_address,
        )
        await self.db.commit()
        await self.db.refresh(cust)
        return cust

    async def delete_customer(
        self,
        tenant_id: UUID,
        user_id: UUID,
        customer_id: UUID,
        ip_address: str | None = None,
    ) -> None:
        cust = await self.get_customer(tenant_id, customer_id)
        await self.customer_repo.soft_delete(tenant_id, customer_id)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.customer.delete",
            entity_type="customer",
            entity_id=str(cust.id),
            details={"name": cust.name},
            ip_address=ip_address,
        )
        await self.db.commit()

    async def import_customers(
        self,
        tenant_id: UUID,
        user_id: UUID,
        file_bytes: bytes,
        ip_address: str | None = None,
    ) -> CustomerImportSummary:
        content_str = file_bytes.decode("utf-8", errors="replace")
        csv_reader = csv.reader(io.StringIO(content_str))
        rows = list(csv_reader)

        if not rows:
            return CustomerImportSummary(imported_count=0, skipped_count=0, failed_count=0, errors=[])

        header = [h.strip().lower().replace("*", "").strip() for h in rows[0]]

        col_map: dict[str, int] = {}
        for idx, h in enumerate(header):
            if "customer type" in h or h == "type":
                col_map["customer_type"] = idx
            elif "balance type" in h or "debit/credit" in h:
                col_map["opening_balance_type"] = idx
            elif "opening balance" in h or h == "balance":
                col_map["opening_balance"] = idx
            elif "credit limit" in h or h == "limit":
                col_map["credit_limit"] = idx
            elif "company" in h:
                col_map["company"] = idx
            elif "address" in h:
                col_map["billing_address"] = idx
            elif "city" in h:
                col_map["city"] = idx
            elif "state" in h:
                col_map["state"] = idx
            elif "pincode" in h or "pin" in h or "zip" in h:
                col_map["pincode"] = idx
            elif "gstin" in h or "gst" in h:
                col_map["gstin"] = idx
            elif "pan" in h:
                col_map["pan"] = idx
            elif "notes" in h:
                col_map["notes"] = idx
            elif "mobile" in h or "phone" in h:
                col_map["phone"] = idx
            elif "email" in h:
                col_map["email"] = idx
            elif "name" in h:
                col_map["name"] = idx

        imported_count = 0
        skipped_count = 0
        failed_count = 0
        errors: list[CustomerImportRowError] = []

        for row_idx, row in enumerate(rows[1:], start=2):
            if not any(cell.strip() for cell in row):
                continue  # skip completely empty lines

            def get_val(key: str) -> str | None:
                if key in col_map and col_map[key] < len(row):
                    val = row[col_map[key]].strip()
                    return val if val else None
                return None

            name = get_val("name")
            phone = get_val("phone")

            if not name:
                errors.append(CustomerImportRowError(row=row_idx, reason="Customer Name is required"))
                failed_count += 1
                continue

            if not phone:
                errors.append(CustomerImportRowError(row=row_idx, reason="Mobile Number is required"))
                failed_count += 1
                continue

            email = get_val("email")
            if email and ("@" not in email or "." not in email):
                errors.append(CustomerImportRowError(row=row_idx, reason="Invalid email format"))
                failed_count += 1
                continue

            op_bal_val = 0.0
            raw_op_bal = get_val("opening_balance")
            if raw_op_bal:
                try:
                    op_bal_val = float(raw_op_bal.replace(",", ""))
                except ValueError:
                    errors.append(CustomerImportRowError(row=row_idx, reason="Invalid Opening Balance value"))
                    failed_count += 1
                    continue

            cred_lim_val = None
            raw_cred_lim = get_val("credit_limit")
            if raw_cred_lim:
                try:
                    cred_lim_val = float(raw_cred_lim.replace(",", ""))
                except ValueError:
                    errors.append(CustomerImportRowError(row=row_idx, reason="Invalid Credit Limit value"))
                    failed_count += 1
                    continue

            # Check duplicate by phone number (Section 7.4)
            existing = await self.customer_repo.get_by_phone(tenant_id, phone)
            if existing:
                skipped_count += 1
                continue

            bal_type = get_val("opening_balance_type") or "Debit"
            if bal_type.capitalize() in ("Debit", "Credit"):
                bal_type = bal_type.capitalize()
            else:
                bal_type = "Debit"

            cust_type = get_val("customer_type") or "Individual"
            if cust_type.capitalize() in ("Individual", "Business"):
                cust_type = cust_type.capitalize()
            else:
                cust_type = "Individual"

            new_cust = Customer(
                tenant_id=tenant_id,
                name=name,
                phone=phone,
                email=email,
                customer_type=cust_type,
                company=get_val("company"),
                billing_address=get_val("billing_address"),
                city=get_val("city"),
                state=get_val("state"),
                pincode=get_val("pincode"),
                gstin=get_val("gstin"),
                pan=get_val("pan"),
                opening_balance=op_bal_val,
                opening_balance_type=bal_type,
                credit_limit=cred_lim_val,
                notes=get_val("notes"),
            )
            await self.customer_repo.create(new_cust)
            imported_count += 1

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="crm.customer.import",
            entity_type="customer",
            entity_id="batch_import",
            details={
                "imported_count": imported_count,
                "skipped_count": skipped_count,
                "failed_count": failed_count,
            },
            ip_address=ip_address,
        )
        await self.db.commit()

        return CustomerImportSummary(
            imported_count=imported_count,
            skipped_count=skipped_count,
            failed_count=failed_count,
            errors=errors,
        )

    def generate_sample_customer_template(self) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Customer Name *",
            "Mobile Number *",
            "Email",
            "Customer Type",
            "Company Name",
            "Billing Address",
            "City",
            "State",
            "Pincode",
            "GSTIN",
            "PAN",
            "Opening Balance",
            "Balance Type",
            "Credit Limit",
            "Notes",
        ])
        writer.writerow([
            "Ramesh Traders",
            "9876543210",
            "ramesh@example.com",
            "Business",
            "Ramesh Enterprises",
            "123 Market Street",
            "Mumbai",
            "Maharashtra",
            "400001",
            "27AAAAA0000A1Z5",
            "ABCDE1234F",
            "5000",
            "Debit",
            "50000",
            "Sample customer record from import template",
        ])
        return output.getvalue()
