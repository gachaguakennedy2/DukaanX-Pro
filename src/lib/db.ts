import Dexie, { type Table } from 'dexie';
import type { Customer, CustomerLedger, Inventory, Product, Sale, StockMovement, Supplier, SupplierLedger, Expense } from '../types/schema';

// Local simplified types for caching
// We store full objects for offline search
export interface OfflineSaleQueue {
    id?: number;
    clientTxnId: string;
    data: unknown;
    type: 'SALE' | 'PAYMENT' | 'STOCK_MOVEMENT' | 'LEDGER';
    createdAt: Date;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    attempts?: number;
    lastAttemptAt?: Date;
    lastError?: string;
}

export class GroceryDatabase extends Dexie {
    products!: Table<Product, string>;
    customers!: Table<Customer, string>;
    customerLedger!: Table<CustomerLedger, string>;
    inventory!: Table<Inventory, [string, string]>;
    stockMovements!: Table<StockMovement, string>;
    sales!: Table<Sale, string>;
    offlineQueue!: Table<OfflineSaleQueue, number>;
    suppliers!: Table<Supplier, string>;
    supplierLedger!: Table<SupplierLedger, string>;
    expenses!: Table<Expense, string>;

    constructor() {
        super('GroceryDB');
        this.version(1).stores({
            products: 'id, name, barcode, categoryId',
            offlineQueue: '++id, clientTxnId, status',
        });

        // v2: persistence for local-first MVP
        this.version(2).stores({
            products: 'id, name, barcode, categoryId',
            customers: 'id, name, phone, status',
            customerLedger: 'id, customerId, branchId, createdAt, type, referenceId',
            inventory: '[productId+branchId], productId, branchId, lastUpdated',
            stockMovements: 'id, branchId, productId, createdAt, type, referenceId',
            sales: 'id, branchId, customerId, createdAt, status',
            offlineQueue: '++id, clientTxnId, status, type',
        });

        // v3: accounting — suppliers, payables, expenses
        this.version(3).stores({
            products: 'id, name, barcode, categoryId',
            customers: 'id, name, phone, status',
            customerLedger: 'id, customerId, branchId, createdAt, type, referenceId',
            inventory: '[productId+branchId], productId, branchId, lastUpdated',
            stockMovements: 'id, branchId, productId, createdAt, type, referenceId',
            sales: 'id, branchId, customerId, createdAt, status',
            offlineQueue: '++id, clientTxnId, status, type',
            suppliers: 'id, name, status',
            supplierLedger: 'id, supplierId, branchId, createdAt, type, referenceId',
            expenses: 'id, branchId, category, createdAt',
        });
    }
}

export const db = new GroceryDatabase();
