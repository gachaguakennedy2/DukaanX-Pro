import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ledgerService } from '../lib/ledger';
import type { Customer, CustomerLedger } from '../types/schema';
import { ArrowLeft, DollarSign, TrendingUp, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { makeReferenceId } from '../lib/ids';
import { printPaymentReceipt } from '../lib/receiptPrint';

type PayChannel = 'CASH' | 'EVC' | 'BANK_TRANSFER';

const CHANNEL_LABELS: Record<PayChannel, string> = {
    CASH: '💵 Cash',
    EVC: '📱 EVC',
    BANK_TRANSFER: '🏦 Bank Transfer',
};

const CHANNEL_COLORS: Record<PayChannel, string> = {
    CASH: 'bg-emerald-100 text-emerald-700',
    EVC: 'bg-violet-100 text-violet-700',
    BANK_TRANSFER: 'bg-blue-100 text-blue-700',
};

export default function CustomerDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [refreshKey, setRefreshKey] = useState(0);

    // Payment Modal
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [payAmount, setPayAmount] = useState<string>('');
    const [payChannel, setPayChannel] = useState<PayChannel>('CASH');
    const [payReference, setPayReference] = useState<string>('');

    // Derived data
    void refreshKey;
    const customer: Customer | undefined = id ? ledgerService.getCustomer(id) : undefined;
    const history: CustomerLedger[] = id ? ledgerService.getLedgerHistory(id) : [];

    const openPaymentModal = () => {
        setPayAmount('');
        setPayChannel('CASH');
        setPayReference('');
        setIsPaymentOpen(true);
    };

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer || !payAmount) return;

        try {
            const amount = parseFloat(payAmount);
            if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }

            const newEntry = ledgerService.createEntry({
                customerId: customer.id,
                branchId: 'branch-1',
                type: 'PAYMENT',
                amount: -amount,
                referenceId: makeReferenceId('PAY'),
                paymentChannel: payChannel,
                paymentReference: payReference.trim() || undefined,
                note: `${CHANNEL_LABELS[payChannel].replace(/^\S+\s/, '')} Payment${payReference.trim() ? ` — Ref: ${payReference.trim()}` : ''}`,
            });

            // Auto-print payment receipt
            printPaymentReceipt({
                storeName: 'Orbit Retail',
                branchName: 'branch-1',
                customer: { name: customer.name, phone: customer.phone },
                entry: newEntry,
                balanceBefore: customer.currentBalance + amount, // before was higher
            });

            setRefreshKey((k) => k + 1);
            setIsPaymentOpen(false);
        } catch {
            alert('Error recording payment');
        }
    };

    if (!customer) return <div className="p-6">Customer not found</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4">
                <ArrowLeft size={18} /> Back to List
            </button>

            {/* Header / Profile */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{customer.name}</h1>
                    <div className="text-gray-500 flex gap-4 mt-1">
                        <span>{customer.phone}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{customer.status}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Current Balance</div>
                        <div className={`text-3xl font-bold ${customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${customer.currentBalance.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">Limit: ${customer.creditLimit}</div>
                    </div>

                    <button
                        onClick={openPaymentModal}
                        className="btn-primary py-3 px-6 shadow-lg flex items-center gap-2"
                    >
                        <DollarSign size={20} /> Record Payment
                    </button>
                </div>
            </div>

            {/* Ledger */}
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp size={20} /> Transaction Ledger
            </h2>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Channel</th>
                            <th className="p-4">Reference</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-right">Balance</th>
                            <th className="p-4 text-center">Print</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-400">No history found</td></tr>
                        ) : (
                            history.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-gray-600 font-mono text-sm">
                                        {format(entry.createdAt, 'MMM dd, HH:mm')}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs rounded uppercase font-bold ${entry.type === 'PAYMENT' ? 'bg-green-100 text-green-700' :
                                            entry.type === 'SALE' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'
                                            }`}>
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {entry.paymentChannel ? (
                                            <span className={`px-2 py-1 text-xs rounded font-bold ${CHANNEL_COLORS[entry.paymentChannel]}`}>
                                                {CHANNEL_LABELS[entry.paymentChannel]}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        <div className="font-mono text-xs">{entry.referenceId}</div>
                                        {entry.paymentReference && (
                                            <div className="text-[10px] text-blue-600 mt-0.5">Ref: {entry.paymentReference}</div>
                                        )}
                                    </td>
                                    <td className={`p-4 text-right font-bold ${entry.amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {entry.amount > 0 ? '+' : ''}{entry.amount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right font-mono text-gray-700">
                                        ${entry.balanceAfter.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        {entry.type === 'PAYMENT' && customer && (
                                            <button
                                                onClick={() => printPaymentReceipt({
                                                    storeName: 'Orbit Retail',
                                                    branchName: entry.branchId,
                                                    customer: { name: customer.name, phone: customer.phone },
                                                    entry,
                                                    balanceBefore: entry.balanceAfter - entry.amount,
                                                })}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-green-600 transition-colors"
                                                title="Print Payment Receipt"
                                            >
                                                <Printer size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Payment Modal */}
            {isPaymentOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Record Payment</h3>
                            <p className="text-sm text-gray-500 mt-1">Customer: <span className="font-bold text-gray-700">{customer.name}</span> — Balance: <span className="font-bold text-red-600">${customer.currentBalance.toFixed(2)}</span></p>
                        </div>
                        <form onSubmit={handlePayment} className="p-6">
                            {/* Payment Channel */}
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['CASH', 'EVC', 'BANK_TRANSFER'] as PayChannel[]).map((ch) => (
                                        <button
                                            key={ch}
                                            type="button"
                                            onClick={() => setPayChannel(ch)}
                                            className={`p-3 rounded-xl border-2 text-center text-sm font-bold transition-all ${
                                                payChannel === ch
                                                    ? `${CHANNEL_COLORS[ch]} border-current`
                                                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                        >
                                            {CHANNEL_LABELS[ch]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
                                <input
                                    type="number"
                                    className="w-full border border-gray-200 p-3 rounded-lg text-2xl font-bold outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                                    placeholder="0.00"
                                    autoFocus
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    required
                                    step="0.01"
                                    min="0.01"
                                />
                            </div>

                            {/* Reference (EVC / Bank) */}
                            {payChannel !== 'CASH' && (
                                <div className="mb-5">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {payChannel === 'EVC' ? 'EVC Transaction ID' : 'Bank Reference #'}
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                                        placeholder={payChannel === 'EVC' ? 'e.g. EVC-123456' : 'e.g. TXN-2026-0001'}
                                        value={payReference}
                                        onChange={e => setPayReference(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsPaymentOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg">Confirm Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
