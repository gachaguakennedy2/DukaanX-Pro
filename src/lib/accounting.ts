export interface DailyFinancials {
    date: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    expectedCash: number;
    actualCash: number;
    variance: number;
    isClosed: boolean;
}

class AccountingService {
    private days: Map<string, DailyFinancials> = new Map();

    // MOCK: Get today's snapshot
    getDailySnapshot(date: Date = new Date()): DailyFinancials {
        const dateKey = date.toISOString().split('T')[0];

        // If closed, return saved
        if (this.days.has(dateKey)) {
            return this.days.get(dateKey)!;
        }

        // Else calculate live (Mocked for now)
        // In real app: Sum queries from Sale items
        const revenue = 1250.00;
        const cogs = 950.00; // Mock Cost
        const expectedCash = 800.00; // Assuming some was Credit

        return {
            date: dateKey,
            revenue,
            cogs,
            grossProfit: revenue - cogs,
            expectedCash,
            actualCash: 0,
            variance: 0,
            isClosed: false
        };
    }

    closeDay(financials: DailyFinancials) {
        this.days.set(financials.date, { ...financials, isClosed: true });
        // In real app: Generate Z-Report PDF here
        console.log("Day Closed:", financials);
        return true;
    }

    getHistory(): DailyFinancials[] {
        return Array.from(this.days.values()).sort((a, b) => b.date.localeCompare(a.date));
    }
}

export const accountingService = new AccountingService();
