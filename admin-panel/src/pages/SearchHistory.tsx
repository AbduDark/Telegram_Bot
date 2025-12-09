import { useState } from 'react';
import { useSearchHistory } from '../api/hooks';
import { ChevronLeft, ChevronRight, Filter, Phone, Facebook } from 'lucide-react';

export default function SearchHistory() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>('');

  const { data, isLoading, error } = useSearchHistory(page, 50, type);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
    <div className="search-history-page">
      <h1 className="page-title">سجل عمليات البحث</h1>

      <div className="filters-bar">
        <div className="filter-group">
          <Filter size={18} />
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">جميع الأنواع</option>
            <option value="phone">بحث بالهاتف</option>
            <option value="facebook_id">بحث بالفيسبوك</option>
          </select>
        </div>
        <div className="stats-summary">
          <span>إجمالي النتائج: {data?.pagination?.total || 0}</span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>المستخدم</th>
              <th>نوع البحث</th>
              <th>نص البحث</th>
              <th>النتائج</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {data?.history?.map((item, index) => (
              <tr key={item.id}>
                <td>{(page - 1) * 50 + index + 1}</td>
                <td>
                  <div className="user-cell">
                    <span className="username">{item.username || '-'}</span>
                    <span className="user-id">{item.telegram_user_id}</span>
                  </div>
                </td>
                <td>
                  <span className={`search-type-badge ${item.search_type}`}>
                    {item.search_type === 'phone' ? (
                      <>
                        <Phone size={14} />
                        هاتف
                      </>
                    ) : item.search_type === 'facebook_id' ? (
                      <>
                        <Facebook size={14} />
                        فيسبوك
                      </>
                    ) : (
                      <>{item.search_type}</>
                    )}
                  </span>
                </td>
                <td>
                  <code className="search-query">{item.search_query}</code>
                </td>
                <td>
                  <span className={`results-count ${item.results_count > 0 ? 'success' : 'empty'}`}>
                    {item.results_count}
                  </span>
                </td>
                <td>{formatDate(item.created_at)}</td>
              </tr>
            ))}
            {(!data?.history || data.history.length === 0) && (
              <tr>
                <td colSpan={6} className="no-data">
                  لا توجد عمليات بحث
                </td>
              </tr>
            )}
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
