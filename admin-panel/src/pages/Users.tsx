import { useState } from 'react';
import { useUsers, useUser, useUpdateSubscription, useAddFreeSearches } from '../api/hooks';
import { Search, ChevronLeft, ChevronRight, X, Clock, Gift, Users as UsersIcon } from 'lucide-react';

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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <UsersIcon size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">إدارة المستخدمين</h1>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="البحث باسم المستخدم أو المعرف..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
          <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
        >
          بحث
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">المعرف</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">اسم المستخدم</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">نوع الاشتراك</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">حالة الاشتراك</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">تاريخ الانتهاء</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((user) => (
                <tr key={user.telegram_user_id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-mono text-sm">{user.telegram_user_id}</td>
                  <td className="px-6 py-4 text-white">{user.username || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      user.subscription_type === 'vip'
                        ? 'bg-amber-500/20 text-amber-400'
                        : user.subscription_type === 'regular'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {user.subscription_type === 'vip'
                        ? 'VIP'
                        : user.subscription_type === 'regular'
                        ? 'عادي'
                        : 'غير مشترك'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{formatDate(user.subscription_end)}</td>
                  <td className="px-6 py-4">
                    <button
                      className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm transition-colors"
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
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={20} />
        </button>
        <span className="text-slate-400">
          صفحة {page} من {data?.pagination?.totalPages || 1}
        </span>
        <button
          disabled={page >= (data?.pagination?.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* User Details Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)}>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">تفاصيل المستخدم</h2>
              <button onClick={() => setSelectedUserId(null)} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            {userLoading ? (
              <div className="flex justify-center p-12">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : userDetails ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <label className="text-xs text-slate-500 block mb-1">معرف تليجرام</label>
                    <span className="text-white font-mono">{userDetails.user.telegram_user_id}</span>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <label className="text-xs text-slate-500 block mb-1">اسم المستخدم</label>
                    <span className="text-white">{userDetails.user.username || '-'}</span>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <label className="text-xs text-slate-500 block mb-1">نوع الاشتراك</label>
                    <span className="text-white">
                      {userDetails.user.subscription_type === 'vip'
                        ? 'VIP'
                        : userDetails.user.subscription_type === 'regular'
                        ? 'عادي'
                        : 'غير مشترك'}
                    </span>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <label className="text-xs text-slate-500 block mb-1">تاريخ الانتهاء</label>
                    <span className="text-white">{formatDate(userDetails.user.subscription_end)}</span>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <label className="text-xs text-slate-500 block mb-1">عمليات البحث المجانية المستخدمة</label>
                    <span className="text-white">{userDetails.user.free_searches_used}</span>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <label className="text-xs text-slate-500 block mb-1">عمليات البحث الإضافية</label>
                    <span className="text-white">{userDetails.user.bonus_searches}</span>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <label className="text-xs text-slate-500 block mb-1">تاريخ التسجيل</label>
                    <span className="text-white">{formatDate(userDetails.user.created_at)}</span>
                  </div>
                  {userDetails.referral && (
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <label className="text-xs text-slate-500 block mb-1">كود الإحالة</label>
                      <span className="text-white font-mono">{userDetails.referral.referral_code}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
                    onClick={() => setShowExtendModal(true)}
                  >
                    <Clock size={18} />
                    تمديد الاشتراك
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-colors"
                    onClick={() => setShowSearchesModal(true)}
                  >
                    <Gift size={18} />
                    إضافة عمليات بحث
                  </button>
                </div>

                {userDetails.searchHistory.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">سجل البحث الأخير</h4>
                    <div className="space-y-2">
                      {userDetails.searchHistory.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
                          <span className="text-white font-mono text-sm">{item.search_query}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              {item.search_type === 'phone' ? 'هاتف' : 'فيسبوك'}
                            </span>
                            <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Extend Subscription Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowExtendModal(false)}>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">تمديد الاشتراك</h2>
              <button onClick={() => setShowExtendModal(false)} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">نوع الاشتراك</label>
                <select
                  value={extendType}
                  onChange={(e) => setExtendType(e.target.value as 'regular' | 'vip')}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="regular">عادي</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">عدد الأشهر</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(Number(e.target.value))}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <button
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50"
                onClick={handleExtendSubscription}
                disabled={updateSubscription.isPending}
              >
                {updateSubscription.isPending ? 'جاري التنفيذ...' : 'تمديد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Searches Modal */}
      {showSearchesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearchesModal(false)}>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">إضافة عمليات بحث مجانية</h2>
              <button onClick={() => setShowSearchesModal(false)} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">عدد عمليات البحث</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bonusSearches}
                  onChange={(e) => setBonusSearches(Number(e.target.value))}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <button
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50"
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
