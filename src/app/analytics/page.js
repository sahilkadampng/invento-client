'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { TrendingUp, BarChart3, Clock, AlertTriangle } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3 shadow-lg text-sm" style={{ background: 'var(--bg-secondary)' }}>
        <p style={{ color: 'var(--text-muted)' }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>)}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['analytics-sales'],
    queryFn: () => api.get('/analytics/sales?days=30').then((r) => r.data.data),
  });

  const { data: turnoverData, isLoading: turnoverLoading } = useQuery({
    queryKey: ['analytics-turnover'],
    queryFn: () => api.get('/analytics/inventory-turnover').then((r) => r.data.data),
  });

  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ['analytics-forecast'],
    queryFn: () => api.get('/analytics/demand-forecast').then((r) => r.data.data),
  });

  const monthlyData = salesData?.salesByMonth?.map((d) => ({ month: d._id, revenue: d.revenue, orders: d.orders })) || [];

  return (
    <DashboardLayout>
      <PageHeader title="Analytics" subtitle="Sales, inventory turnover, and demand forecasting" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5" style={{ color: 'var(--accent)' }} /><h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly Revenue</h3></div>
          {salesLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} /><YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} /><Bar dataKey="orders" name="Orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Inventory Turnover */}
        <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5" style={{ color: 'var(--success)' }} /><h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Inventory Turnover (30 days)</h3></div>
          {turnoverLoading ? <ChartSkeleton /> : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {turnoverData?.turnover?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="w-8 h-8 rounded-lg gradient-success flex items-center justify-center text-white text-xs font-bold">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sold: {item.totalSold} · Stock: {item.currentStock}</p>
                  </div>
                  <span className="badge badge-success text-xs">{item.turnoverRate?.toFixed(1)}x</span>
                </div>
              ))}
              {(!turnoverData?.turnover || turnoverData.turnover.length === 0) && <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No turnover data</p>}
            </div>
          )}
        </motion.div>

        {/* Demand Forecast */}
        <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning)' }} /><h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Demand Forecast & Reorder Suggestions</h3></div>
          {forecastLoading ? <ChartSkeleton /> : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Daily Avg Sales</th><th>Days Until Stockout</th><th>Suggested Reorder</th><th>Status</th></tr></thead>
                <tbody>
                  {forecastData?.forecast?.map((item, i) => (
                    <tr key={i}>
                      <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                      <td><span className="badge badge-default">{item.sku}</span></td>
                      <td>{item.currentStock}</td>
                      <td>{item.dailyAvgSales?.toFixed(1)}</td>
                      <td><span className={`font-semibold ${item.daysUntilStockout <= 7 ? 'text-red-500' : item.daysUntilStockout <= 14 ? 'text-amber-500' : 'text-emerald-500'}`}>{item.daysUntilStockout?.toFixed(0)} days</span></td>
                      <td className="font-semibold" style={{ color: 'var(--accent)' }}>{item.suggestedReorder} units</td>
                      <td><span className={`badge ${item.daysUntilStockout <= 7 ? 'badge-danger' : item.daysUntilStockout <= 14 ? 'badge-warning' : 'badge-success'}`}>{item.daysUntilStockout <= 7 ? 'Critical' : item.daysUntilStockout <= 14 ? 'Low' : 'OK'}</span></td>
                    </tr>
                  ))}
                  {(!forecastData?.forecast || forecastData.forecast.length === 0) && <tr><td colSpan="7" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No forecast data — needs sales history</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
