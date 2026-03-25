'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import useThemeStore from '@/store/themeStore';
import useSidebarStore from '@/store/sidebarStore';
import api from '@/services/api';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, loadFromStorage, updateUser } = useAuthStore();
  const { loadTheme } = useThemeStore();
  const { isCollapsed } = useSidebarStore();

  useEffect(() => {
    loadFromStorage();
    loadTheme();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // If we only have warehouseId as a string in local state, hydrate full user data.
    const needsHydration = !!user && typeof user.warehouseId === 'string';
    if (!needsHydration) return;

    let mounted = true;

    const hydrateUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        const freshUser = data?.data?.user;
        if (mounted && freshUser) {
          updateUser(freshUser);
        }
      } catch {
        // Ignore profile hydration failures; auth guards will handle invalid sessions.
      }
    };

    hydrateUser();

    return () => {
      mounted = false;
    };
  }, [isLoading, isAuthenticated, user, updateUser]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="skeleton w-20 h-3" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <Navbar />
      <main
        className="pt-16 transition-all duration-300 min-h-screen"
        style={{ marginLeft: isCollapsed ? '72px' : '260px' }}
      >
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
