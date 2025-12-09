import { useReferrals } from '../api/hooks';
import StatsCard from '../components/StatsCard';
import { Users, Gift, Share2, TrendingUp } from 'lucide-react';

export default function Referrals() {
  const { data, isLoading, error } = useReferrals();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA');
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
          <Share2 size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">إحصائيات الإحالات</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          title="إجمالي الإحالات"
          value={data?.totalReferrals || 0}
          icon={Users}
          color="#3b82f6"
        />
        <StatsCard
          title="عمليات البحث المكافأة"
          value={data?.totalBonusSearches || 0}
          icon={Gift}
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referrers */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-slate-700/50">
            <TrendingUp size={20} className="text-amber-400" />
            <h3 className="text-lg font-semibold text-white">أفضل المُحيلين</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-right text-xs font-medium text-slate-500 px-6 py-3">#</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-6 py-3">اسم المستخدم</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-6 py-3">كود الإحالة</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-6 py-3">عدد الإحالات</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-6 py-3">المكافآت</th>
                </tr>
              </thead>
              <tbody>
                {data?.topReferrers?.map((referrer, index) => (
                  <tr key={referrer.telegram_user_id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-amber-500/20 text-amber-400' :
                        index === 1 ? 'bg-slate-400/20 text-slate-300' :
                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-700/50 text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{referrer.username || referrer.telegram_user_id}</td>
                    <td className="px-6 py-4">
                      <code className="bg-slate-700/50 text-blue-400 px-2 py-1 rounded text-sm font-mono">{referrer.referral_code}</code>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{referrer.total_referrals}</td>
                    <td className="px-6 py-4 text-emerald-400">{referrer.bonus_searches} عمليات بحث</td>
                  </tr>
                ))}
                {(!data?.topReferrers || data.topReferrers.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      لا توجد إحالات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Referrals */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-slate-700/50">
            <Share2 size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">آخر الإحالات</h3>
          </div>
          <div className="p-4 space-y-3">
            {data?.recentReferrals?.slice(0, 10).map((ref, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded-xl px-4 py-3 hover:bg-slate-700/50 transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-white font-medium">
                    {ref.referred_username || ref.referred_user_id}
                  </span>
                  <span className="text-xs text-slate-500">
                    باستخدام كود: <code className="text-blue-400">{ref.referral_code}</code>
                  </span>
                </div>
                <span className="text-xs text-slate-500">{formatDate(ref.created_at)}</span>
              </div>
            ))}
            {(!data?.recentReferrals || data.recentReferrals.length === 0) && (
              <div className="text-center text-slate-500 py-8">لا توجد إحالات حديثة</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
