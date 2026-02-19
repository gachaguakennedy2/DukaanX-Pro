import { ledgerService } from './ledger';
import { inventoryService } from './inventory';
import { MOCK_PRODUCTS } from './mockProducts';
import type { Customer } from '../types/schema';

export interface DailySales {
    date: string;
    totalSales: number;
    cashSales: number;
    creditSales: number;
    transactionCount: number;
}

export interface ReceivablesAging {
    current: number; // 0-30 days
    over30: number;  // 31-60 days
    over60: number;  // 61-90 days
    over90: number;  // 90+ days
    total: number;
}

class ReportingService {

    // MOCK: Generate some fake history for the dashboard charts
    getRecentSalesHistory(days = 7): DailySales[] {
        const history: DailySales[] = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            // Randomish data
            const baseAmount = 500 + Math.random() * 500;
            const creditRatio = 0.3 + Math.random() * 0.2; // 30-50% credit

            history.push({
                date: date.toISOString().split('T')[0],
                totalSales: baseAmount,
                cashSales: baseAmount * (1 - creditRatio),
                creditSales: baseAmount * creditRatio,
                transactionCount: Math.floor(baseAmount / 20)
            });
        }
        return history;
    }

    getTodayMetrics() {
        // In a real app, fetch from Firestore/Dexie for today's range
        // Here we mock it or maybe aggregared from ledgerService??
        // Let's just mock for the Dashboard UI feel
        return {
            sales: 1250.00,
            transactions: 45,
            newCustomers: 3,
            lowStockItems: 12
        };
    }

    getReceivablesAging(): ReceivablesAging {
        const customers = ledgerService.getAllCustomers();
        let current = 0;
        // In a real app, we'd look at individual invoice dates. 
        // For MVP, we'll just dump total balance into 'Current' 
        // or randomized for demo purpose if they have high balance

        customers.forEach(c => {
            current += c.currentBalance;
        });

        // Mocking the split for the demo visualization
        return {
            current: current * 0.7,
            over30: current * 0.2,
            over60: current * 0.08,
            over90: current * 0.02,
            total: current
        };
    }

    getTopDebtors(limit = 5): Customer[] {
        return ledgerService.getAllCustomers()
            .sort((a, b) => b.currentBalance - a.currentBalance)
            .slice(0, limit);
    }

    /** Returns products with stock below a threshold, sorted lowest-first */
    getLowStockItems(branchId = 'branch-1', threshold = 20): LowStockItem[] {
        const inv = inventoryService.getBranchInventory(branchId);
        const productMap = new Map(MOCK_PRODUCTS.map(p => [p.id, p]));
        const items: LowStockItem[] = [];

        for (const rec of inv) {
            if (rec.stockKg < threshold) {
                const p = productMap.get(rec.productId);
                if (p) {
                    items.push({
                        productId: rec.productId,
                        name: p.name,
                        image: p.image || '📦',
                        baseUnit: p.baseUnit,
                        stockKg: rec.stockKg,
                        threshold,
                    });
                }
            }
        }

        // Also add products with NO inventory record at all (zero stock)
        for (const p of MOCK_PRODUCTS) {
            if (p.isActive && !inv.find(i => i.productId === p.id)) {
                items.push({
                    productId: p.id,
                    name: p.name,
                    image: p.image || '📦',
                    baseUnit: p.baseUnit,
                    stockKg: 0,
                    threshold,
                });
            }
        }

        return items.sort((a, b) => a.stockKg - b.stockKg);
    }
}

export interface LowStockItem {
    productId: string;
    name: string;
    image: string;
    baseUnit: string;
    stockKg: number;
    threshold: number;
}

export const reportingService = new ReportingService();
