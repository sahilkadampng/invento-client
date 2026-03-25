'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useSidebarStore from '@/store/sidebarStore';
import useAuthStore from '@/store/authStore';
import {
  LayoutDashboard, Package, Scan, ClipboardList, FileText,
  Warehouse, BarChart3, Bell, Search, Settings, ShoppingCart,
  Tags, Building2, Users, ChevronLeft, ChevronRight, X, Shield,
  TrendingUp, Boxes, ArrowRightLeft, RotateCcw, Clock, FileBarChart
} from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'warehouse_staff', 'billing_staff'] },
  { label: 'Products', href: '/products', icon: Package, roles: ['admin', 'manager', 'warehouse_staff'] },
  { label: 'Barcode Scanner', href: '/scanner', icon: Scan, roles: ['admin', 'manager', 'warehouse_staff'] },
  { label: 'Inventory', href: '/inventory', icon: Boxes, roles: ['admin', 'manager', 'warehouse_staff'] },
  { label: 'Stock Transfers', href: '/stock-transfers', icon: ArrowRightLeft, roles: ['admin', 'manager', 'warehouse_staff'] },
  { label: 'Expiry Tracker', href: '/expiry-tracker', icon: Clock, roles: ['admin', 'manager', 'warehouse_staff'] },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart, roles: ['admin', 'manager'] },
  { label: 'Invoices', href: '/invoices', icon: FileText, roles: ['admin', 'manager', 'billing_staff'] },
  { label: 'Returns & Damages', href: '/returns', icon: RotateCcw, roles: ['admin', 'manager', 'warehouse_staff'] },
  { label: 'Customers', href: '/customers', icon: Users, roles: ['admin', 'manager', 'billing_staff'] },
  { label: 'Warehouses', href: '/warehouses', icon: Warehouse, roles: ['admin', 'manager'] },
  { label: 'Categories', href: '/categories', icon: Tags, roles: ['admin', 'manager'] },
  { label: 'Suppliers', href: '/suppliers', icon: Building2, roles: ['admin', 'manager'] },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'manager'] },
  { label: 'Reports', href: '/reports', icon: FileBarChart, roles: ['admin', 'manager'] },
  { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['admin', 'manager', 'warehouse_staff', 'billing_staff'] },
  { label: 'Audit Logs', href: '/audit-logs', icon: Shield, roles: ['admin'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'manager', 'warehouse_staff', 'billing_staff'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile } = useSidebarStore();
  const { user } = useAuthStore();

  const filteredMenu = menuItems.filter((item) => item.roles.includes(user?.role || ''));

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-all duration-100 flex flex-col
          ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Invento</span>
            </motion.div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center mx-auto">
              <Boxes className="w-5 h-5 text-white" />
            </div>
          )}
          <button onClick={toggleCollapse} className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" style={{ color: 'var(--text-muted)' }}>
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button onClick={closeMobile} className="lg:hidden" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {filteredMenu.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={closeMobile}>
                <div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 group cursor-pointer
                    ${isActive ? 'text-white' : ''}`}
                  style={{
                    background: isActive ? 'black' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                  }}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:text-black'}`} />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'red-400', zIndex: -1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        {!isCollapsed && user && (
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                <p className="text-xs truncate capitalize" style={{ color: 'var(--text-muted)' }}>{user.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
