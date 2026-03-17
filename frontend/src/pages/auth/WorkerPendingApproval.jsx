import { useAuthStore } from '../../store/authStore'
import { Link, useNavigate } from 'react-router-dom'
import { FiClock, FiCheckCircle, FiXCircle, FiLogOut } from 'react-icons/fi'

const STATUS_CONFIG = {
  pending: {
    icon: <FiClock className="w-12 h-12 text-amber-500" />,
    title: 'Application Under Review',
    message: "Your documents have been submitted. Our team will verify your details within 24–48 hours. You'll be able to start delivering once approved.",
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  rejected: {
    icon: <FiXCircle className="w-12 h-12 text-red-500" />,
    title: 'Application Rejected',
    message: 'Unfortunately your application was not approved. Please contact support or re-apply with correct documents.',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  verified: {
    icon: <FiCheckCircle className="w-12 h-12 text-green-500" />,
    title: "You're Approved!",
    message: 'Your account is verified. You can now start accepting delivery orders.',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
}

export default function WorkerPendingApproval({ verificationStatus: propStatus }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const verificationStatus = propStatus || 'pending'
  const config = STATUS_CONFIG[verificationStatus] || STATUS_CONFIG.pending

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-swiggy-gray flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-card p-8 text-center">
        <div className="w-12 h-12 bg-swiggy-orange rounded-xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-xl">S</span>
        </div>

        <div className={`w-20 h-20 ${config.bg} border-2 ${config.border} rounded-full flex items-center justify-center mx-auto mb-5`}>
          {config.icon}
        </div>

        <h1 className="text-xl font-bold text-swiggy-dark mb-2">{config.title}</h1>
        <p className="text-sm text-swiggy-gray-dark leading-relaxed mb-6">{config.message}</p>

        <div className="bg-swiggy-gray rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-medium text-swiggy-dark mb-1">Registered as</p>
          <p className="text-sm font-bold text-swiggy-dark">{user?.name}</p>
          <p className="text-xs text-swiggy-gray-dark">{user?.email}</p>
        </div>

        {verificationStatus === 'verified' ? (
          <Link to="/worker" className="btn-orange w-full block text-center">
            Go to Dashboard →
          </Link>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-swiggy-gray-dark">
              Questions? Contact <span className="text-swiggy-orange font-medium">support@swiggy.com</span>
            </p>
            <button onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full text-sm text-swiggy-gray-dark border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50 transition-colors">
              <FiLogOut /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
