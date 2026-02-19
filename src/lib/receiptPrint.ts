import type { Sale, CustomerLedger } from '../types/schema';

export type ReceiptPayload = {
    storeName: string;
    branchName: string;
    receiptNo: string;
    saleId: string;
    createdAt: Date;
    customer?: {
        id: string;
        name: string;
        phone: string;
    };
    sale: Sale;
};

function money(n: number) {
    return `$${n.toFixed(2)}`;
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function toDateString(d: Date) {
    try {
        return d.toLocaleString();
    } catch {
        return String(d);
    }
}

/** Shared toolbar + print-hide styles used in both draft & receipt */
const TOOLBAR_CSS = `
    .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1e293b; padding: 12px 20px; display: flex; align-items: center; gap: 12px; z-index: 999; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    .toolbar h2 { color: #fff; font-size: 15px; margin: 0; flex: 1; font-family: system-ui, sans-serif; }
    .toolbar button { padding: 8px 20px; font-size: 13px; font-weight: 700; border: none; border-radius: 6px; cursor: pointer; font-family: system-ui, sans-serif; }
    .btn-print { background: #16a34a; color: #fff; }
    .btn-print:hover { background: #15803d; }
    .btn-close { background: #e5e7eb; color: #333; }
    .btn-close:hover { background: #d1d5db; }
    body { padding-top: 60px; }
    @media print { .toolbar { display: none !important; } body { padding-top: 0; } }
`;

/** Open HTML content in a new browser tab (not a popup) */
function openInTab(html: string) {
    const w = window.open('about:blank', '_blank');
    if (!w) {
        alert('Popup blocked — please allow popups for this site.');
        return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
}

// ─── DRAFT ─────────────────────────────────────────────

export type DraftPayload = {
    storeName: string;
    branchName: string;
    customer?: { name: string; phone: string };
    paymentMethod: 'CASH' | 'CREDIT' | 'MIXED';
    items: { index: number; name: string; qty: string; price: number; total: number }[];
    grandTotal: number;
};

export function printDraft(payload: DraftPayload) {
    const itemsHtml = payload.items
        .map((it) => `
<tr>
  <td class="idx">${it.index}</td>
  <td class="name">${escapeHtml(it.name)}</td>
  <td class="qty">${escapeHtml(it.qty)}</td>
  <td class="price">${money(it.price)}</td>
  <td class="amt">${money(it.total)}</td>
</tr>`)
        .join('');

    const customerHtml = payload.customer
        ? `<div class="row"><span>Customer</span><span>${escapeHtml(payload.customer.name)} (${escapeHtml(payload.customer.phone)})</span></div>`
        : `<div class="row"><span>Customer</span><span>Walk-in</span></div>`;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Draft — ${escapeHtml(payload.storeName)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 0; padding: 24px; background: #f9fafb; }
    .wrap { width: 400px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    h1 { font-size: 16px; margin: 0 0 2px; text-align: center; }
    .sub { font-size: 12px; color: #333; text-align: center; margin-bottom: 6px; }
    .badge { display: inline-block; background: #f3f4f6; border: 1px solid #ccc; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: 700; }
    .hr { border-top: 1px dashed #888; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 4px 2px; border-bottom: 1px dashed #888; font-size: 11px; }
    th.amt, th.price { text-align: right; }
    td { padding: 4px 2px; vertical-align: top; }
    td.idx { width: 18px; color: #999; }
    td.qty { white-space: nowrap; padding-left: 6px; }
    td.price { text-align: right; white-space: nowrap; color: #555; }
    td.amt { text-align: right; white-space: nowrap; font-weight: 700; }
    .total-row { font-size: 14px; font-weight: 700; display: flex; justify-content: space-between; margin: 8px 0; }
    .sig { margin-top: 30px; }
    .sig-line { border-bottom: 1px solid #333; width: 200px; display: inline-block; margin-left: 8px; }
    .sig-label { font-size: 12px; color: #555; margin-top: 4px; }
    .draft-label { text-align: center; font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #999; border: 2px dashed #ccc; padding: 4px 0; margin-bottom: 10px; }
    ${TOOLBAR_CSS}
    @media print { body { padding: 0; background: #fff; } .wrap { border: none; box-shadow: none; width: 72mm; padding: 0; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <h2>📋 Draft Preview</h2>
    <button class="btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
  <div class="wrap">
    <div class="draft-label">DRAFT</div>
    <h1>${escapeHtml(payload.storeName)}</h1>
    <div class="sub">${escapeHtml(payload.branchName)}</div>
    <div class="row"><span>Date</span><span>${escapeHtml(new Date().toLocaleString())}</span></div>
    ${customerHtml}
    <div class="row"><span>Payment</span><span class="badge">${escapeHtml(payload.paymentMethod)}</span></div>
    <div class="hr"></div>
    <table>
      <thead><tr><th>#</th><th>Item</th><th>Qty</th><th class="price">Price</th><th class="amt">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="hr"></div>
    <div class="total-row"><span>Grand Total</span><span>${money(payload.grandTotal)}</span></div>
    <div class="hr"></div>
    <div class="sig">
      <div class="sig-label">Shopkeeper Signature: <span class="sig-line"></span></div>
    </div>
    <div class="hr"></div>
    <div style="text-align:center;font-size:11px;color:#999;margin-top:8px;">This is a draft. Not a final receipt.</div>
  </div>
</body>
</html>`;

    openInTab(html);
}

// ─── RECEIPT ───────────────────────────────────────────

export function printReceipt(payload: ReceiptPayload) {
    const itemsHtml = payload.sale.items
        .map((it) => {
            const qty = `${it.quantity} ${it.unitUsed}`;
            const rate = `${money(it.pricePerKgSnapshot)}/kg`;
            return `
<tr>
  <td class="name">${escapeHtml(it.nameSnapshot)}</td>
  <td class="qty">${escapeHtml(qty)}</td>
  <td class="rate">${escapeHtml(rate)}</td>
  <td class="amt">${escapeHtml(money(it.lineTotal))}</td>
</tr>`;
        })
        .join('');

    const customerHtml = payload.customer
        ? `<div class="row"><span>Customer</span><span>${escapeHtml(payload.customer.name)} (${escapeHtml(payload.customer.phone)})</span></div>`
        : `<div class="row"><span>Customer</span><span>Walk-in</span></div>`;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Receipt ${escapeHtml(payload.receiptNo)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 0; padding: 24px; background: #f9fafb; }
    .wrap { width: 360px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
    .sub { font-size: 12px; color: #333; text-align: center; margin-bottom: 10px; }
    .hr { border-top: 1px dashed #888; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 6px 0; border-bottom: 1px dashed #888; }
    td { padding: 6px 0; vertical-align: top; }
    td.qty, td.rate { white-space: nowrap; padding-left: 8px; }
    td.amt { text-align: right; white-space: nowrap; }
    .totals .row { font-size: 13px; font-weight: 700; }
    .muted { color: #555; font-size: 11px; text-align: center; }
    ${TOOLBAR_CSS}
    @media print { body { padding: 0; background: #fff; } .wrap { border: none; box-shadow: none; width: 72mm; padding: 0; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <h2>🧾 Receipt Preview</h2>
    <button class="btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
  <div class="wrap">
    <h1>${escapeHtml(payload.storeName)}</h1>
    <div class="sub">${escapeHtml(payload.branchName)}</div>
    <div class="row"><span>Receipt</span><span>#${escapeHtml(payload.receiptNo)}</span></div>
    <div class="row"><span>Sale ID</span><span>${escapeHtml(payload.saleId)}</span></div>
    <div class="row"><span>Date</span><span>${escapeHtml(toDateString(payload.createdAt))}</span></div>
    ${customerHtml}
    <div class="hr"></div>
    <table>
      <thead><tr><th>Item</th><th class="qty">Qty</th><th class="rate">Rate</th><th class="amt">Amt</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="hr"></div>
    <div class="totals">
      <div class="row"><span>Total</span><span>${escapeHtml(money(payload.sale.totalAmount))}</span></div>
      <div class="row"><span>Paid</span><span>${escapeHtml(money(payload.sale.paidAmount))}</span></div>
      <div class="row"><span>Credit</span><span>${escapeHtml(money(payload.sale.creditAmount))}</span></div>
      <div class="row"><span>Method</span><span>${escapeHtml(payload.sale.paymentMethod)}</span></div>
    </div>
    <div class="hr"></div>
    <div style="margin-top:16px;">
      <div style="font-size:12px;color:#555;">Shopkeeper Signature: <span style="border-bottom:1px solid #333;width:180px;display:inline-block;margin-left:8px;"></span></div>
    </div>
    <div class="hr"></div>
    <div class="muted">Thank you!</div>
  </div>
</body>
</html>`;

    openInTab(html);
}

// ─── PAYMENT RECEIPT ───────────────────────────────────

export type PaymentReceiptPayload = {
    storeName: string;
    branchName: string;
    customer: { name: string; phone: string };
    entry: CustomerLedger;
    balanceBefore: number;
};

const CHANNEL_LABEL: Record<string, string> = {
    CASH: '💵 Cash',
    EVC: '📱 EVC',
    BANK_TRANSFER: '🏦 Bank Transfer',
};

export function printPaymentReceipt(payload: PaymentReceiptPayload) {
    const { entry } = payload;
    const channelLabel = entry.paymentChannel ? (CHANNEL_LABEL[entry.paymentChannel] || entry.paymentChannel) : '—';
    const absAmount = Math.abs(entry.amount);

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt — ${escapeHtml(payload.customer.name)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 0; padding: 24px; background: #f9fafb; }
    .wrap { width: 380px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    h1 { font-size: 16px; margin: 0 0 2px; text-align: center; }
    .sub { font-size: 12px; color: #333; text-align: center; margin-bottom: 10px; }
    .hr { border-top: 1px dashed #888; margin: 12px 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin: 5px 0; }
    .row .label { color: #666; }
    .row .value { font-weight: 700; color: #111; }
    .amount-box { text-align: center; margin: 16px 0; padding: 12px; background: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; }
    .amount-box .amt { font-size: 28px; font-weight: 900; color: #16a34a; }
    .amount-box .lbl { font-size: 11px; color: #666; margin-top: 2px; }
    .sig { margin-top: 24px; }
    .sig-line { border-bottom: 1px solid #333; width: 180px; display: inline-block; margin-left: 8px; }
    .sig-label { font-size: 12px; color: #555; }
    .footer { text-align: center; font-size: 11px; color: #999; margin-top: 12px; }
    ${TOOLBAR_CSS}
    @media print { body { padding: 0; background: #fff; } .wrap { border: none; box-shadow: none; width: 72mm; padding: 0; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <h2>💳 Payment Receipt</h2>
    <button class="btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
  <div class="wrap">
    <h1>${escapeHtml(payload.storeName)}</h1>
    <div class="sub">${escapeHtml(payload.branchName)}</div>
    <div style="text-align:center;font-size:13px;font-weight:700;color:#16a34a;letter-spacing:1px;margin-bottom:8px;">PAYMENT RECEIPT</div>

    <div class="hr"></div>

    <div class="row"><span class="label">Date</span><span class="value">${escapeHtml(toDateString(new Date(entry.createdAt)))}</span></div>
    <div class="row"><span class="label">Customer</span><span class="value">${escapeHtml(payload.customer.name)}</span></div>
    <div class="row"><span class="label">Phone</span><span class="value">${escapeHtml(payload.customer.phone)}</span></div>
    <div class="row"><span class="label">Reference</span><span class="value">${escapeHtml(entry.referenceId)}</span></div>

    <div class="hr"></div>

    <div class="amount-box">
      <div class="lbl">Amount Paid</div>
      <div class="amt">${money(absAmount)}</div>
    </div>

    <div class="row"><span class="label">Payment Method</span><span class="value">${escapeHtml(channelLabel)}</span></div>
    ${entry.paymentReference ? `<div class="row"><span class="label">${entry.paymentChannel === 'EVC' ? 'EVC Txn ID' : 'Bank Ref #'}</span><span class="value">${escapeHtml(entry.paymentReference)}</span></div>` : ''}

    <div class="hr"></div>

    <div class="row"><span class="label">Balance Before</span><span class="value">${money(payload.balanceBefore)}</span></div>
    <div class="row"><span class="label">Balance After</span><span class="value" style="color:${entry.balanceAfter > 0 ? '#dc2626' : '#16a34a'}">${money(entry.balanceAfter)}</span></div>

    <div class="hr"></div>

    <div class="sig">
      <div class="sig-label">Shopkeeper Signature: <span class="sig-line"></span></div>
    </div>

    <div class="footer">Thank you for your payment!</div>
  </div>
</body>
</html>`;

    openInTab(html);
}
