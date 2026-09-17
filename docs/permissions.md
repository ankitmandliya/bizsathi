# Permissions plan

Permissions are action-based and scoped to business domains. Example actions include:

- `crm.lead.view`
- `crm.lead.create`
- `payroll.process`
- `customer.update`
- `report.export`

Authorization should be enforced both at the API layer and service/repository layer to prevent bypasses.
