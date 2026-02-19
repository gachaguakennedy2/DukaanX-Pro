import type { ReactNode } from 'react';
import { useState } from 'react';
import { reportingService } from '../lib/reports';
import type { DailySales, ReceivablesAging, LowStockItem } from '../lib/reports';
import type { Customer } from '../types/schema'; // Import Customer type
import type { LucideIcon } from 'lucide-react';
import { DollarSign, Users, ShoppingBag, AlertTriangle, Activity, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MOCK_PRODUCTS } from '../lib/mockProducts';
import ProductCard from '../components/ProductCard';

type MetricCardProps = {
    title: string;
    value: ReactNode;
    subtext?: string;
    icon: LucideIcon;
    color: string;
};

function MetricCard({ title, value, subtext, icon: Icon, color }: MetricCardProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
                {subtext && <p className={`text-xs mt-2 font-medium ${subtext.includes('+') ? 'text-green-600' : 'text-gray-400'}`}>{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [metrics] = useState(() => reportingService.getTodayMetrics());
    const [history] = useState<DailySales[]>(() => reportingService.getRecentSalesHistory());
    const [aging] = useState<ReceivablesAging>(() => reportingService.getReceivablesAging());
    const [topDebtors] = useState<Customer[]>(() => reportingService.getTopDebtors());
    const [lowStock] = useState<LowStockItem[]>(() => reportingService.getLowStockItems());

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-500">Overview of business performance</p>
            </div>

            {/* Quick Products */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Quick Products</h2>
                    <Link to="/products" className="text-sm text-[hsl(var(--color-primary))] hover:underline">View Catalog</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {MOCK_PRODUCTS.filter(p => p.isActive).slice(0, 8).map(p => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>
            </div>

            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Today's Sales"
                    value={`$${metrics.sales.toLocaleString()}`}
                    subtext="+12% from yesterday"
                    icon={DollarSign}
                    color="bg-emerald-50 text-emerald-600"
                />
                <MetricCard
                    title="Transactions"
                    value={metrics.transactions}
                    subtext="Avg. $27.50 / sale"
                    icon={ShoppingBag}
                    color="bg-blue-50 text-blue-600"
                />
                <MetricCard
                    title="Receivables"
                    value={`$${aging.total.toLocaleString()}`}
                    subtext="Total Outstanding Debt"
                    icon={Users}
                    color="bg-orange-50 text-orange-600"
                />
                <MetricCard
                    title="Low Stock Alerts"
                    value={lowStock.length}
                    subtext={lowStock.length > 0 ? 'Items require attention' : 'All stocked up'}
                    icon={AlertTriangle}
                    color="bg-red-50 text-red-600"
                />
            </div>

            {/* Low Stock Alerts — horizontal sliding ticker */}
            {lowStock.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-500" />
                            Low Stock Alert
                        </h2>
                        <Link to="/inventory" className="text-xs text-[hsl(var(--color-primary))] hover:underline">Manage Inventory →</Link>
                    </div>
                    <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex animate-marquee gap-1 py-2 px-2 w-max">
                            {/* Duplicate list for seamless loop */}
                            {[...lowStock, ...lowStock].map((item, i) => {
                                const isZero = item.stockKg === 0;
                                return (
                                    <div key={`${item.productId}-${i}`} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap text-sm ${
                                        isZero ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                                    }`}>
                                        <span className="text-lg">{item.image}</span>
                                        <span className="font-semibold">{item.name}</span>
                                        <span className={`font-black ${isZero ? 'text-red-600' : 'text-orange-600'}`}>
                                            {item.stockKg}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{item.baseUnit}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area (Mock Visual) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <Activity size={20} className="text-[hsl(var(--color-primary))]" />
                            Weekly Sales Performance
                        </h3>
                        <select className="text-sm border-gray-200 rounded-lg p-1">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>

                    {/* CSS Chart Mock */}
                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {history.map((day, i) => {
                            const height = (day.totalSales / 1500) * 100; // normalize
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                                        Total: ${day.totalSales.toFixed(0)} <br />
                                        Cash: ${day.cashSales.toFixed(0)}
                                    </div>
                                    <div className="w-full bg-[hsl(var(--color-primary))] opacity-80 rounded-t-sm hover:opacity-100 transition-all cursor-pointer relative" style={{ height: `${height}%` }}>
                                        {/* Stacked Credit portion */}
                                        <div className="absolute bottom-0 left-0 w-full bg-[hsl(var(--color-secondary))] opacity-50" style={{ height: `${(day.creditSales / day.totalSales) * 100}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 text-center truncate">{day.date.slice(5)}</div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-4 flex justify-center gap-6 text-xs text-gray-500">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[hsl(var(--color-primary))] rounded-sm"></div> Cash Sales</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[hsl(var(--color-secondary))] rounded-sm"></div> Credit Sales</div>
                    </div>
                </div>

                {/* Right Column: Debtors & Aging */}
                <div className="flex flex-col gap-6">
                    {/* Receivables Aging */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Debt Aging</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Current (0-30d)</span>
                                    <span className="font-bold">${aging.current.toFixed(0)}</span>
                                </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${aging.total ? (aging.current / aging.total) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Overdue (31-60d)</span>
                                    <span className="font-bold">${aging.over30.toFixed(0)}</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-400" style={{ width: `${aging.total ? (aging.over30 / aging.total) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Critical (60d+)</span>
                                    <span className="font-bold text-red-600">${(aging.over60 + aging.over90).toFixed(0)}</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${aging.total ? ((aging.over60 + aging.over90) / aging.total) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Debtors */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">Top Debtors</h3>
                            <Link to="/customers" className="text-xs text-[hsl(var(--color-primary))] hover:underline">View All</Link>
                        </div>
                        <div className="space-y-3">
                            {topDebtors.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {c.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">{c.name}</div>
                                            <div className="text-[10px] text-gray-400">{c.phone}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-red-600">${c.currentBalance.toFixed(0)}</div>
                                        <div className="text-[10px] text-gray-400">Limit: {c.creditLimit}</div>
                                    </div>
                                </div>
                            ))}
                            {topDebtors.length === 0 && <div className="text-sm text-gray-400 text-center py-4">No data available</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
