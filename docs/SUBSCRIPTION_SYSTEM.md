# 📊 نظام الاشتراكات الشهرية - Subscription System

## 🎯 نظرة عامة

يوفر البوت نظامين للاشتراك:

### 👑 اشتراك VIP
- **البحث**: في جميع قواعد البيانات (Facebook + Contacts)
- **النتائج**: شاملة وتفصيلية من جميع المصادر
- **المدة**: اشتراك شهري قابل للتجديد
- **المميزات**:
  - بيانات Facebook الكاملة (الاسم، الرابط، البريد الإلكتروني، الموقع، الوظيفة، النوع)
  - بيانات Contacts (الاسم، العنوان، الهاتف الأول، الهاتف الثاني)

### 👤 اشتراك عادي (Regular)
- **البحث**: فقط في قاعدة بيانات Facebook
- **النتائج**: بيانات Facebook فقط
- **المدة**: اشتراك شهري قابل للتجديد
- **المميزات**:
  - بيانات Facebook الأساسية

---

## 📋 كيفية إدارة الاشتراكات

### 1️⃣ إضافة اشتراك جديد

#### عبر SQL:
```sql
-- إضافة مستخدم VIP لمدة شهر
INSERT INTO user_subscriptions 
(telegram_user_id, username, subscription_type, subscription_start, subscription_end, is_active)
VALUES 
(123456789, 'username', 'vip', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), TRUE);

-- إضافة مستخدم عادي لمدة شهر
INSERT INTO user_subscriptions 
(telegram_user_id, username, subscription_type, subscription_start, subscription_end, is_active)
VALUES 
(987654321, 'username', 'regular', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), TRUE);
```

#### عبر الكود (باستخدام database.ts functions):
```typescript
import { addSubscription } from './src/mastra/config/database';

// إضافة VIP لمدة شهر
await addSubscription(123456789, 'username', 'vip', 1);

// إضافة عادي لمدة 3 أشهر
await addSubscription(987654321, 'username', 'regular', 3);
```

---

### 2️⃣ تجديد اشتراك

#### عبر SQL:
```sql
-- تجديد لمدة شهر
UPDATE user_subscriptions 
SET subscription_end = DATE_ADD(NOW(), INTERVAL 1 MONTH), is_active = TRUE
WHERE telegram_user_id = 123456789;

-- تجديد لمدة 3 أشهر
UPDATE user_subscriptions 
SET subscription_end = DATE_ADD(NOW(), INTERVAL 3 MONTH), is_active = TRUE
WHERE telegram_user_id = 123456789;
```

#### عبر الكود:
```typescript
import { renewSubscription } from './src/mastra/config/database';

// تجديد VIP لمدة شهر
await renewSubscription(123456789, 'vip', 1);

// تجديد عادي لمدة 6 أشهر
await renewSubscription(987654321, 'regular', 6);
```

---

### 3️⃣ إلغاء اشتراك

#### عبر SQL:
```sql
UPDATE user_subscriptions 
SET is_active = FALSE, subscription_end = NOW()
WHERE telegram_user_id = 123456789;
```

#### عبر الكود:
```typescript
import { cancelSubscription } from './src/mastra/config/database';

await cancelSubscription(123456789);
```

---

### 4️⃣ التحقق من حالة الاشتراك

#### عبر الكود:
```typescript
import { hasActiveSubscription, getSubscriptionDetails } from './src/mastra/config/database';

// التحقق من وجود اشتراك نشط
const status = await hasActiveSubscription(123456789);
// { hasSubscription: true, subscriptionType: 'vip' }

// الحصول على تفاصيل الاشتراك
const details = await getSubscriptionDetails(123456789);
```

---

## 🔧 أدوات إدارة الاشتراكات (Tools)

### subscriptionManagementTool

أداة شاملة لإدارة الاشتراكات عبر البوت:

```typescript
// مثال على استخدام الأداة
{
  action: 'add',           // add, renew, cancel, check, details
  telegramUserId: 123456789,
  username: 'user123',
  subscriptionType: 'vip', // vip أو regular
  months: 1                // عدد الأشهر
}
```

**الإجراءات المتاحة:**
- `add`: إضافة اشتراك جديد
- `renew`: تجديد اشتراك موجود
- `cancel`: إلغاء اشتراك
- `check`: التحقق من وجود اشتراك نشط
- `details`: الحصول على تفاصيل الاشتراك

---

## 📊 استعلامات مفيدة

### عرض جميع الاشتراكات النشطة:
```sql
SELECT 
  telegram_user_id,
  username,
  subscription_type,
  subscription_start,
  subscription_end,
  CASE 
    WHEN subscription_end IS NULL THEN 'غير محدود'
    WHEN subscription_end > NOW() THEN CONCAT('متبقي ', DATEDIFF(subscription_end, NOW()), ' يوم')
    ELSE 'منتهي'
  END AS status
FROM user_subscriptions
WHERE is_active = TRUE
ORDER BY subscription_type DESC, subscription_start DESC;
```

