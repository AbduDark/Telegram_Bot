import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Search, Eye, ChevronLeft, ChevronRight, Crown, User as UserIcon } from 'lucide-react'

interface User {
  telegram_user_id: number
  username: string | null
  subscription_type: string | null
  subscription_end: string | null
  is_active: boolean
  free_searches_used: number
  bonus_searches: number
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, search])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/users', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search
        }
      })
      setUsers(response.data.users)
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchUsers()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSubscriptionBadge = (user: User) => {
    if (!user.is_active || !user.subscription_type) {
      return <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-sm">غير مشترك</span>
    }
    if (user.subscription_type === 'vip') {
      return (
        <span className="px-3 py-1 bg-gold-500/20 text-gold-500 rounded-full text-sm flex items-center gap-1">
          <Crown className="w-4 h-4" />
          VIP
        </span>
      )
    }
    return <span className="px-3 py-1 bg-green-900/20 text-green-500 rounded-full text-sm">عادي</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">إدارة المستخدمين</h1>
        <p className="text-gray-400">إجمالي: {pagination.total} مستخدم</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full pr-12"
            placeholder="ابحث باسم المستخدم أو رقم التيليجرام..."
          />
        </div>
        <button type="submit" className="btn-gold px-6">
          بحث
        </button>
      </form>

      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-500 border-t-transparent"></div>
          </div>
        ) : (
          <table className="table-dark">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>رقم التيليجرام</th>
                <th>الاشتراك</th>
                <th>تاريخ الانتهاء</th>
                <th>البحث المجاني</th>
                <th>تاريخ التسجيل</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.telegram_user_id} className="hover:bg-dark-300 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="font-medium">@{user.username || 'غير معروف'}</span>
                    </div>
                  </td>
                  <td className="font-mono text-gray-400">{user.telegram_user_id}</td>
                  <td>{getSubscriptionBadge(user)}</td>
                  <td className="text-gray-400">{formatDate(user.subscription_end)}</td>
                  <td>
                    <span className="text-gold-500 font-bold">{10 - (user.free_searches_used || 0)}</span>
                    <span className="text-gray-500"> / 10</span>
                  </td>
                  <td className="text-gray-400">{formatDate(user.created_at)}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/users/${user.telegram_user_id}`)}
                      className="p-2 hover:bg-gold-500/20 rounded-lg transition-colors group"
                    >
                      <Eye className="w-5 h-5 text-gray-400 group-hover:text-gold-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="p-2 hover:bg-dark-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-gray-400">
            صفحة {pagination.page} من {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 hover:bg-dark-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}