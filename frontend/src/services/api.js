import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => {
    // Log OTP for development convenience if it's in the response
    if (res.data?.otp) {
      console.log(`%c[AUTH] Your OTP is: ${res.data.otp}`, "color: #fc8019; font-weight: bold; font-size: 14px;");
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)

// AUTH
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  workerRegister: (data) => api.post('/auth/worker-register', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMe: () => api.get('/auth/me'),
}

// RESTAURANTS
export const restaurantAPI = {
  getAll: (params) => api.get('/restaurants', { params }),
  getById: (id) => api.get(`/restaurants/${id}`),
  getMenu: (id) => api.get(`/restaurants/${id}/menu`),
  search: (q) => api.get('/restaurants/search', { params: { q } }),
}

// ORDERS
export const orderAPI = {
  place: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  getMyOrders: () => api.get('/orders/my'),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  getTracking: (id) => api.get(`/orders/${id}/tracking`),
}

// WORKER
export const workerAPI = {
  getAvailableOrders: () => api.get('/workers/orders/available'),
  acceptOrder: (orderId) => api.post(`/workers/orders/${orderId}/accept`),
  updateOrderStatus: (orderId, status, data) => api.patch(`/workers/orders/${orderId}/status`, { status, ...data }),
  updateLocation: (lat, lng, speed) => api.post('/workers/location', { lat, lng, speed }),
  setStatus: (status) => api.patch('/workers/status', { status }),
  getMyStats: () => api.get('/workers/my-stats'),
  getMyOrders: () => api.get('/workers/orders'),
  getMyEarnings: (period) => api.get('/workers/earnings', { params: { period } }),
  reportFailure: (orderId, data) => api.post(`/workers/orders/${orderId}/failure`, data),
  getDashboard: () => api.get('/workers/dashboard'),
}

// ADMIN
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getWorkers: (params) => api.get('/admin/workers', { params }),
  getWorkerDetail: (id) => api.get(`/admin/workers/${id}`),
  verifyWorker: (id, status) => api.patch(`/admin/workers/${id}/verify`, { status }),
  getOrders: (params) => api.get('/admin/orders', { params }),
  getLiveWorkers: () => api.get('/admin/live-workers'),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getFailures: () => api.get('/admin/failures'),
  getRestaurants: () => api.get('/admin/restaurants'),
  addRestaurant: (data) => api.post('/admin/restaurants', data),
}

export default api
