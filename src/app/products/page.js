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
import { Plus, Search, Edit, Trash2, Upload, Eye, Package, Filter, Download } from 'lucide-react';

export default function ProductsPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [filters, setFilters] = useState({});
    const [form, setForm] = useState({ name: '', category: '', brand: '', supplier: '', purchasePrice: '', sellingPrice: '', stockQty: '', reorderLevel: '10', description: '', batchNumber: '', lotNumber: '', expiryDate: '', manufacturingDate: '' });

    const { data, isLoading } = useQuery({
        queryKey: ['products', page, search, filters],
        queryFn: () => api.get('/products', { params: { page, limit: 15, search, ...filters } }).then((r) => r.data.data),
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.get('/categories').then((r) => r.data.data.categories),
    });

    const { data: brands } = useQuery({
        queryKey: ['brands'],
        queryFn: () => api.get('/brands').then((r) => r.data.data.brands),
    });

    const createMutation = useMutation({
        mutationFn: (data) => api.post('/products', data),
        onSuccess: () => { queryClient.invalidateQueries(['products']); setShowModal(false); resetForm(); toast.success('Product created'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/products/${id}`, data),
        onSuccess: () => { queryClient.invalidateQueries(['products']); setShowModal(false); setEditProduct(null); resetForm(); toast.success('Product updated'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/products/${id}`),
        onSuccess: () => { queryClient.invalidateQueries(['products']); toast.success('Product deleted'); },
    });

    const resetForm = () => setForm({ name: '', category: '', brand: '', supplier: '', purchasePrice: '', sellingPrice: '', stockQty: '', reorderLevel: '10', description: '', batchNumber: '', lotNumber: '', expiryDate: '', manufacturingDate: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...form, purchasePrice: parseFloat(form.purchasePrice), sellingPrice: parseFloat(form.sellingPrice), stockQty: parseInt(form.stockQty) || 0, reorderLevel: parseInt(form.reorderLevel) || 10 };
        if (editProduct) {
            updateMutation.mutate({ id: editProduct._id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const openEdit = (product) => {
        setEditProduct(product);
        setForm({
            name: product.name, category: product.category?._id || '', brand: product.brand?._id || '',
            supplier: product.supplier?._id || '', purchasePrice: product.purchasePrice?.toString() || '',
            sellingPrice: product.sellingPrice?.toString() || '', stockQty: product.stockQty?.toString() || '',
            reorderLevel: product.reorderLevel?.toString() || '10', description: product.description || '',
            batchNumber: product.batchNumber || '', lotNumber: product.lotNumber || '',
            expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
            manufacturingDate: product.manufacturingDate ? new Date(product.manufacturingDate).toISOString().split('T')[0] : '',
        });
        setShowModal(true);
    };

    return (
        <DashboardLayout>
            <PageHeader title="Products" subtitle={`${data?.pagination?.total || 0} total products`}>
                <div className="relative">
                    {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /> */}
                    <input type="text" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="form-input pl-10 w-64" />
                </div>
                <button onClick={() => { resetForm(); setEditProduct(null); setShowModal(true); }} className="btn btn-primary">
                    <Plus className="w-4 h-4" /> Add Product
                </button>
            </PageHeader>

            {isLoading ? (
                <div className="card p-5"><LoadingSkeleton rows={8} columns={6} /></div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th>Stock</th>
                                    <th>Purchase Price</th>
                                    <th>Selling Price</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.products?.map((product) => (
                                    <tr key={product._id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-(--accent-light) flex items-center justify-center">
                                                    <Package className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{product.barcode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-default">{product.sku}</span></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{product.category?.name || '-'}</td>
                                        <td>
                                            <span className={`badge ${product.stockQty <= product.reorderLevel ? 'badge-danger' : product.stockQty <= product.reorderLevel * 2 ? 'badge-warning' : 'badge-success'}`}>
                                                {product.stockQty}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>₹{product.purchasePrice?.toLocaleString()}</td>
                                        <td style={{ color: 'var(--text-primary)' }} className="font-medium">₹{product.sellingPrice?.toLocaleString()}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(product)} className="btn btn-ghost btn-sm"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(product._id); }} className="btn btn-ghost btn-sm text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.products || data.products.length === 0) && (
                                    <tr><td colSpan="7" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No products found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4">
                        <Pagination pagination={data?.pagination} onPageChange={setPage} />
                    </div>
                </motion.div>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditProduct(null); resetForm(); }} title={editProduct ? 'Edit Product' : 'Add Product'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="form-label">Product Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" required /></div>
                        <div><label className="form-label">Category *</label>
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-input" required>
                                <option value="">Select category</option>
                                {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div><label className="form-label">Purchase Price *</label><input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="form-input" required /></div>
                        <div><label className="form-label">Selling Price *</label><input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="form-input" required /></div>
                        <div><label className="form-label">Stock Quantity</label><input type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} className="form-input" /></div>
                        <div><label className="form-label">Reorder Level</label><input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="form-input" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <div><label className="form-label">Batch Number</label><input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} className="form-input" placeholder="e.g. BATCH-2024-001" /></div>
                        <div><label className="form-label">Lot Number</label><input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} className="form-input" placeholder="e.g. LOT-A1" /></div>
                        <div><label className="form-label">Manufacturing Date</label><input type="date" value={form.manufacturingDate} onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })} className="form-input" /></div>
                        <div><label className="form-label">Expiry Date</label><input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="form-input" /></div>
                    </div>
                    <div className="mt-4"><label className="form-label">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input" rows={3} /></div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => { setShowModal(false); setEditProduct(null); resetForm(); }} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                            {editProduct ? 'Update' : 'Create'} Product
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
