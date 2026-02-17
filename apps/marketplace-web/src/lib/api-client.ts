import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth
  async login(email: string, password: string) {
    const { data } = await apiClient.post('/api/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    return data;
  },

  async register(userData: any) {
    const { data } = await apiClient.post('/api/auth/register', userData);
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    return data;
  },

  async getCurrentUser() {
    const { data } = await apiClient.get('/api/auth/me');
    return data;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  },

  // Products
  async getProducts(params?: any) {
    const { data } = await apiClient.get('/api/products', { params });
    return data;
  },

  async getProduct(id: string) {
    const { data } = await apiClient.get(`/api/products/${id}`);
    return data;
  },

  async createProduct(productData: any) {
    const { data } = await apiClient.post('/api/products', productData);
    return data;
  },

  // Cart
  async getCart() {
    const { data } = await apiClient.get('/api/cart');
    return data;
  },

  async addToCart(productId: string, quantity: number) {
    const { data } = await apiClient.post('/api/cart/items', { productId, quantity });
    return data;
  },

  async updateCartItem(productId: string, quantity: number) {
    const { data } = await apiClient.put(`/api/cart/items/${productId}`, { quantity });
    return data;
  },

  async removeFromCart(productId: string) {
    const { data } = await apiClient.delete(`/api/cart/items/${productId}`);
    return data;
  },

  // Orders
  async createOrder(orderData: any) {
    const { data } = await apiClient.post('/api/orders', orderData);
    return data;
  },

  async getOrders() {
    const { data } = await apiClient.get('/api/orders');
    return data;
  },

  async getOrder(id: string) {
    const { data } = await apiClient.get(`/api/orders/${id}`);
    return data;
  },
};
