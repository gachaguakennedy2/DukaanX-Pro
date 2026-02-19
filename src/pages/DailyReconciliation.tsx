import { useState } from 'react';
import { accountingService } from '../lib/accounting';
import type { DailyFinancials } from '../lib/accounting';
import { CheckCircle, AlertTriangle, Save, DollarSign, Calculator } from 'lucide-react';

export default function DailyReconciliation() {
    const [snapshot, setSnapshot] = useState<DailyFinancials | null>(() => accountingService.getDailySnapshot());
    const [cashInput, setCashInput] = useState('');
    const [notes, setNotes] = useState('');
    const [step, setStep] = useState(1); // 1: Review, 2: Count, 3: Confirm

    if (!snapshot) return <div>Loading...</div>;

    if (snapshot.isClosed) {
        return (
            <div className="p-10 flex flex-col items-center justify-center h-full text-center">
                <CheckCircle size={64} className="text-green-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-800">Day Closed</h1>
                <p className="text-gray-500 mt-2">Reconciliation for {snapshot.date} is complete.</p>
                <div className="mt-8 bg-gray-50 p-6 rounded-xl border border-gray-100 max-w-sm w-full">
                    <div className="flex justify-between mb-2"><span>Revenue</span><span className="font-bold">${snapshot.revenue}</span></div>
                    <div className="flex justify-between mb-2"><span>Gross Profit</span><span className="font-bold text-green-600">${snapshot.grossProfit}</span></div>
                    <div className="border-t border-gray-200 my-2 pt-2 flex justify-between">
                        <span>Variance</span>
                        <span className={`font-bold ${snapshot.variance < 0 ? 'text-red-500' : 'text-gray-800'}`}>${snapshot.variance}</span>
                    </div>
                </div>
            </div>
        );
    }

    const variance = (parseFloat(cashInput) || 0) - snapshot.expectedCash;

    const handleCloseDay = () => {
        if (!snapshot) return;
        accountingService.closeDay({
            ...snapshot,
            actualCash: parseFloat(cashInput) || 0,
            variance
        });
        setSnapshot(accountingService.getDailySnapshot()); // Refresh to see closed state
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">End of Day Reconciliation</h1>

            {/* Stepper */}
            <div className="flex gap-4 mb-8">
                <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-[hsl(var(--color-primary))]' : 'bg-gray-200'}`}></div>
                <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-[hsl(var(--color-primary))]' : 'bg-gray-200'}`}></div>
                <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-[hsl(var(--color-primary))]' : 'bg-gray-200'}`}></div>
            </div>

            {step === 1 && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Calculator /> Step 1: System Review</h2>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-500 mb-1">Total Revenue</div>
                            <div className="text-2xl font-bold">${snapshot.revenue.toFixed(2)}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-500 mb-1">Cost of Goods</div>
                            <div className="text-2xl font-bold text-gray-600">${snapshot.cogs.toFixed(2)}</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg col-span-2">
                            <div className="text-sm text-green-600 mb-1 font-bold uppercase">Expected Gross Profit</div>
                            <div className="text-3xl font-bold text-green-700">${snapshot.grossProfit.toFixed(2)}</div>
                        </div>
                    </div>
                    <button onClick={() => setStep(2)} className="btn-primary w-full py-3">Next: Cash Count</button>
                </div>
            )}

            {step === 2 && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><DollarSign /> Step 2: Cash Count</h2>
                    <p className="text-gray-500 mb-6">Count the physical cash in the drawer and enter the total.</p>

                    <div className="mb-6">
                        <div className="text-sm font-bold text-gray-600 mb-2">Expected Cash (System)</div>
                        <div className="text-2xl font-bold text-gray-400 mb-4">${snapshot.expectedCash.toFixed(2)}</div>

                        <label className="block text-sm font-bold mb-2">Actual Cash Counted</label>
                        <input
                            type="number"
                            autoFocus
                            className="w-full text-3xl font-bold p-4 border rounded-xl"
                            placeholder="0.00"
                            value={cashInput}
                            onChange={e => setCashInput(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="px-6 py-3 bg-gray-100 rounded-lg font-bold text-gray-600">Back</button>
                        <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3" disabled={!cashInput}>Review Variance</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><AlertTriangle /> Step 3: Final Review</h2>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Expected Cash</span>
                            <span className="font-bold text-lg">${snapshot.expectedCash.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Actual Count</span>
                            <span className="font-bold text-lg">${parseFloat(cashInput).toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${variance === 0 ? 'bg-green-50 border-green-100 text-green-700' : variance < 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                            <span className="font-bold uppercase">Variance</span>
                            <span className="font-bold text-2xl">${variance.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                        <textarea
                            className="w-full border p-3 rounded-lg"
                            rows={3}
                            placeholder="Explain any discrepancy..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(2)} className="px-6 py-3 bg-gray-100 rounded-lg font-bold text-gray-600">Back</button>
                        <button
                            onClick={handleCloseDay}
                            className={`flex-1 py-3 rounded-lg font-bold text-white shadow-lg flex items-center justify-center gap-2 ${variance < -10 ? 'bg-red-600 hover:bg-red-700' : 'bg-[hsl(var(--color-primary))] hover:brightness-110'}`}
                        >
                            <Save size={18} /> Confirm Close Day
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
