'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, Truck, ArrowRightLeft, CheckCircle, Clock, Package, Send, Trash2 } from 'lucide-react';

const statusColors = { draft: 'badge-default', in_transit: 'badge-warning', partial: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };

export default function StockTransfersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ fromWarehouse: '', toWarehouse: '', items: [{ product: '', quantity: 1 }], notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', page, statusFilter],
    queryFn: () => api.get('/stock-transfers', { params: { page, limit: 15, status: statusFilter || undefined } }).then((r) => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['transfer-stats'],
    queryFn: () => api.get('/stock-transfers/stats').then((r) => r.data.data),
  });

  const { data: products } = useQuery({ queryKey: ['products-list-transfers'], queryFn: () => api.get('/products?limit=200').then((r) => r.data.data.products) });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses-list-transfers'], queryFn: () => api.get('/warehouses').then((r) => r.data.data.warehouses) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/stock-transfers', data),
    onSuccess: () => { queryClient.invalidateQueries(['stock-transfers', 'transfer-stats']); setShowModal(false); toast.success('Transfer created'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const dispatchMutation = useMutation({
    mutationFn: (id) => api.put(`/stock-transfers/${id}/dispatch`),
    onSuccess: () => { queryClient.invalidateQueries(['stock-transfers', 'transfer-stats']); toast.success('Transfer dispatched'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, receivedItems }) => api.put(`/stock-transfers/${id}/receive`, { receivedItems }),
    onSuccess: () => { queryClient.invalidateQueries(['stock-transfers', 'transfer-stats']); toast.success('Transfer received'); },
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { product: '', quantity: 1 }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const handleReceive = (transfer) => {
    const receivedItems = transfer.items.map((item) => ({ product: item.product?._id || item.product, received: item.quantity }));
    receiveMutation.mutate({ id: transfer._id, receivedItems });
  };

  const statCards = [
    { label: 'Total Transfers', value: stats?.total || 0, icon: ArrowRightLeft, color: '#6366f1' },
    { label: 'Draft', value: stats?.draft || 0, icon: Package, color: '#8b5cf6' },
    { label: 'In Transit', value: stats?.inTransit || 0, icon: Truck, color: '#f59e0b' },
    { label: 'Completed Today', value: stats?.completedToday || 0, icon: CheckCircle, color: '#10b981' },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Stock Transfers" subtitle="Inter-warehouse stock transfer management">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-input w-40">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="in_transit">In Transit</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus className="w-4 h-4" /> New Transfer</button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Draft', count: stats?.draft || 0, color: '#94a3b8' },
          { label: 'In Transit', count: stats?.inTransit || 0, color: '#f59e0b' },
          { label: 'Partial', count: 0, color: '#3b82f6' },
          { label: 'Completed', count: stats?.completedToday || 0, color: '#10b981' },
        ].map((stage) => (
          <div key={stage.label} className="card p-3 text-center border-t-2" style={{ borderTopColor: stage.color }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stage.label}</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stage.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card p-5"><LoadingSkeleton rows={8} columns={6} /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Transfer #</th><th>From</th><th>To</th><th>Items</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.transfers?.map((t) => (
                  <tr key={t._id}>
                    <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.transferNumber}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.fromWarehouse?.name || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.toWarehouse?.name || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.items?.length || 0} items</td>
                    <td><span className={`badge ${statusColors[t.status]}`}>{t.status?.replace('_', ' ').toUpperCase()}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {t.status === 'draft' && (
                          <button onClick={() => dispatchMutation.mutate(t._id)} className="btn btn-ghost btn-sm text-amber-500" title="Dispatch"><Send className="w-4 h-4" /></button>
                        )}
                        {t.status === 'in_transit' && (
                          <button onClick={() => handleReceive(t)} className="btn btn-ghost btn-sm text-emerald-500" title="Receive All"><CheckCircle className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.transfers || data.transfers.length === 0) && (
                  <tr><td colSpan="7" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No transfers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4"><Pagination pagination={data?.pagination} onPageChange={setPage} /></div>
        </motion.div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Stock Transfer" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">From Warehouse *</label>
              <select value={form.fromWarehouse} onChange={(e) => setForm({ ...form, fromWarehouse: e.target.value })} className="form-input" required>
                <option value="">Select source</option>
                {warehouses?.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">To Warehouse *</label>
              <select value={form.toWarehouse} onChange={(e) => setForm({ ...form, toWarehouse: e.target.value })} className="form-input" required>
                <option value="">Select destination</option>
                {warehouses?.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Products</label>
              <button type="button" onClick={addItem} className="btn btn-ghost btn-sm"><Plus className="w-3 h-3" /> Add</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <select value={item.product} onChange={(e) => updateItem(i, 'product', e.target.value)} className="form-input col-span-8" required>
                  <option value="">Select product</option>
                  {products?.map((p) => <option key={p._id} value={p._id}>{p.name} (Stock: {p.stockQty})</option>)}
                </select>
                <input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="form-input col-span-3" min="1" />
                <button type="button" onClick={() => removeItem(i)} className="btn btn-ghost btn-sm col-span-1 text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>

          <div><label className="form-label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input" rows={2} /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Create Transfer</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
