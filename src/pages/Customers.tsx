import { useState } from 'react';
import { Plus, Users, Search, AlertCircle, FileText } from 'lucide-react';
import type { Customer } from '../types/schema';
import { ledgerService } from '../lib/ledger'; // We use the singleton for state
import { Link } from 'react-router-dom';

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>(ledgerService.getAllCustomers());
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [limit, setLimit] = useState(100);

    const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        ledgerService.createCustomer({ name, phone, creditLimit: limit });
        setCustomers(ledgerService.getAllCustomers()); // Refresh
        setIsModalOpen(false);
        setName(''); setPhone(''); setLimit(100);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
                    <p className="text-gray-500">Manage profiles and credit limits</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Customer
                </button>
            </div>

            {/* Stats Cards (Mock) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="card flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">Total Customers</div>
                        <div className="text-2xl font-bold">{customers.length}</div>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">Overdue (Mock)</div>
                        <div className="text-2xl font-bold">0</div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Phone</th>
                            <th className="p-4">Credit Status</th>
                            <th className="p-4">Balance / Limit</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map(c => {
                            const usage = (c.currentBalance / c.creditLimit) * 100;
                            let statusColor = 'bg-green-100 text-green-700';
                            if (usage > 80) statusColor = 'bg-yellow-100 text-yellow-700';
                            if (usage >= 100 || c.status === 'BLOCKED') statusColor = 'bg-red-100 text-red-700';

                            return (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{c.name}</div>
                                        <div className="text-xs text-gray-400">ID: {c.id}</div>
                                    </td>
                                    <td className="p-4 text-gray-600">{c.phone}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1 w-32">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold">${c.currentBalance.toFixed(2)}</span>
                                                <span className="text-gray-400">/ ${c.creditLimit}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${usage > 90 ? 'bg-red-500' : 'bg-[hsl(var(--color-primary))]'}`}
                                                    style={{ width: `${Math.min(usage, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Link to={`/customers/${c.id}`} className="text-[hsl(var(--color-primary))] hover:underline flex items-center justify-end gap-1 font-medium text-sm">
                                            View Ledger <FileText size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Add Customer</h2>
                        <form onSubmit={handleCreate} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input className="w-full border p-2 rounded-lg" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <input className="w-full border p-2 rounded-lg" value={phone} onChange={e => setPhone(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Credit Limit ($)</label>
                                <input type="number" className="w-full border p-2 rounded-lg" value={limit} onChange={e => setLimit(Number(e.target.value))} required />
                            </div>
                            <div className="flex gap-3 justify-end mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
