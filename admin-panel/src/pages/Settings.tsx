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
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>حدث خطأ في تحميل الإعدادات</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h1 className="page-title">إعدادات البوت</h1>

      <div className="settings-card">
        <div className="settings-header">
          <SettingsIcon size={24} />
          <h2>الإعدادات العامة</h2>
        </div>

        <div className="settings-form">
          {(Object.keys(form) as Array<keyof SettingsForm>).map((key) => (
            <div key={key} className="form-group">
              <label>{settingLabels[key]}</label>
              {key === 'bot_welcome_message' ? (
                <textarea
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  rows={4}
                  placeholder="أدخل رسالة الترحيب..."
                />
              ) : (
                <input
                  type={key.includes('limit') || key.includes('price') || key.includes('bonus') ? 'number' : 'text'}
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={`أدخل ${settingLabels[key]}`}
                />
              )}
            </div>
          ))}

          <div className="settings-actions">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              <Save size={18} />
              {updateSettings.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>

            {saveStatus === 'success' && (
              <div className="save-status success">
                <CheckCircle size={18} />
                تم حفظ الإعدادات بنجاح
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="save-status error">
                <AlertCircle size={18} />
                حدث خطأ في حفظ الإعدادات
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
