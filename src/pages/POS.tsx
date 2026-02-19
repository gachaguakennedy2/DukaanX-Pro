import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '../store/cartStore';
import type { Product, Unit, Customer } from '../types/schema';
import { ledgerService } from '../lib/ledger';
import { inventoryService } from '../lib/inventory';
import type { Sale } from '../types/schema';
import { makeClientTxnId, makeReceiptNo, makeReferenceId } from '../lib/ids';
import { salesService } from '../lib/sales';
import { printReceipt, printDraft, type ReceiptPayload } from '../lib/receiptPrint';
import { Search, ShoppingCart, Trash2, User as UserIcon, X, Check, AlertCircle } from 'lucide-react';
import { MOCK_PRODUCTS } from '../lib/mockProducts';
import { reportingService, type LowStockItem } from '../lib/reports';

export default function POS() {
    const { items, addToCart, removeFromCart, cartTotal, clearCart } = useCartStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUnit] = useState<Record<string, Unit>>({});

    // Add Item Modal (quantity prompt)
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [addItemProduct, setAddItemProduct] = useState<Product | undefined>();
    const [addItemUnit, setAddItemUnit] = useState<Unit>('KG');
    const [addItemQty, setAddItemQty] = useState<string>('1');

    // Payment/Checkout State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
    const [customerSearch, setCustomerSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT' | 'MIXED'>('CASH');
    const [paidNow, setPaidNow] = useState<string>('');
    const [checkoutStep, setCheckoutStep] = useState<'CUSTOMER' | 'PAYMENT' | 'DRAFT' | 'RECEIPT'>('CUSTOMER');
    const [receiptNo, setReceiptNo] = useState('');
    const [lastReceipt, setLastReceipt] = useState<ReceiptPayload | undefined>();
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [lowStock] = useState<LowStockItem[]>(() => reportingService.getLowStockItems());

    const loadRecentSales = useCallback(async () => {
        const sales = await salesService.getRecentSales(5);
        setRecentSales(sales);
    }, []);

    useEffect(() => { void loadRecentSales(); }, [loadRecentSales]);

    const filteredProducts = MOCK_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.includes(searchTerm)
    );

    const filteredCustomers = ledgerService.getAllCustomers().filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
    );

    const getActiveUnit = (product: Product) => selectedUnit[product.id] || product.baseUnit;

    const openAddItem = (product: Product) => {
        const unit = getActiveUnit(product);
        setAddItemProduct(product);
        setAddItemUnit(unit);
        setAddItemQty('');
        setIsAddItemOpen(true);
    };

    const closeAddItem = () => {
        setIsAddItemOpen(false);
        setAddItemProduct(undefined);
        setAddItemQty('');
    };

    const confirmAddItem = () => {
        if (!addItemProduct) return;
        const parsed = Number.parseFloat(addItemQty);
        const qty = Number.isFinite(parsed) ? parsed : 0;
        if (qty <= 0) {
            alert('Enter a valid quantity.');
            return;
        }

        addToCart(addItemProduct, addItemUnit, qty);
        closeAddItem();
    };

    const handleCheckoutStart = () => {
        if (items.length === 0) return;
        setIsCheckoutOpen(true);
        setCheckoutStep('CUSTOMER');
        setSelectedCustomer(undefined);
        setPaymentMethod('CASH');
        setPaidNow('');
    };

    const handleConfirmSale = async () => {
        const total = cartTotal();
        const branchId = 'branch-1';

        let paidAmount = total;
        let creditAmount = 0;

        if (selectedCustomer) {
            if (paymentMethod === 'CREDIT') {
                paidAmount = 0;
                creditAmount = total;
            } else if (paymentMethod === 'MIXED') {
                const parsed = Number.parseFloat(paidNow || '0');
                const clamped = Number.isFinite(parsed) ? Math.max(0, Math.min(total, parsed)) : 0;
                paidAmount = clamped;
                creditAmount = total - clamped;
            } else {
                paidAmount = total;
                creditAmount = 0;
            }

            // Validate credit remainder against limit
            if (creditAmount > 0) {
                const newBalance = selectedCustomer.currentBalance + creditAmount;
                if (newBalance > selectedCustomer.creditLimit) {
                    alert(
                        `Credit Limit Exceeded! Current: $${selectedCustomer.currentBalance.toFixed(2)}, Limit: $${selectedCustomer.creditLimit.toFixed(2)}, New: $${newBalance.toFixed(2)}`
                    );
                    return;
                }
            }
        } else {
            // Walk-in: force cash
            paidAmount = total;
            creditAmount = 0;
        }

        const referenceId = makeReferenceId('SALE');
        const clientTxnId = makeClientTxnId('web');

        // 1) Ledger (append-only) — always record if a customer was selected
        if (selectedCustomer) {
            try {
                ledgerService.createEntry({
                    customerId: selectedCustomer.id,
                    branchId,
                    type: 'SALE',
                    amount: total,
                    referenceId,
                    note: 'POS Sale',
                });

                if (paidAmount > 0) {
                    ledgerService.createEntry({
                        customerId: selectedCustomer.id,
                        branchId,
                        type: 'PAYMENT',
                        amount: -paidAmount,
                        referenceId: makeReferenceId('PAY'),
                        note: 'POS Payment (at checkout)',
                    });
                }
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Unknown error';
                alert(message);
                return;
            }
        }

        // 2) Inventory movements
        items.forEach((item) => {
            inventoryService.adjustStock(
                item.productId,
                branchId,
                'SALE',
                -item.kgCalculated,
                `POS Sale: ${item.quantity} ${item.unitUsed}`
            );
        });

        // 3) Persist sale record (local-first)
        const sale: Sale = {
            id: referenceId,
            branchId,
            customerId: selectedCustomer?.id,
            customerName: selectedCustomer?.name,
            totalAmount: total,
            paidAmount,
            creditAmount,
            paymentMethod: selectedCustomer ? paymentMethod : 'CASH',
            items: items,
            createdAt: new Date(),
            status: 'COMPLETED',
        };

        try {
            await salesService.createSale(sale, clientTxnId);
        } catch (e) {
            console.warn('Failed to persist sale to local DB', e);
        }

        // 4) Clear cart & refresh recent sales
        clearCart();
        void loadRecentSales();

        const rn = makeReceiptNo();
        setReceiptNo(rn);
        setLastReceipt({
            storeName: 'Orbit Retail',
            branchName: branchId,
            receiptNo: rn,
            saleId: sale.id,
            createdAt: sale.createdAt,
            customer: selectedCustomer
                ? { id: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phone }
                : undefined,
            sale,
        });
        setCheckoutStep('RECEIPT');
    };

    const handleCloseCheckout = () => {
        setIsCheckoutOpen(false);
        clearCart();
        setCheckoutStep('CUSTOMER');
        setReceiptNo('');
        setPaidNow('');
    };

    const handlePrintReceipt = () => {
        if (!lastReceipt) {
            alert('No receipt to print yet.');
            return;
        }
        printReceipt(lastReceipt);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-gray-50 text-[rgb(var(--color-text))]">
        <div className="flex flex-1 min-h-0 gap-4 p-4 pb-2">
            {/* LEFT: Product Grid */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-2 border border-blue-100">
                    <Search className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products or scan barcode..."
                        className="flex-1 outline-none text-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2">
                    {filteredProducts.map(product => {
                        const handleAdd = () => openAddItem(product);

                        return (
                            <div
                                key={product.id}
                                role="button"
                                tabIndex={0}
                                onClick={handleAdd}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') handleAdd();
                                }}
                                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center justify-center gap-2 h-32 group relative overflow-hidden cursor-pointer hover:border-[hsl(var(--color-primary))] hover:bg-emerald-50/30"
                            >
                                <div className="text-3xl">{product.image || '📦'}</div>
                                <h3 className="font-bold text-sm text-gray-900 text-center leading-tight line-clamp-2">
                                    {product.name}
                                </h3>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT: Cart */}
            <div className="w-[400px] bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full">
                {/* ... Cart Header ... */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[hsl(var(--color-primary))] text-white rounded-t-xl">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <ShoppingCart />
                        Current Sale
                    </div>
                    <div className="text-sm opacity-80">
                        {items.length} items
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {items.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <ShoppingCart size={48} className="mb-2 opacity-20" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={`${item.productId}-${item.unitUsed}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group">
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800">{item.nameSnapshot}</div>
                                    <div className="text-xs text-gray-500">
                                        {item.unitUsed} @ ${item.pricePerKgSnapshot.toFixed(2)}/kg
                                        {item.unitUsed === 'BAG' && <span className="ml-1 text-[hsl(var(--color-secondary))]">(Bag calc)</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 bg-white rounded-md border border-gray-200 shadow-sm">
                                        <div className="px-2 py-1 font-mono font-bold min-w-[2rem] text-center">{item.quantity}</div>
                                    </div>
                                    <div className="font-bold text-lg w-20 text-right">
                                        ${item.lineTotal.toFixed(2)}
                                    </div>
                                    <button onClick={() => removeFromCart(item.productId, item.unitUsed)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Totals Section */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl">
                    <div className="flex justify-between mb-2 text-gray-500">
                        <span>Subtotal</span>
                        <span>${cartTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-3xl font-bold text-[hsl(var(--color-text))] mb-6">
                        <span>Total</span>
                        <span>${cartTotal().toFixed(2)}</span>
                    </div>

                    <button
                        onClick={handleCheckoutStart}
                        className="w-full py-4 bg-[hsl(var(--color-primary))] text-white rounded-xl text-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-3"
                    >
                        Checkout
                    </button>

                    {/* Recent Sales */}
                    {recentSales.length > 0 && (
                        <div className="mt-4 border-t border-gray-200 pt-4 max-h-[180px] overflow-y-auto">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Recent Sales</h4>
                            <div className="space-y-2">
                                {recentSales.map((s) => (
                                    <div key={s.id} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-gray-100">
                                        <div>
                                            <div className="font-medium text-gray-700">{s.items.length} items</div>
                                            <div className="text-gray-400">{new Date(s.createdAt).toLocaleTimeString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-800">${s.totalAmount.toFixed(2)}</div>
                                            <div className={`text-[10px] font-bold ${s.paymentMethod === 'CREDIT' ? 'text-orange-600' : s.paymentMethod === 'MIXED' ? 'text-blue-600' : 'text-emerald-600'}`}>{s.paymentMethod}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* LOW STOCK TICKER — pinned to bottom */}
        {lowStock.length > 0 && (
            <div className="px-4 pb-3">
                <div className="relative overflow-hidden bg-white rounded-xl border border-orange-200 shadow-sm">
                    <div className="flex items-center">
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border-r border-orange-200 shrink-0 z-10">
                            <AlertCircle size={14} className="text-red-500" />
                            <span className="text-[11px] font-bold text-red-600 uppercase">Low Stock</span>
                        </div>
                        <div className="overflow-hidden flex-1">
                            <div className="flex animate-marquee gap-1 py-2 px-2 w-max">
                                {[...lowStock, ...lowStock].map((item, i) => {
                                    const isZero = item.stockKg === 0;
                                    return (
                                        <div key={`${item.productId}-${i}`} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md whitespace-nowrap text-xs ${
                                            isZero ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                                        }`}>
                                            <span>{item.image}</span>
                                            <span className="font-semibold">{item.name}</span>
                                            <span className={`font-black ${isZero ? 'text-red-600' : 'text-orange-600'}`}>{item.stockKg}</span>
                                            <span className="text-[9px] text-gray-400">{item.baseUnit}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {/* end low stock ticker */}

            {/* Checkout Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold">Checkout</h2>
                            <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* STEPS Sidebar */}
                            <div className="w-48 bg-gray-50 border-r border-gray-100 p-4 flex flex-col gap-2">
                                <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${checkoutStep === 'CUSTOMER' ? 'bg-white shadow text-[hsl(var(--color-primary))]' : 'text-gray-400'}`}>
                                    <UserIcon size={16} /> Customer
                                </div>
                                <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${checkoutStep === 'PAYMENT' ? 'bg-white shadow text-[hsl(var(--color-primary))]' : 'text-gray-400'}`}>
                                    <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">$</div> Payment
                                </div>
                                <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${checkoutStep === 'DRAFT' ? 'bg-white shadow text-[hsl(var(--color-primary))]' : 'text-gray-400'}`}>
                                    📋 Draft
                                </div>
                                <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${checkoutStep === 'RECEIPT' ? 'bg-white shadow text-[hsl(var(--color-primary))]' : 'text-gray-400'}`}>
                                    <Check size={16} /> Receipt
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 p-8 overflow-y-auto">
                                {checkoutStep === 'CUSTOMER' && (
                                    <div className="flex flex-col h-full">
                                        <h3 className="text-lg font-bold mb-4">Select Customer (Optional)</h3>

                                        <div className="relative mb-4">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                                                placeholder="Search customer..."
                                                value={customerSearch}
                                                onChange={e => setCustomerSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>

                                        <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg">
                                            {filteredCustomers.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => setSelectedCustomer(c)}
                                                    className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-center ${selectedCustomer?.id === c.id ? 'bg-emerald-50 border-emerald-100' : ''}`}
                                                >
                                                    <div>
                                                        <div className="font-bold">{c.name}</div>
                                                        <div className="text-xs text-gray-500">{c.phone}</div>
                                                    </div>
                                                    {selectedCustomer?.id === c.id && <Check size={16} className="text-[hsl(var(--color-primary))]" />}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="mt-4 flex justify-end gap-3">
                                            <button onClick={() => setCheckoutStep('PAYMENT')} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-600">
                                                Skip / Walk-in
                                            </button>
                                            <button
                                                disabled={!selectedCustomer}
                                                onClick={() => setCheckoutStep('PAYMENT')}
                                                className="px-6 py-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {checkoutStep === 'PAYMENT' && (
                                    <div className="flex flex-col h-full">
                                        <h3 className="text-lg font-bold mb-4">Payment Method</h3>

                                        {selectedCustomer && (
                                            <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <div className="text-xs text-emerald-600 font-bold uppercase mb-1">Customer</div>
                                                <div className="font-bold text-emerald-900">{selectedCustomer.name}</div>
                                                <div className="flex gap-4 mt-2 text-sm">
                                                    <div>Balance: <span className="font-bold">${selectedCustomer.currentBalance.toFixed(2)}</span></div>
                                                    <div>Limit: <span className="font-bold">${selectedCustomer.creditLimit.toFixed(2)}</span></div>
                                                    <div>Available: <span className="font-bold text-emerald-600">${Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentBalance).toFixed(2)}</span></div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <button
                                                onClick={() => setPaymentMethod('CASH')}
                                                className={`p-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'CASH' ? 'border-[hsl(var(--color-primary))] bg-emerald-50 text-[hsl(var(--color-primary))] font-bold' : 'border-gray-100 hover:border-gray-200'}`}
                                            >
                                                CASH
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('CREDIT')}
                                                disabled={!selectedCustomer}
                                                className={`p-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'CREDIT' ? 'border-[hsl(var(--color-secondary))] bg-orange-50 text-[hsl(var(--color-secondary))] font-bold' : 'border-gray-100 hover:border-gray-200 disabled:opacity-50'}`}
                                            >
                                                CREDIT
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('MIXED')}
                                                disabled={!selectedCustomer}
                                                className={`p-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'MIXED' ? 'border-[hsl(var(--color-text))] bg-gray-50 text-[hsl(var(--color-text))] font-bold' : 'border-gray-100 hover:border-gray-200 disabled:opacity-50'}`}
                                            >
                                                MIXED
                                            </button>
                                        </div>

                                        {selectedCustomer && paymentMethod === 'MIXED' && (
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Paid Now ($)</label>
                                                <input
                                                    type="number"
                                                    value={paidNow}
                                                    onChange={(e) => setPaidNow(e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-xl font-bold outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min={0}
                                                    max={cartTotal()}
                                                />
                                                <div className="text-xs text-gray-500 mt-2">
                                                    Credit remainder: <span className="font-bold">${Math.max(0, cartTotal() - (Number.parseFloat(paidNow || '0') || 0)).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-auto">
                                            <div className="flex justify-between items-center mb-4 text-2xl font-bold">
                                                <span>Total Due</span>
                                                <span>${cartTotal().toFixed(2)}</span>
                                            </div>
                                            <button
                                                onClick={() => setCheckoutStep('DRAFT')}
                                                className="w-full py-4 btn-primary text-xl shadow-lg"
                                            >
                                                Review Draft
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {checkoutStep === 'DRAFT' && (
                                    <div className="flex flex-col h-full">
                                        <h3 className="text-lg font-bold mb-4">Draft — Review & Confirm</h3>

                                        {selectedCustomer && (
                                            <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-sm">
                                                <span className="font-bold text-emerald-900">{selectedCustomer.name}</span>
                                                <span className="text-gray-500 ml-2">{selectedCustomer.phone}</span>
                                                <span className="ml-3 px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">{paymentMethod}</span>
                                            </div>
                                        )}

                                        <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg mb-4">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 text-xs text-gray-500">
                                                        <th className="text-left p-2">#</th>
                                                        <th className="text-left p-2">Item</th>
                                                        <th className="text-right p-2">Qty</th>
                                                        <th className="text-right p-2">Price</th>
                                                        <th className="text-right p-2">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((it, idx) => (
                                                        <tr key={`${it.productId}-${idx}`} className="border-t border-gray-50">
                                                            <td className="p-2 text-gray-400">{idx + 1}</td>
                                                            <td className="p-2 font-medium text-gray-800">{it.nameSnapshot}</td>
                                                            <td className="p-2 text-right text-gray-600">{it.quantity} {it.unitUsed}</td>
                                                            <td className="p-2 text-right text-gray-600">${it.pricePerKgSnapshot.toFixed(2)}</td>
                                                            <td className="p-2 text-right font-bold text-gray-900">${it.lineTotal.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="border-t border-dashed border-gray-200 pt-3 mb-4 text-sm space-y-1">
                                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-bold">${cartTotal().toFixed(2)}</span></div>
                                            {paymentMethod === 'MIXED' && (
                                                <>
                                                    <div className="flex justify-between"><span className="text-gray-600">Cash Paid</span><span className="font-bold text-emerald-700">${(Number.parseFloat(paidNow || '0') || 0).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-600">Credit</span><span className="font-bold text-orange-700">${Math.max(0, cartTotal() - (Number.parseFloat(paidNow || '0') || 0)).toFixed(2)}</span></div>
                                                </>
                                            )}
                                            {paymentMethod === 'CREDIT' && (
                                                <div className="flex justify-between"><span className="text-gray-600">Credit</span><span className="font-bold text-orange-700">${cartTotal().toFixed(2)}</span></div>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setCheckoutStep('PAYMENT')}
                                                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700"
                                            >
                                                ← Back
                                            </button>
                                            <button
                                                onClick={() => {
                                                    printDraft({
                                                        storeName: 'Orbit Retail',
                                                        branchName: 'branch-1',
                                                        customer: selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : undefined,
                                                        paymentMethod,
                                                        items: items.map((it, idx) => ({
                                                            index: idx + 1,
                                                            name: it.nameSnapshot,
                                                            qty: `${it.quantity} ${it.unitUsed}`,
                                                            price: it.pricePerKgSnapshot,
                                                            total: it.lineTotal,
                                                        })),
                                                        grandTotal: cartTotal(),
                                                    });
                                                }}
                                                className="px-5 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                                            >
                                                🖨️ Print Draft
                                            </button>
                                            <button
                                                onClick={handleConfirmSale}
                                                className="flex-1 py-3 btn-primary font-bold text-lg"
                                            >
                                                ✅ Customer Confirmed
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {checkoutStep === 'RECEIPT' && (
                                    <div className="flex flex-col h-full items-center justify-center text-center">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                                            <Check size={40} />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Sale Completed!</h3>
                                        <p className="text-gray-500 mb-8">Receipt #{receiptNo || '------'}</p>

                                        {/* On-screen preview for checking */}
                                        {lastReceipt && (
                                            <div className="w-full max-w-xl bg-white border border-gray-200 rounded-xl p-4 text-left mb-6 shadow-sm">
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <div>
                                                        <div className="font-bold text-gray-900">{lastReceipt.storeName}</div>
                                                        <div className="text-xs text-gray-500">{lastReceipt.branchName}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-mono font-bold">#{lastReceipt.receiptNo}</div>
                                                        <div className="text-xs text-gray-500">{lastReceipt.createdAt.toLocaleString()}</div>
                                                    </div>
                                                </div>

                                                <div className="mt-3 text-xs text-gray-600">
                                                    Customer: <span className="font-semibold">{lastReceipt.customer ? `${lastReceipt.customer.name} (${lastReceipt.customer.phone})` : 'Walk-in'}</span>
                                                </div>

                                                <div className="mt-3 border-t border-dashed border-gray-200 pt-3 max-h-48 overflow-auto">
                                                    <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 mb-2">
                                                        <div className="col-span-6">Item</div>
                                                        <div className="col-span-3">Qty</div>
                                                        <div className="col-span-3 text-right">Amount</div>
                                                    </div>
                                                    {lastReceipt.sale.items.map((it, idx) => (
                                                        <div key={`${it.productId}-${idx}`} className="grid grid-cols-12 gap-2 text-sm py-1">
                                                            <div className="col-span-6 text-gray-800 font-medium">{it.nameSnapshot}</div>
                                                            <div className="col-span-3 text-gray-600">{it.quantity} {it.unitUsed}</div>
                                                            <div className="col-span-3 text-right font-semibold text-gray-800">${it.lineTotal.toFixed(2)}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-3 border-t border-dashed border-gray-200 pt-3 text-sm">
                                                    <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-bold">${lastReceipt.sale.totalAmount.toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="font-bold text-emerald-700">${lastReceipt.sale.paidAmount.toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-600">Credit</span><span className="font-bold text-orange-700">${lastReceipt.sale.creditAmount.toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-600">Method</span><span className="font-bold">{lastReceipt.sale.paymentMethod}</span></div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-4">
                                            <button
                                                onClick={handlePrintReceipt}
                                                className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <div className="w-4 h-4" /> Print Receipt
                                            </button>
                                            <button onClick={handleCloseCheckout} className="btn-primary">
                                                New Sale
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {isAddItemOpen && addItemProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <div className="text-xs text-gray-500">Add Item</div>
                                <div className="text-lg font-bold text-gray-800">{addItemProduct.name}</div>
                            </div>
                            <button onClick={closeAddItem} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-6" onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                confirmAddItem();
                            }
                        }}>
                            <div className="mb-4">
                                <div className="text-sm font-medium text-gray-700 mb-2">Unit</div>
                                <div className="flex gap-2 flex-wrap">
                                    {addItemProduct.sellingUnits.map((u) => (
                                        <button
                                            key={u}
                                            onClick={() => setAddItemUnit(u)}
                                            className={`px-3 py-2 rounded-lg border text-sm font-bold transition-all ${addItemUnit === u
                                                ? 'bg-[hsl(var(--color-primary))] text-white border-transparent'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-[hsl(var(--color-primary))]'}`}
                                        >
                                            {u}
                                        </button>
                                    ))}
                                </div>
                                {addItemUnit === 'BAG' && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        Bag size: <span className="font-bold">{addItemProduct.bagSizeKg ?? 50}kg</span>
                                    </div>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantity ({addItemUnit === 'KG' ? 'kg' : addItemUnit === 'PCS' ? 'pcs' : 'bags'})
                                </label>
                                <input
                                    type="number"
                                    value={addItemQty}
                                    onChange={(e) => setAddItemQty(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-2xl font-bold outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                                    placeholder="Enter quantity"
                                    autoFocus
                                    step={addItemUnit === 'KG' ? '0.01' : '1'}
                                    min={0}
                                />
                                <div className="text-xs text-gray-500 mt-2">Enter quantity, then press Enter to add.</div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button onClick={closeAddItem} className="px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700">
                                    Cancel
                                </button>
                                <button onClick={confirmAddItem} className="px-5 py-3 btn-primary font-bold">
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
