export type Unit = 'KG' | 'BAG' | 'PCS';

export interface Branch {
    id: string;
    name: string;
    location: string;
    isActive: boolean;
}

export interface Product {
    id: string;
    name: string;
    categoryId: string;
    barcode?: string;
    image?: string; // URL or emoji placeholder
    baseUnit: Unit;
    sellingUnits: Unit[];
    bagSizeKg?: number; // e.g., 25 or 50
    pricePerKg: number;
    costPerKg: number;
    isActive: boolean;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    address?: string;
    creditLimit: number;
    currentBalance: number;
    status: 'ACTIVE' | 'BLOCKED';
    lastPurchaseAt?: Date;
    lastPaymentAt?: Date;
}

export interface SaleItem {
    productId: string;
    nameSnapshot: string;
    unitUsed: Unit;
    quantity: number; // e.g. 2 bags, or 1.5 kg
    kgCalculated: number; // Standardized amount for inventory
    pricePerKgSnapshot: number;
    lineTotal: number;
}

export interface Sale {
    id: string;
    branchId: string;
    customerId?: string; // Nullable for walk-in
    customerName?: string; // Snapshot for reports
    totalAmount: number;
    paidAmount: number;
    creditAmount: number;
    paymentMethod: 'CASH' | 'CREDIT' | 'MOBILE' | 'CARD' | 'MIXED';
    items: SaleItem[];
    createdAt: Date;
    status: 'COMPLETED' | 'VOID';
}

export interface CustomerLedger {
    id: string;
    customerId: string;
    branchId: string;
    type: 'SALE' | 'PAYMENT' | 'ADJUSTMENT' | 'VOID';
    amount: number; // Positive for Sale (Debit), Negative for Payment (Credit)
    balanceAfter: number;
    referenceId: string; // SaleID or PaymentID
    paymentChannel?: 'CASH' | 'EVC' | 'BANK_TRANSFER'; // Payment method channel
    paymentReference?: string; // EVC txn ID, bank ref, etc.
    createdAt: Date;
    note?: string;
}

export interface StockMovement {
    id: string;
    branchId: string;
    productId: string;
    type: 'PURCHASE' | 'SALE' | 'RETURN' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT' | 'WASTAGE';
    kgChange: number; // + for In, - for Out
    referenceId: string;
    createdAt: Date;
    note?: string;
}

export interface Inventory {
    productId: string;
    branchId: string;
    stockKg: number;
    lastUpdated: Date;
}

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';

export interface AppUser {
    uid: string;
    email: string;
    displayName?: string;
    role: UserRole;
    branchIds: string[]; // User can belong to multiple branches
    isActive: boolean;
    createdAt: Date;
}

// ─── ACCOUNTING ────────────────────────────────────────

export interface Supplier {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    currentBalance: number;   // positive = we owe them (payable)
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
}

export interface SupplierLedger {
    id: string;
    supplierId: string;
    branchId: string;
    type: 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT' | 'RETURN';
    amount: number;           // +purchase (we owe more), -payment (we owe less)
    balanceAfter: number;
    referenceId: string;
    paymentChannel?: 'CASH' | 'EVC' | 'BANK_TRANSFER' | 'CHECK';
    paymentReference?: string;
    createdAt: Date;
    note?: string;
}

export type ExpenseCategory =
    | 'SALARY'
    | 'RENT'
    | 'ELECTRICITY'
    | 'WATER'
    | 'INTERNET'
    | 'TRANSPORT'
    | 'SUPPLIES'
    | 'MAINTENANCE'
    | 'TAX'
    | 'OTHER';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
    { value: 'SALARY',      label: 'Salary',        icon: '👤' },
    { value: 'RENT',         label: 'Rent',          icon: '🏠' },
    { value: 'ELECTRICITY',  label: 'Electricity',   icon: '⚡' },
    { value: 'WATER',        label: 'Water',         icon: '💧' },
    { value: 'INTERNET',     label: 'Internet',      icon: '🌐' },
    { value: 'TRANSPORT',    label: 'Transport',     icon: '🚛' },
    { value: 'SUPPLIES',     label: 'Supplies',      icon: '📦' },
    { value: 'MAINTENANCE',  label: 'Maintenance',   icon: '🔧' },
    { value: 'TAX',          label: 'Tax',           icon: '🏛️' },
    { value: 'OTHER',        label: 'Other',         icon: '📋' },
];

export interface Expense {
    id: string;
    branchId: string;
    category: ExpenseCategory;
    amount: number;
    description: string;
    paymentChannel: 'CASH' | 'EVC' | 'BANK_TRANSFER' | 'CHECK';
    paymentReference?: string;
    receiptRef?: string;     // external receipt / invoice #
    createdAt: Date;
    note?: string;
}
