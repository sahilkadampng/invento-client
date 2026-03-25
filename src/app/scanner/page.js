'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, Keyboard, Package, Plus, Minus, RotateCcw, Check, X,
    Scan, Loader2, Volume2, VolumeX, Vibrate, Clock, AlertTriangle,
    ShieldAlert, Wifi, WifiOff, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';

// ── Audio Helper ──────────────────────────────────────────
const playBeep = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {
        // AudioContext not available
    }
};

const triggerVibration = () => {
    try {
        if (navigator.vibrate) navigator.vibrate(200);
    } catch {
        // Vibration API not available
    }
};

// ── Debounce cooldown (ms) ────────────────────────────────
const SCAN_COOLDOWN = 2500;

const normalizeBarcode = (value) => String(value || '').trim();

export default function ScannerPage() {
    const [mode, setMode] = useState('camera');
    const [barcode, setBarcode] = useState('');
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanHistory, setScanHistory] = useState([]);
    const [cameraError, setCameraError] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [scanFlash, setScanFlash] = useState(false);
    const [showHistory, setShowHistory] = useState(true);
    const [action, setAction] = useState('in');
    const [quantity, setQuantity] = useState(1);
    const [categories, setCategories] = useState([]);
    const [savingDetails, setSavingDetails] = useState(false);
    const [needsDetails, setNeedsDetails] = useState(false);
    const [detailsForm, setDetailsForm] = useState({
        name: '',
        category: '',
        purchasePrice: '',
        sellingPrice: '',
    });

    const inputRef = useRef(null);
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const lastScanTimeRef = useRef(0);
    const isProcessingRef = useRef(false);

    const stopAndClearScanner = useCallback(async () => {
        const scanner = html5QrCodeRef.current;
        if (!scanner) return;

        // Prevent concurrent teardown calls from acting on stale scanner instances.
        html5QrCodeRef.current = null;

        try {
            await scanner.stop();
        } catch {
            // Ignore stop errors (already stopped/not started).
        }

        try {
            await scanner.clear();
        } catch {
            // Ignore clear errors during rapid mode switches.
        }

        setIsCameraActive(false);
    }, []);

    const shouldPromptDetails = (p) => {
        if (!p) return false;
        const hasDefaultName = !p.name || p.name.trim().toLowerCase() === 'new product';
        const hasZeroPrice = Number(p.purchasePrice ?? 0) <= 0 || Number(p.sellingPrice ?? 0) <= 0;
        const uncategorized = p.category?.name?.toLowerCase() === 'uncategorized';
        return hasDefaultName || hasZeroPrice || uncategorized;
    };

    const preloadDetailsForm = (p) => {
        setDetailsForm({
            name: p?.name || '',
            category: p?.category?._id || '',
            purchasePrice: p?.purchasePrice ?? '',
            sellingPrice: p?.sellingPrice ?? '',
        });
    };

    useEffect(() => {
        let mounted = true;

        const loadCategories = async () => {
            try {
                const { data } = await api.get('/categories');
                if (mounted) {
                    setCategories(data?.data?.categories || []);
                }
            } catch {
                // Category list is optional for scanner flow.
            }
        };

        loadCategories();
        return () => {
            mounted = false;
        };
    }, []);

    // ── POST /api/scan ────────────────────────────────────
    const processScan = useCallback(async (code) => {
        const normalizedCode = normalizeBarcode(code);
        if (!normalizedCode || normalizedCode.length < 4) {
            toast.error('Invalid barcode (too short)');
            return;
        }
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setLoading(true);

        try {
            const { data } = await api.post('/scan', { barcode: normalizedCode });
            const p = data.data.product;

            setProduct(p);
            setNeedsDetails(shouldPromptDetails(p));
            preloadDetailsForm(p);
            setScanHistory(prev => [
                {
                    id: Date.now(),
                    barcode: normalizedCode,
                    productName: p.name,
                    stockQty: p.stockQty,
                    isNew: data.data.isNew,
                    timestamp: new Date(),
                },
                ...prev.slice(0, 49), // keep last 50
            ]);

            // Feedback
            if (soundEnabled) playBeep();
            triggerVibration();
            setScanFlash(true);
            setTimeout(() => setScanFlash(false), 600);

            toast.success(
                data.data.isNew
                    ? `New product created — ${code}`
                    : `${p.name} — Stock: ${p.stockQty}`,
                { icon: '📦' }
            );
        } catch (err) {
            const msg = err.response?.data?.message || 'Scan failed — check your connection';
            toast.error(msg, { icon: '❌' });
        } finally {
            setLoading(false);
            isProcessingRef.current = false;
        }
    }, [soundEnabled]);

    // ── Camera scanner lifecycle ──────────────────────────
    useEffect(() => {
        if (mode !== 'camera') return;

        let mounted = true;

        const startScanner = async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');

                if (!mounted) return;

                await stopAndClearScanner();
                if (!mounted) return;

                const scanner = new Html5Qrcode('scanner-viewport', { verbose: false });
                html5QrCodeRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        disableFlip: false,
                    },
                    (decodedText) => {
                        const now = Date.now();
                        if (now - lastScanTimeRef.current < SCAN_COOLDOWN) return;
                        lastScanTimeRef.current = now;
                        processScan(decodedText);
                    },
                    () => { } // ignore errors (no barcode in frame)
                );

                if (mounted) {
                    setIsCameraActive(true);
                    setCameraError(null);
                }
            } catch (err) {
                if (!mounted) return;
                const msg = err?.message || String(err);
                if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
                    setCameraError('PERMISSION_DENIED');
                } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
                    setCameraError('NO_CAMERA');
                } else {
                    setCameraError('UNKNOWN');
                }
                setIsCameraActive(false);
            }
        };

        startScanner();

        return () => {
            mounted = false;
            stopAndClearScanner();
        };
    }, [mode, processScan, stopAndClearScanner]);

    // ── Keyboard auto-focus ───────────────────────────────
    useEffect(() => {
        if (mode === 'keyboard' && inputRef.current) inputRef.current.focus();
    }, [mode, product]);

    // ── Keyboard lookup (uses /api/scan too) ──────────────
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            processScan(barcode);
            setBarcode('');
        }
    };

    // ── Stock action (in/out/adjust) ──────────────────────
    const handleStockAction = async () => {
        if (!product || quantity < 1) return;
        try {
            await api.post('/inventory/log', {
                product: product._id,
                type: action,
                quantity,
            });
            toast.success(`Stock ${action === 'in' ? 'added' : action === 'out' ? 'removed' : 'adjusted'}`);
            // Re-fetch product
            const { data } = await api.get(`/products/barcode/${product.barcode}`);
            setProduct(data.data.product);
            setQuantity(1);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleSaveDetails = async () => {
        if (!product?._id) return;
        if (!detailsForm.name.trim()) {
            toast.error('Product name is required');
            return;
        }
        if (!detailsForm.category) {
            toast.error('Category is required');
            return;
        }

        const purchasePrice = Number(detailsForm.purchasePrice);
        const sellingPrice = Number(detailsForm.sellingPrice);

        if (Number.isNaN(purchasePrice) || purchasePrice < 0 || Number.isNaN(sellingPrice) || sellingPrice < 0) {
            toast.error('Enter valid prices (0 or higher)');
            return;
        }

        setSavingDetails(true);
        try {
            const { data } = await api.put(`/scan/product/${product._id}`, {
                name: detailsForm.name.trim(),
                category: detailsForm.category,
                purchasePrice,
                sellingPrice,
            });

            const updated = data?.data?.product;
            if (updated) {
                setProduct(updated);
                preloadDetailsForm(updated);
                setNeedsDetails(shouldPromptDetails(updated));
            } else {
                setNeedsDetails(false);
            }

            toast.success('Product details saved');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save product details');
        } finally {
            setSavingDetails(false);
        }
    };

    const reset = () => {
        setProduct(null);
        setBarcode('');
        setQuantity(1);
        setNeedsDetails(false);
        setDetailsForm({ name: '', category: '', purchasePrice: '', sellingPrice: '' });
        if (inputRef.current) inputRef.current.focus();
    };

    // ── Camera error UI ───────────────────────────────────
    const renderCameraError = () => {
        const errors = {
            PERMISSION_DENIED: {
                icon: <ShieldAlert className="w-10 h-10" />,
                title: 'Camera Permission Denied',
                desc: 'Allow camera access in your browser settings, then reload the page.',
            },
            NO_CAMERA: {
                icon: <Camera className="w-10 h-10" />,
                title: 'No Camera Found',
                desc: 'Connect a camera or use keyboard mode.',
            },
            UNKNOWN: {
                icon: <AlertTriangle className="w-10 h-10" />,
                title: 'Camera Error',
                desc: 'Could not start camera. Try reloading or use keyboard mode.',
            },
        };
        const e = errors[cameraError] || errors.UNKNOWN;
        return (
            <div className="scanner-error-state">
                <div className="scanner-error-icon">{e.icon}</div>
                <h4>{e.title}</h4>
                <p>{e.desc}</p>
                <button onClick={() => setMode('keyboard')} className="btn btn-secondary btn-sm mt-4">
                    <Keyboard className="w-4 h-4" /> Switch to Keyboard
                </button>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <PageHeader title="Barcode Scanner" subtitle="Scan products to view details and update stock">
                <div className="flex gap-2">
                    <button onClick={() => setMode('keyboard')} className={`btn btn-sm ${mode === 'keyboard' ? 'btn-primary' : 'btn-secondary'}`}>
                        <Keyboard className="w-4 h-4" /> Keyboard
                    </button>
                    <button onClick={() => setMode('camera')} className={`btn btn-sm ${mode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}>
                        <Camera className="w-4 h-4" /> Camera
                    </button>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="btn btn-sm btn-ghost" title={soundEnabled ? 'Mute' : 'Unmute'}>
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Scanner Panel ─────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                            <Scan className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {mode === 'keyboard' ? 'Manual / USB Scanner' : 'Camera Scanner'}
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {mode === 'keyboard' ? 'Type or scan a barcode number' : isCameraActive ? 'Point camera at barcode' : 'Starting camera…'}
                            </p>
                        </div>
                        {loading && <Loader2 className="w-5 h-5 animate-spin ml-auto" style={{ color: 'var(--accent)' }} />}
                    </div>

                    {/* ── Camera Mode ── */}
                    {mode === 'camera' && (
                        <div className={`scanner-viewport-wrapper ${scanFlash ? 'scan-flash' : ''}`}>
                            {cameraError ? renderCameraError() : (
                                <>
                                    <div id="scanner-viewport" ref={scannerRef} className="scanner-viewport" />
                                    {/* Corner bracket overlay */}
                                    <div className="scanner-overlay">
                                        <div className="scanner-bracket tl" />
                                        <div className="scanner-bracket tr" />
                                        <div className="scanner-bracket bl" />
                                        <div className="scanner-bracket br" />
                                        <div className="scanner-line" />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Keyboard Mode ── */}
                    {mode === 'keyboard' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Enter or scan barcode…"
                                    className="form-input text-lg py-4 text-center font-mono tracking-widest"
                                    autoFocus
                                />
                            </div>
                            <button onClick={() => { processScan(barcode); setBarcode(''); }} disabled={loading || !barcode} className="btn btn-primary w-full justify-center btn-lg">
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Zap className="w-4 h-4" /> Scan & Add Stock</>}
                            </button>
                        </div>
                    )}

                    {/* ── Quick tips ── */}
                    <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                        <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>How it works</p>
                        <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                            <li>• Scan any barcode — product is auto-created if new</li>
                            <li>• Each scan adds +1 to stock quantity</li>
                            <li>• 2.5s cooldown between scans to prevent duplicates</li>
                            <li>• Sound + vibration on successful scan</li>
                        </ul>
                    </div>
                </motion.div>

                {/* ── Right Column: Product Detail + History ───── */}
                <div className="space-y-6">
                    {/* Product Details */}
                    <AnimatePresence mode="wait">
                        {product ? (
                            <motion.div key="product" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card p-6">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-(--accent-light) flex items-center justify-center">
                                            <Package className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{product.name}</h3>
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>SKU: {product.sku}</p>
                                        </div>
                                    </div>
                                    <button onClick={reset} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Barcode</p>
                                        <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{product.barcode}</p>
                                    </div>
                                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Category</p>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{product.category?.name || '—'}</p>
                                    </div>
                                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current Stock</p>
                                        <p className={`text-xl font-bold ${product.stockQty <= (product.reorderLevel || 10) ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {product.stockQty}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Selling Price</p>
                                        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{product.sellingPrice?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>

                                {/* Stock Operations */}
                                <div className="border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
                                    {needsDetails && (
                                        <div className="mb-5 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                                            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                                                Complete Product Details
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Product name"
                                                    value={detailsForm.name}
                                                    onChange={(e) => setDetailsForm((prev) => ({ ...prev, name: e.target.value }))}
                                                />
                                                <select
                                                    className="form-input"
                                                    value={detailsForm.category}
                                                    onChange={(e) => setDetailsForm((prev) => ({ ...prev, category: e.target.value }))}
                                                >
                                                    <option value="">Select category</option>
                                                    {categories.map((cat) => (
                                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="form-input"
                                                    placeholder="Purchase price"
                                                    value={detailsForm.purchasePrice}
                                                    onChange={(e) => setDetailsForm((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="form-input"
                                                    placeholder="Selling price"
                                                    value={detailsForm.sellingPrice}
                                                    onChange={(e) => setDetailsForm((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                                                />
                                            </div>
                                            <button
                                                onClick={handleSaveDetails}
                                                disabled={savingDetails}
                                                className="btn btn-primary w-full justify-center"
                                            >
                                                {savingDetails ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Details'}
                                            </button>
                                        </div>
                                    )}

                                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Quick Stock Update</h4>
                                    <div className="flex gap-2 mb-4">
                                        {[{ val: 'in', label: 'Stock In', cls: 'btn-success' }, { val: 'out', label: 'Stock Out', cls: 'btn-danger' }, { val: 'adjust', label: 'Adjust', cls: 'btn-secondary' }].map((a) => (
                                            <button key={a.val} onClick={() => setAction(a.val)} className={`btn btn-sm flex-1 justify-center ${action === a.val ? a.cls : 'btn-ghost'}`}>
                                                {a.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="btn btn-secondary btn-sm"><Minus className="w-4 h-4" /></button>
                                        <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="form-input text-center w-20 text-lg font-bold" min="1" />
                                        <button onClick={() => setQuantity(quantity + 1)} className="btn btn-secondary btn-sm"><Plus className="w-4 h-4" /></button>
                                    </div>
                                    <button onClick={handleStockAction} className="btn btn-primary w-full justify-center">
                                        <Check className="w-4 h-4" /> Confirm {action === 'in' ? 'Stock In' : action === 'out' ? 'Stock Out' : 'Adjustment'}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 flex items-center justify-center min-h-50">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-(--bg-tertiary) flex items-center justify-center mx-auto mb-4">
                                        <Package className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                    <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No product scanned</p>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Scan a barcode to view product details</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Scan History ───────────────────────────── */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="w-full flex items-center justify-between p-4 text-left"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-sm font-semibold">Scan History</span>
                                <span className="badge badge-default text-xs">{scanHistory.length}</span>
                            </div>
                            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <AnimatePresence>
                            {showHistory && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 max-h-80 overflow-y-auto space-y-2">
                                        {scanHistory.length === 0 ? (
                                            <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
                                                No scans yet — start scanning!
                                            </p>
                                        ) : (
                                            scanHistory.map((item, i) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: -8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    className="flex items-center justify-between p-3 rounded-lg"
                                                    style={{ background: 'var(--bg-tertiary)' }}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${item.isNew ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                                {item.productName}
                                                            </p>
                                                            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                                                {item.barcode}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-3">
                                                        <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                                                            Qty: {item.stockQty}
                                                        </p>
                                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {item.timestamp.toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}
