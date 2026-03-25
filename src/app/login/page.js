'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useAuthStore from '@/store/authStore';
import useThemeStore from '@/store/themeStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Boxes, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, loadFromStorage } = useAuthStore();
  const { loadTheme } = useThemeStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFromStorage();
    loadTheme();
  }, []);

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
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
          <h1 className="text-4xl font-bold text-white mb-4">Invento</h1>
          <p className="text-xl text-white/80 mb-6">Warehouse Inventory Management System</p>
          <p className="text-white/60 leading-relaxed">
            Track products, manage stock levels, handle purchase orders, create invoices, and analyze performance — all in one powerful platform.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-10">
            {['Real-time Tracking', 'Barcode Scanning', 'Smart Analytics', 'Multi-warehouse'].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-white/80 text-sm">
                <div className="w-2 h-2 rounded-full bg-white/60" />
                {feat}
              </div>
            ))}
          </div>
        </motion.div>
      </div> */}

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Invento</span>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Sign in to your account to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="form-label">Email</label>
              <div className="relative">
                {/* <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /> */}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="" className="form-input pl-10 left-4" autoFocus />
              </div>
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                {/* <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /> */}
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="" className="form-input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center btn-lg">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <button onClick={() => router.push('/signup')} className="font-medium" style={{ color: 'var(--accent)' }}>Create account</button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
