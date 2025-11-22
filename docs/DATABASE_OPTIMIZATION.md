# دليل تحسين البحث في قاعدة البيانات PostgreSQL

هذا الدليل يشرح كيفية تحسين البحث في PostgreSQL لجعل عمليات البحث سريعة جداً حتى مع ملايين الصفوف.

## 📊 أنواع الـ Indexes المتاحة

### 1️⃣ B-Tree Index (الأكثر استخداماً)

**متى تستخدمه:**
- البحث بالتساوي (`=`)
- البحث بالنطاق (`<`, `>`, `BETWEEN`)
- الترتيب (`ORDER BY`)

**مثال:**
```sql
-- Index بسيط
CREATE INDEX idx_users_email ON users(email);

-- Index متعدد الأعمدة (الترتيب مهم!)
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);

-- Index مع ترتيب تنازلي
CREATE INDEX idx_posts_created ON posts(created_at DESC);
```

**نصيحة:** في الـ Index متعدد الأعمدة، ضع الأعمدة المستخدمة في `WHERE =` أولاً، ثم أعمدة النطاق، ثم أعمدة `ORDER BY`.

---

### 2️⃣ Hash Index (للبحث الدقيق فقط)

**متى تستخدمه:**
- البحث الدقيق السريع جداً
- البحث عن UUID أو tokens

**مثال:**
```sql
CREATE INDEX idx_sessions_token_hash ON sessions USING HASH (session_token);
```

**محدودية:** لا يدعم البحث بالنطاق أو الترتيب.

---

### 3️⃣ GIN Index (للبيانات المركبة)

**متى تستخدمه:**
- البحث في JSONB
- البحث في Arrays
- البحث النصي الكامل (Full-text search)
- البحث بـ LIKE مع `pg_trgm`

**أمثلة:**

```sql
-- JSONB
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

-- Full-text search
CREATE INDEX idx_articles_content ON articles 
USING GIN (to_tsvector('arabic', content));

-- البحث بـ LIKE
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_companies_name ON companies USING GIN (name gin_trgm_ops);
SELECT * FROM companies WHERE name LIKE '%شركة%';

-- Arrays
CREATE INDEX idx_products_tags ON products USING GIN (tags);
```

---

### 4️⃣ BRIN Index (للبيانات الضخمة المرتبة)

**متى تستخدمه:**
- جداول ضخمة (مليارات الصفوف)
- بيانات Time-series (logs, events)
- البيانات المدخلة بشكل تسلسلي

**مثال:**
```sql
CREATE INDEX idx_logs_timestamp ON logs USING BRIN (created_at);
```

**فوائد:**
- حجم صغير جداً (100-1000x أصغر من B-tree)
- صيانة أقل
- مثالي للبيانات المرتبة طبيعياً

---

## ⚡ تقنيات متقدمة للتحسين

### 1. Partial Indexes (فهرسة جزئية)

فهرس فقط الصفوف التي تبحث عنها فعلياً:

```sql
-- فهرسة المستخدمين النشطين فقط
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- فهرسة الطلبات الحديثة فقط
CREATE INDEX idx_recent_orders ON orders(customer_id) 
WHERE created_at > '2024-01-01';
```

**فوائد:**
- حجم أصغر
- بحث أسرع
- صيانة أقل

---

### 2. Covering Indexes (فهرس شامل)

تضمين أعمدة إضافية لتجنب الرجوع للجدول:

```sql
-- الاستعلام: SELECT email, name FROM users WHERE user_id = 123
CREATE INDEX idx_users_id_covering 
ON users(user_id) INCLUDE (email, name);
```

PostgreSQL يستطيع الإجابة على الاستعلام من الفهرس فقط!

---

### 3. Expression Indexes (فهرس على دوال)

فهرسة قيم محسوبة:

```sql
-- بحث غير حساس لحالة الأحرف
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- استخراج من JSONB
CREATE INDEX idx_orders_total 
ON orders((metadata->>'total_amount')::numeric);
```

---

## 🔍 أمثلة عملية

### مثال: البحث عن رقم هاتف في ملايين الصفوف

```sql
-- الجدول
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- بدون Index (بطيء جداً - Seq Scan)
SELECT * FROM customers WHERE phone = '+201234567890';
-- الوقت: 15000ms على 10M صف

-- مع B-Tree Index (سريع جداً)
CREATE INDEX idx_customers_phone ON customers(phone);
SELECT * FROM customers WHERE phone = '+201234567890';
-- الوقت: 5ms ⚡

-- للبحث الجزئي (مثل: يبدأ بـ +20)
CREATE INDEX idx_customers_phone_pattern 
ON customers(phone varchar_pattern_ops);
SELECT * FROM customers WHERE phone LIKE '+20%';
-- الوقت: 8ms ⚡
```

---

### مثال: البحث في النصوص العربية

```sql
-- تفعيل Full-text search للعربية
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500),
    content TEXT,
    search_vector tsvector
);

-- إنشاء عمود البحث تلقائياً
CREATE OR REPLACE FUNCTION articles_search_trigger() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        to_tsvector('arabic', COALESCE(NEW.title, '')) || 
        to_tsvector('arabic', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_vector 
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();

-- إنشاء GIN Index
CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- البحث (سريع جداً!)
SELECT * FROM articles 
WHERE search_vector @@ to_tsquery('arabic', 'تكنولوجيا | برمجة');
-- الوقت: 15ms على 5M مقالة ⚡
```

---

