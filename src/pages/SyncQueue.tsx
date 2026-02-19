import { useEffect, useMemo, useState } from 'react';
import { CloudOff, RefreshCw, Trash2, CheckCircle2, CircleAlert } from 'lucide-react';
import { db, type OfflineSaleQueue } from '../lib/db';
import { format } from 'date-fns';

type Row = OfflineSaleQueue & { id: number };

function asDate(value: unknown) {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    return new Date();
}

export default function SyncQueue() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = async () => {
        setLoading(true);
        try {
            const q = await db.offlineQueue.orderBy('id').reverse().toArray();
            setRows(q as Row[]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void reload();
    }, []);

    const counts = useMemo(() => {
        const c = { PENDING: 0, SYNCED: 0, FAILED: 0, total: rows.length };
        rows.forEach((r) => {
            c[r.status] += 1;
        });
        return c;
    }, [rows]);

    const deleteRow = async (id: number) => {
        await db.offlineQueue.delete(id);
        await reload();
    };

    const clearSynced = async () => {
        const synced = await db.offlineQueue.where('status').equals('SYNCED').primaryKeys();
        await db.offlineQueue.bulkDelete(synced);
        await reload();
    };

    const markAllPending = async () => {
        const failed = await db.offlineQueue.where('status').equals('FAILED').toArray();
        await db.offlineQueue.bulkPut(failed.map((f) => ({ ...f, status: 'PENDING' }))); 
        await reload();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CloudOff size={22} className="text-[hsl(var(--color-primary))]" /> Sync Queue
                    </h1>
                    <p className="text-gray-500">Offline-first queue entries waiting to sync</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={reload}
                        className="px-4 py-2 border border-gray-200 bg-white rounded-lg flex items-center gap-2 hover:bg-gray-50 text-sm font-medium"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={clearSynced}
                        className="px-4 py-2 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                        Clear Synced
                    </button>
                    <button
                        onClick={markAllPending}
                        className="px-4 py-2 bg-[hsl(var(--color-primary))] text-white rounded-lg hover:brightness-110 shadow-sm text-sm font-medium"
                    >
                        Retry Failed
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-2xl font-bold">{counts.total}</div>
                </div>
                <div className="card">
                    <div className="text-xs text-gray-500">Pending</div>
                    <div className="text-2xl font-bold text-blue-700">{counts.PENDING}</div>
                </div>
                <div className="card">
                    <div className="text-xs text-gray-500">Synced</div>
                    <div className="text-2xl font-bold text-emerald-700">{counts.SYNCED}</div>
                </div>
                <div className="card">
                    <div className="text-xs text-gray-500">Failed</div>
                    <div className="text-2xl font-bold text-red-700">{counts.FAILED}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-500">Newest first</div>
                    <div className="text-xs text-gray-400">Local DB: GroceryDB</div>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4">Status</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Created</th>
                            <th className="p-4">Attempts</th>
                            <th className="p-4">clientTxnId</th>
                            <th className="p-4">Last Error</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-10 text-center text-gray-400">
                                    {loading ? 'Loading…' : 'Queue is empty.'}
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => {
                                const created = asDate(r.createdAt);
                                const badge =
                                    r.status === 'SYNCED'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : r.status === 'FAILED'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-blue-100 text-blue-700';

                                return (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-2 px-2 py-1 text-xs rounded-full font-bold ${badge}`}>
                                                {r.status === 'SYNCED' ? <CheckCircle2 size={14} /> : r.status === 'FAILED' ? <CircleAlert size={14} /> : <CloudOff size={14} />}
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-700 text-sm font-medium">{r.type}</td>
                                        <td className="p-4 text-gray-600 text-sm font-mono">{format(created, 'MMM dd, HH:mm:ss')}</td>
                                        <td className="p-4 text-gray-700 text-sm font-mono">{r.attempts ?? 0}</td>
                                        <td className="p-4 text-gray-600 text-sm font-mono break-all">{r.clientTxnId}</td>
                                        <td className="p-4 text-gray-500 text-xs max-w-[300px] truncate" title={r.lastError || ''}>
                                            {r.lastError || '—'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => deleteRow(r.id)}
                                                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 text-sm"
                                                title="Delete this queue entry"
                                            >
                                                <Trash2 size={16} /> Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
