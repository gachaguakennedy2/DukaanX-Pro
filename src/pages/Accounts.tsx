import { useState } from 'react';
import { supplierService } from '../lib/suppliers';
import { expenseService } from '../lib/expenses';
import { ledgerService } from '../lib/ledger';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../types/schema';
import { BookOpen, TrendingDown, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Accounts() {
    const [refreshKey] = useState(0);
    void refreshKey;

    const receivable = ledgerService.getAllCustomers().reduce((s, c) => s + Math.max(0, c.currentBalance), 0);
    const payable = supplierService.getTotalPayables();
    const totalExpenses = expenseService.getAll().reduce((s, e) => s + e.amount, 0);
    const todayExpenses = expenseService.getTodayTotal();
    const catTotals = expenseService.getTotalByCategory();

    const netPosition = receivable - payable;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BookOpen size={24} /> Accounts</h1>
                <p className="text-gray-500 text-sm">Receivables, payables & expense overview</p>
            </div>

            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs opacity-80 font-medium">Accounts Receivable</div>
                            <div className="text-3xl font-black mt-1">${receivable.toFixed(2)}</div>
                            <div className="text-[10px] opacity-60 mt-1">Customers owe you</div>
                        </div>
                        <TrendingUp size={32} className="opacity-30" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs opacity-80 font-medium">Accounts Payable</div>
                            <div className="text-3xl font-black mt-1">${payable.toFixed(2)}</div>
                            <div className="text-[10px] opacity-60 mt-1">You owe suppliers</div>
                        </div>
                        <TrendingDown size={32} className="opacity-30" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs opacity-80 font-medium">Total Expenses</div>
                            <div className="text-3xl font-black mt-1">${totalExpenses.toFixed(2)}</div>
                            <div className="text-[10px] opacity-60 mt-1">Today: ${todayExpenses.toFixed(2)}</div>
                        </div>
                        <Wallet size={32} className="opacity-30" />
                    </div>
                </div>

                <div className={`bg-gradient-to-br ${netPosition >= 0 ? 'from-blue-500 to-blue-600' : 'from-gray-600 to-gray-700'} text-white rounded-2xl p-5 shadow-lg`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs opacity-80 font-medium">Net Position</div>
                            <div className="text-3xl font-black mt-1">${netPosition.toFixed(2)}</div>
                            <div className="text-[10px] opacity-60 mt-1">Receivable − Payable</div>
                        </div>
                        <BookOpen size={32} className="opacity-30" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payable Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Supplier Balances</h3>
                        <Link to="/suppliers" className="text-xs text-[hsl(var(--color-primary))] hover:underline flex items-center gap-1">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {supplierService.getAllSuppliers()
                            .sort((a, b) => b.currentBalance - a.currentBalance)
                            .slice(0, 5)
                            .map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-sm">🏭</div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">{s.name}</div>
                                            <div className="text-[10px] text-gray-400">{s.phone || '—'}</div>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-black ${s.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ${Math.abs(s.currentBalance).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        {supplierService.getAllSuppliers().length === 0 && (
                            <div className="text-sm text-gray-400 text-center py-4">No suppliers yet</div>
                        )}
                    </div>
                </div>

                {/* Expense Categories Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Expense Breakdown</h3>
                        <Link to="/expenses" className="text-xs text-[hsl(var(--color-primary))] hover:underline flex items-center gap-1">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {EXPENSE_CATEGORIES.map(c => {
                            const total = catTotals[c.value as ExpenseCategory] || 0;
                            const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                            return (
                                <div key={c.value} className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg">{c.icon}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">{c.label}</span>
                                            <span className="text-sm font-black text-gray-800">${total.toFixed(2)}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Future: Tax Account Placeholder */}
                <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-6 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl">🏛️</div>
                        <div>
                            <h3 className="font-bold text-gray-800">Tax Account</h3>
                            <p className="text-xs text-gray-400">Coming soon — track VAT, withholding tax, and filing</p>
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
                        Tax tracking will be enabled in a future update. Expenses marked as "Tax" category are tracked separately for your reference.
                        {(catTotals['TAX'] || 0) > 0 && (
                            <span className="font-bold ml-1">Current tax expenses: ${catTotals['TAX']?.toFixed(2)}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
