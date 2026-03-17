import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import OtpVerify from './pages/auth/OtpVerify'
import WorkerRegister from './pages/auth/WorkerRegister'

// Customer Pages
import Home from './pages/customer/Home'
import RestaurantList from './pages/customer/RestaurantList'
import RestaurantDetail from './pages/customer/RestaurantDetail'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import OrderTracking from './pages/customer/OrderTracking'
import OrderHistory from './pages/customer/OrderHistory'
import Profile from './pages/customer/Profile'

// Worker Pages
import WorkerDashboard from './pages/worker/WorkerDashboard'
import WorkerOrders from './pages/worker/WorkerOrders'
import ActiveDelivery from './pages/worker/ActiveDelivery'
import WorkerEarnings from './pages/worker/WorkerEarnings'
import WorkerAnalytics from './pages/worker/WorkerAnalytics'
import WorkerProfile from './pages/worker/WorkerProfile'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminWorkers from './pages/admin/AdminWorkers'
import AdminOrders from './pages/admin/AdminOrders'
import AdminLiveMap from './pages/admin/AdminLiveMap'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminRestaurants from './pages/admin/AdminRestaurants'

// Layouts
import CustomerLayout from './components/common/CustomerLayout'
import WorkerLayout from './components/common/WorkerLayout'
import AdminLayout from './components/common/AdminLayout'

const ProtectedRoute = ({ children, role }) => {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (role && user?.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Public Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<OtpVerify />} />
        <Route path="/worker/register" element={<WorkerRegister />} />

        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="restaurants" element={<RestaurantList />} />
          <Route path="restaurant/:id" element={<RestaurantDetail />} />
          <Route path="cart" element={<ProtectedRoute role="customer"><Cart /></ProtectedRoute>} />
          <Route path="checkout" element={<ProtectedRoute role="customer"><Checkout /></ProtectedRoute>} />
          <Route path="order/:id/track" element={<ProtectedRoute role="customer"><OrderTracking /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute role="customer"><OrderHistory /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute role="customer"><Profile /></ProtectedRoute>} />
        </Route>

        {/* Worker Routes */}
        <Route path="/worker" element={<ProtectedRoute role="worker"><WorkerLayout /></ProtectedRoute>}>
          <Route index element={<WorkerDashboard />} />
          <Route path="orders" element={<WorkerOrders />} />
          <Route path="delivery/:orderId" element={<ActiveDelivery />} />
          <Route path="earnings" element={<WorkerEarnings />} />
          <Route path="analytics" element={<WorkerAnalytics />} />
          <Route path="profile" element={<WorkerProfile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="workers" element={<AdminWorkers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="live-map" element={<AdminLiveMap />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="restaurants" element={<AdminRestaurants />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
