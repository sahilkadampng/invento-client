import { create } from 'zustand';

const useThemeStore = create((set) => ({
  theme: 'dark',

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      }
      return { theme: newTheme };
    });
  },

  loadTheme: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
      set({ theme: saved });
    }
  },
}));

export default useThemeStore;
