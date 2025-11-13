-- ════════════════════════════════════════════════════════════════════
-- تحديث جدول user_subscriptions لدعم الاشتراكات الشهرية
-- Database Migration: Add subscription_end support for monthly subscriptions
-- ════════════════════════════════════════════════════════════════════

-- استخدام قاعدة بيانات VIP
USE telegram_bot_vip;

-- ════════════════════════════════════════════════════════════════════
-- الخطوة 1: التحقق من الجدول الحالي
-- ════════════════════════════════════════════════════════════════════

-- عرض البنية الحالية للجدول
DESCRIBE user_subscriptions;

-- ════════════════════════════════════════════════════════════════════
-- الخطوة 2: تحديث الجدول (إذا لم يكن موجوداً)
-- ════════════════════════════════════════════════════════════════════

-- حذف الجدول القديم إذا كنت تريد البدء من جديد (احذر: سيحذف كل البيانات!)
-- DROP TABLE IF EXISTS user_subscriptions;

-- إنشاء جدول محدث مع دعم subscription_end
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  username VARCHAR(255),
  subscription_type ENUM('regular', 'vip') NOT NULL DEFAULT 'regular',
  subscription_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  subscription_end DATETIME NULL,  -- NULL = unlimited, otherwise expiry date
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_telegram_user_id (telegram_user_id),
  INDEX idx_subscription_type (subscription_type),
  INDEX idx_is_active (is_active),
  INDEX idx_subscription_end (subscription_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ════════════════════════════════════════════════════════════════════
-- الخطوة 3: إضافة عمود subscription_end للجداول الموجودة
-- ════════════════════════════════════════════════════════════════════

-- إذا كان الجدول موجوداً بالفعل، أضف العمود الجديد
-- تنفذ فقط إذا لم يكن العمود موجوداً
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_end DATETIME NULL AFTER subscription_start;

-- إضافة الفهرس للعمود الجديد
ALTER TABLE user_subscriptions 
ADD INDEX IF NOT EXISTS idx_subscription_end (subscription_end);

-- ════════════════════════════════════════════════════════════════════
-- الخطوة 4: أمثلة على الاستخدام
-- ════════════════════════════════════════════════════════════════════

-- ═══ إضافة مستخدم VIP لمدة شهر ═══
INSERT INTO user_subscriptions 
(telegram_user_id, username, subscription_type, subscription_start, subscription_end, is_active)
VALUES 
(123456789, 'example_vip_user', 'vip', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), TRUE)
ON DUPLICATE KEY UPDATE 
  subscription_type = 'vip', 
  subscription_end = DATE_ADD(NOW(), INTERVAL 1 MONTH), 
  is_active = TRUE;

-- ═══ إضافة مستخدم عادي لمدة شهر ═══
INSERT INTO user_subscriptions 
(telegram_user_id, username, subscription_type, subscription_start, subscription_end, is_active)
VALUES 
(987654321, 'example_regular_user', 'regular', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), TRUE)
ON DUPLICATE KEY UPDATE 
  subscription_type = 'regular', 
  subscription_end = DATE_ADD(NOW(), INTERVAL 1 MONTH), 
  is_active = TRUE;

-- ═══ إضافة مستخدم VIP بدون تاريخ انتهاء (unlimited) ═══
INSERT INTO user_subscriptions 
(telegram_user_id, username, subscription_type, subscription_start, subscription_end, is_active)
VALUES 
(111222333, 'lifetime_vip_user', 'vip', NOW(), NULL, TRUE);

-- ════════════════════════════════════════════════════════════════════
-- الخطوة 5: استعلامات مفيدة لإدارة الاشتراكات
-- ════════════════════════════════════════════════════════════════════

-- ═══ عرض جميع الاشتراكات النشطة ═══
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
  END AS status,
  is_active
FROM user_subscriptions
WHERE is_active = TRUE
ORDER BY subscription_type DESC, subscription_start DESC;

-- ═══ عرض الاشتراكات المنتهية التي ما زالت نشطة ═══
SELECT 
  telegram_user_id,
  username,
  subscription_type,
  subscription_end,
  DATEDIFF(NOW(), subscription_end) AS days_expired
FROM user_subscriptions
WHERE is_active = TRUE 
  AND subscription_end IS NOT NULL 
  AND subscription_end < NOW()
ORDER BY subscription_end DESC;

-- ═══ تجديد اشتراك لمدة شهر ═══
UPDATE user_subscriptions 
SET 
  subscription_end = DATE_ADD(NOW(), INTERVAL 1 MONTH),
  is_active = TRUE
WHERE telegram_user_id = 123456789;

-- ═══ تجديد اشتراك لمدة 3 أشهر ═══
UPDATE user_subscriptions 
SET 
  subscription_end = DATE_ADD(NOW(), INTERVAL 3 MONTH),
  is_active = TRUE
WHERE telegram_user_id = 123456789;

-- ═══ إلغاء اشتراك ═══
UPDATE user_subscriptions 
SET 
  is_active = FALSE,
  subscription_end = NOW()
WHERE telegram_user_id = 123456789;

-- ═══ إعادة تفعيل اشتراك لمدة شهر ═══
UPDATE user_subscriptions 
SET 
  is_active = TRUE,
  subscription_end = DATE_ADD(NOW(), INTERVAL 1 MONTH)
WHERE telegram_user_id = 123456789;

-- ════════════════════════════════════════════════════════════════════
-- الخطوة 6: تعطيل الاشتراكات المنتهية تلقائياً
-- ════════════════════════════════════════════════════════════════════

-- هذا الاستعلام يمكن تشغيله دورياً (cron job) لتعطيل الاشتراكات المنتهية
UPDATE user_subscriptions 
SET is_active = FALSE
WHERE subscription_end IS NOT NULL 
  AND subscription_end < NOW() 
  AND is_active = TRUE;

-- ════════════════════════════════════════════════════════════════════
-- الخطوة 7: إحصائيات مفيدة
-- ════════════════════════════════════════════════════════════════════

-- ═══ إحصائيات الاشتراكات ═══
SELECT 
  subscription_type,
  COUNT(*) AS total_users,
  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_users,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive_users,
  SUM(CASE WHEN subscription_end IS NULL THEN 1 ELSE 0 END) AS unlimited_users,
  SUM(CASE WHEN subscription_end > NOW() AND is_active = TRUE THEN 1 ELSE 0 END) AS valid_subscriptions,
  SUM(CASE WHEN subscription_end < NOW() AND is_active = TRUE THEN 1 ELSE 0 END) AS expired_but_active
FROM user_subscriptions
GROUP BY subscription_type;

-- ═══ عرض الاشتراكات التي ستنتهي خلال 7 أيام ═══
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

-- ════════════════════════════════════════════════════════════════════
-- ملاحظات مهمة:
-- ════════════════════════════════════════════════════════════════════
--
-- 1. subscription_end = NULL يعني اشتراك غير محدود
-- 2. subscription_end > NOW() يعني الاشتراك ما زال صالحاً
-- 3. subscription_end < NOW() يعني الاشتراك منتهي
-- 4. يجب تشغيل استعلام التعطيل التلقائي دورياً (cron job)
-- 5. استخدم ON DUPLICATE KEY UPDATE لتحديث الاشتراكات بدلاً من إضافة مستخدمين جدد
--
-- ════════════════════════════════════════════════════════════════════
