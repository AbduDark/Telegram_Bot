# Telegram Phone Lookup Bot 🤖

بوت تليجرام للبحث عن أرقام الهواتف في قاعدتي بيانات منفصلتين (VIP و عادي)

## ✨ المميزات

- 🔍 **بحث ذكي**: يدعم جميع صيغ أرقام الهواتف (+20, 00, 0)
- 👑 **نظام VIP**: قاعدتي بيانات منفصلتين للمشتركين المميزين والعاديين
- ⚡ **سريع وآمن**: باستخدام MySQL وتقنيات حديثة
- 🛠️ **سهل الإعداد**: سكريبت setup تفاعلي
- 🌐 **دعم العربية**: واجهة وتوثيق باللغة العربية

---

## 🚀 البدء السريع

### 1. المتطلبات
```bash
- Node.js 20.x أو أحدث
- MySQL 8.0 أو أحدث
- حساب Telegram Bot
```

### 2. التثبيت

```bash
# استنساخ المشروع
git clone <repository-url>
cd telegram-bot

# تشغيل الإعداد التلقائي
npm install mysql2
node setup.js
```

سكريبت الإعداد سيقوم بـ:
- ✅ طلب معلومات بوت Telegram
- ✅ إعداد اتصال قاعدتي البيانات
- ✅ إنشاء الجداول تلقائياً
- ✅ إضافة مستخدمين VIP
- ✅ تثبيت جميع المكتبات

### 3. التشغيل

```bash
# التشغيل العادي
npm run dev

# أو باستخدام PM2
pm2 start ecosystem.config.js
```

---

## 📚 التوثيق

### للإعداد السريع
📖 [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) - دليل الإعداد الكامل خطوة بخطوة

### للنشر على سيرفر
🚀 [`docs/UBUNTU_DEPLOYMENT_GUIDE.md`](docs/UBUNTU_DEPLOYMENT_GUIDE.md) - دليل النشر على Ubuntu Server

---

## 🗄️ قواعد البيانات

### قاعدة VIP (`telegram_bot_vip`)
للمشتركين المميزين - تحتوي على:
- `facebook_accounts` - بيانات فيسبوك المتقدمة
- `contacts` - جهات اتصال مفصلة
- `user_subscriptions` - إدارة المشتركين VIP

### قاعدة Regular (`telegram_bot_regular`)
للمشتركين العاديين - تحتوي على:
- `facebook_accounts` - بيانات فيسبوك عادية
- `contacts` - جهات اتصال عادية

---

## 👑 إدارة المستخدمين VIP

### إضافة مستخدم VIP

```sql
USE telegram_bot_vip;

INSERT INTO user_subscriptions (telegram_user_id, username, subscription_type, is_active)
VALUES (YOUR_TELEGRAM_USER_ID, 'username', 'vip', TRUE);
```

### عرض المستخدمين VIP

```sql
SELECT * FROM user_subscriptions WHERE subscription_type = 'vip' AND is_active = TRUE;
```

### تعطيل مستخدم VIP

```sql
UPDATE user_subscriptions SET is_active = FALSE WHERE telegram_user_id = YOUR_USER_ID;
```

أو عدّل ملف `vip-users.json` مباشرة.

---

## 📁 هيكل المشروع

```
telegram-bot/
├── setup.js                    # سكريبت الإعداد السريع ⭐
├── vip-users.json             # قائمة المستخدمين VIP
├── .env                       # متغيرات البيئة
├── .env.example               # مثال للمتغيرات
│
├── src/
│   └── mastra/
│       ├── index.ts           # نقطة البداية
│       ├── config/
│       │   └── database.ts    # إعدادات قواعد البيانات
│       ├── agents/
│       │   └── telegramBotAgent.ts
│       └── tools/
│           └── phoneLookupTool.ts  # أداة البحث
│
├── docs/
│   ├── SETUP_GUIDE.md         # دليل الإعداد
│   └── UBUNTU_DEPLOYMENT_GUIDE.md  # دليل النشر
│
└── ecosystem.config.js        # إعدادات PM2
```

---

## 🔧 المتغيرات البيئية

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_token

# VIP Database
VIP_DB_HOST=localhost
VIP_DB_PORT=3306
VIP_DB_NAME=telegram_bot_vip
VIP_DB_USER=bot_user
VIP_DB_PASSWORD=password

# Regular Database
REGULAR_DB_HOST=localhost
REGULAR_DB_PORT=3306
REGULAR_DB_NAME=telegram_bot_regular
REGULAR_DB_USER=bot_user
REGULAR_DB_PASSWORD=password

# Optional AI
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
```

---

## 🎯 كيف يعمل؟

1. **يستقبل البوت رسالة** من مستخدم
2. **يتحقق من نوع المستخدم** (VIP أو عادي)
3. **يبحث في القاعدة المناسبة**:
   - VIP → `telegram_bot_vip`
   - عادي → `telegram_bot_regular`
4. **يرجع النتائج** من جدولي `facebook_accounts` و `contacts`

---

## 🛠️ التقنيات المستخدمة

- **[Mastra](https://mastra.ai)** - إطار عمل AI
- **[Inngest](https://inngest.com)** - Workflow orchestration
- **MySQL 2** - قاعدة البيانات
- **TypeScript** - لغة البرمجة
- **Node.js 20** - بيئة التشغيل

---

## 📞 الدعم

- 📖 راجع التوثيق في مجلد `docs/`
- 🐛 للإبلاغ عن مشاكل: افتح Issue
- 💡 للاقتراحات: افتح Discussion

---

## 📄 الترخيص

MIT License

---

**تم التطوير بـ ❤️ في نوفمبر 2025**
