import { useStats } from '../api/hooks';
import StatsCard from '../components/StatsCard';
import { Users, CreditCard, Star, Search, UserPlus, Activity } from 'lucide-react';
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
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>حدث خطأ في تحميل البيانات</p>
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
    <div className="dashboard">
      <h1 className="page-title">لوحة التحكم</h1>

      <div className="stats-grid">
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

      <div className="charts-grid">
        <div className="chart-card">
          <h3>توزيع الاشتراكات</h3>
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
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">لا توجد بيانات</div>
          )}
        </div>

        <div className="chart-card">
          <h3>النشاط اليومي</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
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
