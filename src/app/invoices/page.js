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
import { Plus, Eye, FileText, Download, Mail, X } from 'lucide-react';

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', gstNumber: '' });
  const [items, setItems] = useState([{ product: '', quantity: '', unitPrice: '', discount: '0', tax: '18' }]);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page],
    queryFn: () => api.get('/invoices', { params: { page, limit: 15 } }).then((r) => r.data.data),
  });

  const { data: products } = useQuery({ queryKey: ['products-list'], queryFn: () => api.get('/products?limit=100').then((r) => r.data.data.products) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/invoices', data),
    onSuccess: () => { qc.invalidateQueries(['invoices']); setShowModal(false); toast.success('Invoice created'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const addItem = () => setItems([...items, { product: '', quantity: '', unitPrice: '', discount: '0', tax: '18' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => { const c = [...items]; c[i][field] = value; if (field === 'product') { const p = products?.find((pr) => pr._id === value); if (p) c[i].unitPrice = p.sellingPrice.toString(); } setItems(c); };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      customer, paymentMethod, paymentStatus: 'paid',
      items: items.map((i) => ({ product: i.product, quantity: parseInt(i.quantity), unitPrice: parseFloat(i.unitPrice), discount: parseFloat(i.discount) || 0, tax: parseFloat(i.tax) || 0 })),
    });
  };

  const downloadPdf = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `invoice.pdf`; a.click();
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to download PDF'); }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Invoices" subtitle="Sales & billing">
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus className="w-4 h-4" /> New Invoice</button>
      </PageHeader>

      {isLoading ? <div className="card p-5"><LoadingSkeleton rows={8} columns={5} /></div> : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Invoice #</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.invoices?.map((inv) => (
                  <tr key={inv._id}>
                    <td className="font-mono font-semibold text-sm" style={{ color: 'var(--accent)' }}>{inv.invoiceNumber}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{inv.customer?.name || '-'}</td>
                    <td className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{(inv.totalAmount || 0).toLocaleString()}</td>
                    <td><span className={`badge ${inv.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>{inv.paymentStatus}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setViewInvoice(inv)} className="btn btn-ghost btn-sm"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => downloadPdf(inv._id)} className="btn btn-ghost btn-sm"><Download className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.invoices || data.invoices.length === 0) && <tr><td colSpan="6" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No invoices</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="p-4"><Pagination pagination={data?.pagination} onPageChange={setPage} /></div>
        </motion.div>
      )}

      {/* View Invoice */}
      <Modal isOpen={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice?.invoiceNumber || ''}`} size="lg">
        {viewInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Customer</span><p className="font-medium">{viewInvoice.customer?.name}</p></div>
              <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</span><p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>₹{viewInvoice.totalAmount?.toLocaleString()}</p></div>
            </div>
            <table className="data-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Tax</th><th>Total</th></tr></thead>
              <tbody>{viewInvoice.items?.map((item, i) => (
                <tr key={i}><td>{item.name || 'Product'}</td><td>{item.quantity}</td><td>₹{item.unitPrice}</td><td>{item.tax}%</td><td className="font-semibold">₹{item.total?.toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
            <div className="flex gap-2 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => downloadPdf(viewInvoice._id)} className="btn btn-primary"><Download className="w-4 h-4" /> Download PDF</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Invoice */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Invoice" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Customer Name *</label><input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="form-input" required /></div>
            <div><label className="form-label">Email</label><input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">Phone</label><input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="form-input">
                <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
          <div><label className="form-label">Items</label>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 mb-2">
                <select value={item.product} onChange={(e) => updateItem(i, 'product', e.target.value)} className="form-input col-span-2" required>
                  <option value="">Product</option>{products?.map((p) => <option key={p._id} value={p._id}>{p.name} (₹{p.sellingPrice})</option>)}
                </select>
                <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="form-input" min="1" required />
                <input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="form-input" step="0.01" required />
                <input type="number" placeholder="Tax %" value={item.tax} onChange={(e) => updateItem(i, 'tax', e.target.value)} className="form-input" />
                <button type="button" onClick={() => removeItem(i)} className="btn btn-ghost btn-sm text-red-500 justify-center"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="btn btn-ghost btn-sm"><Plus className="w-4 h-4" /> Add Item</button>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Create Invoice</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
