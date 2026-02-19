import {
    Timestamp,
    doc,
    increment,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';
import type { Sale, SaleItem } from '../types/schema';
import { db, type OfflineSaleQueue } from './db';
import { firestore } from './firebase';

type SyncOptions = {
    companyId: string;
    branchId: string;
    userId?: string;
    maxBatch?: number;
};

function asSale(data: unknown): Sale {
    return data as Sale;
}

function nowClientTimestamp() {
    return Timestamp.fromDate(new Date());
}

async function applySaleTxn(opts: SyncOptions, queueItem: OfflineSaleQueue & { id: number }) {
    const sale = asSale(queueItem.data);

    const syncLogRef = doc(firestore, 'companies', opts.companyId, 'syncLogs', queueItem.clientTxnId);
    const saleRef = doc(firestore, 'companies', opts.companyId, 'branches', opts.branchId, 'sales', sale.id);

    const customerId = sale.customerId;
    const customerRef = customerId
        ? doc(firestore, 'companies', opts.companyId, 'customers', customerId)
        : null;

    const createdAtDevice = sale.createdAt instanceof Date ? Timestamp.fromDate(sale.createdAt) : nowClientTimestamp();

    await runTransaction(firestore, async (tx) => {
        const syncSnap = await tx.get(syncLogRef);
        if (syncSnap.exists()) {
            return; // idempotent: already applied
        }

        // Persist sale header
        tx.set(
            saleRef,
            {
                ...sale,
                branchId: opts.branchId,
                createdAtDevice,
                createdAtServer: serverTimestamp(),
                syncedAt: serverTimestamp(),
                clientTxnId: queueItem.clientTxnId,
                cashierUserId: opts.userId ?? null,
            },
            { merge: true }
        );

        // Persist sale items (subcollection)
        for (let i = 0; i < sale.items.length; i++) {
            const item: SaleItem = sale.items[i];
            const itemRef = doc(
                firestore,
                'companies',
                opts.companyId,
                'branches',
                opts.branchId,
                'sales',
                sale.id,
                'items',
                `${i}`
            );
            tx.set(itemRef, item, { merge: true });
        }

        // Ledger + customer balance cache
        if (customerRef && customerId) {
            const customerSnap = await tx.get(customerRef);
            const prevBalance = (customerSnap.exists() && typeof customerSnap.data().currentBalance === 'number')
                ? (customerSnap.data().currentBalance as number)
                : 0;

            // Ledger entries are append-only. We store under customer subcollection.
            const ledgerBasePath = ['companies', opts.companyId, 'customers', customerId, 'ledger'] as const;

            const saleLedgerId = `LED-${sale.id}`;
            const saleLedgerRef = doc(firestore, ...ledgerBasePath, saleLedgerId);
            const balAfterSale = prevBalance + sale.totalAmount;
            tx.set(
                saleLedgerRef,
                {
                    id: saleLedgerId,
                    customerId,
                    branchId: opts.branchId,
                    type: 'SALE',
                    amount: sale.totalAmount,
                    referenceId: sale.id,
                    note: 'Synced POS Sale',
                    createdAtDevice,
                    createdAtServer: serverTimestamp(),
                    balanceAfter: balAfterSale,
                    clientTxnId: queueItem.clientTxnId,
                },
                { merge: true }
            );

            let balFinal = balAfterSale;

            if (sale.paidAmount > 0) {
                const paymentLedgerId = `LED-PAY-${sale.id}`;
                const paymentLedgerRef = doc(firestore, ...ledgerBasePath, paymentLedgerId);
                balFinal = balAfterSale - sale.paidAmount;
                tx.set(
                    paymentLedgerRef,
                    {
                        id: paymentLedgerId,
                        customerId,
                        branchId: opts.branchId,
                        type: 'PAYMENT',
                        amount: -sale.paidAmount,
                        referenceId: sale.id,
                        note: 'Synced POS Payment',
                        createdAtDevice,
                        createdAtServer: serverTimestamp(),
                        balanceAfter: balFinal,
                        clientTxnId: queueItem.clientTxnId,
                    },
                    { merge: true }
                );
            }

            tx.set(
                customerRef,
                {
                    id: customerId,
                    currentBalance: balFinal,
                    lastPurchaseAt: createdAtDevice,
                    lastPaymentAt: sale.paidAmount > 0 ? createdAtDevice : null,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        }

        // Stock movements + inventory aggregate updates
        for (let i = 0; i < sale.items.length; i++) {
            const item = sale.items[i];
            const movementId = `MOV-${sale.id}-${item.productId}-${i}`;
            const movementRef = doc(
                firestore,
                'companies',
                opts.companyId,
                'branches',
                opts.branchId,
                'stockMovements',
                movementId
            );

            tx.set(
                movementRef,
                {
                    id: movementId,
                    branchId: opts.branchId,
                    productId: item.productId,
                    type: 'SALE',
                    kgChange: -item.kgCalculated,
                    referenceId: sale.id,
                    createdAtDevice,
                    createdAtServer: serverTimestamp(),
                    note: `Synced POS Sale: ${item.quantity} ${item.unitUsed}`,
                    clientTxnId: queueItem.clientTxnId,
                    userId: opts.userId ?? null,
                },
                { merge: true }
            );

            const invRef = doc(
                firestore,
                'companies',
                opts.companyId,
                'branches',
                opts.branchId,
                'inventory',
                item.productId
            );

            // Use atomic increments (allows missing docs)
            tx.set(
                invRef,
                {
                    productId: item.productId,
                    branchId: opts.branchId,
                    stockKg: increment(-item.kgCalculated),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        }

        // Sync log entry last to mark idempotency key as applied
        tx.set(
            syncLogRef,
            {
                clientTxnId: queueItem.clientTxnId,
                type: 'SALE',
                status: 'APPLIED',
                saleId: sale.id,
                branchId: opts.branchId,
                appliedAt: serverTimestamp(),
            },
            { merge: true }
        );
    });
}

async function markQueueItem(id: number, patch: Partial<OfflineSaleQueue>) {
    const existing = await db.offlineQueue.get(id);
    if (!existing) return;
    await db.offlineQueue.put({ ...existing, ...patch });
}

export async function syncPendingQueue(opts: SyncOptions) {
    const maxBatch = opts.maxBatch ?? 10;

    // Only SYNC SALE items in this MVP worker.
    const pending = await db.offlineQueue
        .where('status')
        .equals('PENDING')
        .toArray();

    const batch = pending
        .filter((q) => q.type === 'SALE')
        .sort((a, b) => (b.createdAt as any) - (a.createdAt as any))
        .slice(0, maxBatch) as Array<(OfflineSaleQueue & { id: number })>;

    for (const q of batch) {
        const attempts = (q.attempts ?? 0) + 1;
        await markQueueItem(q.id, { attempts, lastAttemptAt: new Date() });

        try {
            await applySaleTxn(opts, q);
            await markQueueItem(q.id, { status: 'SYNCED', lastError: undefined });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown sync error';
            await markQueueItem(q.id, { status: 'FAILED', lastError: message });
        }
    }
}
