import type { Supplier, SupplierLedger } from '../types/schema';
import { db } from './db';

class SupplierService {
    private suppliers: Map<string, Supplier> = new Map();
    private ledger: SupplierLedger[] = [];

    constructor() {
        void this.loadFromDb();
    }

    private async loadFromDb() {
        try {
            const [suppliers, ledger] = await Promise.all([
                db.suppliers.toArray(),
                db.supplierLedger.toArray(),
            ]);

            if (suppliers.length === 0) {
                // Seed a demo supplier
                const seed: Supplier = {
                    id: 'SUP-001',
                    name: 'Mogadishu Wholesale',
                    phone: '252-61-1234567',
                    currentBalance: 0,
                    status: 'ACTIVE',
                    createdAt: new Date(),
                };
                this.suppliers.set(seed.id, seed);
                await db.suppliers.put(seed);
            } else {
                suppliers.forEach(s => this.suppliers.set(s.id, s));
            }

            this.ledger = ledger;
        } catch (e) {
            console.warn('Failed to load suppliers from DB', e);
        }
    }

    getSupplier(id: string): Supplier | undefined {
        return this.suppliers.get(id);
    }

    getAllSuppliers(): Supplier[] {
        return Array.from(this.suppliers.values());
    }

    addSupplier(data: Omit<Supplier, 'id' | 'currentBalance' | 'createdAt'>): Supplier {
        const id = `SUP-${Date.now().toString(36)}`;
        const supplier: Supplier = {
            ...data,
            id,
            currentBalance: 0,
            createdAt: new Date(),
        };
        this.suppliers.set(id, supplier);
        void db.suppliers.put(supplier);
        return supplier;
    }

    getLedgerHistory(supplierId: string): SupplierLedger[] {
        return this.ledger
            .filter(l => l.supplierId === supplierId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /** Record a purchase or payment against a supplier */
    createEntry(entry: Omit<SupplierLedger, 'id' | 'balanceAfter' | 'createdAt'>): SupplierLedger {
        const supplier = this.suppliers.get(entry.supplierId);
        if (!supplier) throw new Error('Supplier not found');

        const newBalance = supplier.currentBalance + entry.amount;

        const fullEntry: SupplierLedger = {
            ...entry,
            id: Math.random().toString(36).substr(2, 9),
            balanceAfter: newBalance,
            createdAt: new Date(),
        };

        supplier.currentBalance = newBalance;
        this.suppliers.set(supplier.id, supplier);
        this.ledger.push(fullEntry);

        void db.suppliers.put(supplier);
        void db.supplierLedger.put(fullEntry);

        return fullEntry;
    }

    getTotalPayables(): number {
        return Array.from(this.suppliers.values())
            .reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0);
    }
}

export const supplierService = new SupplierService();
