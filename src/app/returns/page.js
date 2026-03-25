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
import { Plus, RotateCcw, CheckCircle, XCircle, Clock, AlertTriangle, Package, Ban, Trash2 } from 'lucide-react';

const statusColors = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger', processed: 'badge-info' };
const typeLabels = { customer_return: 'Customer Return', damaged: 'Damaged', expired: 'Expired', write_off: 'Write-off' };

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'customer_return', items: [{ product: '', quantity: 1, reason: '', condition: 'good' }], customer: { name: '', phone: '' }, totalRefund: 0, notes: '' });

  const statusFilter = tab === 'pending' ? 'pending' : tab === 'damaged' ? undefined : undefined;
  const typeFilter = tab === 'damaged' ? 'damaged' : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page, tab],
    queryFn: () => api.get('/returns', { params: { page, limit: 15, status: statusFilter, type: typeFilter } }).then((r) => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['return-stats'],
    queryFn: () => api.get('/returns/stats').then((r) => r.data.data),
  });

  const { data: products } = useQuery({ queryKey: ['products-list-returns'], queryFn: () => api.get('/products?limit=200').then((r) => r.data.data.products) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/returns', data),
    onSuccess: () => { queryClient.invalidateQueries(['returns', 'return-stats']); setShowModal(false); toast.success('Return created'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`/returns/${id}/approve`),
    onSuccess: () => { queryClient.invalidateQueries(['returns', 'return-stats']); toast.success('Return approved & stock restored'); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.put(`/returns/${id}/reject`),
    onSuccess: () => { queryClient.invalidateQueries(['returns', 'return-stats']); toast.success('Return rejected'); },
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { product: '', quantity: 1, reason: '', condition: 'good' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const statCards = [
    { label: 'Total Returns', value: stats?.total || 0, icon: RotateCcw, color: '#6366f1' },
    { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: '#f59e0b' },
    { label: 'Processed Today', value: stats?.processedToday || 0, icon: CheckCircle, color: '#10b981' },
    { label: 'Total Refunds', value: `₹${(stats?.totalRefundValue || 0).toLocaleString()}`, icon: AlertTriangle, color: '#ef4444' },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Returns & Damages" subtitle="Manage returns, damaged goods, and write-offs">
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus className="w-4 h-4" /> New Return</button>
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-sm w-fit" style={{ background: 'var(--bg-tertiary)' }}>
        {[{ key: 'all', label: 'All Returns' }, { key: 'pending', label: 'Pending' }, { key: 'damaged', label: 'Damaged/Write-offs' }].map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }} className={`px-4 py-2 rounded-sm text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card p-5"><LoadingSkeleton rows={8} columns={6} /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Return #</th><th>Type</th><th>Items</th><th>Refund</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.returns?.map((r) => (
                  <tr key={r._id}>
                    <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.returnNumber}</td>
                    <td><span className="badge badge-default">{typeLabels[r.type] || r.type}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.items?.length || 0} items</td>
                    <td className="font-medium" style={{ color: 'var(--text-primary)' }}>₹{(r.totalRefund || 0).toLocaleString()}</td>
                    <td><span className={`badge ${statusColors[r.status]}`}>{r.status?.toUpperCase()}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => approveMutation.mutate(r._id)} className="btn btn-ghost btn-sm text-emerald-500" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => rejectMutation.mutate(r._id)} className="btn btn-ghost btn-sm text-red-500" title="Reject"><XCircle className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.returns || data.returns.length === 0) && (
                  <tr><td colSpan="7" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No returns found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4"><Pagination pagination={data?.pagination} onPageChange={setPage} /></div>
        </motion.div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Return" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, totalRefund: parseFloat(form.totalRefund) || 0 }); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">Return Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="form-input">
                <option value="customer_return">Customer Return</option>
                <option value="damaged">Damaged</option>
                <option value="expired">Expired</option>
                <option value="write_off">Write-off</option>
              </select>
            </div>
            <div><label className="form-label">Total Refund (₹)</label>
              <input type="number" step="0.01" value={form.totalRefund} onChange={(e) => setForm({ ...form, totalRefund: e.target.value })} className="form-input" />
            </div>
            <div><label className="form-label">Customer Name</label><input value={form.customer.name} onChange={(e) => setForm({ ...form, customer: { ...form.customer, name: e.target.value } })} className="form-input" /></div>
            <div><label className="form-label">Customer Phone</label><input value={form.customer.phone} onChange={(e) => setForm({ ...form, customer: { ...form.customer, phone: e.target.value } })} className="form-input" /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Items</label>
              <button type="button" onClick={addItem} className="btn btn-ghost btn-sm"><Plus className="w-3 h-3" /> Add Item</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <select value={item.product} onChange={(e) => updateItem(i, 'product', e.target.value)} className="form-input col-span-4" required>
                  <option value="">Select product</option>
                  {products?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="form-input col-span-2" min="1" />
                <select value={item.condition} onChange={(e) => updateItem(i, 'condition', e.target.value)} className="form-input col-span-2">
                  <option value="good">Good</option>
                  <option value="damaged">Damaged</option>
                  <option value="expired">Expired</option>
                  <option value="unsellable">Unsellable</option>
                </select>
                <input value={item.reason} onChange={(e) => updateItem(i, 'reason', e.target.value)} className="form-input col-span-3" placeholder="Reason" />
                <button type="button" onClick={() => removeItem(i)} className="btn btn-ghost btn-sm col-span-1 text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>

          <div><label className="form-label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input" rows={2} /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Create Return</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
