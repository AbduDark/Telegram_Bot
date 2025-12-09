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

  return (
    <div className="referrals-page">
      <h1 className="page-title">إحصائيات الإحالات</h1>

      <div className="stats-grid small">
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

      <div className="referrals-content">
        <div className="card">
          <div className="card-header">
            <TrendingUp size={20} />
            <h3>أفضل المُحيلين</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم المستخدم</th>
                  <th>كود الإحالة</th>
                  <th>عدد الإحالات</th>
                  <th>المكافآت</th>
                </tr>
              </thead>
              <tbody>
                {data?.topReferrers?.map((referrer, index) => (
                  <tr key={referrer.telegram_user_id}>
                    <td>{index + 1}</td>
                    <td>{referrer.username || referrer.telegram_user_id}</td>
                    <td>
                      <code className="referral-code">{referrer.referral_code}</code>
                    </td>
                    <td>{referrer.total_referrals}</td>
                    <td>{referrer.bonus_searches} عمليات بحث</td>
                  </tr>
                ))}
                {(!data?.topReferrers || data.topReferrers.length === 0) && (
                  <tr>
                    <td colSpan={5} className="no-data">
                      لا توجد إحالات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <Share2 size={20} />
            <h3>آخر الإحالات</h3>
          </div>
          <div className="recent-referrals">
            {data?.recentReferrals?.slice(0, 10).map((ref, index) => (
              <div key={index} className="referral-item">
                <div className="referral-info">
                  <span className="referred-user">
                    {ref.referred_username || ref.referred_user_id}
                  </span>
                  <span className="referral-details">
                    باستخدام كود: <code>{ref.referral_code}</code>
                  </span>
                </div>
                <span className="referral-date">{formatDate(ref.created_at)}</span>
              </div>
            ))}
            {(!data?.recentReferrals || data.recentReferrals.length === 0) && (
              <div className="no-data">لا توجد إحالات حديثة</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