### الاشتراكات التي ستنتهي خلال 7 أيام:
```sql
SELECT 
  telegram_user_id,
  username,
  subscription_type,
  subscription_end,
  DATEDIFF(subscription_end, NOW()) AS days_remaining
FROM user_subscriptions
WHERE subscription_end IS NOT NULL
  AND subscription_end > NOW()
  AND subscription_end < DATE_ADD(NOW(), INTERVAL 7 DAY)
  AND is_active = TRUE
ORDER BY subscription_end ASC;
```

### الاشتراكات المنتهية:
```sql
SELECT 
  telegram_user_id,
  username,
  subscription_type,
  subscription_end,
  DATEDIFF(NOW(), subscription_end) AS days_expired
FROM user_subscriptions
WHERE is_active = TRUE 
  AND subscription_end IS NOT NULL 
  AND subscription_end < NOW();
```

### إحصائيات الاشتراكات:
```sql
SELECT 
  subscription_type,
  COUNT(*) AS total_users,
  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_users,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive_users,
  SUM(CASE WHEN subscription_end > NOW() THEN 1 ELSE 0 END) AS valid_subscriptions
FROM user_subscriptions
GROUP BY subscription_type;
```

---

## 🔄 التعطيل التلقائي للاشتراكات المنتهية

يجب تشغيل هذا الاستعلام دورياً (Cron Job) لتعطيل الاشتراكات المنتهية:

```sql
UPDATE user_subscriptions 
SET is_active = FALSE
WHERE subscription_end IS NOT NULL 
  AND subscription_end < NOW() 
  AND is_active = TRUE;
```

**إعداد Cron Job (مثال):**
```bash
# تشغيل كل يوم عند الساعة 2 صباحاً
0 2 * * * mysql -u bot_user -p'PASSWORD' telegram_bot_vip -e "UPDATE user_subscriptions SET is_active = FALSE WHERE subscription_end IS NOT NULL AND subscription_end < NOW() AND is_active = TRUE;"
```

---

## 🗄️ بنية قاعدة البيانات

### جدول user_subscriptions:
```sql
CREATE TABLE user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  username VARCHAR(255),
  subscription_type ENUM('regular', 'vip') NOT NULL DEFAULT 'regular',
  subscription_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  subscription_end DATETIME NULL,  -- NULL = unlimited, otherwise expiry date
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔐 منطق التحقق من الصلاحية

عند البحث، يتحقق النظام من:

1. **is_active = TRUE**: الاشتراك نشط
2. **subscription_end IS NULL OR subscription_end > NOW()**: الاشتراك لم ينتهِ بعد

```typescript
// كود التحقق في database.ts
export async function isVIPUser(telegramUserId: number): Promise<boolean> {
  const [rows] = await vipPool.query(
    `SELECT is_active, subscription_end FROM user_subscriptions 
     WHERE telegram_user_id = ? 
     AND subscription_type = 'vip' 
     AND is_active = TRUE
     AND (subscription_end IS NULL OR subscription_end > NOW())`,
    [telegramUserId]
  );
  return Array.isArray(rows) && rows.length > 0;
}
```

---

## 📝 ملاحظات مهمة

1. **subscription_end = NULL**: اشتراك غير محدود (مدى الحياة)
2. **subscription_end > NOW()**: اشتراك صالح
3. **subscription_end < NOW()**: اشتراك منتهي
4. **is_active = FALSE**: اشتراك ملغى أو معطل
5. جميع التواريخ في المنطقة الزمنية UTC
6. يمكن للمستخدم أن يكون لديه اشتراك واحد فقط في وقت واحد
7. عند التحديث، استخدم `ON DUPLICATE KEY UPDATE` لتجنب التكرار

---

## 🎨 عرض النتائج في البوت

### للمستخدمين VIP:
- نتائج Facebook كاملة
- نتائج Contacts كاملة
- رسالة ترحيبية توضح نوع الاشتراك

### للمستخدمين العاديين:
- نتائج Facebook فقط
- اقتراح للترقية إلى VIP
- رسالة توضح المميزات الإضافية للـ VIP

---

## 🔄 سير العمل (Workflow)

1. المستخدم يرسل رقم هاتف
2. البوت يستدعي `phoneLookupTool`
3. `phoneLookupTool` يستدعي `isVIPUser()`
4. يتم تحديد نوع الاشتراك (VIP أو Regular)
5. البحث في قواعد البيانات المناسبة:
   - **VIP**: Facebook + Contacts
   - **Regular**: Facebook فقط
6. عرض النتائج بشكل منظم حسب نوع الاشتراك

---

## 📞 الدعم الفني

للمساعدة أو الاستفسارات حول نظام الاشتراكات، راجع:
- `docs/DATABASE_EXAMPLES.md`
- `docs/database_migration_subscription.sql`
- `src/mastra/config/database.ts`
- `src/mastra/tools/subscriptionManagementTool.ts`
