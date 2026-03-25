'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import useAuthStore from '@/store/authStore';
import useThemeStore from '@/store/themeStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { User, Moon, Sun, Shield, Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Note: Would need a profile update endpoint
      updateUser({ name, email });
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><User className="w-6 h-6 text-white" /></div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Profile</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Update your personal information</p>
            </div>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div><label className="form-label">Full Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="form-input" /></div>
            <div><label className="form-label">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" /></div>
            <div><label className="form-label">Role</label><input value={user?.role?.replace('_', ' ')} className="form-input capitalize" disabled /></div>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
            </button>
          </form>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            {theme === 'dark' ? <Moon className="w-6 h-6" style={{ color: 'var(--accent)' }} /> : <Sun className="w-6 h-6" style={{ color: 'var(--accent)' }} />}
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Customize the look and feel</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Dark Mode</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Toggle between light and dark themes</p>
              </div>
              <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Account Info</h3>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Account ID</span><span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{user?._id?.substring(0, 12)}...</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Role</span><span className="capitalize" style={{ color: 'var(--text-secondary)' }}>{user?.role?.replace('_', ' ')}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Member since</span><span style={{ color: 'var(--text-secondary)' }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A'}</span></div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
