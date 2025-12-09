import { useState, useEffect } from 'react';
import { useSettings, useUpdateSettings } from '../api/hooks';
import { Save, Settings as SettingsIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface SettingsForm {
  free_searches_limit: string;
  monthly_search_limit: string;
  channel_id: string;
  vip_price_stars: string;
  regular_price_stars: string;
  referral_bonus_searches: string;
  bot_welcome_message: string;
}

const defaultSettings: SettingsForm = {
  free_searches_limit: '3',
  monthly_search_limit: '30',
  channel_id: '',
  vip_price_stars: '100',
  regular_price_stars: '50',
  referral_bonus_searches: '3',
  bot_welcome_message: '',
};

const settingLabels: Record<string, string> = {
  free_searches_limit: 'عدد عمليات البحث المجانية',
  monthly_search_limit: 'الحد الشهري للبحث',
  channel_id: 'معرف القناة',
  vip_price_stars: 'سعر اشتراك VIP (نجوم)',
  regular_price_stars: 'سعر الاشتراك العادي (نجوم)',
  referral_bonus_searches: 'مكافأة الإحالة (عمليات بحث)',
  bot_welcome_message: 'رسالة الترحيب',
};

export default function Settings() {
  const { data, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<SettingsForm>(defaultSettings);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (data?.settings) {
      const settingsMap: Record<string, string> = {};
      data.settings.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      setForm({
        free_searches_limit: settingsMap.free_searches_limit || defaultSettings.free_searches_limit,
        monthly_search_limit: settingsMap.monthly_search_limit || defaultSettings.monthly_search_limit,
        channel_id: settingsMap.channel_id || defaultSettings.channel_id,
        vip_price_stars: settingsMap.vip_price_stars || defaultSettings.vip_price_stars,
        regular_price_stars: settingsMap.regular_price_stars || defaultSettings.regular_price_stars,
        referral_bonus_searches: settingsMap.referral_bonus_searches || defaultSettings.referral_bonus_searches,
        bot_welcome_message: settingsMap.bot_welcome_message || defaultSettings.bot_welcome_message,
      });
    }
  }, [data]);

  const handleChange = (key: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(form as unknown as Record<string, string>);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
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
          حدث خطأ في تحميل الإعدادات
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
          <SettingsIcon size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">إعدادات البوت</h1>
      </div>

      {/* Settings Card */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-slate-700/50">
          <SettingsIcon size={24} className="text-slate-400" />
          <h2 className="text-lg font-semibold text-white">الإعدادات العامة</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.keys(form) as Array<keyof SettingsForm>).map((key) => (
              <div key={key} className={`space-y-2 ${key === 'bot_welcome_message' ? 'md:col-span-2' : ''}`}>
                <label className="block text-sm font-medium text-slate-300">{settingLabels[key]}</label>
                {key === 'bot_welcome_message' ? (
                  <textarea
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    rows={4}
                    placeholder="أدخل رسالة الترحيب..."
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                  />
                ) : (
                  <input
                    type={key.includes('limit') || key.includes('price') || key.includes('bonus') ? 'number' : 'text'}
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={`أدخل ${settingLabels[key]}`}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
            <button
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50"
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              <Save size={18} />
              {updateSettings.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>

            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={18} />
                <span className="text-sm">تم حفظ الإعدادات بنجاح</span>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={18} />
                <span className="text-sm">حدث خطأ في حفظ الإعدادات</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
