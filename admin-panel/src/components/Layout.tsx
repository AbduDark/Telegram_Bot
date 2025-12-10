import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Share2,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Crown,
  Database
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { path: '/users', icon: Users, label: 'المستخدمين' },
  { path: '/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
  { path: '/referrals', icon: Share2, label: 'الإحالات' },
  { path: '/search-history', icon: History, label: 'سجل البحث' },
  { path: '/database', icon: Database, label: 'قاعدة البيانات' },
  { path: '/settings', icon: Settings, label: 'الإعدادات' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { admin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-black flex">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-dark-500 border-l border-dark-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-dark-200 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Crown className="w-8 h-8 text-gold-500" />
              <span className="text-gold-500 font-bold text-xl">Admin</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-dark-300 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-gold-500 text-black font-bold' 
                    : 'text-gray-400 hover:bg-dark-300 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-200">
          {sidebarOpen && admin && (
            <div className="mb-4 text-center">
              <p className="text-gold-500 font-bold">{admin.username}</p>
              <p className="text-gray-500 text-sm">{admin.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}