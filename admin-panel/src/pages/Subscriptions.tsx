import { useState } from 'react';
import { useSubscriptions } from '../api/hooks';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function Subscriptions() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');

  const { data, isLoading, error } = useSubscriptions(page, 20, status, type);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-SA');
  };

  const isExpired = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
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
    <div className="subscriptions-page">
      <h1 className="page-title">إدارة الاشتراكات</h1>

      <div className="filters-bar">
        <div className="filter-group">
          <Filter size={18} />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
        <div className="filter-group">
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">جميع الأنواع</option>
            <option value="vip">VIP</option>
            <option value="regular">عادي</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>المعرف</th>
              <th>اسم المستخدم</th>
              <th>نوع الاشتراك</th>
              <th>تاريخ البدء</th>
              <th>تاريخ الانتهاء</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {data?.subscriptions?.map((sub) => (
              <tr key={sub.telegram_user_id}>
                <td>{sub.telegram_user_id}</td>
                <td>{sub.username || '-'}</td>
                <td>
                  <span className={`badge ${sub.subscription_type || 'none'}`}>
                    {sub.subscription_type === 'vip'
                      ? 'VIP'
                      : sub.subscription_type === 'regular'
                      ? 'عادي'
                      : 'غير مشترك'}
                  </span>
                </td>
                <td>{formatDate(sub.subscription_start)}</td>
                <td>{formatDate(sub.subscription_end)}</td>
                <td>
                  <span
                    className={`status ${
                      !sub.is_active
                        ? 'inactive'
                        : isExpired(sub.subscription_end)
                        ? 'expired'
                        : 'active'
                    }`}
                  >
                    {!sub.is_active
                      ? 'غير نشط'
                      : isExpired(sub.subscription_end)
                      ? 'منتهي'
                      : 'نشط'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronRight size={20} />
        </button>
        <span>
          صفحة {page} من {data?.pagination?.totalPages || 1}
        </span>
        <button
          disabled={page >= (data?.pagination?.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronLeft size={20} />
        </button>
      </div>
    </div>
  );
}
