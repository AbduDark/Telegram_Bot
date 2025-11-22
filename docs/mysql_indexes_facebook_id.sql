-- ═══════════════════════════════════════════════════════════
-- إضافة Index على facebook_id للبحث السريع
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- قاعدة VIP
-- ═══════════════════════════════════════════════════════════
USE telegram_bot_vip;

-- التحقق من وجود Index مسبقاً
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'facebook_accounts' 
  AND index_name = 'idx_facebook_id';

-- إنشاء Index إذا لم يكن موجوداً
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_facebook_id ON facebook_accounts(facebook_id)',
  'SELECT "Index already exists on VIP database" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════
-- قاعدة Regular
-- ═══════════════════════════════════════════════════════════
USE telegram_bot_regular;

-- التحقق من وجود Index مسبقاً
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'facebook_accounts' 
  AND index_name = 'idx_facebook_id';

-- إنشاء Index إذا لم يكن موجوداً
SET @sql = IF(@index_exists = 0, 
  'CREATE INDEX idx_facebook_id ON facebook_accounts(facebook_id)',
  'SELECT "Index already exists on Regular database" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════
-- التحقق من الـ Indexes المضافة
-- ═══════════════════════════════════════════════════════════

SELECT 
  'VIP Database' as database_name,
  table_name,
  index_name,
  column_name,
  index_type
FROM information_schema.statistics 
WHERE table_schema = 'telegram_bot_vip' 
  AND table_name = 'facebook_accounts' 
  AND index_name = 'idx_facebook_id'

UNION ALL

SELECT 
  'Regular Database' as database_name,
  table_name,
  index_name,
  column_name,
  index_type
FROM information_schema.statistics 
WHERE table_schema = 'telegram_bot_regular' 
  AND table_name = 'facebook_accounts' 
  AND index_name = 'idx_facebook_id';

SELECT '✅ Index على facebook_id تم إضافته بنجاح!' as status;
