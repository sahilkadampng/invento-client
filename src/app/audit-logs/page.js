'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { motion } from 'framer-motion';
import { Shield, Filter } from 'lucide-react';

const actionColors = { create: 'badge-success', update: 'badge-info', delete: 'badge-danger', approve: 'badge-success', reject: 'badge-warning', transfer: 'badge-default', login: 'badge-info', logout: 'badge-default' };

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, entity],
    queryFn: () => api.get('/audit-logs', { params: { page, limit: 20, action: action || undefined, entity: entity || undefined } }).then((r) => r.data.data),
  });

  return (
    <DashboardLayout>
      <PageHeader title="Audit Logs" subtitle="Track all system actions (Admin only)">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="form-input w-36">
          <option value="">All Actions</option>
          {['create', 'update', 'delete', 'approve', 'reject', 'transfer', 'login', 'logout'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="form-input w-40">
          <option value="">All Entities</option>
          {['Product', 'Category', 'Brand', 'Supplier', 'Warehouse', 'PurchaseOrder', 'Invoice', 'User', 'Inventory'].map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </PageHeader>

      {isLoading ? <div className="card p-5"><LoadingSkeleton rows={10} columns={5} /></div> : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>User</th><th>Action</th><th>Entity</th><th>IP</th><th>Date</th></tr></thead>
              <tbody>
                {data?.logs?.map((log) => (
                  <tr key={log._id}>
                    <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs">{log.user?.name?.charAt(0) || '?'}</div><div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{log.user?.name || 'System'}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.user?.role}</p></div></div></td>
                    <td><span className={`badge ${actionColors[log.action] || 'badge-default'}`}>{log.action}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{log.entity}</td>
                    <td className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{log.ipAddress || '-'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {(!data?.logs || data.logs.length === 0) && <tr><td colSpan="5" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No audit logs</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="p-4"><Pagination pagination={data?.pagination} onPageChange={setPage} /></div>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
