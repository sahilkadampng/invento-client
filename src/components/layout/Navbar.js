'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '@/store/authStore';
import useThemeStore from '@/store/themeStore';
import useSidebarStore from '@/store/sidebarStore';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import {
  Menu, Search, Bell, Sun, Moon, LogOut, User, ChevronDown, Settings, X
} from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { toggleMobile, isCollapsed } = useSidebarStore();
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch unread notification count
  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications?unreadOnly=true&limit=1').then((r) => r.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.data?.unreadCount || 0;

  // Search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.data);
      } catch (e) { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSearch(false); setSearchResults(null); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    api.post('/auth/logout').catch(() => { });
    logout();
    router.push('/login');
  };

  return (
    <header
      className="dashboard-navbar fixed top-0 right-0 h-16 z-30 flex items-center justify-between px-3 sm:px-4 lg:px-6 transition-all duration-300"
      style={{
        '--sidebar-offset': isCollapsed ? '72px' : '260px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={toggleMobile} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition" style={{ color: 'var(--text-secondary)' }}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative gap-2" ref={searchRef}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2.5 rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)', background: showSearch ? 'var(--bg-tertiary)' : 'transparent' }}
          >
            <Search className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-12 w-[min(92vw,24rem)] sm:w-96 card p-3 shadow-2xl gap-2"
              >
                <div className="relative">
                  {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /> */}
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search products, SKU, barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input pl-0 pr-0"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  )}
                </div>

                {searchResults && (
                  <div className="mt-3 max-h-80 overflow-y-auto">
                    {searchResults.products?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase px-2 py-1" style={{ color: 'var(--text-muted)' }}>Products</p>
                        {searchResults.products.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => { router.push(`/products/${p._id}`); setShowSearch(false); }}
                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-(--bg-tertiary) transition"
                          >
                            <div className="w-8 h-8 rounded-lg bg-(--accent-light) flex items-center justify-center text-xs font-bold" style={{ color: 'var(--accent)' }}>
                              {p.name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>SKU: {p.sku} · Stock: {p.stockQty}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.products?.length === 0 && searchResults.suppliers?.length === 0 && (
                      <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No results found</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2.5 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center pulse-glow">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <ChevronDown className="w-4 h-4 hidden sm:block" />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-12 w-56 card shadow-2xl overflow-hidden"
              >
                <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { router.push('/settings'); setShowDropdown(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-(--bg-tertiary)"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-50 text-red-600"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
