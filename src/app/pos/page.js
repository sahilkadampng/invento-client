'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import usePosCartStore from '@/store/posCartStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Keyboard, ShoppingCart, Trash2, Plus, Minus, Receipt,
  Scan, Loader2, Volume2, VolumeX, CreditCard, Banknote, Smartphone,
  X, Download, CheckCircle2, AlertTriangle, ShieldAlert, Package,
  Search,
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
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    // Second tone for "cash register" feel
    setTimeout(() => {
      try {
        const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1600, ctx2.currentTime);
        gain2.gain.setValueAtTime(0.2, ctx2.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.15);
        osc2.start(ctx2.currentTime);
        osc2.stop(ctx2.currentTime + 0.15);
      } catch {}
    }, 100);
  } catch {}
};

const triggerVibration = () => {
  try { if (navigator.vibrate) navigator.vibrate([100, 50, 100]); } catch {}
};

const SCAN_COOLDOWN = 2000;

export default function PosPage() {
  const {
    items, paymentMethod,
    addItem, removeItem, updateQuantity, setDiscount,
    setPaymentMethod, clearCart,
    getSubtotal, getDiscountTotal, getGstTotal, getGrandTotal,
  } = usePosCartStore();

  const [mode, setMode] = useState('camera');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanFlash, setScanFlash] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const inputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // ── Stop camera scanner ────────────────────────────────
  const stopAndClearScanner = useCallback(async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;
    html5QrCodeRef.current = null;
    try { await scanner.stop(); } catch {}
    try { await scanner.clear(); } catch {}
    setIsCameraActive(false);
  }, []);

  // ── Scan barcode → lookup product → add to cart ─────────
  const processScan = useCallback(async (code) => {
    if (!code || code.length < 4) {
      toast.error('Invalid barcode (too short)');
      return;
    }
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);

    try {
      const { data } = await api.post('/pos/scan', { barcode: code });
      const p = data.data.product;

      addItem(p);

      if (soundEnabled) playBeep();
      triggerVibration();
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 600);

      toast.success(`${p.name} added to cart`, { icon: '🛒' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Scan failed';
      if (err.response?.status === 400 && msg.includes('Out of stock')) {
        toast.error(`Out of Stock — ${err.response?.data?.data?.product?.name || code}`, { icon: '🚫' });
      } else {
        toast.error(msg, { icon: '❌' });
      }
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [soundEnabled, addItem]);

  // ── Camera scanner lifecycle ───────────────────────────
  useEffect(() => {
    if (mode !== 'camera') return;
    let mounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;
        await stopAndClearScanner();
        if (!mounted) return;

        const scanner = new Html5Qrcode('pos-scanner-viewport', { verbose: false });
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false },
          (decodedText) => {
            const now = Date.now();
            if (now - lastScanTimeRef.current < SCAN_COOLDOWN) return;
            lastScanTimeRef.current = now;
            processScan(decodedText);
          },
          () => {}
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
    return () => { mounted = false; stopAndClearScanner(); };
  }, [mode, processScan, stopAndClearScanner]);

  useEffect(() => {
    if (mode === 'keyboard' && inputRef.current) inputRef.current.focus();
  }, [mode]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') { processScan(barcode); setBarcode(''); }
  };

  // ── Generate Invoice ───────────────────────────────────
  const handleGenerateInvoice = async () => {
    if (items.length === 0) { toast.error('Cart is empty'); return; }
    setInvoiceLoading(true);
    try {
      const { data } = await api.post('/pos/invoice', {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        paymentMethod,
      });
      setInvoiceResult(data.data.invoice);
      clearCart();
      toast.success(`Invoice ${data.data.invoice.invoiceNumber} created!`, { icon: '🧾' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  // ── Download PDF ───────────────────────────────────────
  const handleDownloadPdf = async (invoiceId) => {
    setPdfLoading(true);
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Camera error UI ────────────────────────────────────
  const renderCameraError = () => {
    const errors = {
      PERMISSION_DENIED: { icon: <ShieldAlert className="w-10 h-10" />, title: 'Camera Permission Denied', desc: 'Allow camera access in browser settings, then reload.' },
      NO_CAMERA: { icon: <Camera className="w-10 h-10" />, title: 'No Camera Found', desc: 'Connect a camera or use keyboard mode.' },
      UNKNOWN: { icon: <AlertTriangle className="w-10 h-10" />, title: 'Camera Error', desc: 'Could not start camera. Try reloading.' },
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

  const formatCurrency = (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DashboardLayout>
      {/* ── Header ───────────────────────────────────────── */}
      <div className="pos-header">
        <div className="pos-header-left">
          <div className="pos-header-icon">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="pos-title">Point of Sale</h1>
            <p className="pos-subtitle">Scan products to build cart & generate invoice</p>
          </div>
        </div>
        <div className="pos-header-actions">
          <button onClick={() => setMode('camera')} className={`btn btn-sm ${mode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}>
            <Camera className="w-4 h-4" /> Camera
          </button>
          <button onClick={() => setMode('keyboard')} className={`btn btn-sm ${mode === 'keyboard' ? 'btn-primary' : 'btn-secondary'}`}>
            <Keyboard className="w-4 h-4" /> Manual
          </button>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="btn btn-sm btn-ghost" title={soundEnabled ? 'Mute' : 'Unmute'}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="pos-layout">
        {/* ════════════════════════════════════════════════ */}
        {/* LEFT PANEL — Scanner                            */}
        {/* ════════════════════════════════════════════════ */}
        <div className="pos-scanner-panel">
          <div className="card pos-scanner-card">
            <div className="pos-scanner-header">
              <Scan className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <span>{mode === 'camera' ? 'Camera Scanner' : 'Manual Entry'}</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin ml-auto" style={{ color: 'var(--accent)' }} />}
            </div>

            {mode === 'camera' && (
              <div className={`scanner-viewport-wrapper ${scanFlash ? 'scan-flash' : ''}`}>
                {cameraError ? renderCameraError() : (
                  <>
                    <div id="pos-scanner-viewport" className="scanner-viewport" />
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

            {mode === 'keyboard' && (
              <div className="pos-keyboard-input">
                <div className="pos-search-wrap">
                  <Search className="w-5 h-5 pos-search-icon" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter barcode…"
                    className="form-input pos-barcode-input"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => { processScan(barcode); setBarcode(''); }}
                  disabled={loading || !barcode}
                  className="btn btn-primary w-full justify-center"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Looking up…</> : <><Scan className="w-4 h-4" /> Add to Cart</>}
                </button>
              </div>
            )}

            <div className="pos-scanner-tips">
              <p className="pos-tips-title">Quick Tips</p>
              <ul>
                <li>• Point camera at barcode for auto-scan</li>
                <li>• 2s cooldown prevents duplicates</li>
                <li>• Same barcode = quantity increments</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* RIGHT PANEL — Cart + Summary                    */}
        {/* ════════════════════════════════════════════════ */}
        <div className="pos-cart-panel">
          {/* Cart Header */}
          <div className="card pos-cart-card">
            <div className="pos-cart-header">
              <div className="pos-cart-header-left">
                <ShoppingCart className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <span>Cart</span>
                {itemCount > 0 && <span className="pos-cart-badge">{itemCount}</span>}
              </div>
              {items.length > 0 && (
                <button onClick={clearCart} className="btn btn-ghost btn-sm pos-clear-btn">
                  <Trash2 className="w-4 h-4" /> Clear
                </button>
              )}
            </div>

            {/* Cart Items */}
            {items.length === 0 ? (
              <div className="pos-empty-cart">
                <div className="pos-empty-cart-icon">
                  <Package className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="pos-empty-cart-title">Cart is empty</p>
                <p className="pos-empty-cart-desc">Scan barcodes to add products</p>
              </div>
            ) : (
              <div className="pos-cart-items">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.productId}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="pos-cart-item"
                    >
                      <div className="pos-cart-item-top">
                        <div className="pos-cart-item-info">
                          <p className="pos-cart-item-name">{item.name}</p>
                          <p className="pos-cart-item-meta">
                            {formatCurrency(item.price)} × {item.quantity}
                            {item.gst > 0 && <span className="pos-gst-badge">GST {item.gst}%</span>}
                          </p>
                        </div>
                        <div className="pos-cart-item-total">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>

                      <div className="pos-cart-item-controls">
                        <div className="pos-qty-controls">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="pos-qty-btn" disabled={item.quantity <= 1}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="pos-qty-input"
                            min="1"
                            max={item.stock}
                          />
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="pos-qty-btn" disabled={item.quantity >= item.stock}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="pos-discount-wrap">
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => setDiscount(item.productId, parseFloat(e.target.value) || 0)}
                            className="pos-discount-input"
                            placeholder="0"
                            min="0"
                            max="100"
                          />
                          <span className="pos-discount-label">% off</span>
                        </div>
                        <button onClick={() => removeItem(item.productId)} className="pos-remove-btn" title="Remove item">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Billing Summary ─────────────────────────── */}
          {items.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card pos-summary-card">
              <div className="pos-summary-rows">
                <div className="pos-summary-row">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>{formatCurrency(getSubtotal())}</span>
                </div>
                {getDiscountTotal() > 0 && (
                  <div className="pos-summary-row pos-summary-discount">
                    <span>Discount</span>
                    <span>- {formatCurrency(getDiscountTotal())}</span>
                  </div>
                )}
                <div className="pos-summary-row">
                  <span>GST</span>
                  <span>+ {formatCurrency(getGstTotal())}</span>
                </div>
                <div className="pos-summary-divider" />
                <div className="pos-summary-row pos-summary-total">
                  <span>Grand Total</span>
                  <span>{formatCurrency(getGrandTotal())}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="pos-payment-method">
                <p className="pos-payment-label">Payment Method</p>
                <div className="pos-payment-options">
                  {[
                    { val: 'cash', icon: <Banknote className="w-4 h-4" />, label: 'Cash' },
                    { val: 'upi', icon: <Smartphone className="w-4 h-4" />, label: 'UPI' },
                    { val: 'card', icon: <CreditCard className="w-4 h-4" />, label: 'Card' },
                  ].map((pm) => (
                    <button
                      key={pm.val}
                      onClick={() => setPaymentMethod(pm.val)}
                      className={`pos-payment-btn ${paymentMethod === pm.val ? 'active' : ''}`}
                    >
                      {pm.icon} {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateInvoice}
                disabled={invoiceLoading}
                className="btn pos-invoice-btn"
              >
                {invoiceLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Creating Invoice…</>
                ) : (
                  <><Receipt className="w-5 h-5" /> Generate Invoice — {formatCurrency(getGrandTotal())}</>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* INVOICE MODAL                                       */}
      {/* ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {invoiceResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pos-modal-overlay"
            onClick={() => setInvoiceResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="pos-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pos-modal-header">
                <div className="pos-modal-success-icon">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2>Invoice Created!</h2>
                <p className="pos-modal-inv-number">{invoiceResult.invoiceNumber}</p>
              </div>

              <div className="pos-modal-body">
                <table className="pos-invoice-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>GST</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceResult.items?.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{item.tax}%</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pos-invoice-totals">
                  <div className="pos-invoice-total-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(invoiceResult.subtotal)}</span>
                  </div>
                  {invoiceResult.discountAmount > 0 && (
                    <div className="pos-invoice-total-row">
                      <span>Discount</span>
                      <span>- {formatCurrency(invoiceResult.discountAmount)}</span>
                    </div>
                  )}
                  <div className="pos-invoice-total-row">
                    <span>GST</span>
                    <span>+ {formatCurrency(invoiceResult.taxAmount)}</span>
                  </div>
                  <div className="pos-invoice-total-row pos-invoice-grand">
                    <span>Total</span>
                    <span>{formatCurrency(invoiceResult.totalAmount)}</span>
                  </div>
                </div>

                <div className="pos-invoice-meta">
                  <span>Payment: {invoiceResult.paymentMethod?.toUpperCase()}</span>
                  <span>Status: PAID</span>
                </div>
              </div>

              <div className="pos-modal-actions">
                <button
                  onClick={() => handleDownloadPdf(invoiceResult._id)}
                  disabled={pdfLoading}
                  className="btn btn-primary pos-modal-btn"
                >
                  {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download PDF
                </button>
                <button onClick={() => setInvoiceResult(null)} className="btn btn-secondary pos-modal-btn">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
