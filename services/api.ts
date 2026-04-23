import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://mobilebackend-aefo.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
});

api.interceptors.request.use(
  async (config) => {
    const publicAuthPaths = [
      '/auth/register/',
      '/auth/login/',
      '/auth/verify-email/',
      '/auth/resend-verification/',
      '/auth/reset-mpin/',
    ];
    const requestUrl = config.url || '';
    const isPublicAuthRequest = publicAuthPaths.some((path) => requestUrl.includes(path));

    if (isPublicAuthRequest && config.headers) {
      delete config.headers.Authorization;
      return config;
    }

    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          await AsyncStorage.setItem('accessToken', newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (formData: FormData) => {
    try {
      return await api.post('/auth/register/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error: any) {
      const isNetworkFailure = error?.message === 'Network Error' || error?.code === 'ECONNABORTED';
      if (!isNetworkFailure) throw error;

      // Fallback to fetch for devices that fail axios multipart uploads.
      const response = await fetch(`${API_URL}/auth/register/`, {
        method: 'POST',
        body: formData,
      });

      const raw = await response.text();
      let data: any = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = { detail: raw };
        }
      }

      if (!response.ok) {
        const fetchError: any = new Error(
          data?.error || data?.detail || data?.message || 'Registration failed'
        );
        fetchError.response = { status: response.status, data };
        throw fetchError;
      }

      return { status: response.status, data };
    }
  },
  verifyEmail: (email: string, code: string) => api.post('/auth/verify-email/', { email, code }),
  resendVerification: (email: string) => api.post('/auth/resend-verification/', { email }),
  
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login/', { username, password });
      if (response.data.access) {
        await AsyncStorage.setItem('accessToken', response.data.access);
        await AsyncStorage.setItem('refreshToken', response.data.refresh);
        if (response.data.user_type) {
          await AsyncStorage.setItem('userType', response.data.user_type);
        }
        if (response.data.user_id) {
          await AsyncStorage.setItem('userId', response.data.user_id.toString());
        }
        // Note: Backend now handles setting rider online status automatically
      }
      return response;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Connection timeout. Please check if backend server is running.');
      }
      if (error.message === 'Network Error') {
        throw new Error(`Cannot connect to server. Please check:\n1. Backend server is running\n2. IP address is correct\n3. Device is on same network`);
      }
      if (error.response?.status === 500) {
        throw new Error('Server error. Please make sure the database is properly set up and migrations are applied.');
      }
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || 'Bad request. Please check your input.';
        throw new Error(errorMsg);
      }
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },
  
  logout: async () => {
    try {
      const userType = await AsyncStorage.getItem('userType');
      // Set rider status to offline if user is a rider
      if (userType === 'RIDER') {
        try {
          await api.patch('/auth/profile/', { is_online: false });
        } catch (error) {
          console.log('Failed to set offline status:', error);
        }
      }
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userType');
    } catch (error) {
      console.log('Logout error:', error);
    }
  },
  
  validateToken: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return false;
      
      await api.get('/auth/profile/');
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await api.post('/auth/token/refresh/', { refresh: refreshToken });
            await AsyncStorage.setItem('accessToken', response.data.access);
            return true;
          }
        } catch (refreshError) {
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
          await AsyncStorage.removeItem('userType');
        }
      }
      return false;
    }
  },
  
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data: { first_name?: string; last_name?: string; phone?: string; address?: string; vehicle_type?: string; vehicle_brand?: string; license_number?: string; is_online?: boolean }) =>
    api.patch('/auth/profile/', data),
  updateProfileForm: (formData: FormData) =>
    api.patch('/auth/profile/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  approveRider: (userId: number) => api.post(`/auth/approve-rider/${userId}/`),
  rejectUser: (userId: number, reason: string) => api.post(`/auth/reject-user/${userId}/`, { reason }),
  getCustomers: () => api.get('/auth/customers/'),
  getCashiers: () => api.get('/auth/cashiers/'),
  updateRiderStatus: (isOnline: boolean) => api.patch('/auth/profile/', { is_online: isOnline }),
  createStaff: (data: {
    user_type: 'RIDER' | 'CASHIER';
    username: string; email: string; password: string;
    first_name: string; last_name: string; phone: string;
    address: string; date_of_birth: string;
    vehicle_type?: string; vehicle_brand?: string; license_number?: string;
  }) => api.post('/auth/create-staff/', data),
  getBranches: () => api.get('/auth/branches/'),
  assignBranch: (userId: number, branchId: number | null) => api.patch(`/auth/riders/${userId}/assign-branch/`, { branch_id: branchId }),
  createBranch: (data: { name: string; address: string; latitude?: number; longitude?: number }) => api.post('/auth/branches/', data),
  updateBranch: (id: number, data: { name?: string; address?: string; latitude?: number; longitude?: number }) => api.patch(`/auth/branches/${id}/`, data),
  deleteBranch: (id: number) => api.delete(`/auth/branches/${id}/`),
  resetMpin: (email: string) => api.post('/auth/reset-mpin/', { email }),
};

