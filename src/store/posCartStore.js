import { create } from 'zustand';

const usePosCartStore = create((set, get) => ({
  items: [],
  paymentMethod: 'cash',

  // ── Actions ──────────────────────────────────────────────
  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        // Don't exceed available stock
        if (existing.quantity >= product.stock) return state;
        return {
          items: state.items.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            gst: product.gst,
            stock: product.stock,
            quantity: 1,
            discount: 0,
          },
        ],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
          : i
      ),
    }));
  },

  setDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, discount: Math.max(0, Math.min(100, discount)) }
          : i
      ),
    }));
  },

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  clearCart: () => set({ items: [], paymentMethod: 'cash' }),

  // ── Computed ─────────────────────────────────────────────
  get itemCount() {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getDiscountTotal: () => {
    return get().items.reduce((sum, i) => {
      const lineSub = i.price * i.quantity;
      return sum + lineSub * (i.discount / 100);
    }, 0);
  },

  getGstTotal: () => {
    return get().items.reduce((sum, i) => {
      const lineSub = i.price * i.quantity;
      const disc = lineSub * (i.discount / 100);
      const taxable = lineSub - disc;
      return sum + taxable * (i.gst / 100);
    }, 0);
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountTotal();
    const gst = get().getGstTotal();
    return subtotal - discount + gst;
  },
}));

export default usePosCartStore;
