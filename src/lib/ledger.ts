import type { Customer, CustomerLedger } from '../types/schema';
import { db } from './db';

// MOCK DB for Sprint 2 (Until fully connected to Firestore/Dexie)
// In a real implementation, this would be a Transaction
export class LedgerService {
    private customers: Map<string, Customer> = new Map();
    private ledger: CustomerLedger[] = [];

    constructor() {
        void this.loadFromDb();
    }

    private async loadFromDb() {
        try {
            const [customers, ledger] = await Promise.all([
                db.customers.toArray(),
                db.customerLedger.toArray(),
            ]);

            if (customers.length === 0) {
                // Seed some data
                const seed: Customer = {
                    id: '101',
                    name: 'John Doe',
                    phone: '555-0123',
                    creditLimit: 500,
                    currentBalance: 0,
                    status: 'ACTIVE',
                    lastPurchaseAt: new Date(),
                };
                this.customers.set(seed.id, seed);
                await db.customers.put(seed);
            } else {
                // Migrate: bump any customer still on the old $100 limit to $500
                for (const c of customers) {
                    if (c.creditLimit === 100) {
                        c.creditLimit = 500;
                        await db.customers.put(c);
                    }
                    this.customers.set(c.id, c);
                }
            }

            this.ledger = ledger;
        } catch (e) {
            // If IndexedDB isn't available or fails, keep in-memory behavior.
            console.warn('Failed to load ledger from local DB', e);
        }
    }

    getCustomer(id: string): Customer | undefined {
        return this.customers.get(id);
    }

    getAllCustomers(): Customer[] {
        return Array.from(this.customers.values());
    }

    getLedgerHistory(customerId: string): CustomerLedger[] {
        return this.ledger.filter(l => l.customerId === customerId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // THE CRITICAL FUNCTION
    createEntry(entry: Omit<CustomerLedger, 'id' | 'balanceAfter' | 'createdAt'>): CustomerLedger {
        const customer = this.customers.get(entry.customerId);
        if (!customer) throw new Error('Customer not found');

        // 1. Calculate New Balance
        // Sale (Positive Amount) increases balance (Debt)
        // Payment (Negative Amount) decreases balance
        const newBalance = customer.currentBalance + entry.amount;

        // 2. Validate Limits (only if increasing debt)
        if (entry.amount > 0 && newBalance > customer.creditLimit) {
            // In strict mode, we might throw. For now, we allow but maybe warn?
            // Specification says: "Auto block rules". 
            // We'll throw for now to enforce limit in UI.
            throw new Error(`Credit Limit Exceeded! Limit: $${customer.creditLimit}, New Balance would be: $${newBalance}`);
        }

        // 3. Create Record
        const fullEntry: CustomerLedger = {
            ...entry,
            id: Math.random().toString(36).substr(2, 9),
            balanceAfter: newBalance,
            createdAt: new Date()
        };

        // 4. Update Mutable Customer State (Cache)
        customer.currentBalance = newBalance;
        customer.lastPaymentAt = entry.type === 'PAYMENT' ? new Date() : customer.lastPaymentAt;
        if (entry.type === 'SALE') customer.lastPurchaseAt = new Date();

        // 5. Commit
        this.ledger.push(fullEntry);
        this.customers.set(customer.id, customer);

        // Persist (best-effort)
        void db.customerLedger.put(fullEntry);
        void db.customers.put(customer);

        return fullEntry;
    }

    // Helper to create a new customer
    createCustomer(c: Omit<Customer, 'id' | 'currentBalance' | 'status'>): Customer {
        const newC: Customer = {
            ...c,
            id: Math.random().toString(36).substr(2, 9),
            currentBalance: 0,
            status: 'ACTIVE',
        };
        this.customers.set(newC.id, newC);
        void db.customers.put(newC);
        return newC;
    }
}

export const ledgerService = new LedgerService();
