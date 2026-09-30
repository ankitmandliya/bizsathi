import csv
import io
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vendors import Vendor
from app.repositories.vendors import VendorRepository
from app.schemas.vendors import (
    PaginatedVendorsResponse,
    VendorCreate,
    VendorImportSummaryResponse,
    VendorResponse,
    VendorUpdate,
)
from app.services.audit import log_audit_event


class VendorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = VendorRepository(db)

    @staticmethod
    def compute_outstanding(opening_balance: Decimal, balance_type: str) -> tuple[Decimal, str]:
        val = Decimal(str(opening_balance or 0))
        b_type = balance_type.capitalize() if balance_type else "Payable"

        if b_type == "Advance":
            outstanding = -val
            if val > 0:
                display = f"Vendor owes you ₹{val:,.2f}"
            else:
                display = "No outstanding balance"
        else:
            outstanding = val
            if val > 0:
                display = f"You owe ₹{val:,.2f}"
            else:
                display = "No outstanding balance"

        return outstanding, display

    def _to_vendor_response(self, vendor: Vendor) -> VendorResponse:
        outstanding, display = self.compute_outstanding(vendor.opening_balance, vendor.opening_balance_type)
        return VendorResponse(
            id=vendor.id,
            tenant_id=vendor.tenant_id,
            name=vendor.name,
            contact_person=vendor.contact_person,
            phone=vendor.phone,
            email=vendor.email,
            vendor_type=vendor.vendor_type if vendor.vendor_type in ("Individual", "Business") else "Business",
            company_name=vendor.company_name,
            billing_address=vendor.billing_address,
            city=vendor.city,
            state=vendor.state,
            pincode=vendor.pincode,
            gstin=vendor.gstin,
            pan=vendor.pan,
            payment_terms=vendor.payment_terms,
            opening_balance=vendor.opening_balance,
            opening_balance_type=vendor.opening_balance_type if vendor.opening_balance_type in ("Payable", "Advance") else "Payable",
            notes=vendor.notes,
            outstanding_payable=outstanding,
            outstanding_display=display,
            created_at=vendor.created_at or datetime.now(timezone.utc),
            updated_at=vendor.updated_at or datetime.now(timezone.utc),
        )

    async def create_vendor(
        self,
        tenant_id: UUID,
        vendor_in: VendorCreate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> VendorResponse:
        if not vendor_in.name or not vendor_in.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor name is required",
            )
        if not vendor_in.phone or not vendor_in.phone.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor phone number is required",
            )

        vendor = Vendor(
            tenant_id=tenant_id,
            name=vendor_in.name.strip(),
            contact_person=vendor_in.contact_person.strip() if vendor_in.contact_person else None,
            phone=vendor_in.phone.strip(),
            email=vendor_in.email.strip() if vendor_in.email else None,
            vendor_type=vendor_in.vendor_type,
            company_name=vendor_in.company_name.strip() if vendor_in.company_name else None,
            billing_address=vendor_in.billing_address.strip() if vendor_in.billing_address else None,
            city=vendor_in.city.strip() if vendor_in.city else None,
            state=vendor_in.state.strip() if vendor_in.state else None,
            pincode=vendor_in.pincode.strip() if vendor_in.pincode else None,
            gstin=vendor_in.gstin.strip() if vendor_in.gstin else None,
            pan=vendor_in.pan.strip() if vendor_in.pan else None,
            payment_terms=vendor_in.payment_terms.strip() if vendor_in.payment_terms else None,
            opening_balance=vendor_in.opening_balance,
            opening_balance_type=vendor_in.opening_balance_type,
            notes=vendor_in.notes.strip() if vendor_in.notes else None,
        )
        created = await self.repo.create(vendor)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="vendor.create",
            entity_type="vendor",
            entity_id=str(created.id),
            entity_label=created.name,
            details={"name": created.name, "phone": created.phone},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return self._to_vendor_response(created)

    async def get_vendor(self, tenant_id: UUID, vendor_id: UUID) -> VendorResponse:
        vendor = await self.repo.get_by_id(tenant_id, vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
        return self._to_vendor_response(vendor)

    async def list_vendors(
        self,
        tenant_id: UUID,
        search: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> PaginatedVendorsResponse:
        skip = (page - 1) * limit
        items, total = await self.repo.list_vendors(
            tenant_id=tenant_id,
            search=search,
            skip=skip,
            limit=limit,
        )
        res_items = [self._to_vendor_response(v) for v in items]
        return PaginatedVendorsResponse(items=res_items, total=total, page=page, limit=limit)

    async def update_vendor(
        self,
        tenant_id: UUID,
        vendor_id: UUID,
        vendor_in: VendorUpdate,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> VendorResponse:
        vendor = await self.repo.get_by_id(tenant_id, vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

        update_data = vendor_in.model_dump(exclude_unset=True)

        # Track opening balance changes for audit log
        ob_changed = False
        old_ob = vendor.opening_balance
        old_ob_type = vendor.opening_balance_type

        if "opening_balance" in update_data and update_data["opening_balance"] is not None:
            if update_data["opening_balance"] != old_ob:
                ob_changed = True
        if "opening_balance_type" in update_data and update_data["opening_balance_type"] is not None:
            if update_data["opening_balance_type"] != old_ob_type:
                ob_changed = True

        updated = await self.repo.update(tenant_id, vendor_id, update_data)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor update failed")

        audit_details = {"name": updated.name}
        if ob_changed:
            audit_details["opening_balance_change"] = {
                "old": f"{old_ob} ({old_ob_type})",
                "new": f"{updated.opening_balance} ({updated.opening_balance_type})",
            }

        action_name = "vendor.opening_balance.edit" if ob_changed else "vendor.edit"
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action=action_name,
            entity_type="vendor",
            entity_id=str(updated.id),
            entity_label=updated.name,
            details=audit_details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()
        return self._to_vendor_response(updated)

    async def delete_vendor(
        self,
        tenant_id: UUID,
        vendor_id: UUID,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        vendor = await self.repo.get_by_id(tenant_id, vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

        success = await self.repo.soft_delete(tenant_id, vendor_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Failed to delete vendor")

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="vendor.delete",
            entity_type="vendor",
            entity_id=str(vendor_id),
            entity_label=vendor.name,
            details={"name": vendor.name, "phone": vendor.phone},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()

    async def import_vendors(
        self,
        tenant_id: UUID,
        file_content: bytes,
        user_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> VendorImportSummaryResponse:
        text = file_content.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))

        imported = 0
        skipped_duplicates = 0
        failed = 0
        errors: list[dict] = []
        total_rows = 0

        for row_idx, raw_row in enumerate(reader, start=2):
            total_rows += 1
            row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}

            # Map column names flexibly
            name = (
                row.get("vendor name *")
                or row.get("vendor name")
                or row.get("name *")
                or row.get("name")
            )
            phone = (
                row.get("phone *")
                or row.get("phone")
                or row.get("mobile *")
                or row.get("mobile")
            )

            if not name or not name.strip():
                failed += 1
                errors.append({"row_number": row_idx, "reason": "Missing required field: Vendor Name"})
                continue

            if not phone or not phone.strip():
                failed += 1
                errors.append({"row_number": row_idx, "vendor_name": name, "reason": "Missing required field: Phone"})
                continue

            phone_clean = phone.strip()

            # Duplicate check on Phone
            existing = await self.repo.get_by_phone(tenant_id, phone_clean)
            if existing:
                skipped_duplicates += 1
                continue

            # Parsing fields
            c_person = row.get("contact person") or None
            email = row.get("email") or None
            v_type_raw = (row.get("vendor type") or "Business").title()
            v_type = "Individual" if v_type_raw == "Individual" else "Business"
            c_name = row.get("company name") or None
            b_addr = row.get("billing address") or None
            city = row.get("city") or None
            state = row.get("state") or None
            pincode = row.get("pincode") or None
            gstin = row.get("gstin") or None
            pan = row.get("pan") or None
            p_terms = row.get("payment terms") or None

            ob_str = row.get("opening balance") or "0"
            try:
                ob_val = Decimal(ob_str)
            except (InvalidOperation, ValueError):
                ob_val = Decimal("0.00")

            ob_type_raw = (row.get("balance type") or "Payable").capitalize()
            ob_type = "Advance" if ob_type_raw == "Advance" else "Payable"
            notes = row.get("notes") or None

            v_obj = Vendor(
                tenant_id=tenant_id,
                name=name.strip(),
                contact_person=c_person,
                phone=phone_clean,
                email=email,
                vendor_type=v_type,
                company_name=c_name,
                billing_address=b_addr,
                city=city,
                state=state,
                pincode=pincode,
                gstin=gstin,
                pan=pan,
                payment_terms=p_terms,
                opening_balance=ob_val,
                opening_balance_type=ob_type,
                notes=notes,
            )
            await self.repo.create(v_obj)
            imported += 1

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="vendor.import",
            entity_type="vendor",
            details={
                "total_rows": total_rows,
                "imported": imported,
                "skipped_duplicates": skipped_duplicates,
                "failed": failed,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.db.commit()

        return VendorImportSummaryResponse(
            total_rows=total_rows,
            imported=imported,
            skipped_duplicates=skipped_duplicates,
            failed=failed,
            errors=errors,
        )
