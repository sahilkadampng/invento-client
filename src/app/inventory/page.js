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
import { ArrowRightLeft, Package, AlertTriangle, Clock, Plus, Filter } from 'lucide-react';

const typeColors = { in: 'badge-success', out: 'badge-danger', adjust: 'badge-info', return: 'badge-warning', transfer: 'badge-default', damaged: 'badge-danger' };

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('logs');
  const [page, setPage] = useState(1);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [logForm, setLogForm] = useState({ product: '', type: 'in', quantity: '', reason: '' });
  const [transferForm, setTransferForm] = useState({ product: '', fromWarehouse: '', toWarehouse: '', quantity: '', reason: '' });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['inventory-logs', page],
    queryFn: () => api.get('/inventory/logs', { params: { page, limit: 15 } }).then((r) => r.data.data),
    enabled: tab === 'logs',
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => api.get('/inventory/alerts').then((r) => r.data.data),
    enabled: tab === 'alerts',
  });

  const { data: products } = useQuery({ queryKey: ['products-list'], queryFn: () => api.get('/products?limit=100').then((r) => r.data.data.products) });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses-list'], queryFn: () => api.get('/warehouses').then((r) => r.data.data.warehouses) });

  const logMutation = useMutation({
    mutationFn: (data) => api.post('/inventory/log', data),
    onSuccess: () => { queryClient.invalidateQueries(['inventory-logs']); setShowLogModal(false); toast.success('Stock updated'); setLogForm({ product: '', type: 'in', quantity: '', reason: '' }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const transferMutation = useMutation({
    mutationFn: (data) => api.post('/inventory/transfer', data),
    onSuccess: () => { queryClient.invalidateQueries(['inventory-logs']); setShowTransferModal(false); toast.success('Transfer initiated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <DashboardLayout>
      <PageHeader title="Inventory" subtitle="Track stock movements and alerts">
        <button onClick={() => setShowLogModal(true)} className="btn btn-primary"><Plus className="w-4 h-4" /> Stock Log</button>
        <button onClick={() => setShowTransferModal(true)} className="btn btn-secondary"><ArrowRightLeft className="w-4 h-4" /> Transfer</button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-sm w-fit" style={{ background: 'var(--bg-tertiary)' }}>
        {['logs', 'alerts'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-sm text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
            {t === 'alerts' ? 'Alerts' : 'Logs'}
          </button>
        ))}
      </div>

      {/* Logs Tab */}
      {tab === 'logs' && (
        logsLoading ? <div className="card p-5"><LoadingSkeleton rows={8} columns={6} /></div> : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Previous</th><th>New</th><th>By</th><th>Date</th></tr></thead>
                <tbody>
                  {logsData?.logs?.map((log) => (
                    <tr key={log._id}>
                      <td><div className="flex items-center gap-2"><Package className="w-4 h-4" style={{ color: 'var(--accent)' }} /><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{log.product?.name || '-'}</span></div></td>
                      <td><span className={`badge ${typeColors[log.type]}`}>{log.type.toUpperCase()}</span></td>
                      <td className="font-semibold">{log.quantity}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{log.previousQty}</td>
                      <td className="font-semibold" style={{ color: 'var(--text-primary)' }}>{log.newQty}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.performedBy?.name || '-'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                  {(!logsData?.logs || logsData.logs.length === 0) && <tr><td colSpan="7" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No inventory logs</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-4"><Pagination pagination={logsData?.pagination} onPageChange={setPage} /></div>
          </motion.div>
        )
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        alertsLoading ? <div className="card p-5"><LoadingSkeleton /></div> : (
          <div className="space-y-6">
            {/* Low Stock */}
            <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <AlertTriangle className="w-4 h-4 text-red-500" /> Low Stock ({alertsData?.lowStock?.length || 0})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {alertsData?.lowStock?.map((p) => (
                  <div key={p._id} className="p-3 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><Package className="w-5 h-5 text-red-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Stock: <span className="text-red-500 font-semibold">{p.stockQty}</span> / Reorder: {p.reorderLevel}</p>
                    </div>
                  </div>
                ))}
              </div>
              {(!alertsData?.lowStock || alertsData.lowStock.length === 0) && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No low stock items 🎉</p>}
            </motion.div>

            {/* Expiring Soon */}
            <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <Clock className="w-4 h-4 text-amber-500" /> Expiring Soon ({alertsData?.expiringSoon?.length || 0})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {alertsData?.expiringSoon?.map((p) => (
                  <div key={p._id} className="p-3 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Expires: {new Date(p.expiryDate).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
              {(!alertsData?.expiringSoon || alertsData.expiringSoon.length === 0) && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No expiring items</p>}
            </motion.div>
          </div>
        )
      )}

      {/* Stock Log Modal */}
      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Create Stock Log">
        <form onSubmit={(e) => { e.preventDefault(); logMutation.mutate({ ...logForm, quantity: parseInt(logForm.quantity) }); }} className="space-y-4">
          <div><label className="form-label">Product *</label>
            <select value={logForm.product} onChange={(e) => setLogForm({ ...logForm, product: e.target.value })} className="form-input" required>
              <option value="">Select product</option>
              {products?.map((p) => <option key={p._id} value={p._id}>{p.name} (Stock: {p.stockQty})</option>)}
            </select>
          </div>
          <div><label className="form-label">Type *</label>
            <select value={logForm.type} onChange={(e) => setLogForm({ ...logForm, type: e.target.value })} className="form-input">
              <option value="in">Stock In</option><option value="out">Stock Out</option>
              <option value="adjust">Adjust</option><option value="return">Return</option><option value="damaged">Damaged</option>
            </select>
          </div>
          <div><label className="form-label">Quantity *</label><input type="number" value={logForm.quantity} onChange={(e) => setLogForm({ ...logForm, quantity: e.target.value })} className="form-input" min="1" required /></div>
          <div><label className="form-label">Reason</label><input value={logForm.reason} onChange={(e) => setLogForm({ ...logForm, reason: e.target.value })} className="form-input" /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowLogModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Submit</button></div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Inter-warehouse Transfer">
        <form onSubmit={(e) => { e.preventDefault(); transferMutation.mutate({ ...transferForm, quantity: parseInt(transferForm.quantity) }); }} className="space-y-4">
          <div><label className="form-label">Product *</label>
            <select value={transferForm.product} onChange={(e) => setTransferForm({ ...transferForm, product: e.target.value })} className="form-input" required>
              <option value="">Select product</option>
              {products?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">From Warehouse *</label>
              <select value={transferForm.fromWarehouse} onChange={(e) => setTransferForm({ ...transferForm, fromWarehouse: e.target.value })} className="form-input" required>
                <option value="">Select</option>
                {warehouses?.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">To Warehouse *</label>
              <select value={transferForm.toWarehouse} onChange={(e) => setTransferForm({ ...transferForm, toWarehouse: e.target.value })} className="form-input" required>
                <option value="">Select</option>
                {warehouses?.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="form-label">Quantity *</label><input type="number" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} className="form-input" min="1" required /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowTransferModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Transfer</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
