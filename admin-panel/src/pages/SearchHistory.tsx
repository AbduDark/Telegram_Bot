import { useState } from 'react';
import { useSearchHistory } from '../api/hooks';
import { ChevronLeft, ChevronRight, Filter, Phone, Facebook, History } from 'lucide-react';

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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <History size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">سجل عمليات البحث</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2">
          <Filter size={18} className="text-slate-400" />
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="bg-transparent text-white border-none focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-800">جميع الأنواع</option>
            <option value="phone" className="bg-slate-800">بحث بالهاتف</option>
            <option value="facebook_id" className="bg-slate-800">بحث بالفيسبوك</option>
          </select>
        </div>
        <div className="bg-slate-700/30 rounded-xl px-4 py-2">
          <span className="text-slate-400 text-sm">إجمالي النتائج: </span>
          <span className="text-white font-semibold">{data?.pagination?.total || 0}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">#</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">المستخدم</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">نوع البحث</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">نص البحث</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">النتائج</th>
                <th className="text-right text-sm font-medium text-slate-400 px-6 py-4">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data?.history?.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-sm">{(page - 1) * 50 + index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-white">{item.username || '-'}</span>
                      <span className="text-xs text-slate-500 font-mono">{item.telegram_user_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      item.search_type === 'phone'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {item.search_type === 'phone' ? (
                        <>
                          <Phone size={12} />
                          هاتف
                        </>
                      ) : item.search_type === 'facebook_id' ? (
                        <>
                          <Facebook size={12} />
                          فيسبوك
                        </>
                      ) : (
                        <>{item.search_type}</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="bg-slate-700/50 text-slate-300 px-3 py-1 rounded-lg text-sm font-mono">
                      {item.search_query}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-bold ${
                      item.results_count > 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {item.results_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(item.created_at)}</td>
                </tr>
              ))}
              {(!data?.history || data.history.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    لا توجد عمليات بحث
                  </td>
                </tr>
              )}
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
