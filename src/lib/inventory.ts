import type { Inventory, StockMovement } from '../types/schema';
import { db } from './db';

// MOCK DB for Sprint 3
class InventoryService {
    private inventory: Map<string, Inventory> = new Map(); // Key: productId-branchId
    private movements: StockMovement[] = [];

    constructor() {
        void this.loadFromDb();
    }

    private async loadFromDb() {
        try {
            const [inventory, movements] = await Promise.all([
                db.inventory.toArray(),
                db.stockMovements.toArray(),
            ]);

            if (inventory.length === 0) {
                // Seed mock inventory for 'branch-1'
                const seeds: Array<{ productId: string; branchId: string; kg: number }> = [
                    { productId: '1', branchId: 'branch-1', kg: 100 },
                    { productId: '2', branchId: 'branch-1', kg: 50 },
                    { productId: '3', branchId: 'branch-1', kg: 0 },
                    { productId: '4', branchId: 'branch-1', kg: 24 },
                    { productId: '5', branchId: 'branch-1', kg: 40 },
                    { productId: '7', branchId: 'branch-1', kg: 60 },
                    { productId: '9', branchId: 'branch-1', kg: 30 },
                    { productId: '11', branchId: 'branch-1', kg: 100 },
                    { productId: '13', branchId: 'branch-1', kg: 80 },
                    { productId: '18', branchId: 'branch-1', kg: 25 },
                ];

                const now = new Date();
                const toPut: Inventory[] = seeds.map((s) => ({
                    productId: s.productId,
                    branchId: s.branchId,
                    stockKg: s.kg,
                    lastUpdated: now,
                }));

                await db.inventory.bulkPut(toPut);
                toPut.forEach((i) => this.inventory.set(`${i.productId}-${i.branchId}`, i));
            } else {
                inventory.forEach((i) => this.inventory.set(`${i.productId}-${i.branchId}`, i));
            }

            this.movements = movements;
        } catch (e) {
            console.warn('Failed to load inventory from local DB', e);
        }
    }

    // Get current stock for a product at a branch
    getStock(productId: string, branchId: string): number {
        const key = `${productId}-${branchId}`;
        return this.inventory.get(key)?.stockKg || 0;
    }

    // Get all inventory items for a branch (for dashboard)
    getBranchInventory(branchId: string): Inventory[] {
        return Array.from(this.inventory.values()).filter(i => i.branchId === branchId);
    }

    // THE CORE FUNCTION: Adjust Stock
    adjustStock(
        productId: string,
        branchId: string,
        type: StockMovement['type'],
        kgChange: number,
        note?: string
    ) {
        // 1. Validate (Optional: Prevent negative stock if strict)
        this.getStock(productId, branchId);

        // MVP: Allow negative stock but warn? Or strict? 
        // Let's go semi-strict: Warn but allow for consistency (e.g. sale before system entry)

        // 2. Create Movement Record
        const movement: StockMovement = {
            id: Math.random().toString(36).substr(2, 9),
            branchId,
            productId,
            type,
            kgChange,
            referenceId: `MOV-${Date.now()}`,
            createdAt: new Date(),
            note
        };
        this.movements.push(movement);
        void db.stockMovements.put(movement);

        // 3. Update Aggregate
        const key = `${productId}-${branchId}`;
        const existing = this.inventory.get(key);

        if (existing) {
            existing.stockKg += kgChange;
            existing.lastUpdated = new Date();
            this.inventory.set(key, existing);
            void db.inventory.put(existing);
        } else {
            const created: Inventory = {
                productId,
                branchId,
                stockKg: kgChange,
                lastUpdated: new Date()
            };
            this.inventory.set(key, created);
            void db.inventory.put(created);
        }

        return this.getStock(productId, branchId);
    }

    // History for a product
    getHistory(productId: string, branchId: string): StockMovement[] {
        return this.movements
            .filter(m => m.productId === productId && m.branchId === branchId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
}

export const inventoryService = new InventoryService();
