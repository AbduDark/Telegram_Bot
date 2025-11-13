# دليل تثبيت بوت Telegram على Ubuntu Server مع MySQL

## جدول المحتويات
1. [متطلبات النظام](#متطلبات-النظام)
2. [إعداد السيرفر الأساسي](#إعداد-السيرفر-الأساسي)
3. [تأمين السيرفر](#تأمين-السيرفر)
4. [تثبيت Node.js](#تثبيت-nodejs)
5. [تثبيت MySQL](#تثبيت-mysql)
6. [تثبيت phpMyAdmin](#تثبيت-phpmyadmin)
7. [نشر البوت](#نشر-البوت)
8. [إعداد Nginx](#إعداد-nginx)
9. [تثبيت SSL](#تثبيت-ssl)
10. [إعداد PM2](#إعداد-pm2)
11. [تشغيل البوت](#تشغيل-البوت)
12. [المراقبة والصيانة](#المراقبة-والصيانة)

---

## متطلبات النظام

### الحد الأدنى للمواصفات
- **نظام التشغيل**: Ubuntu 22.04 LTS أو أحدث
- **المعالج**: 2 Core CPU
- **الذاكرة**: 2GB RAM (يُفضل 4GB)
- **التخزين**: 20GB SSD
- **الإنترنت**: اتصال ثابت مع IP ثابت أو دومين

### المتطلبات الإضافية
- صلاحيات Root أو sudo
- اتصال SSH للوصول للسيرفر
- دومين (اختياري لكن موصى به للـ SSL)

---

## إعداد السيرفر الأساسي

### 1. تحديث النظام
```bash
# تسجيل الدخول كـ root أو مستخدم بصلاحيات sudo
sudo apt update && sudo apt upgrade -y
sudo apt dist-upgrade -y
sudo apt autoremove -y
sudo apt autoclean
```

### 2. تعيين المنطقة الزمنية
```bash
# تعيين المنطقة الزمنية (مثال: القاهرة)
sudo timedatectl set-timezone Africa/Cairo

# التحقق
timedatectl
```

### 3. إنشاء مستخدم جديد للأمان
```bash
# لا تستخدم root مباشرة، أنشئ مستخدم جديد
sudo adduser botadmin

# إعطاء صلاحيات sudo
sudo usermod -aG sudo botadmin

# التبديل للمستخدم الجديد
su - botadmin
```

---

## تأمين السيرفر

### 1. تكوين SSH الآمن

```bash
# نسخ احتياطي من ملف الإعداد
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# تعديل الإعدادات
sudo nano /etc/ssh/sshd_config
```

**التعديلات المطلوبة:**
```
# تغيير البورت الافتراضي (اختياري لكن موصى به)
Port 2222

# منع تسجيل الدخول كـ root
PermitRootLogin no

# استخدام SSH Protocol 2 فقط
Protocol 2

# تقليل محاولات المصادقة
MaxAuthTries 3

# منع كلمات المرور الفارغة
PermitEmptyPasswords no

# تفعيل المصادقة بالمفاتيح فقط (موصى به)
PubkeyAuthentication yes
PasswordAuthentication no

# منع X11 Forwarding
X11Forwarding no

# تحديد المستخدمين المسموح لهم
AllowUsers botadmin
```

```bash
# إعادة تشغيل SSH
sudo systemctl restart sshd
```

### 2. إعداد SSH Keys

**على جهازك المحلي:**
```bash
# إنشاء مفتاح SSH (إذا لم يكن لديك واحد)
ssh-keygen -t ed25519 -C "your_email@example.com"

# نسخ المفتاح العام للسيرفر
ssh-copy-id -p 2222 botadmin@your_server_ip
```

**على السيرفر:**
```bash
# التحقق من الصلاحيات الصحيحة
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 3. تثبيت وإعداد UFW Firewall

```bash
# تثبيت UFW
sudo apt install ufw -y

# إعداد القواعد الأساسية
sudo ufw default deny incoming
sudo ufw default allow outgoing

# السماح بـ SSH (استخدم البورت الذي اخترته)
sudo ufw allow 2222/tcp

# السماح بـ HTTP و HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# تفعيل الجدار الناري
sudo ufw enable

# التحقق من الحالة
sudo ufw status verbose
```

### 4. تثبيت Fail2Ban

```bash
# تثبيت Fail2Ban
sudo apt install fail2ban -y

# نسخ ملف الإعداد
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# تعديل الإعدادات
sudo nano /etc/fail2ban/jail.local
```

**إضافة/تعديل:**
```ini
[DEFAULT]
# حظر لمدة ساعة
bantime = 3600
# البحث خلال 10 دقائق
findtime = 600
# الحد الأقصى للمحاولات
maxretry = 3

[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log
```

```bash
# إعادة تشغيل Fail2Ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# التحقق من الحالة
sudo fail2ban-client status sshd
```

### 5. تثبيت أدوات الأمان الإضافية

```bash
# تثبيت rkhunter للكشف عن الـ rootkits
sudo apt install rkhunter -y
sudo rkhunter --update

# تثبيت ClamAV للحماية من الفيروسات
sudo apt install clamav clamav-daemon -y
sudo freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

### 6. إعداد التحديثات التلقائية

```bash
# تثبيت unattended-upgrades
sudo apt install unattended-upgrades -y

# تفعيل التحديثات التلقائية
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## تثبيت Node.js

### 1. تثبيت Node.js 20.x

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت المتطلبات
sudo apt install -y ca-certificates curl gnupg

# إضافة مفتاح GPG من NodeSource
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# إضافة مستودع Node.js 20.x
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# تحديث وتثبيت Node.js
sudo apt update
sudo apt install -y nodejs

# التحقق من الإصدارات
node --version  # يجب أن يكون >= v20.9.0
npm --version
```

### 2. تثبيت أدوات البناء

```bash
# تثبيت build tools
sudo apt install -y build-essential

# تثبيت Git
sudo apt install -y git
git --version
```

---

## تثبيت MySQL

### 1. تثبيت MySQL Server 8.0

```bash
# تحديث قائمة الحزم
sudo apt update

# تثبيت MySQL Server
sudo apt install mysql-server -y

# التحقق من الحالة
sudo systemctl status mysql
sudo systemctl enable mysql
```

### 2. تأمين MySQL

```bash
# تشغيل سكريبت التأمين
sudo mysql_secure_installation
```

**اتبع التعليمات:**
```
- Setup VALIDATE PASSWORD component? Y (نعم)
- Password validation policy: 2 (قوي)
- New password: أدخل كلمة مرور قوية جداً
- Remove anonymous users? Y
- Disallow root login remotely? Y
- Remove test database? Y
- Reload privilege tables? Y
```

### 3. إنشاء قاعدة البيانات والمستخدم

```bash
# الدخول إلى MySQL
sudo mysql
```

```sql
-- إنشاء قاعدة بيانات للبوت
CREATE DATABASE telegram_bot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- إنشاء مستخدم خاص بالبوت
CREATE USER 'bot_user'@'localhost' IDENTIFIED BY 'كلمة_مرور_قوية_جداً';

-- منح الصلاحيات الكاملة على القاعدة
GRANT ALL PRIVILEGES ON telegram_bot_db.* TO 'bot_user'@'localhost';

-- تطبيق التغييرات
FLUSH PRIVILEGES;

-- عرض المستخدمين
SELECT user, host FROM mysql.user;

-- الخروج
EXIT;
```

### 4. تكوين MySQL للأمان

```bash
# تعديل ملف الإعداد
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

**التعديلات الموصى بها:**
```ini
[mysqld]
# الاستماع على localhost فقط
bind-address = 127.0.0.1

# تعطيل LOCAL INFILE (أمان)
local-infile = 0

# تحديد حجم الحزم
max_allowed_packet = 64M

# تحسين الأداء
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

```bash
# إعادة تشغيل MySQL
sudo systemctl restart mysql
```

### 5. إنشاء الجداول المطلوبة

```bash
# الاتصال بقاعدة البيانات
mysql -u bot_user -p telegram_bot_db
```

```sql
-- إنشاء جدول facebook_accounts
CREATE TABLE facebook_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول contacts
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- عرض الجداول
SHOW TABLES;

-- الخروج
EXIT;
```

---

## تثبيت phpMyAdmin

### 1. تثبيت Apache و PHP

```bash
# تثبيت Apache
sudo apt install apache2 -y

# تثبيت PHP والإضافات المطلوبة
sudo apt install php php-mbstring php-zip php-gd php-json php-curl php-mysql libapache2-mod-php -y

# التحقق من PHP
php -v
```

### 2. تثبيت phpMyAdmin

```bash
# تثبيت phpMyAdmin
sudo apt install phpmyadmin -y
```

**أثناء التثبيت:**
- اختر `apache2` عند السؤال عن الـ web server
- اختر `Yes` لإعداد قاعدة البيانات مع dbconfig-common
- أدخل كلمة مرور قوية لقاعدة بيانات phpmyadmin

```bash
# تفعيل الإضافات المطلوبة
sudo phpenmod mbstring

# إعادة تشغيل Apache
sudo systemctl restart apache2
```

### 3. تأمين phpMyAdmin

**إنشاء مصادقة HTTP:**
```bash
# إنشاء ملف كلمات المرور
sudo htpasswd -c /etc/phpmyadmin/.htpasswd admin
# أدخل كلمة مرور قوية

# تعديل ملف إعداد Apache
sudo nano /etc/apache2/conf-available/phpmyadmin.conf
```

**أضف داخل الملف:**
```apache
<Directory /usr/share/phpmyadmin>
    Options FollowSymLinks
    DirectoryIndex index.php
    AllowOverride All
    
    # HTTP Basic Authentication
    AuthType Basic
    AuthName "Restricted Access - phpMyAdmin"
    AuthUserFile /etc/phpmyadmin/.htpasswd
    Require valid-user
    
    # السماح من IP محدد فقط (اختياري)
    # Require ip YOUR_IP_ADDRESS
    # Require ip 127.0.0.1
</Directory>
```

```bash
# إعادة تحميل Apache
sudo systemctl reload apache2
```

**الوصول إلى phpMyAdmin:**
```
http://your_server_ip/phpmyadmin
```
- سيطلب منك اسم المستخدم وكلمة المرور (HTTP Auth)
- ثم تسجيل الدخول بمستخدم MySQL (bot_user)

### 4. تأمين phpMyAdmin إضافياً

```bash
# تغيير مسار الوصول الافتراضي (اختياري لكن موصى به)
sudo nano /etc/apache2/conf-available/phpmyadmin.conf
```

**غيّر:**
```apache
Alias /phpmyadmin /usr/share/phpmyadmin
```

**إلى:**
```apache
Alias /my-secret-admin-panel /usr/share/phpmyadmin
```

```bash
# إعادة التحميل
sudo systemctl reload apache2
```

الآن الوصول سيكون عبر: `http://your_server_ip/my-secret-admin-panel`

---

## نشر البوت

### 1. إنشاء مجلد المشروع

```bash
# إنشاء مجلد للمشاريع
sudo mkdir -p /var/www/bots
sudo chown -R botadmin:botadmin /var/www/bots
cd /var/www/bots
```

### 2. رفع الكود

**الطريقة 1: استنساخ من Git**
```bash
git clone https://github.com/your-username/your-bot-repo.git telegram-bot
cd telegram-bot
```

**الطريقة 2: رفع الملفات يدوياً**
```bash
# من جهازك المحلي
scp -P 2222 -r /path/to/local/project botadmin@your_server_ip:/var/www/bots/telegram-bot
```

### 3. تثبيت المكتبات

```bash
cd /var/www/bots/telegram-bot

# تثبيت المكتبات
npm install

# إذا كان هناك أخطاء في بعض الحزم
npm install --legacy-peer-deps
```

### 4. إعداد متغيرات البيئة

```bash
# إنشاء ملف .env
nano .env
```

**محتوى ملف `.env`:**
```bash
# اتصال MySQL
DATABASE_URL="mysql://bot_user:كلمة_مرور_قوية_جداً@localhost:3306/telegram_bot_db"

# معلومات بوت Telegram
TELEGRAM_BOT_TOKEN="your_telegram_bot_token_here"

# مفاتيح AI
OPENAI_API_KEY="your_openai_api_key"
GROQ_API_KEY="your_groq_api_key"

# إعدادات البيئة
NODE_ENV="production"

# بورت التشغيل
PORT=5000

# URL الخاص بالبوت
BOT_URL="https://yourdomain.com"
```

```bash
# تأمين ملف .env
chmod 600 .env
```

---

## إعداد Nginx

### 1. تثبيت Nginx

```bash
# تثبيت Nginx
sudo apt install nginx -y

# التحقق من الحالة
sudo systemctl status nginx
sudo systemctl enable nginx

# إيقاف Apache إذا كان يعمل (يتعارض مع Nginx على port 80)
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### 2. إعداد Reverse Proxy للبوت

```bash
# إنشاء ملف إعداد
sudo nano /etc/nginx/sites-available/telegram-bot
```

**محتوى الملف:**
```nginx
# Upstream Node.js backend
upstream telegram_bot {
    server 127.0.0.1:5000;
    keepalive 64;
}

# HTTP Server (سيتم تحويله لـ HTTPS لاحقاً)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # إخفاء إصدار Nginx
    server_tokens off;
    
    # حدود الأمان
    client_max_body_size 10M;
    client_body_buffer_size 1K;
    client_header_buffer_size 1k;
    large_client_header_buffers 2 1k;
    
    # Logs
    access_log /var/log/nginx/telegram-bot.access.log;
    error_log /var/log/nginx/telegram-bot.error.log;
    
    location / {
        proxy_pass http://telegram_bot;
        proxy_http_version 1.1;
        
        # WebSocket Support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Forward Client Info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }
    
    # حماية الملفات المخفية
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

```bash
# تفعيل الإعداد
sudo ln -s /etc/nginx/sites-available/telegram-bot /etc/nginx/sites-enabled/

# حذف الإعداد الافتراضي
sudo rm /etc/nginx/sites-enabled/default

# اختبار الإعداد
sudo nginx -t

# إعادة تحميل Nginx
sudo systemctl reload nginx
```

---

## تثبيت SSL

### 1. تثبيت Certbot

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### 2. الحصول على شهادة SSL

```bash
# احصل على شهادة SSL مجانية
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# اتبع التعليمات:
# - أدخل بريدك الإلكتروني
# - وافق على شروط الخدمة
# - اختر إعادة التوجيه التلقائية إلى HTTPS (خيار 2)
```

### 3. تحسين إعدادات SSL

```bash
# إنشاء DH parameters
sudo openssl dhparam -out /etc/nginx/dhparam.pem 4096

# تعديل ملف الإعداد
sudo nano /etc/nginx/sites-available/telegram-bot
```

**التكوين الكامل المحدث:**
```nginx
# Upstream Node.js backend
upstream telegram_bot {
    server 127.0.0.1:5000;
    keepalive 64;
}

# إعادة توجيه HTTP إلى HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # شهادات SSL
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;
    
    # إعدادات SSL/TLS
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';
    ssl_dhparam /etc/nginx/dhparam.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "0" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    server_tokens off;
    
    # حدود الأمان
    client_max_body_size 10M;
    client_body_buffer_size 1K;
    client_header_buffer_size 1k;
    large_client_header_buffers 2 1k;
    
    location / {
        proxy_pass http://telegram_bot;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 240s;
        proxy_connect_timeout 75s;
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }
    
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    access_log /var/log/nginx/telegram-bot.access.log;
    error_log /var/log/nginx/telegram-bot.error.log warn;
}
```

```bash
# اختبار وإعادة تحميل
sudo nginx -t
sudo systemctl reload nginx
```

---

## إعداد PM2

### 1. تثبيت PM2

```bash
# تثبيت PM2 عالمياً
sudo npm install -g pm2

# التحقق
pm2 --version
```

### 2. إنشاء ملف إعداد PM2

```bash
cd /var/www/bots/telegram-bot
nano ecosystem.config.js
```

**محتوى الملف:**
```javascript
module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: 'npm',
      args: 'run dev',
      cwd: '/var/www/bots/telegram-bot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/bots/telegram-bot/logs/pm2-error.log',
      out_file: '/var/www/bots/telegram-bot/logs/pm2-out.log',
      log_file: '/var/www/bots/telegram-bot/logs/pm2-combined.log',
      time: true,
    },
    {
      name: 'inngest-server',
      script: './scripts/inngest.sh',
      cwd: '/var/www/bots/telegram-bot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/www/bots/telegram-bot/logs/inngest-error.log',
      out_file: '/var/www/bots/telegram-bot/logs/inngest-out.log',
      time: true,
    },
  ],
};
```

```bash
# إنشاء مجلد logs
mkdir -p logs
```

---

## تشغيل البوت

### 1. تشغيل البوت بـ PM2

```bash
cd /var/www/bots/telegram-bot

# تشغيل باستخدام ملف الإعداد
pm2 start ecosystem.config.js

# عرض الحالة
pm2 status

# عرض السجلات
pm2 logs
```

### 2. إعداد PM2 للتشغيل التلقائي

```bash
# حفظ قائمة العمليات
pm2 save

# إنشاء startup script
pm2 startup systemd

# سيظهر أمر، قم بتشغيله (مثال):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u botadmin --hp /home/botadmin

# حفظ مرة أخرى
pm2 save
```

### 3. إعداد Telegram Webhook

```bash
# تحميل المتغيرات من .env
source .env

# ضبط webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${BOT_URL}/webhooks/telegram/action\",
    \"allowed_updates\": [\"message\"]
  }"

# التحقق من webhook
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

### 4. اختبار البوت

```bash
# افتح Telegram وابحث عن بوتك
# أرسل رسالة اختبارية مع رقم هاتف

# راقب السجلات
pm2 logs telegram-bot --lines 50
```

---

## المراقبة والصيانة

### 1. مراقبة السجلات

```bash
# PM2 logs
pm2 logs --lines 100
pm2 monit

# Nginx logs
sudo tail -f /var/log/nginx/telegram-bot.access.log
sudo tail -f /var/log/nginx/telegram-bot.error.log

# MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### 2. النسخ الاحتياطي التلقائي

**إنشاء سكريبت النسخ الاحتياطي:**
```bash
nano ~/backup-mysql.sh
```

**محتوى السكريبت:**
```bash
#!/bin/bash

DB_NAME="telegram_bot_db"
DB_USER="bot_user"
DB_PASS="كلمة_مرور_قوية_جداً"
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_FILE

find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

```bash
# منح صلاحيات التنفيذ
chmod +x ~/backup-mysql.sh

# إضافة إلى cron
crontab -e
```

**أضف:**
```
0 2 * * * /home/botadmin/backup-mysql.sh >> /home/botadmin/backup.log 2>&1
```

### 3. أوامر الصيانة

```bash
# إعادة تشغيل كل شيء
sudo systemctl restart mysql nginx
pm2 restart all

# فحص الحالة
sudo systemctl status mysql nginx
pm2 status

# فحص المساحة
df -h

# فحص الموارد
htop

# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تحديث npm packages
cd /var/www/bots/telegram-bot
npm update
npm audit fix
```

---

## استكشاف الأخطاء

### البوت لا يستجيب

```bash
# 1. تحقق من PM2
pm2 status
pm2 logs telegram-bot --lines 50

# 2. تحقق من MySQL
sudo systemctl status mysql
mysql -u bot_user -p -e "SELECT 1;"

# 3. تحقق من Nginx
sudo nginx -t
sudo systemctl status nginx

# 4. تحقق من webhook
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

# 5. إعادة تشغيل كل شيء
pm2 restart all
sudo systemctl restart nginx
```

### خطأ في الاتصال بقاعدة البيانات

```bash
# تحقق من MySQL
sudo systemctl status mysql

# اختبر الاتصال
mysql -u bot_user -p telegram_bot_db

# راجع السجلات
sudo tail -f /var/log/mysql/error.log
```

### Nginx يعرض 502 Bad Gateway

```bash
# تحقق من البوت
pm2 status

# تحقق من البورت
netstat -tulpn | grep 5000

# راجع السجلات
sudo tail -f /var/log/nginx/telegram-bot.error.log
pm2 logs telegram-bot
```

---

## قائمة التحقق النهائية

- [ ] تم تحديث النظام
- [ ] تم تأمين SSH
- [ ] تم تثبيت UFW و Fail2Ban
- [ ] تم تثبيت Node.js 20
- [ ] تم تثبيت MySQL وتأمينه
- [ ] تم إنشاء قاعدة البيانات والجداول
- [ ] تم تثبيت phpMyAdmin وتأمينه
- [ ] تم رفع كود البوت
- [ ] تم إعداد ملف .env
- [ ] تم تثبيت Nginx
- [ ] تم الحصول على SSL Certificate
- [ ] تم تثبيت PM2
- [ ] تم تشغيل البوت
- [ ] تم إعداد Telegram webhook
- [ ] تم اختبار البوت والتأكد من عمله
- [ ] تم إعداد النسخ الاحتياطي التلقائي

---

**تم إنشاء هذا الدليل بمعايير الأمان لعام 2025**  
**آخر تحديث:** نوفمبر 2025  
**الإصدار:** 3.0 - MySQL Edition
