import type { Expense, ExpenseCategory } from '../types/schema';
import { db } from './db';

class ExpenseService {
    private expenses: Expense[] = [];

    constructor() {
        void this.loadFromDb();
    }

    private async loadFromDb() {
        try {
            this.expenses = await db.expenses.toArray();
        } catch (e) {
            console.warn('Failed to load expenses from DB', e);
        }
    }

    getAll(): Expense[] {
        return [...this.expenses].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    getByCategory(category: ExpenseCategory): Expense[] {
        return this.expenses
            .filter(e => e.category === category)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    getByDateRange(from: Date, to: Date): Expense[] {
        return this.expenses
            .filter(e => e.createdAt >= from && e.createdAt <= to)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    addExpense(data: Omit<Expense, 'id' | 'createdAt'>): Expense {
        const expense: Expense = {
            ...data,
            id: `EXP-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
            createdAt: new Date(),
        };
        this.expenses.push(expense);
        void db.expenses.put(expense);
        return expense;
    }

    getTotalByCategory(): Record<ExpenseCategory, number> {
        const totals = {} as Record<ExpenseCategory, number>;
        for (const e of this.expenses) {
            totals[e.category] = (totals[e.category] || 0) + e.amount;
        }
        return totals;
    }

    getMonthTotal(year: number, month: number): number {
        return this.expenses
            .filter(e => {
                const d = e.createdAt;
                return d.getFullYear() === year && d.getMonth() === month;
            })
            .reduce((sum, e) => sum + e.amount, 0);
    }

    getTodayTotal(): number {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.expenses
            .filter(e => e.createdAt >= today)
            .reduce((sum, e) => sum + e.amount, 0);
    }
}

export const expenseService = new ExpenseService();
