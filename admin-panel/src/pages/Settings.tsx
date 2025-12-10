import { useState, useEffect } from 'react'
import api from '../services/api'
import { 
  Settings as SettingsIcon, 
  Save,
  RefreshCw,
  AlertCircle,
  Check
} from 'lucide-react'

interface Setting {
  key: string
  value: string
  description?: string
}

const SETTING_LABELS: Record<string, { label: string; description: string }> = {
  free_searches: { label: 'عدد البحث المجاني', description: 'عدد عمليات البحث المجانية للمستخدمين الجدد' },
  monthly_search_limit: { label: 'حد البحث الشهري', description: 'الحد الأقصى لعمليات البحث شهرياً للمشتركين' },
  regular_price_1month: { label: 'سعر الاشتراك العادي (شهر)', description: 'السعر بالنجوم' },
  regular_price_3months: { label: 'سعر الاشتراك العادي (3 أشهر)', description: 'السعر بالنجوم' },
  regular_price_6months: { label: 'سعر الاشتراك العادي (6 أشهر)', description: 'السعر بالنجوم' },
  regular_price_12months: { label: 'سعر الاشتراك العادي (سنة)', description: 'السعر بالنجوم' },
  vip_price_1month: { label: 'سعر اشتراك VIP (شهر)', description: 'السعر بالنجوم' },
  vip_price_3months: { label: 'سعر اشتراك VIP (3 أشهر)', description: 'السعر بالنجوم' },
  vip_price_6months: { label: 'سعر اشتراك VIP (6 أشهر)', description: 'السعر بالنجوم' },
  vip_price_12months: { label: 'سعر اشتراك VIP (سنة)', description: 'السعر بالنجوم' },
  referral_bonus_searches: { label: 'مكافأة الإحالة', description: 'عدد عمليات البحث المجانية عند نجاح الإحالة' },
  referral_discount_percent: { label: 'نسبة خصم المحال', description: 'نسبة الخصم للمستخدم المحال' },
  maintenance_mode: { label: 'وضع الصيانة', description: 'تفعيل أو تعطيل وضع الصيانة' },
  bot_welcome_message: { label: 'رسالة الترحيب', description: 'الرسالة التي تظهر عند بدء البوت' },
}

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/settings')
      setSettings(response.data.settings || [])
      const initial: Record<string, string> = {}
      response.data.settings?.forEach((s: Setting) => {
        initial[s.key] = s.value
      })
      setEditedSettings(initial)
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await api.put('/admin/settings', { settings: editedSettings })
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' })
      await fetchSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'فشل حفظ الإعدادات' })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }))
  }

  const hasChanges = () => {
    return settings.some(s => editedSettings[s.key] !== s.value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-gold-500" />
          <h1 className="text-3xl font-bold text-white">الإعدادات</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            className="btn-outline-gold flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            تحديث
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            حفظ التغييرات
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-900/20 border border-green-800' 
            : 'bg-red-900/20 border border-red-800'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <p className={message.type === 'success' ? 'text-green-500' : 'text-red-500'}>
            {message.text}
          </p>
        </div>
      )}

      <div className="card-dark p-6">
        {settings.length > 0 ? (
          <div className="space-y-6">
            {settings.map((setting) => {
              const meta = SETTING_LABELS[setting.key] || { label: setting.key, description: '' }
              return (
                <div key={setting.key} className="border-b border-dark-200 pb-6 last:border-0 last:pb-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-white font-medium mb-1">
                        {meta.label}
                      </label>
                      <p className="text-gray-500 text-sm">{meta.description}</p>
                    </div>
                    <div className="md:w-64">
                      {setting.key === 'maintenance_mode' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleChange(setting.key, 'false')}
                            className={`flex-1 py-2 rounded-lg transition-colors ${
                              editedSettings[setting.key] === 'false'
                                ? 'bg-green-900/30 text-green-500 border border-green-500'
                                : 'bg-dark-300 text-gray-400'
                            }`}
                          >
                            معطل
                          </button>
                          <button
                            onClick={() => handleChange(setting.key, 'true')}
                            className={`flex-1 py-2 rounded-lg transition-colors ${
                              editedSettings[setting.key] === 'true'
                                ? 'bg-red-900/30 text-red-500 border border-red-500'
                                : 'bg-dark-300 text-gray-400'
                            }`}
                          >
                            مفعل
                          </button>
                        </div>
                      ) : setting.key.includes('message') ? (
                        <textarea
                          value={editedSettings[setting.key] || ''}
                          onChange={(e) => handleChange(setting.key, e.target.value)}
                          className="input-dark w-full min-h-[100px]"
                          placeholder="أدخل الرسالة..."
                        />
                      ) : (
                        <input
                          type={setting.key.includes('price') || setting.key.includes('limit') || setting.key.includes('searches') || setting.key.includes('percent') ? 'number' : 'text'}
                          value={editedSettings[setting.key] || ''}
                          onChange={(e) => handleChange(setting.key, e.target.value)}
                          className="input-dark w-full"
                          placeholder="أدخل القيمة..."
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <SettingsIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">لا توجد إعدادات متاحة</p>
            <p className="text-gray-500 text-sm mt-2">يمكنك إضافة إعدادات من خلال قاعدة البيانات</p>
          </div>
        )}
      </div>
    </div>
  )
}