import { useState } from 'react';
import { useUsers, useUser, useUpdateSubscription, useAddFreeSearches } from '../api/hooks';
import { Search, ChevronLeft, ChevronRight, X, Clock, Gift } from 'lucide-react';

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showSearchesModal, setShowSearchesModal] = useState(false);
  const [extendMonths, setExtendMonths] = useState(1);
  const [extendType, setExtendType] = useState<'regular' | 'vip'>('regular');
  const [bonusSearches, setBonusSearches] = useState(5);

  const { data, isLoading, error } = useUsers(page, 20, search);
  const { data: userDetails, isLoading: userLoading } = useUser(selectedUserId || '');
  const updateSubscription = useUpdateSubscription();
  const addFreeSearches = useAddFreeSearches();

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleExtendSubscription = async () => {
    if (!selectedUserId) return;
    await updateSubscription.mutateAsync({
      userId: selectedUserId,
      action: 'extend',
      months: extendMonths,
      subscription_type: extendType,
    });
    setShowExtendModal(false);
  };

  const handleAddSearches = async () => {
    if (!selectedUserId) return;
    await addFreeSearches.mutateAsync({
      userId: selectedUserId,
      count: bonusSearches,
    });
    setShowSearchesModal(false);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
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
    <div className="users-page">
      <h1 className="page-title">إدارة المستخدمين</h1>

      <div className="search-bar">
        <input
          type="text"
          placeholder="البحث باسم المستخدم أو المعرف..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>
          <Search size={20} />
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>المعرف</th>
              <th>اسم المستخدم</th>
              <th>نوع الاشتراك</th>
              <th>حالة الاشتراك</th>
              <th>تاريخ الانتهاء</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data?.users?.map((user) => (
              <tr key={user.telegram_user_id}>
                <td>{user.telegram_user_id}</td>
                <td>{user.username || '-'}</td>
                <td>
                  <span className={`badge ${user.subscription_type || 'none'}`}>
                    {user.subscription_type === 'vip'
                      ? 'VIP'
                      : user.subscription_type === 'regular'
                      ? 'عادي'
                      : 'غير مشترك'}
                  </span>
                </td>
                <td>
                  <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td>{formatDate(user.subscription_end)}</td>
                <td>
                  <button
                    className="action-btn"
                    onClick={() => setSelectedUserId(user.telegram_user_id)}
                  >
                    التفاصيل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
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

      {selectedUserId && (
        <div className="modal-overlay" onClick={() => setSelectedUserId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>تفاصيل المستخدم</h2>
              <button onClick={() => setSelectedUserId(null)}>
                <X size={24} />
              </button>
            </div>
            {userLoading ? (
              <div className="loading-container">
                <div className="loading-spinner" />
              </div>
            ) : userDetails ? (
              <div className="modal-content">
                <div className="user-info-grid">
                  <div className="info-item">
                    <label>معرف تليجرام</label>
                    <span>{userDetails.user.telegram_user_id}</span>
                  </div>
                  <div className="info-item">
                    <label>اسم المستخدم</label>
                    <span>{userDetails.user.username || '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>نوع الاشتراك</label>
                    <span>
                      {userDetails.user.subscription_type === 'vip'
                        ? 'VIP'
                        : userDetails.user.subscription_type === 'regular'
                        ? 'عادي'
                        : 'غير مشترك'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>تاريخ الانتهاء</label>
                    <span>{formatDate(userDetails.user.subscription_end)}</span>
                  </div>
                  <div className="info-item">
                    <label>عمليات البحث المجانية المستخدمة</label>
                    <span>{userDetails.user.free_searches_used}</span>
                  </div>
                  <div className="info-item">
                    <label>عمليات البحث الإضافية</label>
                    <span>{userDetails.user.bonus_searches}</span>
                  </div>
                  <div className="info-item">
                    <label>تاريخ التسجيل</label>
                    <span>{formatDate(userDetails.user.created_at)}</span>
                  </div>
                  {userDetails.referral && (
                    <div className="info-item">
                      <label>كود الإحالة</label>
                      <span>{userDetails.referral.referral_code}</span>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    className="btn-primary"
                    onClick={() => setShowExtendModal(true)}
                  >
                    <Clock size={18} />
                    تمديد الاشتراك
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowSearchesModal(true)}
                  >
                    <Gift size={18} />
                    إضافة عمليات بحث
                  </button>
                </div>

                {userDetails.searchHistory.length > 0 && (
                  <div className="search-history">
                    <h4>سجل البحث الأخير</h4>
                    <ul>
                      {userDetails.searchHistory.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          <span className="query">{item.search_query}</span>
                          <span className="type">
                            {item.search_type === 'phone' ? 'هاتف' : 'فيسبوك'}
                          </span>
                          <span className="date">{formatDate(item.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showExtendModal && (
        <div className="modal-overlay" onClick={() => setShowExtendModal(false)}>
          <div className="modal small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>تمديد الاشتراك</h2>
              <button onClick={() => setShowExtendModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>نوع الاشتراك</label>
                <select
                  value={extendType}
                  onChange={(e) => setExtendType(e.target.value as 'regular' | 'vip')}
                >
                  <option value="regular">عادي</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div className="form-group">
                <label>عدد الأشهر</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(Number(e.target.value))}
                />
              </div>
              <button
                className="btn-primary full-width"
                onClick={handleExtendSubscription}
                disabled={updateSubscription.isPending}
              >
                {updateSubscription.isPending ? 'جاري التنفيذ...' : 'تمديد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSearchesModal && (
        <div className="modal-overlay" onClick={() => setShowSearchesModal(false)}>
          <div className="modal small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>إضافة عمليات بحث مجانية</h2>
              <button onClick={() => setShowSearchesModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>عدد عمليات البحث</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bonusSearches}
                  onChange={(e) => setBonusSearches(Number(e.target.value))}
                />
              </div>
              <button
                className="btn-primary full-width"
                onClick={handleAddSearches}
                disabled={addFreeSearches.isPending}
              >
                {addFreeSearches.isPending ? 'جاري التنفيذ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
