import { create } from 'zustand';

const useSidebarStore = create((set) => ({
  isCollapsed: false,
  isMobileOpen: false,

  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  closeMobile: () => set({ isMobileOpen: false }),
}));

export default useSidebarStore;
