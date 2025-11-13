# أمثلة إدارة قواعد البيانات

## 📝 إضافة بيانات تجريبية

### قاعدة VIP - بيانات مفصلة

```sql
USE telegram_bot_vip;

-- إضافة حسابات فيسبوك
INSERT INTO facebook_accounts (facebook_id, name, phone, facebook_url, email, location, job, gender)
VALUES 
  ('100012345678', 'أحمد محمد علي', '+201234567890', 'https://facebook.com/ahmad.mohamed', 'ahmad@email.com', 'القاهرة، مصر', 'مهندس برمجيات', 'ذكر'),
  ('100087654321', 'سارة أحمد حسن', '+201098765432', 'https://facebook.com/sara.ahmed', 'sara@email.com', 'الإسكندرية، مصر', 'طبيبة', 'أنثى'),
  ('100011112222', 'محمد حسن', '+201111222333', 'https://facebook.com/mohamed.hassan', NULL, 'الجيزة، مصر', 'مدرس', 'ذكر');

-- إضافة جهات اتصال
INSERT INTO contacts (name, phone, phone2, address)
VALUES 
  ('خالد عبدالله', '+201555444333', '+201555444334', 'شارع الهرم، الجيزة'),
  ('فاطمة محمود', '+201666555444', NULL, 'شارع النصر، المنصورة'),
  ('عمر سعيد', '+201777666555', '+201777666556', 'شارع التحرير، القاهرة');

-- عرض البيانات
SELECT * FROM facebook_accounts;
SELECT * FROM contacts;
```

---

### قاعدة Regular - بيانات أساسية

```sql
USE telegram_bot_regular;

-- إضافة حسابات فيسبوك (بيانات أقل)
INSERT INTO facebook_accounts (name, phone, location)
VALUES 
  ('حسام الدين', '+201222333444', 'القاهرة'),
  ('ليلى كريم', '+201333444555', 'طنطا'),
  ('يوسف إبراهيم', '+201444555666', 'أسيوط');

-- إضافة جهات اتصال
INSERT INTO contacts (name, phone, address)
VALUES 
  ('منى سالم', '+201888777666', 'شارع الجلاء'),
  ('طارق فهمي', '+201999888777', 'شارع الجمهورية'),
  ('نور الهدى', '+201000111222', 'شارع السلام');

-- عرض البيانات
SELECT * FROM facebook_accounts;
SELECT * FROM contacts;
```

---

## 👑 إدارة المستخدمين VIP

### إضافة مستخدم VIP

```sql
USE telegram_bot_vip;

INSERT INTO user_subscriptions (telegram_user_id, username, subscription_type, is_active)
VALUES (987654321, 'vip_username', 'vip', TRUE);
```

### عرض جميع المستخدمين VIP النشطين

```sql
SELECT 
  telegram_user_id,
  username,
  subscription_type,
  subscription_start,
  is_active
FROM user_subscriptions
WHERE subscription_type = 'vip' AND is_active = TRUE
ORDER BY subscription_start DESC;
```

### تعطيل اشتراك VIP

```sql
UPDATE user_subscriptions 
SET is_active = FALSE, subscription_end = NOW()
WHERE telegram_user_id = 987654321;
```

### إعادة تفعيل اشتراك VIP

```sql
UPDATE user_subscriptions 
SET is_active = TRUE, subscription_end = NULL
WHERE telegram_user_id = 987654321;
```

### حذف مستخدم VIP نهائياً

```sql
DELETE FROM user_subscriptions WHERE telegram_user_id = 987654321;
```

---

## 🔍 استعلامات مفيدة

### البحث عن رقم في VIP

```sql
USE telegram_bot_vip;

-- البحث في فيسبوك
SELECT * FROM facebook_accounts 
WHERE phone LIKE '%01234567890%';

-- البحث في جهات الاتصال
SELECT * FROM contacts 
WHERE phone LIKE '%01234567890%' OR phone2 LIKE '%01234567890%';
```

### عدد السجلات في كل جدول

```sql
-- VIP Database
USE telegram_bot_vip;
SELECT 'VIP facebook_accounts' as table_name, COUNT(*) as count FROM facebook_accounts
UNION ALL
SELECT 'VIP contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'VIP user_subscriptions', COUNT(*) FROM user_subscriptions;

-- Regular Database
USE telegram_bot_regular;
SELECT 'Regular facebook_accounts' as table_name, COUNT(*) as count FROM facebook_accounts
UNION ALL
SELECT 'Regular contacts', COUNT(*) FROM contacts;
```

