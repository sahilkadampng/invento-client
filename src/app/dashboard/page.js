'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '@/store/authStore';
import api from '@/services/api';
import { motion } from 'framer-motion';
import {
    Package, TrendingUp, AlertTriangle, ShoppingCart, DollarSign,
    ArrowUpRight, ArrowDownRight, BarChart3, Clock
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#e879f9', '#f472b6'];

const StatCard = ({ title, value, change, icon: Icon, gradient, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay * 0.1 }}
        className="card p-5 relative overflow-hidden rounded-sm"
    >
        <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{title}</p>
            <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
        </div>
        <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(change)}% vs last month
            </div>
        )}
    </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="card p-3 shadow-lg text-sm" style={{ background: 'var(--bg-secondary)' }}>
                <p style={{ color: 'var(--text-muted)' }}>{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }} className="font-semibold">
                        {p.name}: {typeof p.value === 'number' && p.value > 100 ? `₹${p.value.toLocaleString()}` : p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const warehouseName = useAuthStore((state) => state.warehouseName);
    const headerPrefix = warehouseName ? `Warehouse: ${warehouseName}` : 'Warehouse: Unassigned';

    const { data: dashboard, isLoading: loadingDash } = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data),
    });

    const { data: salesData } = useQuery({
        queryKey: ['sales-chart'],
        queryFn: () => api.get('/analytics/sales?days=30').then((r) => r.data.data),
    });

    if (loadingDash) {
        return (
            <DashboardLayout>
                <PageHeader title="Dashboard" subtitle={`${headerPrefix} · Welcome back!`} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartSkeleton /><ChartSkeleton />
                </div>
            </DashboardLayout>
        );
    }

    const stats = [
        { title: 'Total Products', value: dashboard?.totalProducts?.toLocaleString() || '0', icon: Package, gradient: 'bg-white', change: undefined },
        { title: 'Monthly Revenue', value: `₹${(dashboard?.monthlyRevenue || 0).toLocaleString()}`, icon: DollarSign, gradient: 'bg-white', change: dashboard?.revenueGrowth },
        { title: 'Low Stock Items', value: dashboard?.lowStockCount?.toString() || '0', icon: AlertTriangle, gradient: 'bg-white', change: undefined },
        { title: 'Pending POs', value: dashboard?.pendingPOs?.toString() || '0', icon: ShoppingCart, gradient: 'bg-white', change: undefined },
    ];

    const chartData = salesData?.salesByDay?.map((d) => ({
        date: d._id?.substring(5) || '',
        revenue: d.revenue || 0,
        orders: d.orders || 0,
    })) || [];

    return (
        <DashboardLayout>
            <PageHeader title="Dashboard" subtitle={`${headerPrefix} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`} />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map((stat, i) => <StatCard key={stat.title} {...stat} delay={i} />)}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Revenue Chart */}
                <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Revenue Overview</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last 30 days</p>
                        </div>
                        <BarChart3 className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#colorRevenue)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Orders Chart */}
                <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Orders</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last 30 days</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData.slice(-14)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="orders" name="Orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Sellers */}
                <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-5">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Selling Products</h3>
                    <div className="space-y-3">
                        {(dashboard?.topSellers || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: COLORS[i % COLORS.length] }}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.totalSold} sold</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>₹{(item.revenue || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                        {(!dashboard?.topSellers || dashboard.topSellers.length === 0) && (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No sales data yet</p>
                        )}
                    </div>
                </motion.div>

                {/* Recent Sales */}
                <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card p-5">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Sales</h3>
                    <div className="space-y-3">
                        {(dashboard?.recentSales || []).map((sale, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-(--accent-light) flex items-center justify-center">
                                    <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{sale.invoiceNumber}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sale.customer?.name || 'Walk-in'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>₹{(sale.totalAmount || 0).toLocaleString()}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(sale.createdAt).toLocaleDateString('en-IN')}</p>
                                </div>
                            </div>
                        ))}
                        {(!dashboard?.recentSales || dashboard.recentSales.length === 0) && (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No sales yet</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
