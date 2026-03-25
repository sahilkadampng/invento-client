'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Warehouse as WarehouseIcon, MapPin, Users, Package } from 'lucide-react';

export default function WarehousesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', capacity: '', address: { city: '', state: '' } });

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then((r) => r.data.data.warehouses),
  });

  const createMut = useMutation({
    mutationFn: (d) => edit ? api.put(`/warehouses/${edit._id}`, d) : api.post('/warehouses', d),
    onSuccess: () => { qc.invalidateQueries(['warehouses']); setShowModal(false); setEdit(null); toast.success(edit ? 'Updated' : 'Created'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/warehouses/${id}`),
    onSuccess: () => { qc.invalidateQueries(['warehouses']); toast.success('Deleted'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cannot delete'),
  });

  const openEdit = (w) => {
    setEdit(w);
    setForm({ name: w.name, code: w.code, capacity: w.capacity?.toString() || '', address: w.address || { city: '', state: '' } });
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <PageHeader title="Warehouses" subtitle="Manage warehouse locations">
        <button onClick={() => { setEdit(null); setForm({ name: '', code: '', capacity: '', address: { city: '', state: '' } }); setShowModal(true); }} className="btn btn-primary"><Plus className="w-4 h-4" /> Add Warehouse</button>
      </PageHeader>

      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((w, i) => (
            <motion.div key={w._id} initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><WarehouseIcon className="w-6 h-6 text-white" /></div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{w.name}</h3>
                    <span className="badge badge-default text-xs">{w.code}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(w)} className="btn btn-ghost btn-sm"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => { if (confirm('Delete?')) deleteMut.mutate(w._id); }} className="btn btn-ghost btn-sm text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-2">
                {w.address?.city && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><MapPin className="w-4 h-4" />{w.address.city}{w.address.state ? `, ${w.address.state}` : ''}</div>}
                {w.manager && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Users className="w-4 h-4" />{w.manager.name}</div>}
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Package className="w-4 h-4" />Capacity: {w.capacity || 'N/A'}</div>
              </div>
              <div className="flex gap-2 mt-3">
                {w.zones?.map((z, j) => <span key={j} className="badge badge-info text-xs">{z.name}</span>)}
              </div>
            </motion.div>
          ))}
          {(!data || data.length === 0) && <p className="text-sm col-span-3 text-center py-12" style={{ color: 'var(--text-muted)' }}>No warehouses yet</p>}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEdit(null); }} title={edit ? 'Edit Warehouse' : 'Add Warehouse'}>
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate({ ...form, capacity: parseInt(form.capacity) || 0 }); }} className="space-y-4">
          <div><label className="form-label">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" required /></div>
          <div><label className="form-label">Code *</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="form-input" required /></div>
          <div><label className="form-label">Capacity</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="form-input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">City</label><input value={form.address?.city || ''} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} className="form-input" /></div>
            <div><label className="form-label">State</label><input value={form.address?.state || ''} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} className="form-input" /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{edit ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
