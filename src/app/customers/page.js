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
import { Plus, Search, Edit, Trash2, Users, Crown, TrendingUp, ShoppingBag, Phone, Mail, MapPin } from 'lucide-react';

const typeColors = { retail: 'badge-info', wholesale: 'badge-warning', distributor: 'badge-success' };

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: 'retail', gstNumber: '', notes: '', address: { street: '', city: '', state: '', pincode: '' } });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, typeFilter],
    queryFn: () => api.get('/customers', { params: { page, limit: 15, search, type: typeFilter || undefined } }).then((r) => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: () => api.get('/customers/stats').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/customers', data),
    onSuccess: () => { queryClient.invalidateQueries(['customers', 'customer-stats']); setShowModal(false); resetForm(); toast.success('Customer created'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/customers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries(['customers', 'customer-stats']); setShowModal(false); setEditCustomer(null); resetForm(); toast.success('Customer updated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['customers', 'customer-stats']); toast.success('Customer deleted'); },
  });

  const resetForm = () => setForm({ name: '', email: '', phone: '', type: 'retail', gstNumber: '', notes: '', address: { street: '', city: '', state: '', pincode: '' } });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editCustomer) {
      updateMutation.mutate({ id: editCustomer._id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (c) => {
    setEditCustomer(c);
    setForm({
      name: c.name, email: c.email || '', phone: c.phone || '', type: c.type,
      gstNumber: c.gstNumber || '', notes: c.notes || '',
      address: { street: c.address?.street || '', city: c.address?.city || '', state: c.address?.state || '', pincode: c.address?.pincode || '' },
    });
    setShowModal(true);
  };

  const statCards = [
    { label: 'Total Customers', value: stats?.total || 0, icon: Users, color: '#6366f1' },
    { label: 'Active', value: stats?.active || 0, icon: Crown, color: '#10b981' },
    { label: 'Total Revenue', value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: '#f59e0b' },
    { label: 'Avg Order Value', value: `₹${(stats?.avgOrderValue || 0).toLocaleString()}`, icon: ShoppingBag, color: '#8b5cf6' },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Customers" subtitle="Manage your customer database">
        <input type="text" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="form-input w-64" />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="form-input w-40">
          <option value="">All Types</option>
          <option value="retail">Retail</option>
          <option value="wholesale">Wholesale</option>
          <option value="distributor">Distributor</option>
        </select>
        <button onClick={() => { resetForm(); setEditCustomer(null); setShowModal(true); }} className="btn btn-primary"><Plus className="w-4 h-4" /> Add Customer</button>
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

      {/* Table */}
      {isLoading ? (
        <div className="card p-5"><LoadingSkeleton rows={8} columns={6} /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Customer</th><th>Contact</th><th>Type</th><th>Purchases</th><th>Total Spent</th><th>Points</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {data?.customers?.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: '#6366f1' }}>
                          {c.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                          {c.gstNumber && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>GST: {c.gstNumber}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {c.phone && <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><Phone className="w-3 h-3" /> {c.phone}</p>}
                        {c.email && <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Mail className="w-3 h-3" /> {c.email}</p>}
                      </div>
                    </td>
                    <td><span className={`badge ${typeColors[c.type] || 'badge-default'}`}>{c.type?.toUpperCase()}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.totalPurchases}</td>
                    <td className="font-medium" style={{ color: 'var(--text-primary)' }}>₹{(c.totalSpent || 0).toLocaleString()}</td>
                    <td><span className="badge badge-default">{c.loyaltyPoints} pts</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="btn btn-ghost btn-sm"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm('Delete this customer?')) deleteMutation.mutate(c._id); }} className="btn btn-ghost btn-sm text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.customers || data.customers.length === 0) && (
                  <tr><td colSpan="7" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No customers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4"><Pagination pagination={data?.pagination} onPageChange={setPage} /></div>
        </motion.div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditCustomer(null); resetForm(); }} title={editCustomer ? 'Edit Customer' : 'Add Customer'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" required /></div>
            <div><label className="form-label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="form-input">
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>
            <div><label className="form-label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">GST Number</label><input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">City</label><input value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} className="form-input" /></div>
            <div><label className="form-label">State</label><input value={form.address.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} className="form-input" /></div>
            <div><label className="form-label">Pincode</label><input value={form.address.pincode} onChange={(e) => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })} className="form-input" /></div>
          </div>
          <div><label className="form-label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input" rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditCustomer(null); resetForm(); }} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>{editCustomer ? 'Update' : 'Create'} Customer</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
