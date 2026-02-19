import { create } from 'zustand';
import type { Product, SaleItem, Unit } from '../types/schema';

interface CartState {
    items: SaleItem[];
    addToCart: (product: Product, unit: Unit, quantity: number) => void;
    removeFromCart: (productId: string, unit: Unit) => void;
    clearCart: () => void;
    updateQuantity: (productId: string, unit: Unit, quantity: number) => void;
    cartTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],

    addToCart: (product, unit, quantity) => {
        set((state) => {
            // Logic: Check if item already exists with SAME unit
            const existingItemIndex = state.items.findIndex(
                (i) => i.productId === product.id && i.unitUsed === unit
            );

            // Unit Conversion Logic
            let kgCalculated = 0;
            if (unit === 'KG') {
                kgCalculated = quantity;
            } else if (unit === 'PCS') {
                // For MVP, inventory uses a single numeric stock field.
                // We treat PCS as "1 unit" in the standardized field.
                kgCalculated = quantity;
            } else if (unit === 'BAG') {
                kgCalculated = quantity * (product.bagSizeKg || 50); // Default 50 if null, but schema implies it should be set
            }

            // Price Logic
            const lineTotal = unit === 'BAG'
                ? kgCalculated * product.pricePerKg
                : quantity * product.pricePerKg;

            if (existingItemIndex > -1) {
                // Update existing
                const newItems = [...state.items];
                const currentItem = newItems[existingItemIndex];
                const newQty = currentItem.quantity + quantity;

                // Recalculate based on new Qty
                const newKg = unit === 'KG' ? newQty : unit === 'PCS' ? newQty : newQty * (product.bagSizeKg || 50);
                newItems[existingItemIndex] = {
                    ...currentItem,
                    quantity: newQty,
                    kgCalculated: newKg,
                    lineTotal: unit === 'BAG' ? newKg * product.pricePerKg : newQty * product.pricePerKg
                };
                return { items: newItems };
            } else {
                // Add new
                const newItem: SaleItem = {
                    productId: product.id,
                    nameSnapshot: product.name,
                    unitUsed: unit,
                    quantity: quantity,
                    kgCalculated: kgCalculated,
                    pricePerKgSnapshot: product.pricePerKg,
                    lineTotal: lineTotal
                };
                return { items: [...state.items, newItem] };
            }
        });
    },

    removeFromCart: (productId, unit) => {
        set((state) => ({
            items: state.items.filter((i) => !(i.productId === productId && i.unitUsed === unit))
        }));
    },

    clearCart: () => set({ items: [] }),

    updateQuantity: (productId, unit, quantity) => {
        // Similar logic to add, straightforward update
        set((state) => {
            const newItems = state.items.map(item => {
                if (item.productId === productId && item.unitUsed === unit) {
                    // Safer: we need access to product to know bag size if we strictly recalc. 
                    // For MVP assuming bag size didn't change mid-transaction.
                    // Actually `item.kgCalculated` stores the total Kg.
                    // We can infer bag size: item.kgCalculated / item.quantity (if qty > 0)

                    // Better implementation: Just use the stored ratio or minimal assumption
                    // But wait, if unit is BAG, we need the bag size. 
                    // In a real app we might pass the product again or store bagSize in SaleItem.
                    // For now let's assume standard calculation or that we updated only quantity.

                    // Let's rely on the ratio of current calc
                    const ratio = item.quantity > 0 ? item.kgCalculated / item.quantity : 0;
                    const newKgCalculated = quantity * ratio; // Works for KG (ratio 1) and BAG (ratio 50)

                    return {
                        ...item,
                        quantity,
                        kgCalculated: newKgCalculated,
                        lineTotal: newKgCalculated * item.pricePerKgSnapshot
                    };
                }
                return item;
            });
            return { items: newItems };
        });
    },

    cartTotal: () => {
        return get().items.reduce((acc, item) => acc + item.lineTotal, 0);
    }
}));
