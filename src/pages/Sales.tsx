import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ReceiptText, Printer } from 'lucide-react';
import { salesService } from '../lib/sales';
import { ledgerService } from '../lib/ledger';
import { printReceipt } from '../lib/receiptPrint';
import type { Sale } from '../types/schema';
import { format } from 'date-fns';
import { BRAND_NAME } from '../lib/brand';

function money(n: number) {
    return `$${n.toFixed(2)}`;
}

/** Resolve customer name: prefer snapshot on Sale, fall back to ledger lookup */
function customerLabel(s: Sale): string {
    if (s.customerName) return s.customerName;
    if (s.customerId) {
        const c = ledgerService.getCustomer(s.customerId);
        return c ? c.name : `#${s.customerId}`;
    }
    return 'Walk-in';
}

export default function Sales() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = async () => {
        setLoading(true);
        try {
            const s = await salesService.getRecentSales(100);
            setSales(s);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void reload();
    }, []);

    const totals = useMemo(() => {
        return sales.reduce(
            (acc, s) => {
                acc.revenue += s.totalAmount;
                acc.cash += s.paidAmount;
                acc.credit += s.creditAmount;
                return acc;
            },
            { revenue: 0, cash: 0, credit: 0 }
        );
    }, [sales]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ReceiptText size={22} className="text-[hsl(var(--color-primary))]" /> Sales History
                    </h1>
                    <p className="text-gray-500">Local-first sales stored in IndexedDB</p>
                </div>

                <button
                    onClick={reload}
                    className="px-4 py-2 border border-gray-200 bg-white rounded-lg flex items-center gap-2 hover:bg-gray-50 text-sm font-medium"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card">
                    <div className="text-xs text-gray-500">Revenue (Loaded)</div>
                    <div className="text-2xl font-bold">{money(totals.revenue)}</div>
                </div>
                <div className="card">
                    <div className="text-xs text-gray-500">Paid Now</div>
                    <div className="text-2xl font-bold text-emerald-700">{money(totals.cash)}</div>
                </div>
                <div className="card">
                    <div className="text-xs text-gray-500">Credit Portion</div>
                    <div className="text-2xl font-bold text-orange-700">{money(totals.credit)}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-500">Showing {sales.length} sale(s)</div>
                    <div className="text-xs text-gray-400">Newest first</div>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4">Time</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Method</th>
                            <th className="p-4">Items</th>
                            <th className="p-4 text-right">Total</th>
                            <th className="p-4 text-right">Paid</th>
                            <th className="p-4 text-right">Credit</th>
                            <th className="p-4 text-center">Print</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sales.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-10 text-center text-gray-400">
                                    {loading ? 'Loading…' : 'No sales yet. Complete a sale in POS.'}
                                </td>
                            </tr>
                        ) : (
                            sales.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-gray-600 text-sm">
                                        <div className="font-mono">{format(s.createdAt, 'MMM dd, HH:mm')}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900 text-base">{customerLabel(s)}</div>
                                        {s.customerId && <div className="text-[10px] text-gray-400">ID: {s.customerId}</div>}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                                            s.paymentMethod === 'CREDIT' ? 'bg-orange-100 text-orange-700' :
                                            s.paymentMethod === 'MIXED' ? 'bg-blue-100 text-blue-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>{s.paymentMethod}</span>
                                    </td>
                                    <td className="p-4 text-gray-600 text-sm">{s.items.length}</td>
                                    <td className="p-4 text-right font-bold text-lg">{money(s.totalAmount)}</td>
                                    <td className="p-4 text-right text-emerald-700 font-semibold">{money(s.paidAmount)}</td>
                                    <td className="p-4 text-right text-orange-700 font-semibold">{money(s.creditAmount)}</td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => {
                                                const cust = s.customerId ? (() => {
                                                    const c = ledgerService.getCustomer(s.customerId!);
                                                    return c ? { id: c.id, name: c.name, phone: c.phone } : { id: s.customerId!, name: customerLabel(s), phone: '' };
                                                })() : undefined;

                                                printReceipt({
                                                    storeName: BRAND_NAME,
                                                    branchName: s.branchId,
                                                    receiptNo: `DUP-${s.id.slice(-8)}`,
                                                    saleId: s.id,
                                                    createdAt: new Date(s.createdAt),
                                                    customer: cust,
                                                    sale: s,
                                                });
                                            }}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[hsl(var(--color-primary))] transition-colors"
                                            title="Preview & Print Duplicate"
                                        >
                                            <Printer size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
