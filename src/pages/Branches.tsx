import { useState } from 'react';
import { Plus, MapPin, Users, Edit, Trash2 } from 'lucide-react';
import type { Branch } from '../types/schema';

// MOCK DATA for Sprint 1
const MOCK_BRANCHES: Branch[] = [
    { id: '1', name: 'Downtown HQ', location: '123 Main St, Central', isActive: true },
    { id: '2', name: 'Westside Market', location: '456 West Ave', isActive: true },
];

export default function Branches() {
    const [branches, setBranches] = useState<Branch[]>(MOCK_BRANCHES);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const newBranch: Branch = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            location,
            isActive: true
        };
        setBranches([...branches, newBranch]);
        setIsModalOpen(false);
        setName('');
        setLocation('');
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Branch Management</h1>
                    <p className="text-gray-500">Manage store locations and settings</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} /> Add Branch
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => (
                    <div key={branch.id} className="card hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-50 text-[hsl(var(--color-primary))] rounded-lg">
                                <MapPin size={24} />
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${branch.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {branch.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-800 mb-1">{branch.name}</h3>
                        <p className="text-gray-500 text-sm mb-4">{branch.location}</p>

                        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Users size={16} />
                                <span>3 Staff</span>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500">
                                    <Edit size={16} />
                                </button>
                                <button className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Simple Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Add New Branch</h2>
                        <form onSubmit={handleCreate} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Branch Name</label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. North Station"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Location</label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    placeholder="Address or Area"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 hover:bg-gray-100 rounded-lg text-gray-600"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Create Branch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
