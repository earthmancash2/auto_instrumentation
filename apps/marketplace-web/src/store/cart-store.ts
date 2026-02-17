import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface CartItem {
  productId: string;
  productTitle: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartStore {
  items: CartItem[];
  subtotal: number;
  isLoading: boolean;
  error: string | null;

  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  subtotal: 0,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const cart = await api.getCart();
      set({ items: cart.items || [], subtotal: cart.subtotal || 0, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addItem: async (productId: string, quantity: number) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await api.addToCart(productId, quantity);
      set({ items: cart.items || [], subtotal: cart.subtotal || 0, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateItem: async (productId: string, quantity: number) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await api.updateCartItem(productId, quantity);
      set({ items: cart.items || [], subtotal: cart.subtotal || 0, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  removeItem: async (productId: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await api.removeFromCart(productId);
      set({ items: cart.items || [], subtotal: cart.subtotal || 0, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  clearCart: () => {
    set({ items: [], subtotal: 0 });
  },
}));
