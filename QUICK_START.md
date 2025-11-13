# البدء السريع ⚡

## إعداد البوت في 3 خطوات

### الخطوة 1: إنشاء قواعد البيانات في MySQL

```bash
mysql -u root -p
```

```sql
-- إنشاء القواعد
CREATE DATABASE telegram_bot_vip CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE telegram_bot_regular CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- إنشاء المستخدم
CREATE USER 'bot_user'@'localhost' IDENTIFIED BY 'كلمة_مرور_قوية';

-- منح الصلاحيات
GRANT ALL PRIVILEGES ON telegram_bot_vip.* TO 'bot_user'@'localhost';
GRANT ALL PRIVILEGES ON telegram_bot_regular.* TO 'bot_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### الخطوة 2: تشغيل سكريبت الإعداد

```bash
npm run setup
```

السكريبت سيسألك عن:
- 🤖 Telegram Bot Token
- 💎 معلومات قاعدة VIP
- 👥 معلومات قاعدة Regular
- 🔑 API Keys (اختياري)
- 👑 إضافة مستخدمين VIP

### الخطوة 3: تشغيل البوت

```bash
npm run dev
```

---

## ✅ تم! البوت جاهز الآن

### إضافة مستخدمين VIP لاحقاً

```sql
USE telegram_bot_vip;

INSERT INTO user_subscriptions (telegram_user_id, username, subscription_type, is_active)
VALUES (YOUR_TELEGRAM_USER_ID, 'username', 'vip', TRUE);
```

### الحصول على Telegram User ID

أرسل `/start` لـ [@userinfobot](https://t.me/userinfobot) في Telegram

---

📖 **للمزيد من التفاصيل**: راجع [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md)
