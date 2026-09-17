from app.models.crm import Customer
from app.models.sales import Invoice, Payment


def generate_invoice_pdf_html(invoice: Invoice, customer: Customer) -> str:
    items_rows = "".join(
        f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{idx + 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{item.description}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹{float(item.rate):,.2f}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">{float(item.tax_rate_percent):.1f}%</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">₹{float(item.total):,.2f}</td>
        </tr>
        """
        for idx, item in enumerate(invoice.items)
    )

    issue_date_str = invoice.issue_date.strftime("%d %b %Y")
    due_date_str = invoice.due_date.strftime("%d %b %Y")

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {invoice.invoice_number}</title>
    <style>
        body {{ font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; }}
        .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }}
        .brand {{ font-size: 24px; font-weight: 800; color: #2563eb; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #eff6ff; color: #1d4ed8; }}
        .meta-table {{ margin-top: 12px; width: 100%; border-collapse: collapse; }}
        .table {{ width: 100%; border-collapse: collapse; margin-top: 24px; }}
        .table th {{ background: #f8fafc; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }}
        .totals {{ margin-top: 24px; width: 300px; margin-left: auto; border-top: 2px solid #e2e8f0; padding-top: 12px; }}
        .totals-row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }}
        .totals-row.grand {{ font-size: 18px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 6px; }}
        @media print {{ body {{ padding: 0; }} }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">BizSathi</div>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">TAX INVOICE</p>
        </div>
        <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 20px; color: #0f172a;">{invoice.invoice_number}</h2>
            <div class="badge" style="margin-top: 6px;">{invoice.status}</div>
        </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 32px; background: #f8fafc; padding: 20px; border-radius: 8px;">
        <div>
            <p style="font-size: 12px; text-transform: uppercase; color: #64748b; margin: 0 0 6px 0; font-weight: 600;">Billed To</p>
            <h3 style="margin: 0; font-size: 16px;">{customer.name}</h3>
            {f'<p style="margin: 4px 0; color: #475569;">{customer.company}</p>' if customer.company else ''}
            {f'<p style="margin: 4px 0; color: #475569;">{customer.billing_address}</p>' if customer.billing_address else ''}
            {f'<p style="margin: 4px 0; color: #475569; font-size: 13px;">GSTIN: {customer.gstin}</p>' if customer.gstin else ''}
            <p style="margin: 4px 0; color: #64748b; font-size: 13px;">{customer.email or ''} {customer.phone or ''}</p>
        </div>
        <div style="text-align: right;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Issue Date:</strong> {issue_date_str}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Due Date:</strong> {due_date_str}</p>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th style="width: 40px;">#</th>
                <th>Item Description</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: right; width: 110px;">Rate</th>
                <th style="text-align: right; width: 80px;">Tax %</th>
                <th style="text-align: right; width: 120px;">Amount</th>
            </tr>
        </thead>
        <tbody>
            {items_rows}
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row">
            <span>Subtotal</span>
            <span>₹{float(invoice.subtotal):,.2f}</span>
        </div>
        <div class="totals-row">
            <span>Tax Amount</span>
            <span>₹{float(invoice.tax_amount):,.2f}</span>
        </div>
        <div class="totals-row grand">
            <span>Total Amount</span>
            <span>₹{float(invoice.total_amount):,.2f}</span>
        </div>
        <div class="totals-row" style="color: #16a34a; font-weight: 600;">
            <span>Amount Paid</span>
            <span>₹{float(invoice.amount_paid):,.2f}</span>
        </div>
        <div class="totals-row" style="color: #dc2626; font-weight: 700;">
            <span>Amount Due</span>
            <span>₹{float(invoice.amount_due):,.2f}</span>
        </div>
    </div>

    {f'<div style="margin-top: 40px; padding: 16px; background: #fffbeb; border-radius: 6px; font-size: 13px; color: #92400e;"><strong>Notes:</strong> {invoice.notes}</div>' if invoice.notes else ''}
</body>
</html>"""


def generate_payment_receipt_pdf_html(payment: Payment, invoice: Invoice, customer: Customer) -> str:
    payment_date_str = payment.payment_date.strftime("%d %b %Y")

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt {payment.receipt_number}</title>
    <style>
        body {{ font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; }}
        .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }}
        .brand {{ font-size: 24px; font-weight: 800; color: #16a34a; }}
        .card {{ background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0; }}
        .amount-box {{ font-size: 32px; font-weight: 800; color: #16a34a; margin: 12px 0; }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">BizSathi</div>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">PAYMENT RECEIPT</p>
        </div>
        <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 20px; color: #0f172a;">{payment.receipt_number}</h2>
            <p style="margin: 4px 0; font-size: 13px; color: #64748b;">Date: {payment.payment_date_str if hasattr(payment, 'payment_date_str') else payment_date_str}</p>
        </div>
    </div>

    <div class="card" style="text-align: center;">
        <p style="font-size: 14px; color: #64748b; margin: 0;">Payment Received From</p>
        <h2 style="margin: 4px 0; font-size: 22px;">{customer.name}</h2>
        <div class="amount-box">₹{float(payment.amount):,.2f}</div>
        <p style="margin: 0; font-size: 14px; color: #475569;">Payment Mode: <strong>{payment.payment_mode}</strong></p>
    </div>

    <div class="card">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Applied to Invoice</h4>
        <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0;">
            <span>Invoice Number:</span>
            <strong>{invoice.invoice_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0;">
            <span>Invoice Total:</span>
            <span>₹{float(invoice.total_amount):,.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0;">
            <span>Remaining Amount Due:</span>
            <strong style="color: #dc2626;">₹{float(invoice.amount_due):,.2f}</strong>
        </div>
    </div>

    {f'<p style="font-size: 13px; color: #64748b;">Notes: {payment.notes}</p>' if payment.notes else ''}
</body>
</html>"""