### مثال: البحث المتقدم في JSONB

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    metadata JSONB
);

-- GIN Index على JSONB
CREATE INDEX idx_products_metadata ON products USING GIN (metadata);

-- أمثلة بحث سريعة
-- البحث عن قيمة معينة
SELECT * FROM products 
WHERE metadata @> '{"category": "electronics"}';

-- البحث عن مفتاح موجود
SELECT * FROM products 
WHERE metadata ? 'discount';

-- البحث داخل array في JSONB
SELECT * FROM products 
WHERE metadata->'tags' @> '["new"]';

-- كل هذه الاستعلامات سريعة جداً مع GIN Index ⚡
```

---

## 🎯 استراتيجية تحسين شاملة

### الخطوة 1: تحليل الاستعلامات البطيئة

```sql
-- تفعيل تسجيل الاستعلامات البطيئة
ALTER DATABASE your_database SET log_min_duration_statement = 1000;

-- فحص خطة تنفيذ الاستعلام
EXPLAIN ANALYZE 
SELECT * FROM orders 
WHERE customer_id = 123 
  AND created_at > '2024-01-01'
ORDER BY created_at DESC;
```

---

### الخطوة 2: إنشاء Indexes المناسبة

```sql
-- Index متعدد يطابق نمط الاستعلام
CREATE INDEX idx_orders_customer_date 
ON orders(customer_id, created_at DESC);

-- أو Covering Index للأداء الأقصى
CREATE INDEX idx_orders_customer_date_covering 
ON orders(customer_id, created_at DESC) 
INCLUDE (total_amount, status);
```

---

### الخطوة 3: مراقبة استخدام Indexes

```sql
-- عرض Indexes غير المستخدمة
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- عرض استخدام Indexes
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## ⚙️ إعدادات PostgreSQL للأداء

```sql
-- زيادة الذاكرة لإنشاء Indexes
SET maintenance_work_mem = '2GB';

-- تفعيل Parallel Index Creation
SET max_parallel_workers_per_gather = 4;
SET max_parallel_maintenance_workers = 4;

-- إنشاء Index بدون حجب الجدول (production)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- تحديث الإحصائيات (مهم جداً!)
ANALYZE users;
ANALYZE orders;

-- إعادة بناء Index مجزأ
REINDEX INDEX CONCURRENTLY idx_users_email;
```

---

## 📈 قياس الأداء

### قبل التحسين:
```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
```
```
Seq Scan on orders  (cost=0.00..250000.00 rows=100 width=...)
Execution Time: 15234.567 ms
```

### بعد إضافة Index:
```sql
CREATE INDEX idx_orders_customer ON orders(customer_id);
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
```
```
Index Scan using idx_orders_customer on orders  (cost=0.42..12.44 rows=100 width=...)
Execution Time: 2.345 ms  ⚡ (تحسن 6500x!)
```

---

## 🛠️ نصائح مهمة

### ✅ افعل:
- استخدم `EXPLAIN ANALYZE` دائماً لفحص الاستعلامات
- أنشئ Indexes على أعمدة الـ WHERE و JOIN
- استخدم Partial Indexes للبيانات المفلترة
- نفذ `ANALYZE` بانتظام
- راقب Indexes غير المستخدمة واحذفها

### ❌ لا تفعل:
- لا تنشئ Indexes على أعمدة ذات قيم قليلة (boolean) إلا مع Partial Index
- لا تبالغ في Indexes (كل Index يبطئ الكتابة)
- لا تستخدم دوال في WHERE بدون Expression Index
- لا تنسى صيانة Indexes (`REINDEX`, `VACUUM`)

---

## 🚀 سيناريو كامل للتطبيق

```sql
-- جدول الطلبات (10M صف)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes للأداء الأقصى
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE status != 'completed';
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_metadata ON orders USING GIN (metadata);

-- Composite Index لأكثر الاستعلامات شيوعاً
CREATE INDEX idx_orders_customer_created 
ON orders(customer_id, created_at DESC) 
INCLUDE (total_amount, status);

-- تحديث الإحصائيات
ANALYZE orders;

-- اختبار الأداء
EXPLAIN ANALYZE 
SELECT id, total_amount, status, created_at
FROM orders 
WHERE customer_id = 12345 
  AND created_at > NOW() - INTERVAL '1 month'
ORDER BY created_at DESC 
LIMIT 50;

-- النتيجة: < 5ms على 10M صف ⚡
```

---

## 📚 ملخص سريع

| نوع البحث | Index المناسب | مثال |
|-----------|---------------|------|
| رقم هاتف/email | B-Tree | `CREATE INDEX ON users(phone)` |
| نطاق تواريخ | B-Tree | `CREATE INDEX ON orders(created_at)` |
| نص عربي | GIN + tsvector | `CREATE INDEX ON articles USING GIN(search_vector)` |
| JSONB | GIN | `CREATE INDEX ON products USING GIN(metadata)` |
| LIKE '%text%' | GIN + pg_trgm | `CREATE INDEX ON names USING GIN(name gin_trgm_ops)` |
| Time-series ضخم | BRIN | `CREATE INDEX ON logs USING BRIN(timestamp)` |

---

**💡 النصيحة الذهبية:**  
ابدأ بـ B-Tree Index على أعمدة الـ WHERE الأكثر استخداماً، ثم حسّن تدريجياً بناءً على تحليل `EXPLAIN ANALYZE`.

**⚡ الهدف:** استعلام < 10ms حتى على ملايين الصفوف!