export const deliveryAPI = {
  getActiveDeliveries: () => api.get('/deliveries/active/'),
  getAllDeliveries: () => api.get('/deliveries/'),
  getDelivery: (id: number) => api.get(`/deliveries/${id}/`),
  getRiders: () => api.get('/auth/riders/'),
  getAllRiders: () => api.get('/auth/all-riders/'),
  createDelivery: async (formData: FormData) => {
    return api.post('/deliveries/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  updateStatus: (id: number, status: string) => api.post(`/deliveries/${id}/update_status/`, { status }),
  cancelDelivery: (id: number) => api.post(`/deliveries/${id}/cancel/`),
  submitProofOfDelivery: (id: number, formData: FormData) => 
    api.post(`/deliveries/${id}/update_status/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  uploadGcashProof: (id: number, formData: FormData) =>
    api.post(`/deliveries/${id}/gcash-proof/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  approveDelivery: (id: number) => api.post(`/deliveries/${id}/approve/`),
  assignRider: (deliveryId: number, riderId: number) => api.patch(`/deliveries/${deliveryId}/`, { rider: riderId }),
  getRiderStats: () => api.get('/deliveries/rider_stats/'),
  updateRiderLocation: (latitude: number, longitude: number) => 
    api.patch('/auth/profile/', { current_latitude: latitude, current_longitude: longitude }),
  createDeliveryRequest: (data: any) => api.post('/delivery-requests/create/', data),
  getDeliveryRequests: () => api.get('/delivery-requests/'),
  acceptDeliveryRequest: (id: number) => api.post(`/delivery-requests/${id}/accept/`),
  cancelDeliveryRequest: (id: number) => api.post(`/delivery-requests/${id}/cancel/`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
  getPredictive: () => api.get('/analytics/predictive/'),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications/'),
  markRead: (id: number) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  clearAll: () => api.post('/notifications/clear_all/'),
  getUnreadCount: () => api.get('/notifications/unread_count/'),
};

export const chatAPI = {
  getMessages: (deliveryId: number) => api.get(`/deliveries/${deliveryId}/chat/`),
  sendMessage: (deliveryId: number, message: string) => api.post(`/deliveries/${deliveryId}/chat/`, { message }),
};

export const supportAPI = {
  createTicket: (data: { name: string; email: string; concern: string; concern_type?: 'GENERAL' | 'RIDER_APPLICATION' | 'CASHIER_APPLICATION' }) =>
    api.post('/auth/support/tickets/create/', data),
  getTickets: (params?: { status?: 'PENDING' | 'IN_REVIEW' | 'RESOLVED'; concern_type?: 'GENERAL' | 'RIDER_APPLICATION' | 'CASHIER_APPLICATION' }) =>
    api.get('/auth/support/tickets/', { params }),
  updateTicket: (ticketId: number, data: { status?: 'PENDING' | 'IN_REVIEW' | 'RESOLVED'; staff_notes?: string }) =>
    api.patch(`/auth/support/tickets/${ticketId}/`, data),
};

export const trackingAPI = {
  trackByNumber: (trackingNumber: string) =>
    axios.get(`${API_URL}/track/${encodeURIComponent(trackingNumber.trim().toUpperCase())}/`),
};

export const paymentAPI = {
  collectCOD: (deliveryId: number, method: string) =>
    api.post('/payment/payments/create_payment/', { delivery_id: deliveryId, payment_method: method }),
  confirmPayment: (paymentId: number) =>
    api.post(`/payment/payments/${paymentId}/confirm_payment/`),
  getPayments: () => api.get('/payment/payments/'),
  getWithdrawals: () => api.get('/payment/withdrawals/'),
  approveWithdrawal: (id: number) => api.post(`/payment/withdrawals/${id}/approve/`),
  rejectWithdrawal: (id: number, reason?: string) => api.post(`/payment/withdrawals/${id}/reject/`, { reason }),
};

export const posAPI = {
  getCategories: () => api.get('/pos/categories/'),
  getProducts: (params?: { category?: number; search?: string }) => api.get('/pos/products/', { params }),
  getProductByBarcode: (code: string) => api.get('/pos/products/by_barcode/', { params: { code } }),
  createProduct: (data: any) => api.post('/pos/products/', data),
  updateProduct: (id: number, data: any) => api.patch(`/pos/products/${id}/`, data),
  deleteProduct: (id: number) => api.delete(`/pos/products/${id}/`),
  getAllProducts: () => api.get('/pos/products/all_products/'),
  restockProduct: (id: number, quantity: number) => api.post(`/pos/products/${id}/restock/`, { quantity }),
  checkout: (data: any) => api.post('/pos/sales/checkout/', data),
  getSales: () => api.get('/pos/sales/'),
  getReport: (period: 'daily' | 'weekly' | 'monthly') => api.get('/pos/sales/report/', { params: { period } }),
  voidSale: (id: number) => api.post(`/pos/sales/${id}/void/`),
  refundSale: (id: number) => api.post(`/pos/sales/${id}/refund/`),
  createCategory: (data: any) => api.post('/pos/categories/', data),
};

export const addressAPI = {
  getAddresses: () => api.get('/auth/addresses/'),
  addAddress: (data: { label: string; address: string; is_default?: boolean }) => api.post('/auth/addresses/', data),
  updateAddress: (id: number, data: { label?: string; address?: string; is_default?: boolean }) => api.put(`/auth/addresses/${id}/`, data),
  deleteAddress: (id: number) => api.delete(`/auth/addresses/${id}/`),
};

export const walletAPI = {
  getTransactions: () => api.get('/payment/wallets/transactions/'),
  getWallet: () => api.get('/payment/wallets/my_wallet/'),
};

export const ratingAPI = {
  getRatings: () => api.get('/ratings/'),
  getPendingRatings: () => api.get('/ratings/pending/'),
  createRating: (data: { delivery: number; rating: number; comment?: string; tip_amount?: number }) => api.post('/ratings/', data),
  getAllRatings: () => api.get('/ratings/all/'),
  getLowRatedRiders: () => api.get('/ratings/low-rated-riders/'),
};

export const settingsAPI = {
  getFeeConfig: () => api.get('/settings/fee-config/'),
  updateFeeConfig: (data: { base_fee?: number; per_kg_rate?: number; per_item_rate?: number }) =>
    api.patch('/settings/fee-config/update/', data),
};

export default api;
export { API_URL };
