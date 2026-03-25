'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Package, AlertTriangle, Warehouse, User, Phone } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import api from '@/services/api';

const currency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

export default function ProductDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params?.id;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['product', productId],
        queryFn: async () => {
            const res = await api.get(`/products/${productId}`);
            return res.data.data.product;
        },
        enabled: Boolean(productId),
        retry: 1,
        onError: (err) => {
            const message = err.response?.data?.message || 'Failed to load product';
            toast.error(message);
        },
    });

    const product = data;

    const stockBadge = useMemo(() => {
        if (!product) return { label: '-', tone: 'badge-default' };
        if (product.stockQty <= (product.reorderLevel || 0)) return { label: 'Low', tone: 'badge-danger' };
        if (product.stockQty <= (product.reorderLevel || 0) * 2) return { label: 'Watch', tone: 'badge-warning' };
        return { label: 'Healthy', tone: 'badge-success' };
    }, [product]);

    return (
        <DashboardLayout>
            <PageHeader
                title={product ? product.name : 'Product Details'}
                subtitle={product ? `SKU ${product.sku}` : 'Loading product...'}
            >
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => router.push('/products')}>
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button className="btn btn-ghost" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </PageHeader>

            {isLoading ? (
                <div className="card p-5">
                    <LoadingSkeleton rows={8} columns={4} />
                </div>
            ) : isError || !product ? (
                <div className="card p-5 text-center" style={{ color: 'var(--text-muted)' }}>
                    <p className="mb-2">Product not found or unavailable.</p>
                    <button className="btn btn-primary" onClick={() => router.push('/products')}>Return to list</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="card xl:col-span-2 p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-(--accent-light) flex items-center justify-center">
                                <Package className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Barcode: {product.barcode}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoTile label="SKU" value={product.sku} />
                            <InfoTile label="Category" value={product.category?.name || '-'} />
                            <InfoTile label="Brand" value={product.brand?.name || '-'} />
                            <InfoTile label="Supplier" value={product.supplier?.name || '-'} />
                            <InfoTile label="Purchase Price" value={currency(product.purchasePrice)} />
                            <InfoTile label="Selling Price" value={currency(product.sellingPrice)} />
                            <InfoTile label="Stock Quantity" value={product.stockQty} />
                            <InfoTile label="Reorder Level" value={product.reorderLevel} />
                            <InfoTile label="Status" value={<span className={`badge ${stockBadge.tone}`}>{stockBadge.label}</span>} />
                            <InfoTile label="Expiry Date" value={product.expiryDate || '-'} />
                            <InfoTile label="Warehouse" value={product.warehouse?.name || '-'} />
                            <InfoTile label="Location" value={formatLocation(product.warehouseLocation)} />
                        </div>

                        {product.description && (
                            <div className="mt-5">
                                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Description</p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
                            </div>
                        )}
                    </div>

                    <div className="card p-5 space-y-4">
                        <SectionTitle icon={<AlertTriangle className="w-4 h-4" />} title="Inventory" />
                        <InfoRow label="Current Stock" value={product.stockQty} />
                        <InfoRow label="Reorder Level" value={product.reorderLevel} />
                        <InfoRow label="Status" value={<span className={`badge ${stockBadge.tone}`}>{stockBadge.label}</span>} />

                        <SectionTitle icon={<User className="w-4 h-4" />} title="Supplier" />
                        <InfoRow label="Name" value={product.supplier?.name || '-'} />
                        <InfoRow label="Contact" value={product.supplier?.contactPerson || '-'} />
                        <InfoRow label="Phone" value={product.supplier?.phone || '-'} />
                        <InfoRow label="Email" value={product.supplier?.email || '-'} />

                        <SectionTitle icon={<Warehouse className="w-4 h-4" />} title="Warehouse" />
                        <InfoRow label="Name" value={product.warehouse?.name || '-'} />
                        <InfoRow label="Code" value={product.warehouse?.code || '-'} />
                        <InfoRow label="Address" value={product.warehouse?.address || '-'} />
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function InfoTile({ label, value }) {
    return (
        <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{value || '-'}</div>
        </div>
    );
}

function SectionTitle({ icon, title }) {
    return (
        <div className="flex items-center gap-2 pt-3">
            {icon}
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{label}</span>
            <span style={{ color: 'var(--text-primary)' }}>{value || '-'}</span>
        </div>
    );
}

function formatLocation(loc) {
    if (!loc) return '-';
    const parts = [loc.zone, loc.rack, loc.shelf].filter(Boolean);
    return parts.length ? parts.join(' / ') : '-';
}
