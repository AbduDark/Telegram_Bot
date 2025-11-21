# 🌙 دليل التثبيت والتشغيل على السيرفر - Dark Install Guide

## 📋 جدول المحتويات

1. [متطلبات السيرفر](#متطلبات-السيرفر)
2. [إعداد السيرفر](#إعداد-السيرفر)
3. [تثبيت المشروع](#تثبيت-المشروع)
4. [إعداد قواعد البيانات](#إعداد-قواعد-البيانات)
5. [ضبط المتغيرات البيئية](#ضبط-المتغيرات-البيئية)
6. [إعداد Telegram Webhook](#إعداد-telegram-webhook)
7. [التشغيل في Production](#التشغيل-في-production)
8. [استخدام PM2 للتشغيل التلقائي](#استخدام-pm2-للتشغيل-التلقائي)
9. [Nginx كـ Reverse Proxy](#nginx-كـ-reverse-proxy)
10. [SSL Certificate (HTTPS)](#ssl-certificate-https)
11. [الصيانة والمراقبة](#الصيانة-والمراقبة)
12. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🖥️ متطلبات السيرفر

### الحد الأدنى للمواصفات:
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+

### البرمجيات المطلوبة:
- Node.js 20.x أو أحدث
- MySQL 8.0 أو MariaDB 10.5+
- Nginx (للـ reverse proxy)
- PM2 (لإدارة العمليات)
- Git

---

## ⚙️ إعداد السيرفر

### 1. تحديث النظام

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. تثبيت Node.js 20.x

```bash
# إضافة مستودع NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# تثبيت Node.js
sudo apt install -y nodejs

# التحقق من الإصدار
node --version  # يجب أن يكون v20.x.x
npm --version
```

### 3. تثبيت MySQL/MariaDB

```bash
# تثبيت MySQL
sudo apt install -y mysql-server

# تشغيل إعداد الأمان
sudo mysql_secure_installation
```

**أو تثبيت MariaDB:**

```bash
sudo apt install -y mariadb-server
sudo mysql_secure_installation
```

### 4. تثبيت Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 5. تثبيت PM2

```bash
sudo npm install -g pm2
```

### 6. تثبيت Git

```bash
sudo apt install -y git
```

---

## 📦 تثبيت المشروع

### 1. إنشاء مستخدم للبوت

```bash
# إنشاء مستخدم جديد
sudo adduser botuser

# إضافة المستخدم لمجموعة sudo (اختياري)
sudo usermod -aG sudo botuser

# التبديل للمستخدم الجديد
su - botuser
```

### 2. استنساخ المشروع

```bash
# الانتقال إلى المجلد الرئيسي
cd ~

# استنساخ المشروع (استبدل بـ URL الخاص بك)
git clone https://github.com/your-username/telegram-bot-project.git

# الدخول للمجلد
cd telegram-bot-project
```

### 3. تثبيت Dependencies

```bash
npm install --production
```

---

## 🗄️ إعداد قواعد البيانات

> **ملاحظة مهمة**: في Production Mode، يستخدم النظام **قاعدة بيانات واحدة موحدة** تحتوي على كل الجداول.  
> هذا يُبسّط الإدارة والنشر.

### 1. الدخول إلى MySQL

```bash
sudo mysql -u root -p
```

### 2. إنشاء قاعدة البيانات والمستخدم

```sql
-- إنشاء مستخدم البوت
CREATE USER 'bot_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';

-- إنشاء قاعدة البيانات الموحدة
CREATE DATABASE telegram_bot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- منح الصلاحيات
GRANT ALL PRIVILEGES ON telegram_bot_db.* TO 'bot_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

**ملاحظة**: لا حاجة لإنشاء قواعد بيانات منفصلة لـ Facebook و Contacts. كل البيانات ستكون في `telegram_bot_db`.

### 3. إنشاء الجداول المطلوبة

```bash
mysql -u bot_user -p telegram_bot_db
```

**في MySQL Console:**

```sql
-- جدول الاشتراكات
CREATE TABLE user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  username VARCHAR(255),
  subscription_type ENUM('regular', 'vip') NOT NULL DEFAULT 'regular',
  subscription_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  subscription_end DATETIME NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_telegram_user_id (telegram_user_id),
  INDEX idx_subscription_type (subscription_type),
  INDEX idx_is_active (is_active)
);

-- جدول Facebook (استورد بياناتك هنا)
CREATE TABLE facebook_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facebook_id VARCHAR(255),
  phone VARCHAR(50),
  name VARCHAR(255),
  facebook_url VARCHAR(500),
  email VARCHAR(255),
  location VARCHAR(255),
  job VARCHAR(255),
  gender ENUM('male', 'female'),
  INDEX idx_phone (phone)
);

-- جدول Contacts (استورد بياناتك هنا)
CREATE TABLE contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  phone2 VARCHAR(50),
  INDEX idx_phone (phone),
  INDEX idx_phone2 (phone2)
);

EXIT;
```

### 4. استيراد البيانات (اختياري)

```bash
# استيراد بيانات Facebook (إذا كان لديك ملف SQL)
mysql -u bot_user -p telegram_bot_db < facebook_data.sql

# استيراد بيانات Contacts (إذا كان لديك ملف SQL)
mysql -u bot_user -p telegram_bot_db < contacts_data.sql
```

### 5. التحقق من الجداول

```bash
mysql -u bot_user -p telegram_bot_db -e "SHOW TABLES;"
```

يجب أن ترى:
- `user_subscriptions`
- `facebook_accounts`
- `contacts`

---

## 🔐 ضبط المتغيرات البيئية

### 1. نسخ ملف `.env.example`

```bash
cp .env.example .env
```

### 2. تعديل ملف `.env`

```bash
nano .env
```

### 3. ضبط المتغيرات (مثال):

```env
# ========================================
# Telegram Bot Configuration
# ========================================
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# ========================================
# Database Configuration (Unified Database)
# ========================================
VIP_DB_HOST=localhost
VIP_DB_PORT=3306
VIP_DB_NAME=telegram_bot_db
VIP_DB_USER=bot_user
VIP_DB_PASSWORD=your_secure_password_here
VIP_DATABASE_URL=mysql://bot_user:your_secure_password_here@localhost:3306/telegram_bot_db

# Note: FACEBOOK_DB_* and CONTACTS_DB_* are NOT needed
# All tables are in the unified database (telegram_bot_db)

# ========================================
# AI API Keys (اختياري)
# ========================================
OPENAI_API_KEY=sk-your-openai-key-here
GROQ_API_KEY=gsk_your-groq-key-here

# ========================================
# Server Configuration
# ========================================
PORT=5000
HOST=0.0.0.0
NODE_ENV=production

# ========================================
# Logging
# ========================================
LOG_LEVEL=info
```

### 4. حفظ الملف

اضغط `Ctrl + O` للحفظ، ثم `Enter`، ثم `Ctrl + X` للخروج.

---

## 📡 إعداد Telegram Webhook

### 1. تشغيل سكريبت الإعداد

```bash
chmod +x scripts/setup-webhook.sh
./scripts/setup-webhook.sh
```

### 2. التحقق من الـ Webhook يدوياً

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

**النتيجة المتوقعة:**

```json
{
  "ok": true,
  "result": {
    "url": "https://yourdomain.com/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## 🚀 التشغيل في Production

### الطريقة الأولى: التشغيل المباشر

```bash
# تشغيل Production Server (بدون Mastra)
npm start

# أو
npm run start:prod
```

### الطريقة الثانية: PM2 (موصى بها)

انتقل إلى [قسم PM2](#استخدام-pm2-للتشغيل-التلقائي) أدناه.

---

## 🔄 استخدام PM2 للتشغيل التلقائي

### 1. إنشاء ملف تكوين PM2

```bash
nano ecosystem.config.cjs
```

**محتوى الملف:**

```javascript
module.exports = {
  apps: [
    {
      name: 'telegram-bot-production',
      script: 'npm',
      args: 'start',
      cwd: '/home/botuser/telegram-bot-project',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### 2. إنشاء مجلد اللوجات

```bash
mkdir -p logs
```

### 3. تشغيل البوت بـ PM2

```bash
pm2 start ecosystem.config.cjs
```

### 4. حفظ قائمة العمليات

```bash
pm2 save
```

### 5. تفعيل التشغيل التلقائي عند بدء النظام

```bash
pm2 startup
# قم بتنفيذ الأمر الذي سيظهر لك
```

### 6. أوامر PM2 المفيدة

```bash
# عرض حالة العمليات
pm2 status

# عرض اللوجات مباشرة
pm2 logs telegram-bot-production

# إعادة تشغيل البوت
pm2 restart telegram-bot-production

# إيقاف البوت
pm2 stop telegram-bot-production

# حذف البوت من PM2
pm2 delete telegram-bot-production

# مراقبة الموارد
pm2 monit
```

---

## 🔀 Nginx كـ Reverse Proxy

### 1. إنشاء ملف تكوين Nginx

```bash
sudo nano /etc/nginx/sites-available/telegram-bot
```

**محتوى الملف:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (سيتم إضافتها بعد الحصول على الشهادة)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logs
    access_log /var/log/nginx/telegram-bot-access.log;
    error_log /var/log/nginx/telegram-bot-error.log;

    # Telegram Webhook
    location /webhook {
        proxy_pass http://localhost:5000/webhook;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Root endpoint (optional - for status page)
    location / {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 2. تفعيل الموقع

```bash
# إنشاء رابط رمزي
sudo ln -s /etc/nginx/sites-available/telegram-bot /etc/nginx/sites-enabled/

# التحقق من التكوين
sudo nginx -t

# إعادة تحميل Nginx
sudo systemctl reload nginx
```

---

## 🔒 SSL Certificate (HTTPS)

### استخدام Let's Encrypt (مجاني)

### 1. تثبيت Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. الحصول على الشهادة

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. التجديد التلقائي

```bash
# اختبار التجديد
sudo certbot renew --dry-run

# Certbot يضيف cron job تلقائياً للتجديد
```

### 4. التحقق من الشهادة

```bash
sudo certbot certificates
```

---

## 🛠️ الصيانة والمراقبة

### 1. تحديث المشروع

```bash
cd ~/telegram-bot-project

# جلب التحديثات
git pull origin main

# تثبيت Dependencies الجديدة
npm install --production

# إعادة تشغيل البوت
pm2 restart telegram-bot-production
```

### 2. Backup قاعدة البيانات

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/home/botuser/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup VIP Database
mysqldump -u bot_user -p'your_password' telegram_bot_vip > $BACKUP_DIR/vip_$DATE.sql

# Backup Facebook Database
mysqldump -u bot_user -p'your_password' facebook_database > $BACKUP_DIR/facebook_$DATE.sql

# Backup Contacts Database
mysqldump -u bot_user -p'your_password' contacts_database > $BACKUP_DIR/contacts_$DATE.sql

# ضغط الملفات
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/*_$DATE.sql

# حذف ملفات SQL غير المضغوطة
rm $BACKUP_DIR/*_$DATE.sql

# حذف النسخ الاحتياطية الأقدم من 30 يوم
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

**جدولة Backup يومي:**

```bash
chmod +x backup-db.sh

# إضافة cron job
crontab -e

# إضافة السطر التالي (يعمل كل يوم الساعة 2 صباحاً)
0 2 * * * /home/botuser/telegram-bot-project/backup-db.sh
```

### 3. مراقبة اللوجات

```bash
# PM2 logs
pm2 logs telegram-bot-production --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/telegram-bot-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/telegram-bot-error.log
```

### 4. مراقبة الموارد

```bash
# استخدام PM2
pm2 monit

# استخدام htop
sudo apt install htop
htop

# استخدام الذاكرة
free -h

# مساحة القرص
df -h
```

---

## 🔍 استكشاف الأخطاء

### المشكلة: البوت لا يستجيب للرسائل

**الحلول:**

1. التحقق من تشغيل البوت:
```bash
pm2 status
```

2. التحقق من اللوجات:
```bash
pm2 logs telegram-bot-production
```

3. التحقق من الـ webhook:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

4. إعادة ضبط الـ webhook:
```bash
./scripts/setup-webhook.sh
```

---

### المشكلة: خطأ في الاتصال بقاعدة البيانات

**الحلول:**

1. التحقق من MySQL:
```bash
sudo systemctl status mysql
```

2. اختبار الاتصال:
```bash
mysql -u bot_user -p telegram_bot_vip
```

3. التحقق من `.env`:
```bash
cat .env | grep DB_
```

---

### المشكلة: Nginx 502 Bad Gateway

**الحلول:**

1. التحقق من تشغيل التطبيق:
```bash
pm2 status
curl http://localhost:5000/health
```

2. التحقق من تكوين Nginx:
```bash
sudo nginx -t
```

3. التحقق من لوجات Nginx:
```bash
sudo tail -f /var/log/nginx/telegram-bot-error.log
```

---

### المشكلة: Port 5000 already in use

**الحلول:**

```bash
# معرفة العملية المستخدمة للبورت
sudo lsof -i :5000

# إيقاف العملية
kill -9 <PID>

# أو تغيير البورت في .env
```

---

## 📊 مراقبة الأداء

### استخدام PM2 Plus (اختياري)

```bash
pm2 link <secret_key> <public_key>
pm2 install pm2-server-monit
```

زيارة: https://app.pm2.io

---

## 🔐 تأمين السيرفر

### 1. تفعيل Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
sudo ufw status
```

### 2. تعطيل تسجيل الدخول بـ root عبر SSH

```bash
sudo nano /etc/ssh/sshd_config

# غيّر هذا السطر:
PermitRootLogin no

# أعد تشغيل SSH
sudo systemctl restart sshd
```

### 3. استخدام SSH Keys بدلاً من كلمات المرور

راجع: https://www.digitalocean.com/community/tutorials/how-to-set-up-ssh-keys-on-ubuntu-20-04

---

## ✅ الخلاصة

بعد اتباع هذا الدليل، يجب أن يكون لديك:

✓ سيرفر جاهز ومؤمّن  
✓ قواعد بيانات مُعدّة  
✓ بوت Telegram يعمل في Production  
✓ PM2 لإدارة العمليات  
✓ Nginx كـ Reverse Proxy  
✓ SSL Certificate (HTTPS)  
✓ نظام Backup تلقائي  

---

## 📞 الدعم

للحصول على المساعدة:
- راجع الملفات في `/docs`
- تحقق من اللوجات في `/logs`
- استخدم `pm2 logs` للمراقبة

---

**🎉 تهانينا! البوت الخاص بك يعمل الآن في Production!**
