'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, CalendarDays, ShieldAlert, Package, DollarSign } from 'lucide-react';

export default function ExpiryTrackerPage() {
  const [urgency, setUrgency] = useState('all');
  const [page, setPage] = useState(1);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['expiry-dashboard'],
    queryFn: () => api.get('/expiry/dashboard').then((r) => r.data.data),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['expiry-products', page, urgency],
    queryFn: () => api.get('/expiry/products', { params: { page, limit: 20, urgency } }).then((r) => r.data.data),
  });

  const urgencyCards = [
    { label: 'Already Expired', value: dashboard?.expired || 0, icon: ShieldAlert, color: '#ef4444', bg: '#fef2f2', key: 'expired' },
    { label: 'Expiring in 7 Days', value: dashboard?.expiring7Days || 0, icon: AlertTriangle, color: '#f97316', bg: '#fff7ed', key: '7days' },
    { label: 'Expiring in 30 Days', value: dashboard?.expiring30Days || 0, icon: Clock, color: '#eab308', bg: '#fefce8', key: '30days' },
    { label: 'Expiring in 90 Days', value: dashboard?.expiring90Days || 0, icon: CalendarDays, color: '#22c55e', bg: '#f0fdf4', key: '90days' },
  ];

  const getUrgencyBadge = (daysLeft) => {
    if (daysLeft < 0) return { class: 'badge-danger', text: `Expired ${Math.abs(daysLeft)}d ago` };
    if (daysLeft <= 7) return { class: 'badge-danger', text: `${daysLeft}d left` };
    if (daysLeft <= 30) return { class: 'badge-warning', text: `${daysLeft}d left` };
    return { class: 'badge-success', text: `${daysLeft}d left` };
  };

  return (
    <DashboardLayout>
      <PageHeader title="Expiry Tracker" subtitle="Monitor product expiry dates and take action" />

      {/* Urgency Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {urgencyCards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5 cursor-pointer transition-all hover:shadow-md"
            style={{ borderLeft: `4px solid ${c.color}` }}
            onClick={() => { setUrgency(c.key); setPage(1); }}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Value at Risk */}
      {dashboard && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {/* <DollarSign className="w-5 h-5 text-red-500" /> */}
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Value at Risk (30 days):</span>
              <span className="text-lg font-bold text-red-500">₹{(dashboard.valueAtRisk || 0).toLocaleString()}</span>
            </div>
            {dashboard.byCategory?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {dashboard.byCategory.map((cat) => (
                  <span key={cat._id} className="badge badge-default text-xs">{cat._id || 'Uncategorized'}: {cat.count}</span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-sm w-fit" style={{ background: 'var(--bg-tertiary)' }}>
        {[{ key: 'all', label: 'All' }, { key: 'expired', label: 'Expired' }, { key: '7days', label: '7 Days' }, { key: '30days', label: '30 Days' }, { key: '90days', label: '90 Days' }].map((t) => (
          <button key={t.key} onClick={() => { setUrgency(t.key); setPage(1); }} className={`px-4 py-2 rounded-sm text-sm font-medium transition-all ${urgency === t.key ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Products Table */}
      {productsLoading ? (
        <div className="card p-5"><LoadingSkeleton rows={8} columns={6} /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Expiry Date</th><th>Days Left</th><th>Value at Risk</th></tr></thead>
              <tbody>
                {productsData?.products?.map((p) => {
                  const badge = getUrgencyBadge(p.daysLeft);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          <div>
                            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.sku || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.category?.name || '-'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.stockQty}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.expiryDate).toLocaleDateString('en-IN')}</td>
                      <td><span className={`badge ${badge.class}`}>{badge.text}</span></td>
                      <td className="font-medium" style={{ color: p.daysLeft < 0 ? '#ef4444' : 'var(--text-primary)' }}>₹{(p.valueAtRisk || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {(!productsData?.products || productsData.products.length === 0) && (
                  <tr><td colSpan="6" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No expiring products found 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4"><Pagination pagination={productsData?.pagination} onPageChange={setPage} /></div>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
