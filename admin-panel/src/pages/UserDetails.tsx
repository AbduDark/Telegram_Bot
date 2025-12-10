import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { 
  ArrowRight, 
  User as UserIcon, 
  Crown, 
  Search,
  Gift,
  Plus,
  X,
  Check
} from 'lucide-react'

interface UserData {
  telegram_user_id: number
  username: string | null
  subscription_type: string | null
  subscription_start: string | null
  subscription_end: string | null
  is_active: boolean
  free_searches_used: number
  bonus_searches: number
  referral_code: string | null
  terms_accepted: boolean
  created_at: string
}

interface SearchHistoryItem {
  search_query: string
  search_type: string
  results_count: number
  created_at: string
}

interface ReferralInfo {
  referral_code: string
  total_referrals: number
  bonus_searches: number
}

export default function UserDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserData | null>(null)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [referral, setReferral] = useState<ReferralInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [extendMonths, setExtendMonths] = useState(1)
  const [subscriptionType, setSubscriptionType] = useState<'regular' | 'vip'>('regular')
  const [bonusCount, setBonusCount] = useState(5)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUserDetails()
  }, [id])

  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/users/${id}`)
      setUser(response.data.user)
      setSearchHistory(response.data.searchHistory || [])
      setReferral(response.data.referral)
    } catch (error) {
      console.error('Error fetching user details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExtendSubscription = async () => {
    setActionLoading(true)
    try {
      await api.put(`/admin/users/${id}/subscription`, {
        action: 'extend',
        months: extendMonths,
        subscription_type: subscriptionType
      })
      await fetchUserDetails()
      setShowExtendModal(false)
    } catch (error) {
      console.error('Error extending subscription:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('هل أنت متأكد من إلغاء الاشتراك؟')) return
    
    setActionLoading(true)
    try {
      await api.put(`/admin/users/${id}/subscription`, {
        action: 'cancel'
      })
      await fetchUserDetails()
    } catch (error) {
      console.error('Error canceling subscription:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddBonusSearches = async () => {
    setActionLoading(true)
    try {
      await api.put(`/admin/users/${id}/free-searches`, {
        count: bonusCount
      })
      await fetchUserDetails()
      setShowBonusModal(false)
    } catch (error) {
      console.error('Error adding bonus searches:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-xl">المستخدم غير موجود</p>
        <button onClick={() => navigate('/users')} className="btn-gold mt-4">
          العودة للمستخدمين
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/users')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowRight className="w-5 h-5" />
        العودة للمستخدمين
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card-dark p-6 text-center">
            <div className="w-24 h-24 bg-dark-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">@{user.username || 'غير معروف'}</h2>
            <p className="text-gray-500 font-mono">{user.telegram_user_id}</p>
            
            <div className="mt-6 space-y-2">
              {user.is_active && user.subscription_type ? (
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  user.subscription_type === 'vip' 
                    ? 'bg-gold-500/20 text-gold-500' 
                    : 'bg-green-900/20 text-green-500'
                }`}>
                  {user.subscription_type === 'vip' && <Crown className="w-5 h-5" />}
                  {user.subscription_type === 'vip' ? 'VIP' : 'اشتراك عادي'}
                </span>
              ) : (
                <span className="inline-block px-4 py-2 bg-gray-800 text-gray-400 rounded-full">
                  غير مشترك
                </span>
              )}
            </div>
          </div>

          <div className="card-dark p-6 space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-dark-200 pb-2">معلومات الاشتراك</h3>
            
            <div className="flex justify-between">
              <span className="text-gray-400">تاريخ البدء</span>
              <span className="text-white">{formatDate(user.subscription_start)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">تاريخ الانتهاء</span>
              <span className="text-white">{formatDate(user.subscription_end)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">البحث المجاني المتبقي</span>
              <span className="text-gold-500 font-bold">{10 - (user.free_searches_used || 0)} / 10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">بحث إضافي (مكافآت)</span>
              <span className="text-gold-500 font-bold">{user.bonus_searches || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">قبول الشروط</span>
              <span className={user.terms_accepted ? 'text-green-500' : 'text-red-500'}>
                {user.terms_accepted ? 'نعم' : 'لا'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => setShowExtendModal(true)}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              تمديد الاشتراك
            </button>
            <button 
              onClick={() => setShowBonusModal(true)}
              className="btn-outline-gold w-full flex items-center justify-center gap-2"
            >
              <Gift className="w-5 h-5" />
              إضافة بحث مجاني
            </button>
            {user.is_active && (
              <button 
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                className="w-full py-2 px-4 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition-colors disabled:opacity-50"
              >
                إلغاء الاشتراك
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {referral && (
            <div className="card-dark p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-gold-500" />
                معلومات الإحالة
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-dark-300 p-4 rounded-lg text-center">
                  <p className="text-gray-400 text-sm mb-1">كود الإحالة</p>
                  <p className="text-gold-500 font-mono font-bold">{referral.referral_code}</p>
                </div>
                <div className="bg-dark-300 p-4 rounded-lg text-center">
                  <p className="text-gray-400 text-sm mb-1">عدد الإحالات</p>
                  <p className="text-2xl font-bold text-white">{referral.total_referrals}</p>
                </div>
                <div className="bg-dark-300 p-4 rounded-lg text-center">
                  <p className="text-gray-400 text-sm mb-1">بحث مكافأة</p>
                  <p className="text-2xl font-bold text-gold-500">{referral.bonus_searches}</p>
                </div>
              </div>
            </div>
          )}

          <div className="card-dark p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-gold-500" />
              سجل البحث (آخر 20)
            </h3>
            {searchHistory.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-auto">
                {searchHistory.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-dark-300 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs ${
                        item.search_type === 'phone' 
                          ? 'bg-blue-900/30 text-blue-400' 
                          : 'bg-purple-900/30 text-purple-400'
                      }`}>
                        {item.search_type === 'phone' ? 'هاتف' : 'فيسبوك'}
                      </div>
                      <span className="font-mono text-gray-300">{item.search_query}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gold-500 text-sm">{item.results_count} نتيجة</span>
                      <span className="text-gray-500 text-sm">{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">لا يوجد سجل بحث</p>
            )}
          </div>
        </div>
      </div>

      {showExtendModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-dark p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">تمديد الاشتراك</h3>
              <button onClick={() => setShowExtendModal(false)} className="p-1 hover:bg-dark-300 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">نوع الاشتراك</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSubscriptionType('regular')}
                    className={`flex-1 py-3 rounded-lg transition-colors ${
                      subscriptionType === 'regular' 
                        ? 'bg-green-900/30 text-green-500 border border-green-500' 
                        : 'bg-dark-300 text-gray-400'
                    }`}
                  >
                    عادي
                  </button>
                  <button
                    onClick={() => setSubscriptionType('vip')}
                    className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      subscriptionType === 'vip' 
                        ? 'bg-gold-500/20 text-gold-500 border border-gold-500' 
                        : 'bg-dark-300 text-gray-400'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    VIP
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">عدد الأشهر</label>
                <div className="flex gap-2">
                  {[1, 3, 6, 12].map(m => (
                    <button
                      key={m}
                      onClick={() => setExtendMonths(m)}
                      className={`flex-1 py-3 rounded-lg transition-colors ${
                        extendMonths === m 
                          ? 'bg-gold-500 text-black font-bold' 
                          : 'bg-dark-300 text-gray-400 hover:bg-dark-200'
                      }`}
                    >
                      {m} شهر
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleExtendSubscription}
                disabled={actionLoading}
                className="btn-gold w-full py-3 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    تأكيد التمديد
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBonusModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-dark p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">إضافة بحث مجاني</h3>
              <button onClick={() => setShowBonusModal(false)} className="p-1 hover:bg-dark-300 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">عدد البحث الإضافي</label>
                <div className="flex gap-2">
                  {[5, 10, 20, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => setBonusCount(n)}
                      className={`flex-1 py-3 rounded-lg transition-colors ${
                        bonusCount === n 
                          ? 'bg-gold-500 text-black font-bold' 
                          : 'bg-dark-300 text-gray-400 hover:bg-dark-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleAddBonusSearches}
                disabled={actionLoading}
                className="btn-gold w-full py-3 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    إضافة البحث
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}