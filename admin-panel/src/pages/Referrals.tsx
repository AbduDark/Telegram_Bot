import { useState, useEffect } from 'react'
import api from '../services/api'
import { 
  Share2, 
  Trophy, 
  Gift, 
  Users,
  Copy,
  Check
} from 'lucide-react'

interface TopReferrer {
  telegram_user_id: number
  username: string | null
  referral_code: string
  total_referrals: number
  bonus_searches: number
  created_at: string
}

interface RecentReferral {
  referral_code: string
  referrer_id: number
  referred_user_id: number
  referred_username: string | null
  discount_used: boolean
  subscription_granted: boolean
  created_at: string
}

interface ReferralData {
  totalReferrals: number
  totalBonusSearches: number
  topReferrers: TopReferrer[]
  recentReferrals: RecentReferral[]
}

export default function Referrals() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/referrals')
      setData(response.data)
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Share2 className="w-8 h-8 text-gold-500" />
        <h1 className="text-3xl font-bold text-white">نظام الإحالات</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-dark p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">إجمالي الإحالات</p>
              <p className="text-3xl font-bold text-white">{data?.totalReferrals || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-900/20">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card-dark p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">إجمالي البحث المكافأ</p>
              <p className="text-3xl font-bold text-gold-500">{data?.totalBonusSearches || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-gold-500/20">
              <Gift className="w-8 h-8 text-gold-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-dark p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold-500" />
            أفضل المحيلين
          </h2>
          
          {data?.topReferrers && data.topReferrers.length > 0 ? (
            <div className="space-y-3">
              {data.topReferrers.map((referrer, index) => (
                <div 
                  key={referrer.telegram_user_id}
                  className="flex items-center justify-between p-4 bg-dark-300 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-gold-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-700 text-white' :
                      'bg-dark-200 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">@{referrer.username || 'غير معروف'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-mono text-sm">{referrer.referral_code}</span>
                        <button 
                          onClick={() => copyCode(referrer.referral_code)}
                          className="p-1 hover:bg-dark-200 rounded"
                        >
                          {copiedCode === referrer.referral_code ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gold-500">{referrer.total_referrals}</p>
                    <p className="text-gray-500 text-sm">إحالة</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">لا يوجد محيلين بعد</p>
          )}
        </div>

        <div className="card-dark p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-gold-500" />
            آخر الإحالات
          </h2>
          
          {data?.recentReferrals && data.recentReferrals.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-auto">
              {data.recentReferrals.map((ref, index) => (
                <div 
                  key={index}
                  className="p-4 bg-dark-300 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">@{ref.referred_username || 'غير معروف'}</span>
                    <span className="text-gray-500 text-sm">{formatDate(ref.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-dark-200 text-gold-500 rounded text-xs font-mono">
                      {ref.referral_code}
                    </span>
                    {ref.discount_used ? (
                      <span className="px-2 py-1 bg-green-900/30 text-green-500 rounded text-xs">
                        الخصم مستخدم
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-900/30 text-orange-500 rounded text-xs">
                        خصم معلق
                      </span>
                    )}
                    {ref.subscription_granted && (
                      <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">
                        اشترك
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">لا توجد إحالات بعد</p>
          )}
        </div>
      </div>
    </div>
  )
}