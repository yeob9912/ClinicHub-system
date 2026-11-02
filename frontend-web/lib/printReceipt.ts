/**
 * Clean, isolated receipt printing utility.
 * Prints ONLY the receipt on exactly one single page without printing
 * any background dashboard, sidebar, table rows, or extraneous web pages.
 */

export interface PrintableReceipt {
  receipt_no: string;
  order_id?: string;
  pharmacy_id?: { _id?: string; name?: string } | string;
  customer_name?: string;
  date?: string | Date;
  created_at?: string | Date;
  approved_by?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal?: number;
  delivery_fee?: number;
  tax?: number;
  total?: number;
}

function escapeHtml(str?: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function printReceipt(receipt: PrintableReceipt, overridePharmacyName?: string): void {
  if (!receipt || typeof window === "undefined") return;

  const pharmacyName =
    overridePharmacyName ||
    (typeof receipt.pharmacy_id === "object" && receipt.pharmacy_id?.name
      ? receipt.pharmacy_id.name
      : typeof receipt.pharmacy_id === "string" && receipt.pharmacy_id
      ? receipt.pharmacy_id
      : "pharmaLocator Pharmacy");

  const rawDate = receipt.date || receipt.created_at || new Date();
  const dateObj = new Date(rawDate);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const subtotal = Number(receipt.subtotal || 0).toFixed(2);
  const deliveryFee = Number(receipt.delivery_fee || 0);
  const tax = Number(receipt.tax || 0).toFixed(2);
  const total = Number(receipt.total || 0).toFixed(2);

  const itemsHtml = (receipt.items || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 7px 0; text-align: left; vertical-align: top;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${escapeHtml(item.name)}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 1px;">Qty: ${item.quantity} &times; ${Number(item.price).toFixed(2)} ETB</div>
        </td>
        <td style="padding: 7px 0; text-align: right; vertical-align: top; font-family: 'Courier New', Courier, monospace; font-weight: 700; color: #0f172a; font-size: 13px; white-space: nowrap;">
          ${(Number(item.price) * Number(item.quantity)).toFixed(2)} ETB
        </td>
      </tr>
    `
    )
    .join("");

  const deliveryRow =
    deliveryFee > 0
      ? `
      <tr>
        <td style="padding: 4px 0; color: #64748b;">Delivery Fee:</td>
        <td style="padding: 4px 0; text-align: right; font-family: 'Courier New', Courier, monospace; font-weight: 600; color: #1e293b;">
          ${deliveryFee.toFixed(2)} ETB
        </td>
      </tr>
    `
      : "";

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt - ${escapeHtml(receipt.receipt_no)}</title>
  <style>
    @page {
      size: auto;
      margin: 6mm 10mm;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-card {
        box-shadow: none !important;
        border: 1px dashed #94a3b8 !important;
        margin: 0 auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      background-color: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      display: flex;
      justify-content: center;
      padding: 20px 10px;
    }
    .receipt-card {
      width: 100%;
      max-width: 360px;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 24px 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .serrated-top {
      height: 6px;
      margin: -24px -20px 18px -20px;
      border-top-left-radius: 11px;
      border-top-right-radius: 11px;
      background: #0f766e;
    }
    .header {
      text-align: center;
      padding-bottom: 14px;
      border-bottom: 1px dashed #cbd5e1;
      margin-bottom: 14px;
    }
    .pharmacy-name {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #0f766e;
      margin-bottom: 4px;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 10px;
      border-radius: 999px;
      margin-bottom: 6px;
    }
    .receipt-no {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      font-weight: 800;
      color: #0f766e;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 12px;
    }
    .meta-table td {
      padding: 3px 0;
    }
    .meta-label {
      color: #64748b;
      font-weight: 500;
    }
    .meta-val {
      text-align: right;
      font-weight: 700;
      color: #1e293b;
    }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #f1f5f9;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1px dashed #cbd5e1;
      padding-top: 10px;
      margin-top: 6px;
      font-size: 12px;
    }
    .totals-table td {
      padding: 3px 0;
    }
    .grand-total {
      border-top: 1.5px solid #0f172a;
      margin-top: 6px;
      padding-top: 8px !important;
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
    }
    .grand-total-val {
      color: #0f766e;
      font-family: 'Courier New', Courier, monospace;
      font-size: 16px;
      font-weight: 900;
      text-align: right;
    }
    .footer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 10px;
      color: #64748b;
      line-height: 1.5;
    }
    .verified {
      color: #059669;
      font-weight: 800;
      font-size: 10px;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="serrated-top"></div>
    <div class="header">
      <div class="pharmacy-name">${escapeHtml(pharmacyName)}</div>
      <div class="badge">Official Sales Receipt</div>
      <div class="receipt-no">${escapeHtml(receipt.receipt_no)}</div>
    </div>

    <table class="meta-table">
      <tr>
        <td class="meta-label">Date:</td>
        <td class="meta-val">${dateStr} ${timeStr}</td>
      </tr>
      <tr>
        <td class="meta-label">Patient:</td>
        <td class="meta-val">${escapeHtml(receipt.customer_name || "Patient")}</td>
      </tr>
      ${
        receipt.approved_by
          ? `<tr>
        <td class="meta-label">Approved By:</td>
        <td class="meta-val">${escapeHtml(receipt.approved_by)}</td>
      </tr>`
          : ""
      }
    </table>

    <div class="section-title">Items Purchased</div>
    <table class="items-table">
      ${itemsHtml}
    </table>

    <table class="totals-table">
      <tr>
        <td style="color: #64748b;">Subtotal:</td>
        <td style="text-align: right; font-family: 'Courier New', Courier, monospace; font-weight: 600; color: #1e293b;">${subtotal} ETB</td>
      </tr>
      ${deliveryRow}
      <tr>
        <td style="color: #64748b;">VAT (15%):</td>
        <td style="text-align: right; font-family: 'Courier New', Courier, monospace; font-weight: 600; color: #1e293b;">${tax} ETB</td>
      </tr>
      <tr>
        <td class="grand-total">TOTAL PAID:</td>
        <td class="grand-total grand-total-val">${total} ETB</td>
      </tr>
    </table>

    <div class="footer">
      <div class="verified">&#x2713; Payment Verified &amp; Confirmed</div>
      <div>Thank you for choosing ${escapeHtml(pharmacyName)}!</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Retain this receipt for your personal health records.</div>
    </div>
  </div>
</body>
</html>`;

  // Create isolated, hidden iframe so only this receipt document is sent to printer
  const iframe = document.createElement("iframe");
  iframe.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Allow styles to compute and trigger native print preview cleanly
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Receipt printing error:", e);
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 1500);
    }
  }, 200);
}

