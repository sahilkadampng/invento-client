'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Package, ShoppingCart, ArrowRightLeft, Info } from 'lucide-react';
import { useState } from 'react';

const typeIcons = { low_stock: AlertTriangle, expiry: Package, order: ShoppingCart, transfer: ArrowRightLeft, system: Info, purchase: ShoppingCart };
const typeColors = { low_stock: 'text-red-500', expiry: 'text-amber-500', order: 'text-blue-500', transfer: 'text-purple-500', system: 'text-gray-500', purchase: 'text-indigo-500' };

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.get('/notifications', { params: { page, limit: 20 } }).then((r) => r.data.data),
  });

  const markReadMut = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const markAllMut = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries(['notifications']); qc.invalidateQueries(['notifications-count']); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  return (
    <DashboardLayout>
      <PageHeader title="Notifications" subtitle={`${data?.unreadCount || 0} unread`}>
        <button onClick={() => markAllMut.mutate()} className="btn btn-secondary btn-sm"><CheckCheck className="w-4 h-4" /> Mark all read</button>
      </PageHeader>

      <div className="card overflow-hidden">
        {isLoading ? <div className="p-5 space-y-4">{[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div> : (
          <div>
            {data?.notifications?.map((notif, i) => {
              const Icon = typeIcons[notif.type] || Info;
              return (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-4 p-4 border-b transition-colors ${!notif.isRead ? 'bg-[var(--accent-light)]' : ''}`}
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!notif.isRead ? 'gradient-primary' : ''}`} style={notif.isRead ? { background: 'var(--bg-tertiary)' } : {}}>
                    <Icon className={`w-5 h-5 ${notif.isRead ? typeColors[notif.type] || '' : 'text-white'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{notif.title}</p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{notif.message}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(notif.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!notif.isRead && <button onClick={() => markReadMut.mutate(notif._id)} className="btn btn-ghost btn-sm"><Check className="w-4 h-4" /></button>}
                    <button onClick={() => deleteMut.mutate(notif._id)} className="btn btn-ghost btn-sm text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              );
            })}
            {(!data?.notifications || data.notifications.length === 0) && (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No notifications</p>
              </div>
            )}
          </div>
        )}
        <div className="p-4"><Pagination pagination={data?.pagination} onPageChange={setPage} /></div>
      </div>
    </DashboardLayout>
  );
}
