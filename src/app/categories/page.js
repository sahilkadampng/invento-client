'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Tags } from 'lucide-react';

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data.data.categories) });

  const createMut = useMutation({
    mutationFn: (d) => edit ? api.put(`/categories/${edit._id}`, d) : api.post('/categories', d),
    onSuccess: () => { qc.invalidateQueries(['categories']); setShowModal(false); setEdit(null); toast.success(edit ? 'Updated' : 'Created'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries(['categories']); toast.success('Deleted'); },
  });

  return (
    <DashboardLayout>
      <PageHeader title="Categories" subtitle="Organize products by category">
        <button onClick={() => { setEdit(null); setForm({ name: '', description: '' }); setShowModal(true); }} className="btn btn-primary"><Plus className="w-4 h-4" /> Add Category</button>
      </PageHeader>

      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.map((cat, i) => (
            <motion.div key={cat._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} className="card p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center"><Tags className="w-5 h-5" style={{ color: 'var(--accent)' }} /></div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
                  {cat.description && <p className="text-xs truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>{cat.description}</p>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEdit(cat); setForm({ name: cat.name, description: cat.description || '' }); setShowModal(true); }} className="btn btn-ghost btn-sm"><Edit className="w-4 h-4" /></button>
                <button onClick={() => { if (confirm('Delete?')) deleteMut.mutate(cat._id); }} className="btn btn-ghost btn-sm text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEdit(null); }} title={edit ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <div><label className="form-label">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" required autoFocus /></div>
          <div><label className="form-label">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input" /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{edit ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
