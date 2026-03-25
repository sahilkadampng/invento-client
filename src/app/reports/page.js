'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Download, FileText, Package, ShoppingCart, TrendingUp, Clock, BarChart3, Filter } from 'lucide-react';

const reportTypes = [
  { key: 'stock', label: 'Stock Report', desc: 'Current inventory snapshot with values', icon: Package, color: '#6366f1', endpoint: '/reports/stock' },
  { key: 'sales', label: 'Sales Report', desc: 'Revenue, invoices, and top products', icon: TrendingUp, color: '#10b981', endpoint: '/reports/sales' },
  { key: 'purchase', label: 'Purchase Report', desc: 'Purchase orders by period and supplier', icon: ShoppingCart, color: '#f59e0b', endpoint: '/reports/purchase' },
  { key: 'expiry', label: 'Expiry Report', desc: 'Products expiring within selected period', icon: Clock, color: '#ef4444', endpoint: '/reports/expiry' },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('stock');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [downloading, setDownloading] = useState(false);

  const report = reportTypes.find((r) => r.key === activeReport);

  const params = {};
  if (activeReport === 'sales' || activeReport === 'purchase') {
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
  }
  if (activeReport === 'expiry') {
    params.days = expiryDays;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['report', activeReport, startDate, endDate, expiryDays],
    queryFn: () => api.get(report.endpoint, { params }).then((r) => r.data.data),
    enabled: !!report,
  });

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const response = await api.get(report.endpoint, { params: { ...params, format: 'csv' }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeReport}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Failed to download CSV');
    } finally {
      setDownloading(false);
    }
  };

  const renderSummary = () => {
    const s = data?.summary;
    if (!s) return null;
    const items = [];
    if (activeReport === 'stock') {
      items.push({ label: 'Total Products', value: s.totalProducts }, { label: 'Stock Value', value: `₹${(s.totalStockValue || 0).toLocaleString()}` }, { label: 'Retail Value', value: `₹${(s.totalRetailValue || 0).toLocaleString()}` }, { label: 'Out of Stock', value: s.outOfStock }, { label: 'Low Stock', value: s.lowStock });
    } else if (activeReport === 'sales') {
      items.push({ label: 'Total Invoices', value: s.totalInvoices }, { label: 'Revenue', value: `₹${(s.totalRevenue || 0).toLocaleString()}` }, { label: 'Avg Order', value: `₹${(s.avgOrderValue || 0).toLocaleString()}` }, { label: 'Total Tax', value: `₹${(s.totalTax || 0).toLocaleString()}` });
    } else if (activeReport === 'purchase') {
      items.push({ label: 'Total Orders', value: s.totalOrders }, { label: 'Total Value', value: `₹${(s.totalValue || 0).toLocaleString()}` });
    } else if (activeReport === 'expiry') {
      items.push({ label: 'Total Items', value: s.totalItems }, { label: 'Value at Risk', value: `₹${(s.totalValueAtRisk || 0).toLocaleString()}` }, { label: 'Expired', value: s.expired }, { label: 'Critical', value: s.critical });
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {items.map((item) => (
          <div key={item.label} className="card p-4 text-center">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderTable = () => {
    const rows = data?.report;
    if (!rows || rows.length === 0) return <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</p>;

    const columns = Object.keys(rows[0]).filter(k => k !== '_id' && k !== '__v');
    return (
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>{columns.map((col) => <th key={col}>{col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row, i) => (
              <tr key={i}>
                {columns.map((col) => {
                  let val = row[col];
                  if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val) && col.toLowerCase().includes('date'))) {
                    val = new Date(val).toLocaleDateString('en-IN');
                  }
                  if (typeof val === 'number' && (col.toLowerCase().includes('price') || col.toLowerCase().includes('value') || col.toLowerCase().includes('total') || col.toLowerCase().includes('revenue') || col.toLowerCase().includes('refund') || col.toLowerCase().includes('discount') || col.toLowerCase().includes('tax') || col.toLowerCase().includes('subtotal'))) {
                    val = `₹${val.toLocaleString()}`;
                  }
                  return <td key={col} style={{ color: 'var(--text-secondary)' }}>{String(val ?? '-')}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 50 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Showing 50 of {rows.length} rows. Download CSV for full data.</p>}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageHeader title="Reports" subtitle="Generate and export inventory reports">
        <button onClick={handleDownloadCSV} disabled={downloading || isLoading || !data?.report?.length} className="btn btn-primary">
          <Download className="w-4 h-4" /> {downloading ? 'Downloading...' : 'Download CSV'}
        </button>
      </PageHeader>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {reportTypes.map((r) => (
          <motion.div
            key={r.key}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card p-5 cursor-pointer transition-all hover:shadow-md ${activeReport === r.key ? 'ring-2' : ''}`}
            style={{ borderLeft: `4px solid ${r.color}`, ...(activeReport === r.key ? { boxShadow: `0 0 0 2px ${r.color}40` } : {}) }}
            onClick={() => setActiveReport(r.key)}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${r.color}15` }}>
                <r.icon className="w-5 h-5" style={{ color: r.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          {(activeReport === 'sales' || activeReport === 'purchase') && (
            <>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input" />
              </div>
            </>
          )}
          {activeReport === 'expiry' && (
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Expiring Within</label>
              <select value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} className="form-input">
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
          )}
          {activeReport === 'stock' && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Showing current inventory snapshot</p>
          )}
        </div>
      </div>

      {/* Summary */}
      {!isLoading && renderSummary()}

      {/* Data Table */}
      {isLoading ? (
        <div className="card p-5"><LoadingSkeleton rows={10} columns={6} /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
          {renderTable()}
        </motion.div>
      )}
    </DashboardLayout>
  );
}
