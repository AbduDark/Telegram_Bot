# 🚀 تشغيل التطبيق في البرودكشن

## طريقة سريعة - أمر واحد لتشغيل كل شيء

الآن يمكنك تشغيل السيرفر والـ Inngest معاً بأمر واحد فقط:

```bash
npm run start:prod
```

أو مباشرة:

```bash
./scripts/start-production.sh
```

هذا الأمر سيقوم بـ:
- ✅ تشغيل Inngest server على المنفذ 3000
- ✅ تشغيل Production Server على المنفذ 5000
- ✅ ربط الاثنين معاً تلقائياً
- ✅ إعداد Telegram webhook تلقائياً

---

## 🔧 المتطلبات

تأكد من إعداد المتغيرات التالية في Environment Variables:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook
DATABASE_URL=postgresql://...
```

---

## 📊 تحسين البحث في قاعدة البيانات

لجعل البحث سريعاً جداً (أقل من 10 milliseconds) حتى مع ملايين الصفوف:

اقرأ الدليل الكامل في: **[docs/DATABASE_OPTIMIZATION.md](docs/DATABASE_OPTIMIZATION.md)**

### ملخص سريع:

```sql
-- مثال: البحث عن رقم هاتف في 10 مليون صف
CREATE INDEX idx_customers_phone ON customers(phone);

-- مثال: البحث النصي في المحتوى العربي
CREATE INDEX idx_articles_search 
ON articles USING GIN (to_tsvector('arabic', content));

-- مثال: البحث في JSONB
CREATE INDEX idx_products_metadata 
ON products USING GIN (metadata);
```

**النتيجة:** بحث < 5ms بدلاً من 15000ms! ⚡

---

## 📝 ملاحظات مهمة

1. **Development**: استخدم `npm run dev` للتطوير (Mastra UI متاح)
2. **Production**: استخدم `npm run start:prod` للبرودكشن (بدون Mastra UI)
3. **الفرق**: في البرودكشن يعمل السيرفر بشكل أخف وأسرع
4. **الـ Webhook**: يتم إعداده تلقائياً عند بدء السيرفر

---

## 🛠️ استكشاف الأخطاء

### المشكلة: السيرفر لا يعمل
```bash
# تحقق من العمليات الجارية
ps aux | grep -E 'tsx|inngest'

# أوقف جميع العمليات
pkill -f tsx
pkill -f inngest

# ابدأ من جديد
npm run start:prod
```

### المشكلة: Telegram webhook لا يعمل
```bash
# تحقق من الـ webhook يدوياً
./scripts/setup-webhook.sh
```

### المشكلة: قاعدة البيانات بطيئة
```sql
-- تحقق من الاستعلامات البطيئة
EXPLAIN ANALYZE SELECT ...

-- أضف Indexes المناسبة (راجع DATABASE_OPTIMIZATION.md)
```

---

## 🎯 للمزيد من المعلومات

- دليل تحسين قاعدة البيانات: [DATABASE_OPTIMIZATION.md](docs/DATABASE_OPTIMIZATION.md)
- إعداد Telegram Bot: راجع ملف `.env.example`
