import { useState, type FormEvent } from 'react';
import { supplierService } from '../lib/suppliers';
import { makeReferenceId } from '../lib/ids';
import type { Supplier } from '../types/schema';
import { ArrowLeft, Plus, Truck, DollarSign, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

type PayChannel = 'CASH' | 'EVC' | 'BANK_TRANSFER' | 'CHECK';
const CHANNEL_LABELS: Record<PayChannel, string> = {
    CASH: '💵 Cash', EVC: '📱 EVC', BANK_TRANSFER: '🏦 Bank', CHECK: '📝 Check',
};
const CHANNEL_COLORS: Record<PayChannel, string> = {
    CASH: 'bg-emerald-100 text-emerald-700', EVC: 'bg-violet-100 text-violet-700',
    BANK_TRANSFER: 'bg-blue-100 text-blue-700', CHECK: 'bg-amber-100 text-amber-700',
};

export default function Suppliers() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [selected, setSelected] = useState<Supplier | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [showEntry, setShowEntry] = useState<'PURCHASE' | 'PAYMENT' | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    const [entryAmount, setEntryAmount] = useState('');
    const [entryChannel, setEntryChannel] = useState<PayChannel>('CASH');
    const [entryRef, setEntryRef] = useState('');
    const [entryNote, setEntryNote] = useState('');

    void refreshKey; // trigger re-renders
    const suppliers = supplierService.getAllSuppliers();

    const handleAddSupplier = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { alert('Name is required'); return; }
        supplierService.addSupplier({ name: name.trim(), phone: phone.trim(), address: address.trim(), status: 'ACTIVE', notes: '' });
        setName(''); setPhone(''); setAddress('');
        setShowAdd(false);
        setRefreshKey(k => k + 1);
    };

    const handleEntry = (e: FormEvent) => {
        e.preventDefault();
        if (!selected || !showEntry) return;
        const amt = parseFloat(entryAmount);
        if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }

        try {
            supplierService.createEntry({
                supplierId: selected.id,
                branchId: 'branch-1',
                type: showEntry,
                amount: showEntry === 'PURCHASE' ? amt : -amt,
                referenceId: makeReferenceId(showEntry === 'PURCHASE' ? 'PUR' : 'SPAY'),
                paymentChannel: entryChannel,
                paymentReference: entryRef.trim() || undefined,
                note: entryNote.trim() || undefined,
            });
            setEntryAmount(''); setEntryRef(''); setEntryNote('');
            setShowEntry(null);
            setRefreshKey(k => k + 1);
        } catch {
            alert('Error recording entry');
        }
    };

    // ── Detail View ──
    if (selected) {
        const supplier = supplierService.getSupplier(selected.id) || selected;
        const history = supplierService.getLedgerHistory(supplier.id);

        return (
            <div className="p-6 max-w-5xl mx-auto">
                <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4">
                    <ArrowLeft size={18} /> Back to Suppliers
                </button>

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">🏭</div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">{supplier.name}</h1>
                                <p className="text-gray-500 text-sm">{supplier.phone || 'No phone'} · {supplier.address || 'No address'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Payable Balance</div>
                            <div className={`text-3xl font-black ${supplier.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${Math.abs(supplier.currentBalance).toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowEntry('PURCHASE')} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-bold text-sm hover:bg-orange-200 flex items-center gap-2">
                            <ShoppingBag size={16} /> Record Purchase
                        </button>
                        <button onClick={() => setShowEntry('PAYMENT')} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-sm hover:bg-green-200 flex items-center gap-2">
                            <DollarSign size={16} /> Record Payment
                        </button>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Channel</th>
                                <th className="p-4">Reference</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {history.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No history yet</td></tr>
                            ) : history.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 text-sm text-gray-600">{format(new Date(entry.createdAt), 'MMM d, h:mm a')}</td>
                                    <td className="p-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            entry.type === 'PURCHASE' ? 'bg-orange-100 text-orange-700'
                                            : entry.type === 'PAYMENT' ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>{entry.type}</span>
                                    </td>
                                    <td className="p-4">
                                        {entry.paymentChannel ? (
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${CHANNEL_COLORS[entry.paymentChannel as PayChannel] || 'bg-gray-100 text-gray-600'}`}>
                                                {CHANNEL_LABELS[entry.paymentChannel as PayChannel] || entry.paymentChannel}
                                            </span>
                                        ) : <span className="text-xs text-gray-300">—</span>}
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        <div className="font-mono text-xs">{entry.referenceId}</div>
                                        {entry.paymentReference && <div className="text-[10px] text-blue-600 mt-0.5">Ref: {entry.paymentReference}</div>}
                                        {entry.note && <div className="text-[10px] text-gray-400 mt-0.5">{entry.note}</div>}
                                    </td>
                                    <td className={`p-4 text-right font-bold ${entry.amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {entry.amount > 0 ? '+' : ''}{entry.amount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right font-mono text-gray-700">${entry.balanceAfter.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Entry Modal */}
                {showEntry && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-gray-50">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {showEntry === 'PURCHASE' ? '📦 Record Purchase' : '💰 Record Payment'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Supplier: <span className="font-bold text-gray-700">{supplier.name}</span></p>
                            </div>
                            <form onSubmit={handleEntry} className="p-6">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['CASH', 'EVC', 'BANK_TRANSFER', 'CHECK'] as PayChannel[]).map(ch => (
                                            <button key={ch} type="button" onClick={() => setEntryChannel(ch)}
                                                className={`p-2 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                                                    entryChannel === ch ? `${CHANNEL_COLORS[ch]} border-current` : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                                }`}>{CHANNEL_LABELS[ch]}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                                    <input type="number" step="0.01" min="0" value={entryAmount} onChange={e => setEntryAmount(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-bold text-center focus:ring-2 focus:ring-emerald-200 outline-none" placeholder="0.00" autoFocus />
                                </div>
                                {(entryChannel === 'EVC' || entryChannel === 'BANK_TRANSFER' || entryChannel === 'CHECK') && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference #</label>
                                        <input type="text" value={entryRef} onChange={e => setEntryRef(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" placeholder="Txn ID / Check #" />
                                    </div>
                                )}
                                <div className="mb-5">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                                    <input type="text" value={entryNote} onChange={e => setEntryNote(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" placeholder="e.g. Rice 50kg" />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowEntry(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700">Cancel</button>
                                    <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-white ${showEntry === 'PURCHASE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                        {showEntry === 'PURCHASE' ? 'Record Purchase' : 'Record Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── List View ──
    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Truck size={24} /> Suppliers</h1>
                    <p className="text-gray-500 text-sm">Manage suppliers & accounts payable</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-[hsl(var(--color-primary))] text-white rounded-xl font-bold flex items-center gap-2 hover:brightness-110">
                    <Plus size={18} /> Add Supplier
                </button>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-2xl p-6 mb-6 shadow-lg">
                <div className="text-sm opacity-80">Total Accounts Payable</div>
                <div className="text-4xl font-black mt-1">${supplierService.getTotalPayables().toFixed(2)}</div>
                <div className="text-xs opacity-60 mt-2">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Supplier Cards */}
            <div className="space-y-3">
                {suppliers.map(s => (
                    <div key={s.id} onClick={() => setSelected(s)}
                        className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-xl group-hover:bg-purple-100 transition-colors">🏭</div>
                            <div>
                                <div className="font-bold text-gray-800">{s.name}</div>
                                <div className="text-xs text-gray-400">{s.phone || 'No phone'}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xl font-black ${s.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${Math.abs(s.currentBalance).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-gray-400">{s.currentBalance > 0 ? 'YOU OWE' : 'SETTLED'}</div>
                        </div>
                    </div>
                ))}
                {suppliers.length === 0 && (
                    <div className="text-center py-12 text-gray-400">No suppliers yet. Add your first one!</div>
                )}
            </div>

            {/* Add Supplier Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Add Supplier</h3>
                        </div>
                        <form onSubmit={handleAddSupplier} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200" placeholder="Supplier name" autoFocus />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200" placeholder="Phone number" />
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200" placeholder="Address" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl font-bold text-white">Add Supplier</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
