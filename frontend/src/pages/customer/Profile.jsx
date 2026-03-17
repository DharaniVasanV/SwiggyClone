import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { FiUser, FiPhone, FiMail, FiLogOut } from 'react-icons/fi'

export default function Profile() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-swiggy-dark mb-5">Profile</h1>
      <div className="bg-white rounded-xl shadow-card p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-swiggy-orange-light rounded-full flex items-center justify-center text-2xl font-bold text-swiggy-orange">{user?.name?.charAt(0)||'U'}</div>
          <div><h2 className="font-bold text-swiggy-dark">{user?.name}</h2><p className="text-sm text-swiggy-gray-dark">{user?.email}</p></div>
        </div>
        {[
          { icon:<FiUser/>, label:'Name', value: user?.name },
          { icon:<FiPhone/>, label:'Phone', value: user?.phone },
          { icon:<FiMail/>, label:'Email', value: user?.email },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-3 border-t border-gray-100">
            <span className="text-swiggy-orange">{item.icon}</span>
            <div><p className="text-xs text-swiggy-gray-dark">{item.label}</p><p className="text-sm font-medium text-swiggy-dark">{item.value}</p></div>
          </div>
        ))}
      </div>
      <button onClick={() => { logout(); navigate('/') }} className="flex items-center justify-center gap-2 w-full border border-red-300 text-red-500 py-3 rounded-xl font-medium">
        <FiLogOut/> Sign out
      </button>
    </div>
  )
}
