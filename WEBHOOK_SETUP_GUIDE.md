# دليل إعداد Webhook للبوت التلقائي

## نظرة عامة

هذا البوت يقوم بإعداد webhook تلقائياً عند بدء التشغيل باستخدام متغيرات البيئة. لن تحتاج لتشغيل سكريبتات يدوية!

## المتغيرات المطلوبة

### 1. TELEGRAM_BOT_TOKEN (مطلوب)
احصل على توكن البوت من [@BotFather](https://t.me/BotFather) في تيليجرام.

```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 2. إعداد رابط الـ Webhook

لديك خيارين:

#### الخيار أ: استخدام TELEGRAM_WEBHOOK_URL (يدوي - له الأولوية)

```bash
# مع دومين
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# أو مع IP السيرفر العام
TELEGRAM_WEBHOOK_URL=https://123.456.789.10/webhook
```

#### الخيار ب: استخدام REPLIT_DEV_DOMAIN (تلقائي على Replit)

إذا كنت تعمل على Replit، لا تحتاج لتعيين `TELEGRAM_WEBHOOK_URL`.
المتغير `REPLIT_DEV_DOMAIN` متوفر تلقائياً وسيتم استخدامه.

## كيف يعمل النظام

### في وضع Development (Mastra)
```
Webhook URL: https://YOUR_DOMAIN/api/webhooks/telegram/action
```

عند تشغيل:
```bash
npm run dev
```

**ملاحظة:** في Mastra، جميع API routes تبدأ تلقائياً بـ `/api/`

### في وضع Production
```
Webhook URL: https://YOUR_DOMAIN/webhook
```

عند تشغيل:
```bash
npm start
# أو
npm run start:prod
```

## أمثلة على الإعداد

### مثال 1: على Replit
```env
# .env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
# لا تحتاج TELEGRAM_WEBHOOK_URL - سيتم استخدام REPLIT_DEV_DOMAIN تلقائياً
```

### مثال 2: على VPS مع دومين
```env
# .env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_URL=https://mybot.example.com/webhook
```

### مثال 3: على VPS مع IP فقط
```env
# .env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_URL=https://123.456.789.10/webhook
```

## التحقق من إعداد الـ Webhook

عند بدء السيرفر، ستشاهد رسالة في اللوجز:

### إذا نجح الإعداد (Production Mode):
```
🔧 [Webhook Setup] Configuring Telegram webhook automatically...
📍 [Webhook Setup] URL: https://your-domain.com/webhook
✅ [Webhook Setup] Configured successfully!
📡 [Webhook Setup] Info: {
  url: 'https://your-domain.com/webhook',
  pending_updates: 0,
  max_connections: 40
}
```

### إذا نجح الإعداد (Development Mode - Mastra):
```
🔧 [Webhook Setup] Configuring Telegram webhook automatically...
📍 [Webhook Setup] URL: https://your-domain.com/api/webhooks/telegram/action
✅ [Webhook Setup] Configured successfully!
📡 [Webhook Setup] Info: {
  url: 'https://your-domain.com/api/webhooks/telegram/action',
  pending_updates: 0,
  max_connections: 40
}
```

### إذا لم يتم الإعداد:
```
⚠️  [Webhook Setup] TELEGRAM_BOT_TOKEN not configured, skipping webhook setup
```

أو:

```
⚠️  [Webhook Setup] No webhook URL available
💡 Set TELEGRAM_WEBHOOK_URL or ensure REPLIT_DEV_DOMAIN is available
```

## الإعداد اليدوي (اختياري)

إذا أردت إعداد webhook يدوياً، يمكنك استخدام:

```bash
./scripts/setup-webhook.sh
```

أو:

```bash
./scripts/setup-telegram-webhook.sh
```

## معلومات Webhook

### Allowed Updates
يستقبل البوت الأحداث التالية:
- `message` - الرسائل العادية
- `callback_query` - أزرار inline
- `pre_checkout_query` - عمليات الدفع (Telegram Stars)

### Max Connections
- العدد الأقصى: 40 اتصال متزامن

## استكشاف الأخطاء

### المشكلة: "TELEGRAM_BOT_TOKEN not configured"
**الحل:** أضف TELEGRAM_BOT_TOKEN في ملف .env

### المشكلة: "No webhook URL available"
**الحل:** أضف TELEGRAM_WEBHOOK_URL أو تأكد من توفر REPLIT_DEV_DOMAIN

### المشكلة: البوت لا يستجيب للرسائل
**الحل:** 
1. تحقق من أن السيرفر يعمل
2. تحقق من لوجز الـ webhook setup
3. تأكد من أن الدومين/IP متاح من الإنترنت
4. تأكد من استخدام HTTPS (مطلوب من Telegram)

## الدعم

إذا واجهت أي مشكلة:
1. راجع لوجز السيرفر عند بدء التشغيل
2. استخدم السكريبت اليدوي `./scripts/setup-webhook.sh`
3. تحقق من أن الدومين/IP يعمل بشكل صحيح