### آخر 10 مشتركين VIP

```sql
USE telegram_bot_vip;

SELECT * FROM user_subscriptions 
ORDER BY subscription_start DESC 
LIMIT 10;
```

---

## 🧹 صيانة قاعدة البيانات

### حذف جميع البيانات (احذر!)

```sql
-- حذف كل البيانات من VIP (احذر!)
USE telegram_bot_vip;
TRUNCATE TABLE facebook_accounts;
TRUNCATE TABLE contacts;
-- لا تحذف user_subscriptions إلا إذا كنت متأكداً

-- حذف كل البيانات من Regular (احذر!)
USE telegram_bot_regular;
TRUNCATE TABLE facebook_accounts;
TRUNCATE TABLE contacts;
```

### تحسين الأداء

```sql
-- إعادة بناء الفهارس
USE telegram_bot_vip;
OPTIMIZE TABLE facebook_accounts;
OPTIMIZE TABLE contacts;
OPTIMIZE TABLE user_subscriptions;

USE telegram_bot_regular;
OPTIMIZE TABLE facebook_accounts;
OPTIMIZE TABLE contacts;
```

### نسخ احتياطي

```bash
# نسخ احتياطي من VIP
mysqldump -u bot_user -p telegram_bot_vip > vip_backup_$(date +%Y%m%d).sql

# نسخ احتياطي من Regular
mysqldump -u bot_user -p telegram_bot_regular > regular_backup_$(date +%Y%m%d).sql

# نسخ احتياطي من كل شيء
mysqldump -u bot_user -p --databases telegram_bot_vip telegram_bot_regular > full_backup_$(date +%Y%m%d).sql
```

### استعادة من نسخة احتياطية

```bash
# استعادة VIP
mysql -u bot_user -p telegram_bot_vip < vip_backup_20251113.sql

# استعادة Regular
mysql -u bot_user -p telegram_bot_regular < regular_backup_20251113.sql
```

---

## 📊 تقارير إحصائية

### إحصائيات عامة

```sql
-- عدد المستخدمين VIP النشطين
USE telegram_bot_vip;
SELECT COUNT(*) as active_vip_users 
FROM user_subscriptions 
WHERE is_active = TRUE AND subscription_type = 'vip';

-- إجمالي السجلات في كلا القاعدتين
SELECT 
  'VIP' as db_type,
  (SELECT COUNT(*) FROM telegram_bot_vip.facebook_accounts) as facebook_count,
  (SELECT COUNT(*) FROM telegram_bot_vip.contacts) as contacts_count
UNION ALL
SELECT 
  'Regular' as db_type,
  (SELECT COUNT(*) FROM telegram_bot_regular.facebook_accounts),
  (SELECT COUNT(*) FROM telegram_bot_regular.contacts);
```

### المستخدمين الأكثر نشاطاً (يتطلب تتبع الاستخدام)

```sql
-- يمكن إضافة جدول usage_logs لتتبع الاستخدام لاحقاً
CREATE TABLE IF NOT EXISTS telegram_bot_vip.usage_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_user_id BIGINT,
  search_query VARCHAR(100),
  results_found INT,
  search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (telegram_user_id),
  INDEX idx_date (search_date)
);
```

---

## 🔐 أمان قاعدة البيانات

### تغيير كلمة مرور المستخدم

```sql
ALTER USER 'bot_user'@'localhost' IDENTIFIED BY 'كلمة_مرور_جديدة_قوية_جداً';
FLUSH PRIVILEGES;
```

### التحقق من الصلاحيات

```sql
SHOW GRANTS FOR 'bot_user'@'localhost';
```

### إنشاء مستخدم للقراءة فقط (للتقارير)

```sql
CREATE USER 'bot_readonly'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT ON telegram_bot_vip.* TO 'bot_readonly'@'localhost';
GRANT SELECT ON telegram_bot_regular.* TO 'bot_readonly'@'localhost';
FLUSH PRIVILEGES;
```

---

**نصيحة:** احفظ هذه الأوامر في ملف للرجوع إليها لاحقاً!
