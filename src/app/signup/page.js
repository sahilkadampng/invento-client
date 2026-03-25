'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useAuthStore from '@/store/authStore';
import useThemeStore from '@/store/themeStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Boxes, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    const { setAuth, isAuthenticated, loadFromStorage } = useAuthStore();
    const { loadTheme } = useThemeStore();
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'warehouse_staff', warehouseId: '' });
    const [warehouses, setWarehouses] = useState([]);
    const [warehousesLoading, setWarehousesLoading] = useState(true);
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadFromStorage(); loadTheme(); }, []);
    useEffect(() => { if (isAuthenticated) router.push('/dashboard'); }, [isAuthenticated]);

    useEffect(() => {
        let mounted = true;

        const loadSignupMeta = async () => {
            try {
                const { data } = await api.get('/auth/signup-meta');
                const list = data?.data?.warehouses || [];
                if (!mounted) return;
                setWarehouses(list);
                if (list.length > 0) {
                    setForm((prev) => ({ ...prev, warehouseId: prev.warehouseId || list[0]._id }));
                }
            } catch {
                if (!mounted) return;
                toast.error('Could not load warehouses for signup');
            } finally {
                if (mounted) setWarehousesLoading(false);
            }
        };

        loadSignupMeta();
        return () => {
            mounted = false;
        };
    }, []);

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) return toast.error('Please fill all fields');
        if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
        if (!form.warehouseId) return toast.error('Please select a warehouse');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/signup', form);
            setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
            toast.success('Account created!');
            router.push('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
            {/* Left — Brand */}
            {/* <div className="hidden lg:flex flex-1 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="relative z-10 max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
            <Boxes className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Join Invento</h1>
          <p className="text-xl text-white/80 mb-6">Start managing your warehouse today</p>
          <p className="text-white/60 leading-relaxed">
            Create an account to access all features including real-time stock tracking, barcode scanning, analytics, and more.
          </p>
        </motion.div>
      </div> */}

            {/* Right — Signup Form */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <Boxes className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Invento</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Create Account</h2>
                    <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Fill in your details to get started</p>

                    <form onSubmit={handleSignup} className="space-y-5">
                        <div>
                            <label className="form-label">Full Name</label>
                            <div className="relative">
                                {/* <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /> */}
                                <input suppressHydrationWarning type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="" className="form-input pl-10" autoFocus />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Email</label>
                            <div className="relative">
                                {/* <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /> */}
                                <input suppressHydrationWarning type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="" className="form-input pl-10" />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Password</label>
                            <div className="relative">
                                {/* <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /> */}
                                <input suppressHydrationWarning type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" className="form-input pl-10 pr-10" />
                                <button suppressHydrationWarning type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Role</label>
                            <select suppressHydrationWarning value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="form-input">
                                <option value="warehouse_staff">Warehouse Staff</option>
                                <option value="billing_staff">Billing Staff</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Warehouse</label>
                            <select
                                suppressHydrationWarning
                                value={form.warehouseId}
                                onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                                className="form-input"
                                disabled={warehousesLoading || warehouses.length === 0}
                            >
                                {warehousesLoading && <option value="">Loading warehouses...</option>}
                                {!warehousesLoading && warehouses.length === 0 && <option value="">No active warehouses found</option>}
                                {!warehousesLoading && warehouses.map((w) => (
                                    <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                                ))}
                            </select>
                        </div>

                        <button suppressHydrationWarning type="submit" disabled={loading} className="btn btn-primary w-full justify-center btn-lg">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>

                    <p className="text-sm text-center mt-6" style={{ color: 'var(--text-muted)' }}>
                        Already have an account?{' '}
                        <button suppressHydrationWarning onClick={() => router.push('/login')} className="font-medium" style={{ color: 'var(--accent)' }}>Sign in</button>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
