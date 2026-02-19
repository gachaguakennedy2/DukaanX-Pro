import { useEffect, useRef } from 'react';
import { syncPendingQueue } from './firestoreSync';

type Options = {
    companyId: string;
    branchId?: string;
    userId?: string;
    enabled?: boolean;
    intervalMs?: number;
};

export function useSyncWorker(opts: Options) {
    const syncingRef = useRef(false);

    useEffect(() => {
        if (!opts.enabled) return;
        const branchId = opts.branchId;
        if (!branchId) return;

        let cancelled = false;

        const runOnce = async () => {
            if (cancelled) return;
            if (!navigator.onLine) return;
            if (syncingRef.current) return;

            syncingRef.current = true;
            try {
                await syncPendingQueue({
                    companyId: opts.companyId,
                    branchId,
                    userId: opts.userId,
                    maxBatch: 10,
                });
            } finally {
                syncingRef.current = false;
            }
        };

        const onOnline = () => {
            void runOnce();
        };

        void runOnce();
        window.addEventListener('online', onOnline);
        const timer = window.setInterval(() => void runOnce(), opts.intervalMs ?? 15000);

        return () => {
            cancelled = true;
            window.removeEventListener('online', onOnline);
            window.clearInterval(timer);
        };
    }, [opts.enabled, opts.branchId, opts.companyId, opts.userId, opts.intervalMs]);
}
