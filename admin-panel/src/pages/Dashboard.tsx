import { useState, useEffect } from 'react'
import api from '../services/api'
import { 
  Users, 
  CreditCard, 
  Star, 
  Search, 
  TrendingUp,
  UserPlus
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface Stats {
  totalUsers: number
  activeSubscriptions: number
  estimatedRevenue: number
  searchesToday: number
  newUsersToday: number
  totalSearches: number
  subscriptionBreakdown: Array<{ subscription_type: string; count: number }>
}

const GOLD_COLORS = ['#D4AF37', '#B8962E', '#8C7223', '#604E18']

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-500 border-t-transparent"></div>
      </div>
    )
  }

  const statCards = [
    { 
      title: 'إجمالي المستخدمين', 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20'
    },
    { 
      title: 'الاشتراكات النشطة', 
      value: stats?.activeSubscriptions || 0, 
      icon: CreditCard, 
      color: 'text-green-400',
      bgColor: 'bg-green-900/20'
    },
    { 
      title: 'الإيرادات (نجوم)', 
      value: stats?.estimatedRevenue || 0, 
      icon: Star, 
      color: 'text-gold-500',
      bgColor: 'bg-gold-900/20'
    },
    { 
      title: 'عمليات البحث اليوم', 
      value: stats?.searchesToday || 0, 
      icon: Search, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20'
    },
    { 
      title: 'إجمالي عمليات البحث', 
      value: stats?.totalSearches || 0, 
      icon: TrendingUp, 
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20'
    },
    { 
      title: 'مستخدمين جدد اليوم', 
      value: stats?.newUsersToday || 0, 
      icon: UserPlus, 
      color: 'text-pink-400',
      bgColor: 'bg-pink-900/20'
    },
  ]

  const pieData = stats?.subscriptionBreakdown?.map(item => ({
    name: item.subscription_type === 'vip' ? 'VIP' : 'عادي',
    value: item.count
  })) || []

  const barData = [
    { name: 'المستخدمين', value: stats?.totalUsers || 0 },
    { name: 'الاشتراكات', value: stats?.activeSubscriptions || 0 },
    { name: 'البحث اليوم', value: stats?.searchesToday || 0 },
    { name: 'مستخدمين جدد', value: stats?.newUsersToday || 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">لوحة التحكم</h1>
        <button 
          onClick={fetchStats}
          className="btn-outline-gold"
        >
          تحديث البيانات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="card-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-white">{card.value.toLocaleString('ar-EG')}</p>
              </div>
              <div className={`p-4 rounded-xl ${card.bgColor}`}>
                <card.icon className={`w-8 h-8 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-dark p-6">
          <h2 className="text-xl font-bold text-white mb-4">نظرة عامة</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #D4AF37',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#D4AF37' }}
              />
              <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-dark p-6">
          <h2 className="text-xl font-bold text-white mb-4">توزيع الاشتراكات</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={GOLD_COLORS[index % GOLD_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #D4AF37',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              لا توجد بيانات للعرض
            </div>
          )}
        </div>
      </div>
    </div>
  )
}