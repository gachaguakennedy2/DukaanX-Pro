import { useEffect, useMemo, useRef, useState } from 'react';
import { Barcode, Keyboard, Plus, ScanLine, Search, X } from 'lucide-react';
import type { Product, Unit } from '../types/schema';
import { MOCK_PRODUCTS } from '../lib/mockProducts';
import ProductCard from '../components/ProductCard';

type BarcodeMode = 'scanner' | 'manual';

type NewProductForm = {
    name: string;
    categoryId: string;
    barcode: string;
    baseUnit: Unit;
    allowBagUnit: boolean;
    bagSizeKg: string;
    pricePerKg: string;
    costPerKg: string;
};

const INITIAL_FORM: NewProductForm = {
    name: '',
    categoryId: '',
    barcode: '',
    baseUnit: 'PCS',
    allowBagUnit: false,
    bagSizeKg: '',
    pricePerKg: '',
    costPerKg: '',
};

const normalizeBarcode = (value: string) => value.replace(/\s+/g, '').trim();

const makeProductId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `p-${Date.now()}`;
};

export default function Products() {
    const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [barcodeMode, setBarcodeMode] = useState<BarcodeMode>('scanner');
    const [scannerInput, setScannerInput] = useState('');
    const [form, setForm] = useState<NewProductForm>(INITIAL_FORM);
    const [error, setError] = useState('');

    const scannerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isModalOpen || barcodeMode !== 'scanner') return;
        const timer = window.setTimeout(() => {
            scannerRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [isModalOpen, barcodeMode]);

    const filtered = useMemo(() => {
        const normalizedSearch = searchTerm.toLowerCase().trim();
        return products
            .filter((p) => p.isActive)
            .filter((p) => {
                if (!normalizedSearch) return true;
                return (
                    p.name.toLowerCase().includes(normalizedSearch) ||
                    p.categoryId.toLowerCase().includes(normalizedSearch) ||
                    (p.barcode || '').toLowerCase().includes(normalizedSearch)
                );
            });
    }, [products, searchTerm]);

    const closeModal = () => {
        setIsModalOpen(false);
        setBarcodeMode('scanner');
        setScannerInput('');
        setForm(INITIAL_FORM);
        setError('');
    };

    const applyScannedBarcode = (raw: string) => {
        const code = normalizeBarcode(raw);
        if (!code) return;

        setForm((prev) => ({ ...prev, barcode: code }));
        setScannerInput('');
        setError('');
    };

    const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        applyScannedBarcode(scannerInput);
    };

    const handleCreateProduct = (e: React.FormEvent) => {
        e.preventDefault();

        const name = form.name.trim();
        const categoryId = form.categoryId.trim().toLowerCase();
        const barcode = normalizeBarcode(form.barcode);
        const pricePerKg = Number.parseFloat(form.pricePerKg);
        const costPerKg = Number.parseFloat(form.costPerKg);
        const bagSizeKg = form.allowBagUnit ? Number.parseFloat(form.bagSizeKg) : undefined;

        if (!name || !categoryId) {
            setError('Name and category are required.');
            return;
        }

        if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
            setError('Price must be greater than 0.');
            return;
        }

        if (!Number.isFinite(costPerKg) || costPerKg < 0) {
            setError('Cost must be 0 or greater.');
            return;
        }

        if (form.allowBagUnit && (!Number.isFinite(bagSizeKg) || (bagSizeKg ?? 0) <= 0)) {
            setError('Bag size must be greater than 0 when BAG unit is enabled.');
            return;
        }

        if (barcode && products.some((p) => normalizeBarcode(p.barcode || '') === barcode)) {
            setError('This barcode is already assigned to another product.');
            return;
        }

        const sellingUnits: Unit[] = form.allowBagUnit
            ? Array.from(new Set<Unit>([form.baseUnit, 'BAG']))
            : [form.baseUnit];

        const nextProduct: Product = {
            id: makeProductId(),
            name,
            categoryId,
            barcode: barcode || undefined,
            baseUnit: form.baseUnit,
            sellingUnits,
            bagSizeKg: form.allowBagUnit ? bagSizeKg : undefined,
            pricePerKg,
            costPerKg,
            isActive: true,
        };

        setProducts((prev) => [nextProduct, ...prev]);
        closeModal();
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Product Catalog</h1>
                    <p className="text-gray-500">Manage items, prices, and units</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} /> Add Product
                </button>
            </div>

            <div className="mb-4">
                <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                        placeholder="Search products (name, category, barcode...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Register New Product</h2>
                                <p className="text-sm text-gray-500">Use scanner mode or manual barcode entry.</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProduct} className="p-5 flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="text-sm font-medium text-gray-700">
                                    Product Name
                                    <input
                                        className="mt-1 w-full border border-gray-300 p-2 rounded-lg"
                                        value={form.name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </label>

                                <label className="text-sm font-medium text-gray-700">
                                    Category
                                    <input
                                        className="mt-1 w-full border border-gray-300 p-2 rounded-lg"
                                        placeholder="e.g. grains, dairy, beverages"
                                        value={form.categoryId}
                                        onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                                        required
                                    />
                                </label>

                                <label className="text-sm font-medium text-gray-700">
                                    Base Unit
                                    <select
                                        className="mt-1 w-full border border-gray-300 p-2 rounded-lg"
                                        value={form.baseUnit}
                                        onChange={(e) => setForm((prev) => ({ ...prev, baseUnit: e.target.value as Unit }))}
                                    >
                                        <option value="PCS">PCS</option>
                                        <option value="KG">KG</option>
                                    </select>
                                </label>

                                <label className="text-sm font-medium text-gray-700">
                                    Selling Price ({form.baseUnit})
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="mt-1 w-full border border-gray-300 p-2 rounded-lg"
                                        value={form.pricePerKg}
                                        onChange={(e) => setForm((prev) => ({ ...prev, pricePerKg: e.target.value }))}
                                        required
                                    />
                                </label>

                                <label className="text-sm font-medium text-gray-700">
                                    Cost Price ({form.baseUnit})
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="mt-1 w-full border border-gray-300 p-2 rounded-lg"
                                        value={form.costPerKg}
                                        onChange={(e) => setForm((prev) => ({ ...prev, costPerKg: e.target.value }))}
                                        required
                                    />
                                </label>

                                <div className="text-sm font-medium text-gray-700 flex items-center gap-2 mt-6 sm:mt-0">
                                    <input
                                        id="allow-bag"
                                        type="checkbox"
                                        checked={form.allowBagUnit}
                                        onChange={(e) => setForm((prev) => ({ ...prev, allowBagUnit: e.target.checked }))}
                                    />
                                    <label htmlFor="allow-bag">Enable BAG selling unit</label>
                                </div>

                                {form.allowBagUnit && (
                                    <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                                        Bag Size (kg)
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="mt-1 w-full border border-gray-300 p-2 rounded-lg"
                                            value={form.bagSizeKg}
                                            onChange={(e) => setForm((prev) => ({ ...prev, bagSizeKg: e.target.value }))}
                                            required
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                                <div className="flex items-center gap-2 mb-3 text-gray-800 font-semibold">
                                    <Barcode size={18} /> Barcode
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setBarcodeMode('scanner')}
                                        className={`px-3 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 ${barcodeMode === 'scanner'
                                            ? 'bg-[hsl(var(--color-primary))] text-white border-[hsl(var(--color-primary))]'
                                            : 'bg-white border-gray-300 text-gray-700'
                                            }`}
                                    >
                                        <ScanLine size={16} /> Scanner
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBarcodeMode('manual')}
                                        className={`px-3 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 ${barcodeMode === 'manual'
                                            ? 'bg-[hsl(var(--color-primary))] text-white border-[hsl(var(--color-primary))]'
                                            : 'bg-white border-gray-300 text-gray-700'
                                            }`}
                                    >
                                        <Keyboard size={16} /> Manual
                                    </button>
                                </div>

                                {barcodeMode === 'scanner' ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Scanner Input
                                            <input
                                                ref={scannerRef}
                                                className="mt-1 w-full border border-gray-300 p-2 rounded-lg"
                                                placeholder="Scan now, then press Enter"
                                                value={scannerInput}
                                                onChange={(e) => setScannerInput(e.target.value)}
                                                onKeyDown={handleScannerKeyDown}
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => applyScannedBarcode(scannerInput)}
                                            className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-sm"
                                        >
                                            Apply Scanned Code
                                        </button>
                                    </div>
                                ) : (
                                    <label className="text-sm font-medium text-gray-700">
                                        Enter Barcode Manually
                                        <input
                                            className="mt-1 w-full border border-gray-300 p-2 rounded-lg"
                                            placeholder="Type UPC/EAN/barcode"
                                            value={form.barcode}
                                            onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                                        />
                                    </label>
                                )}

                                <p className="text-xs text-gray-500 mt-2">
                                    Saved barcode: <span className="font-mono">{form.barcode || 'none'}</span>
                                </p>
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Save Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
