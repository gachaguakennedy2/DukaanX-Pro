import { useState } from 'react';
import { Calendar, Download, Filter } from 'lucide-react';

export default function Reports() {
    const [activeTab, setActiveTab] = useState<'SALES' | 'DEBTORS' | 'INVENTORY'>('SALES');

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
                    <p className="text-gray-500">Detailed financial breakdowns</p>
                </div>

                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-200 bg-white rounded-lg flex items-center gap-2 hover:bg-gray-50 text-sm font-medium">
                        <Calendar size={16} /> Last 30 Days
                    </button>
                    <button className="px-4 py-2 bg-[hsl(var(--color-primary))] text-white rounded-lg flex items-center gap-2 hover:brightness-110 shadow-sm text-sm font-medium">
                        <Download size={16} /> Export PDF
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('SALES')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'SALES' ? 'border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Sales Performance
                </button>
                <button
                    onClick={() => setActiveTab('DEBTORS')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'DEBTORS' ? 'border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Debtors List
                </button>
                <button
                    onClick={() => setActiveTab('INVENTORY')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'INVENTORY' ? 'border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Inventory Valuation
                </button>
            </div>

            {/* Content Area Placeholder */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[400px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                    <Filter size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Select a report type to view detailed data.</p>
                    <p className="text-xs mt-2 opacity-60">(Detailed Tables Coming Soon)</p>
                </div>
            </div>
        </div>
    );
}
