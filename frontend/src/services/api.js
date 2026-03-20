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
  restaurantRegister: (data) => api.post('/auth/restaurant-register', data),
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  getWorkerZones: () => api.get('/auth/worker-zones'),
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

export const restaurantManagerAPI = {
  getStatus: () => api.get('/restaurants/me/status'),
  getDashboard: () => api.get('/restaurants/me/dashboard'),
  addMenuItem: (data) => api.post('/restaurants/me/menu', data),
  updateMenuItem: (itemId, data) => api.patch(`/restaurants/me/menu/${itemId}`, data),
  markOrderPickedUp: (orderId) => api.patch(`/restaurants/me/orders/${orderId}/pickup`),
}

// ORDERS
export const orderAPI = {
  place: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  getMyOrders: () => api.get('/orders/my'),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  getTracking: (id) => api.get(`/orders/${id}/tracking`),
  getEta: (id, params) => api.get(`/tracking/orders/${id}/eta`, { params }),
  submitReview: (id, data) => api.post(`/orders/${id}/review`, data),
}

export const customerAPI = {
  getAddresses: () => api.get('/customers/addresses'),
  updateAddress: (delivery_address) => api.put('/customers/address', { delivery_address }),
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
  getOrder: (orderId) => api.get(`/workers/orders/${orderId}`),
  getMyEarnings: (period) => api.get('/workers/earnings', { params: { period } }),
  reportFailure: (orderId, data) => api.post(`/workers/orders/${orderId}/failure`, data),
  getDashboard: () => api.get('/workers/dashboard'),
}

// ADMIN
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getExternalAccessKey: () => api.get('/admin/external-access/key'),
  generateExternalAccessKey: (data) => api.post('/admin/external-access/key/generate', data),
  revealExternalAccessKey: (id) => api.get(`/admin/external-access/key/${id}/reveal`),
  updateExternalAccessKey: (id, data) => api.patch(`/admin/external-access/key/${id}`, data),
  getZones: () => api.get('/admin/zones'),
  addZone: (zone_name, daily_target_orders = 0) => api.post('/admin/zones', { zone_name, daily_target_orders }),
  updateZone: (id, data) => api.patch(`/admin/zones/${id}`, data),
  deleteZone: (id) => api.delete(`/admin/zones/${id}`),
  getWorkers: (params) => api.get('/admin/workers', { params }),
  getWorkerDetail: (id) => api.get(`/admin/workers/${id}`),
  verifyWorker: (id, status) => api.patch(`/admin/workers/${id}/verify`, { status }),
  getOrders: (params) => api.get('/admin/orders', { params }),
  getLiveWorkers: () => api.get('/admin/live-workers'),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getFailures: () => api.get('/admin/failures'),
  getRestaurants: () => api.get('/admin/restaurants'),
  addRestaurant: (data) => api.post('/admin/restaurants', data),
  verifyRestaurant: (id, status) => api.patch(`/admin/restaurants/${id}/verify`, { status }),
  deleteRestaurant: (id) => api.delete(`/admin/restaurants/${id}`),
  deleteWorker: (id) => api.delete(`/admin/workers/${id}`),
}

export const externalAccessAPI = {
  getWorkers: (apiKey, limit) => api.get('/external/workers', { params: { limit }, headers: { 'x-api-key': apiKey } }),
  getWorkerProfiles: (apiKey, limit) => api.get('/external/worker-profiles', { params: { limit }, headers: { 'x-api-key': apiKey } }),
  getWorkerEarnings: (apiKey, limit) => api.get('/external/worker-earnings', { params: { limit }, headers: { 'x-api-key': apiKey } }),
  getOrders: (apiKey, limit) => api.get('/external/orders', { params: { limit }, headers: { 'x-api-key': apiKey } }),
}

export default api
