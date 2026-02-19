import type { Sale } from '../types/schema';
import { db } from './db';

export class SalesService {
    async createSale(sale: Sale, clientTxnId: string) {
        // Persist the sale record
        await db.sales.put(sale);

        // Queue for future server sync (local-first)
        await db.offlineQueue.add({
            clientTxnId,
            type: 'SALE',
            data: sale,
            createdAt: new Date(),
            status: 'PENDING',
            attempts: 0,
        });

        return sale;
    }

    async getRecentSales(limit = 50) {
        return db.sales.orderBy('createdAt').reverse().limit(limit).toArray();
    }
}

export const salesService = new SalesService();
