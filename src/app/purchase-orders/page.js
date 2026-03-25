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
import { Plus, Check, X, Eye, ShoppingCart, Truck, Clock } from 'lucide-react';

const statusColors = { draft: 'badge-default', pending: 'badge-warning', approved: 'badge-info', received: 'badge-success', cancelled: 'badge-danger' };

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [items, setItems] = useState([{ product: '', quantity: '', unitPrice: '', tax: '18' }]);
  const [form, setForm] = useState({ supplier: '', deliveryDate: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, status],
    queryFn: () => api.get('/purchase-orders', { params: { page, limit: 15, status: status || undefined } }).then((r) => r.data.data),
  });

  const { data: suppliers } = useQuery({ queryKey: ['suppliers-list'], queryFn: () => api.get('/suppliers').then((r) => r.data.data.suppliers) });
  const { data: products } = useQuery({ queryKey: ['products-list'], queryFn: () => api.get('/products?limit=100').then((r) => r.data.data.products) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/purchase-orders', data),
    onSuccess: () => { queryClient.invalidateQueries(['purchase-orders']); setShowModal(false); toast.success('PO created'); resetForm(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/purchase-orders/${id}/approve`),
    onSuccess: () => { queryClient.invalidateQueries(['purchase-orders']); toast.success('PO approved'); setViewOrder(null); },
  });

  const receiveMutation = useMutation({
    mutationFn: (id) => api.patch(`/purchase-orders/${id}/receive`),
    onSuccess: () => { queryClient.invalidateQueries(['purchase-orders']); toast.success('PO received & stock updated'); setViewOrder(null); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/purchase-orders/${id}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries(['purchase-orders']); toast.success('PO cancelled'); setViewOrder(null); },
  });

  const resetForm = () => { setForm({ supplier: '', deliveryDate: '', notes: '' }); setItems([{ product: '', quantity: '', unitPrice: '', tax: '18' }]); };

  const addItem = () => setItems([...items, { product: '', quantity: '', unitPrice: '', tax: '18' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => { const copy = [...items]; copy[i][field] = value; setItems(copy); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      items: items.map((i) => ({ product: i.product, quantity: parseInt(i.quantity), unitPrice: parseFloat(i.unitPrice), tax: parseFloat(i.tax) || 0 })),
    };
    createMutation.mutate(payload);
  };

  return (
    <DashboardLayout>
      <PageHeader title="Purchase Orders" subtitle="Manage supplier orders">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          {['', 'pending', 'approved', 'received', 'cancelled'].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${status === s ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary"><Plus className="w-4 h-4" /> New PO</button>
      </PageHeader>

      {isLoading ? <div className="card p-5"><LoadingSkeleton rows={8} columns={6} /></div> : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>PO #</th><th>Supplier</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.orders?.map((order) => (
                  <tr key={order._id}>
                    <td className="font-mono font-semibold text-sm" style={{ color: 'var(--accent)' }}>{order.poNumber}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{order.supplier?.name || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{order.items?.length || 0} items</td>
                    <td className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{(order.totalAmount || 0).toLocaleString()}</td>
                    <td><span className={`badge ${statusColors[order.status]}`}>{order.status}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                    <td><button onClick={() => setViewOrder(order)} className="btn btn-ghost btn-sm"><Eye className="w-4 h-4" /></button></td>
                  </tr>
                ))}
                {(!data?.orders || data.orders.length === 0) && <tr><td colSpan="7" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No purchase orders</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="p-4"><Pagination pagination={data?.pagination} onPageChange={setPage} /></div>
        </motion.div>
      )}

      {/* View PO Modal */}
      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Purchase Order ${viewOrder?.poNumber || ''}`} size="lg">
        {viewOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Supplier</span><p className="font-medium" style={{ color: 'var(--text-primary)' }}>{viewOrder.supplier?.name}</p></div>
              <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</span><p><span className={`badge ${statusColors[viewOrder.status]}`}>{viewOrder.status}</span></p></div>
              <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Amount</span><p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>₹{viewOrder.totalAmount?.toLocaleString()}</p></div>
              <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Created By</span><p style={{ color: 'var(--text-secondary)' }}>{viewOrder.createdBy?.name}</p></div>
            </div>
            <table className="data-table mt-4"><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Tax %</th><th>Total</th></tr></thead>
              <tbody>{viewOrder.items?.map((item, i) => (
                <tr key={i}><td>{item.product?.name || '-'}</td><td>{item.quantity}</td><td>₹{item.unitPrice}</td><td>{item.tax}%</td><td className="font-semibold">₹{item.total?.toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
            <div className="flex gap-2 pt-4">
              {viewOrder.status === 'pending' && <><button onClick={() => approveMutation.mutate(viewOrder._id)} className="btn btn-success"><Check className="w-4 h-4" /> Approve</button><button onClick={() => cancelMutation.mutate(viewOrder._id)} className="btn btn-danger"><X className="w-4 h-4" /> Cancel</button></>}
              {viewOrder.status === 'approved' && <button onClick={() => receiveMutation.mutate(viewOrder._id)} className="btn btn-primary"><Truck className="w-4 h-4" /> Mark Received</button>}
            </div>
          </div>
        )}
      </Modal>

      {/* Create PO Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Purchase Order" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Supplier *</label>
              <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="form-input" required>
                <option value="">Select supplier</option>{suppliers?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Delivery Date</label><input type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} className="form-input" /></div>
          </div>
          <div><label className="form-label">Items</label>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                <select value={item.product} onChange={(e) => updateItem(i, 'product', e.target.value)} className="form-input" required>
                  <option value="">Product</option>{products?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="form-input" min="1" required />
                <input type="number" placeholder="Unit Price" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="form-input" step="0.01" required />
                <input type="number" placeholder="Tax %" value={item.tax} onChange={(e) => updateItem(i, 'tax', e.target.value)} className="form-input" />
                <button type="button" onClick={() => removeItem(i)} className="btn btn-ghost btn-sm text-red-500 justify-center"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="btn btn-ghost btn-sm"><Plus className="w-4 h-4" /> Add Item</button>
          </div>
          <div><label className="form-label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input" rows={2} /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Create PO</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
