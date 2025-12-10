import { useState, useEffect } from 'react'
import api from '../services/api'
import { 
  History, 
  Search as SearchIcon, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  Facebook,
  Filter
} from 'lucide-react'

interface HistoryItem {
  id: number
  telegram_user_id: number
  username: string | null
  search_query: string
  search_type: 'phone' | 'facebook_id'
  results_count: number
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function SearchHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [pagination.page, typeFilter])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/search-history', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          type: typeFilter || undefined
        }
      })
      setHistory(response.data.history)
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      console.error('Error fetching search history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-8 h-8 text-gold-500" />
          <h1 className="text-3xl font-bold text-white">سجل البحث</h1>
        </div>
        <p className="text-gray-400">إجمالي: {pagination.total} عملية بحث</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400">تصفية حسب النوع:</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTypeFilter('')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              typeFilter === '' 
                ? 'bg-gold-500 text-black font-bold' 
                : 'bg-dark-300 text-gray-400 hover:bg-dark-200'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => {
              setTypeFilter('phone')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              typeFilter === 'phone' 
                ? 'bg-blue-500 text-white font-bold' 
                : 'bg-dark-300 text-gray-400 hover:bg-dark-200'
            }`}
          >
            <Phone className="w-4 h-4" />
            هاتف
          </button>
          <button
            onClick={() => {
              setTypeFilter('facebook_id')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              typeFilter === 'facebook_id' 
                ? 'bg-purple-500 text-white font-bold' 
                : 'bg-dark-300 text-gray-400 hover:bg-dark-200'
            }`}
          >
            <Facebook className="w-4 h-4" />
            فيسبوك
          </button>
        </div>
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
                <th>#</th>
                <th>المستخدم</th>
                <th>نوع البحث</th>
                <th>قيمة البحث</th>
                <th>عدد النتائج</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-dark-300 transition-colors">
                  <td className="text-gray-500">#{item.id}</td>
                  <td>
                    <div>
                      <p className="font-medium text-white">@{item.username || 'غير معروف'}</p>
                      <p className="text-gray-500 text-sm font-mono">{item.telegram_user_id}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                      item.search_type === 'phone' 
                        ? 'bg-blue-900/20 text-blue-400' 
                        : 'bg-purple-900/20 text-purple-400'
                    }`}>
                      {item.search_type === 'phone' ? (
                        <>
                          <Phone className="w-4 h-4" />
                          هاتف
                        </>
                      ) : (
                        <>
                          <Facebook className="w-4 h-4" />
                          فيسبوك
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <SearchIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-mono text-gray-300">{item.search_query}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`font-bold ${item.results_count > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                      {item.results_count} نتيجة
                    </span>
                  </td>
                  <td className="text-gray-400 text-sm">{formatDate(item.created_at)}</td>
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