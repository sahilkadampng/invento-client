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
import { Plus, Edit, Trash2, Building2, Phone, Mail, Search } from 'lucide-react';

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: '', contactPerson: '', email: '', phone: '', gstNumber: '', address: { city: '', state: '' } });

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => api.get('/suppliers', { params: { page, limit: 15, search } }).then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => edit ? api.put(`/suppliers/${edit._id}`, d) : api.post('/suppliers', d),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); setShowModal(false); setEdit(null); toast.success(edit ? 'Updated' : 'Created'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); toast.success('Deleted'); },
  });

  const openEdit = (s) => {
    setEdit(s);
    setForm({ name: s.name, contactPerson: s.contactPerson || '', email: s.email || '', phone: s.phone || '', gstNumber: s.gstNumber || '', address: s.address || { city: '', state: '' } });
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <PageHeader title="Suppliers" subtitle="Manage vendors and supply chain">
        <div className="relative">
          {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /> */}
          <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="form-input pl-10 w-56" />
        </div>
        <button onClick={() => { setEdit(null); setForm({ name: '', contactPerson: '', email: '', phone: '', gstNumber: '', address: { city: '', state: '' } }); setShowModal(true); }} className="btn btn-primary"><Plus className="w-4 h-4" /> Add Supplier</button>
      </PageHeader>

      {isLoading ? <div className="card p-5"><LoadingSkeleton rows={8} columns={5} /></div> : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Supplier</th><th>Contact</th><th>Email</th><th>Phone</th><th>GST</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.suppliers?.map((s) => (
                  <tr key={s._id}>
                    <td><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg gradient-info flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span></div></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.contactPerson || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.email || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.phone || '-'}</td>
                    <td><span className="badge badge-default text-xs">{s.gstNumber || '-'}</span></td>
                    <td>
                      <div className="flex gap-1"><button onClick={() => openEdit(s)} className="btn btn-ghost btn-sm"><Edit className="w-4 h-4" /></button><button onClick={() => { if (confirm('Delete?')) deleteMut.mutate(s._id); }} className="btn btn-ghost btn-sm text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                    </td>
                  </tr>
                ))}
                {(!data?.suppliers || data.suppliers.length === 0) && <tr><td colSpan="6" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No suppliers</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="p-4"><Pagination pagination={data?.pagination} onPageChange={setPage} /></div>
        </motion.div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEdit(null); }} title={edit ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <div><label className="form-label">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Contact Person</label><input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">GST Number</label><input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} className="form-input" /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{edit ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
