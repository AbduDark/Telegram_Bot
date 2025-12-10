import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { 
  CreditCard, 
  Crown, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Eye
} from 'lucide-react'

interface Subscription {
  telegram_user_id: number
  username: string | null
  subscription_type: string | null
  subscription_start: string | null
  subscription_end: string | null
  is_active: boolean
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSubscriptions()
  }, [pagination.page, statusFilter, typeFilter])

  const fetchSubscriptions = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/subscriptions', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter || undefined,
          type: typeFilter || undefined
        }
      })
      setSubscriptions(response.data.subscriptions)
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (sub: Subscription) => {
    if (!sub.is_active) {
      return <span className="px-3 py-1 bg-red-900/20 text-red-500 rounded-full text-sm">ملغي</span>
    }
    if (sub.subscription_end && new Date(sub.subscription_end) < new Date()) {
      return <span className="px-3 py-1 bg-orange-900/20 text-orange-500 rounded-full text-sm">منتهي</span>
    }
    return <span className="px-3 py-1 bg-green-900/20 text-green-500 rounded-full text-sm">نشط</span>
  }

  const getTypeBadge = (type: string | null) => {
    if (type === 'vip') {
      return (
        <span className="px-3 py-1 bg-gold-500/20 text-gold-500 rounded-full text-sm flex items-center gap-1">
          <Crown className="w-4 h-4" />
          VIP
        </span>
      )
    }
    if (type === 'regular') {
      return <span className="px-3 py-1 bg-blue-900/20 text-blue-400 rounded-full text-sm">عادي</span>
    }
    return <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-sm">-</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-gold-500" />
          <h1 className="text-3xl font-bold text-white">إدارة الاشتراكات</h1>
        </div>
        <p className="text-gray-400">إجمالي: {pagination.total} اشتراك</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400">تصفية:</span>
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
          className="input-dark py-2"
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="expired">منتهي</option>
          <option value="inactive">ملغي</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
          className="input-dark py-2"
        >
          <option value="">جميع الأنواع</option>
          <option value="vip">VIP</option>
          <option value="regular">عادي</option>
        </select>
      </div>

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
                <th>النوع</th>
                <th>الحالة</th>
                <th>تاريخ البدء</th>
                <th>تاريخ الانتهاء</th>
                <th>تاريخ الإنشاء</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.telegram_user_id} className="hover:bg-dark-300 transition-colors">
                  <td>
                    <div>
                      <p className="font-medium text-white">@{sub.username || 'غير معروف'}</p>
                      <p className="text-gray-500 text-sm font-mono">{sub.telegram_user_id}</p>
                    </div>
                  </td>
                  <td>{getTypeBadge(sub.subscription_type)}</td>
                  <td>{getStatusBadge(sub)}</td>
                  <td className="text-gray-400">{formatDate(sub.subscription_start)}</td>
                  <td className="text-gray-400">{formatDate(sub.subscription_end)}</td>
                  <td className="text-gray-400">{formatDate(sub.created_at)}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/users/${sub.telegram_user_id}`)}
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