import { useState } from 'react';
import { inventoryService } from '../lib/inventory';
import type { Inventory } from '../types/schema';
import { Package, AlertTriangle, Plus } from 'lucide-react';
import { MOCK_PRODUCTS } from '../lib/mockProducts';

export default function InventoryPage() {
    const [inventory, setInventory] = useState<Inventory[]>(() => inventoryService.getBranchInventory('branch-1'));
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);

    // Receive Form State
    const [selectedProductId, setSelectedProductId] = useState(MOCK_PRODUCTS[0].id);
    const [bagsReceived, setBagsReceived] = useState('');


    const handleReceive = (e: React.FormEvent) => {
        e.preventDefault();
        const product = MOCK_PRODUCTS.find(p => p.id === selectedProductId);
        if (!product) return;

        // CRITICAL LOGIC: Bags -> KG Conversion
        const bags = parseFloat(bagsReceived);
        const kgPerBag = product.bagSizeKg || 1; // Default to 1 if not set (should be set for BAG unit)
        const totalKg = bags * kgPerBag;

        inventoryService.adjustStock(
            product.id,
            'branch-1',
            'PURCHASE',
            totalKg,
            `Received ${bags} Bags (${kgPerBag}kg/bag)`
        );

        setIsReceiveOpen(false);
        setBagsReceived('');
        setInventory(inventoryService.getBranchInventory('branch-1'));
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Inventory Control</h1>
                    <p className="text-gray-500">Real-time stock tracking</p>
                </div>
                <button onClick={() => setIsReceiveOpen(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Receive Purchase
                </button>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="card flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Package size={24} /></div>
                    <div>
                        <div className="text-sm text-gray-500">Value (Est)</div>
                        <div className="text-2xl font-bold">$1,240.00</div>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><AlertTriangle size={24} /></div>
                    <div>
                        <div className="text-sm text-gray-500">Low Stock Items</div>
                        <div className="text-2xl font-bold">1</div>
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4">Product</th>
                            <th className="p-4 text-right">Stock</th>
                            <th className="p-4 text-right">Est. Bags</th>
                            <th className="p-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {inventory.map(item => {
                            const product = MOCK_PRODUCTS.find(p => p.id === item.productId);
                            if (!product) return null;

                            const bagEst = product.bagSizeKg ? (item.stockKg / product.bagSizeKg).toFixed(1) : '-';

                            return (
                                <tr key={item.productId} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{product.name}</div>
                                        <div className="text-xs text-gray-400">{product.baseUnit} Base</div>
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-lg">
                                        {product.baseUnit === 'KG' ? (
                                            <>
                                                {item.stockKg.toFixed(2)} <span className="text-xs text-gray-400 font-sans">kg</span>
                                            </>
                                        ) : (
                                            <>
                                                {item.stockKg.toFixed(0)} <span className="text-xs text-gray-400 font-sans">pcs</span>
                                            </>
                                        )}
                                    </td>
                                    <td className="p-4 text-right font-mono text-gray-600">
                                        {bagEst} <span className="text-xs text-gray-400 font-sans">bags</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {item.stockKg < 50 ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Low</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">OK</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Receive Modal */}
            {isReceiveOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Receive Purchase (In Bags)</h2>
                        <form onSubmit={handleReceive}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Product</label>
                                <select
                                    className="w-full border p-2 rounded-lg"
                                    value={selectedProductId}
                                    onChange={e => setSelectedProductId(e.target.value)}
                                >
                                    {MOCK_PRODUCTS.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.bagSizeKg}kg/bag)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Quantity (Bags)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded-lg"
                                    value={bagsReceived}
                                    onChange={e => setBagsReceived(e.target.value)}
                                    placeholder="e.g. 10"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    System will automatically convert this to KG based on bag size.
                                </p>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={() => setIsReceiveOpen(false)} className="px-4 py-2 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="btn-primary">Confirm Purchase</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
