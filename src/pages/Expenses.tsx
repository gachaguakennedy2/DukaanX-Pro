import { useState, type FormEvent } from 'react';
import { expenseService } from '../lib/expenses';
import type { ExpenseCategory } from '../types/schema';
import { EXPENSE_CATEGORIES } from '../types/schema';
import { Receipt, Plus, Filter } from 'lucide-react';
import { format } from 'date-fns';

type PayChannel = 'CASH' | 'EVC' | 'BANK_TRANSFER' | 'CHECK';
const CHANNEL_LABELS: Record<PayChannel, string> = {
    CASH: '💵 Cash', EVC: '📱 EVC', BANK_TRANSFER: '🏦 Bank', CHECK: '📝 Check',
};

export default function Expenses() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [showAdd, setShowAdd] = useState(false);
    const [filterCat, setFilterCat] = useState<ExpenseCategory | 'ALL'>('ALL');

    // Form states
    const [category, setCategory] = useState<ExpenseCategory>('SALARY');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [channel, setChannel] = useState<PayChannel>('CASH');
    const [payRef, setPayRef] = useState('');
    const [receiptRef, setReceiptRef] = useState('');
    const [note, setNote] = useState('');

    void refreshKey;
    const allExpenses = expenseService.getAll();
    const expenses = filterCat === 'ALL' ? allExpenses : allExpenses.filter(e => e.category === filterCat);
    const todayTotal = expenseService.getTodayTotal();
    const catTotals = expenseService.getTotalByCategory();
    const grandTotal = allExpenses.reduce((s, e) => s + e.amount, 0);

    const handleAdd = (e: FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
        if (!description.trim()) { alert('Description is required.'); return; }

        expenseService.addExpense({
            branchId: 'branch-1',
            category,
            amount: amt,
            description: description.trim(),
            paymentChannel: channel,
            paymentReference: payRef.trim() || undefined,
            receiptRef: receiptRef.trim() || undefined,
            note: note.trim() || undefined,
        });

        setAmount(''); setDescription(''); setPayRef(''); setReceiptRef(''); setNote('');
        setShowAdd(false);
        setRefreshKey(k => k + 1);
    };

    const catInfo = (cat: ExpenseCategory) => EXPENSE_CATEGORIES.find(c => c.value === cat);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Receipt size={24} /> Expenses</h1>
                    <p className="text-gray-500 text-sm">Track salaries, rent, utilities & more</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-600">
                    <Plus size={18} /> Add Expense
                </button>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-4 shadow-lg">
                    <div className="text-xs opacity-80">Total Expenses</div>
                    <div className="text-2xl font-black mt-1">${grandTotal.toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-4 shadow-lg">
                    <div className="text-xs opacity-80">Today</div>
                    <div className="text-2xl font-black mt-1">${todayTotal.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm col-span-2">
                    <div className="text-xs text-gray-400 font-bold mb-2">BY CATEGORY</div>
                    <div className="flex flex-wrap gap-2">
                        {EXPENSE_CATEGORIES.map(c => {
                            const total = catTotals[c.value] || 0;
                            if (total === 0) return null;
                            return (
                                <div key={c.value} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg text-xs">
                                    <span>{c.icon}</span>
                                    <span className="font-medium text-gray-600">{c.label}</span>
                                    <span className="font-black text-gray-800">${total.toFixed(0)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                <Filter size={14} className="text-gray-400 shrink-0" />
                <button onClick={() => setFilterCat('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filterCat === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>All</button>
                {EXPENSE_CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setFilterCat(c.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filterCat === c.value ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {c.icon} {c.label}
                    </button>
                ))}
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Description</th>
                            <th className="p-4">Channel</th>
                            <th className="p-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {expenses.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">No expenses recorded</td></tr>
                        ) : expenses.map(exp => {
                            const ci = catInfo(exp.category);
                            return (
                                <tr key={exp.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 text-sm text-gray-600">{format(new Date(exp.createdAt), 'MMM d, h:mm a')}</td>
                                    <td className="p-4">
                                        <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                            {ci?.icon} {ci?.label}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-700">
                                        <div className="font-medium">{exp.description}</div>
                                        {exp.receiptRef && <div className="text-[10px] text-blue-600">Receipt: {exp.receiptRef}</div>}
                                        {exp.note && <div className="text-[10px] text-gray-400">{exp.note}</div>}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs font-bold">{CHANNEL_LABELS[exp.paymentChannel as PayChannel] || exp.paymentChannel}</span>
                                        {exp.paymentReference && <div className="text-[10px] text-blue-600 mt-0.5">Ref: {exp.paymentReference}</div>}
                                    </td>
                                    <td className="p-4 text-right font-bold text-red-600">${exp.amount.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add Expense Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Add Expense</h3>
                        </div>
                        <form onSubmit={handleAdd} className="p-6 max-h-[70vh] overflow-y-auto">
                            {/* Category Picker */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {EXPENSE_CATEGORIES.map(c => (
                                        <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                                            className={`p-2 rounded-xl border-2 text-center transition-all ${
                                                category === c.value ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}>
                                            <div className="text-xl">{c.icon}</div>
                                            <div className="text-[10px] font-bold mt-0.5">{c.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
                                <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-bold text-center focus:ring-2 focus:ring-red-200 outline-none" placeholder="0.00" autoFocus />
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-200" placeholder="e.g. January staff wages" />
                            </div>

                            {/* Payment Channel */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['CASH', 'EVC', 'BANK_TRANSFER', 'CHECK'] as PayChannel[]).map(ch => (
                                        <button key={ch} type="button" onClick={() => setChannel(ch)}
                                            className={`p-2 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                                                channel === ch ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}>{CHANNEL_LABELS[ch]}</button>
                                    ))}
                                </div>
                            </div>

                            {(channel === 'EVC' || channel === 'BANK_TRANSFER' || channel === 'CHECK') && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                                    <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-200" placeholder="Txn ID / Check #" />
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt / Invoice #</label>
                                <input type="text" value={receiptRef} onChange={e => setReceiptRef(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-200" placeholder="Optional external ref" />
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-200" placeholder="Optional note" />
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white">Record Expense</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
