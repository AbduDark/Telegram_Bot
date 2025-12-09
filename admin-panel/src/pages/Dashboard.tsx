import { useStats } from '../api/hooks';
import StatsCard from '../components/StatsCard';
import { Users, CreditCard, Star, Search, UserPlus, Activity, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { data: stats, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400">جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl">
          حدث خطأ في تحميل البيانات
        </div>
      </div>
    );
  }

  const pieData = stats?.subscriptionBreakdown?.map((item) => ({
    name: item.subscription_type === 'vip' ? 'VIP' : item.subscription_type === 'regular' ? 'عادي' : 'غير مشترك',
    value: item.count,
  })) || [];

  const activityData = [
    { name: 'اليوم', searches: stats?.searchesToday || 0, users: stats?.newUsersToday || 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-sm text-slate-400">نظرة عامة على إحصائيات النظام</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="إجمالي المستخدمين"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="#3b82f6"
        />
        <StatsCard
          title="الاشتراكات النشطة"
          value={stats?.activeSubscriptions || 0}
          icon={CreditCard}
          color="#10b981"
        />
        <StatsCard
          title="الإيرادات (نجوم)"
          value={stats?.estimatedRevenue || 0}
          icon={Star}
          color="#f59e0b"
        />
        <StatsCard
          title="عمليات البحث اليوم"
          value={stats?.searchesToday || 0}
          icon={Search}
          color="#8b5cf6"
        />
        <StatsCard
          title="المستخدمون الجدد اليوم"
          value={stats?.newUsersToday || 0}
          icon={UserPlus}
          color="#ec4899"
        />
        <StatsCard
          title="إجمالي عمليات البحث"
          value={stats?.totalSearches || 0}
          icon={Activity}
          color="#06b6d4"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">توزيع الاشتراكات</h3>
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
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend
                  wrapperStyle={{ color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              لا توجد بيانات
            </div>
          )}
        </div>

        {/* Area Chart */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">النشاط اليومي</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Area
                type="monotone"
                dataKey="searches"
                name="عمليات البحث"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="users"
                name="المستخدمون الجدد"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
