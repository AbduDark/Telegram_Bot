import { useState } from 'react';
import { useSubscriptions } from '../api/hooks';
import { ChevronLeft, ChevronRight, Filter, CreditCard } from 'lucide-react';

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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <CreditCard size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">إدارة الاشتراكات</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2">
          <Filter size={18} className="text-slate-400" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-transparent text-white border-none focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-800">جميع الحالات</option>
            <option value="active" className="bg-slate-800">نشط</option>
            <option value="expired" className="bg-slate-800">منتهي</option>
            <option value="inactive" className="bg-slate-800">غير نشط</option>
          </select>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2">
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="bg-transparent text-white border-none focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-800">جميع الأنواع</option>
            <option value="vip" className="bg-slate-800">VIP</option>
            <option value="regular" className="bg-slate-800">عادي</option>
          </select>
        </div>
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
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">تاريخ البدء</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">تاريخ الانتهاء</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data?.subscriptions?.map((sub) => (
                <tr key={sub.telegram_user_id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-mono text-sm">{sub.telegram_user_id}</td>
                  <td className="px-6 py-4 text-white">{sub.username || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      sub.subscription_type === 'vip'
                        ? 'bg-amber-500/20 text-amber-400'
                        : sub.subscription_type === 'regular'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {sub.subscription_type === 'vip'
                        ? 'VIP'
                        : sub.subscription_type === 'regular'
                        ? 'عادي'
                        : 'غير مشترك'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{formatDate(sub.subscription_start)}</td>
                  <td className="px-6 py-4 text-slate-300">{formatDate(sub.subscription_end)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      !sub.is_active
                        ? 'bg-slate-500/20 text-slate-400'
                        : isExpired(sub.subscription_end)
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
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
    </div>
  );
}
