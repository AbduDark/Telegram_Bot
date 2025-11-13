# دليل تثبيت بوت Telegram على Ubuntu Server مع إعدادات الأمان العالية

## جدول المحتويات
1. [متطلبات النظام](#متطلبات-النظام)
2. [إعداد السيرفر الأساسي](#إعداد-السيرفر-الأساسي)
3. [تأمين السيرفر](#تأمين-السيرفر)
4. [تثبيت Node.js](#تثبيت-nodejs)
5. [تثبيت PostgreSQL](#تثبيت-postgresql)
6. [تثبيت phpMyAdmin](#تثبيت-phpmyadmin)
7. [نشر البوت](#نشر-البوت)
8. [إعداد Nginx كـ Reverse Proxy](#إعداد-nginx)
9. [تثبيت شهادة SSL](#تثبيت-شهادة-ssl)
10. [إعداد PM2 لإدارة العمليات](#إعداد-pm2)
11. [المراقبة والصيانة](#المراقبة-والصيانة)

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
- دومين (اختياري لكن موصى به)

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

### 2. تعيين Timezone
```bash
# تعيين المنطقة الزمنية (مثال: القاهرة)
sudo timedatectl set-timezone Africa/Cairo

# التحقق
timedatectl
```

### 3. إنشاء مستخدم جديد (للأمان)
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

**التعديلات المطلوبة في ملف `sshd_config`:**
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

# تفعيل المصادقة بالمفاتيح فقط (موصى به جداً)
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

### 2. إعداد SSH Keys (مصادقة آمنة)

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

### 4. تثبيت Fail2Ban (حماية من هجمات Brute Force)

```bash
# تثبيت Fail2Ban
sudo apt install fail2ban -y

# نسخ ملف الإعداد
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# تعديل الإعدادات
sudo nano /etc/fail2ban/jail.local
```

**إضافة/تعديل في `jail.local`:**
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
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### 5. تعطيل الخدمات غير الضرورية

```bash
# عرض الخدمات النشطة
sudo systemctl list-units --type=service --state=running

# تعطيل الخدمات غير المستخدمة (أمثلة)
sudo systemctl disable bluetooth
sudo systemctl stop bluetooth
```

### 6. تثبيت أدوات الأمان الإضافية

```bash
# تثبيت rkhunter للكشف عن الـ rootkits
sudo apt install rkhunter -y
sudo rkhunter --update
sudo rkhunter --check --skip-keypress

# تثبيت ClamAV للحماية من الفيروسات
sudo apt install clamav clamav-daemon -y
sudo freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

### 7. إعداد Automatic Security Updates

```bash
# تثبيت unattended-upgrades
sudo apt install unattended-upgrades -y

# تفعيل التحديثات التلقائية
sudo dpkg-reconfigure -plow unattended-upgrades

# تعديل الإعدادات
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

**في الملف، تأكد من تفعيل:**
```
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
```

---

## تثبيت Node.js

### 1. تثبيت Node.js 20.x (الإصدار المطلوب - طريقة 2025 المحدثة)

```bash
# تحديث النظام أولاً
sudo apt update && sudo apt upgrade -y

# تثبيت المتطلبات الأساسية
sudo apt install -y ca-certificates curl gnupg

# إضافة مفتاح GPG الرسمي من NodeSource
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# إضافة مستودع Node.js 20.x
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# تحديث قائمة الحزم وتثبيت Node.js
sudo apt update
sudo apt install -y nodejs

# التحقق من الإصدارات
node --version  # يجب أن يكون >= v20.9.0
npm --version
```

**ملاحظة:** هذه الطريقة المحدثة لعام 2025 تستخدم GPG keyrings الأكثر أماناً بدلاً من apt-key القديم.

### 2. تثبيت أدوات البناء الضرورية

```bash
# تثبيت build tools
sudo apt install build-essential -y

# تثبيت Git
sudo apt install git -y
git --version
```

---

## تثبيت PostgreSQL

### 1. تثبيت PostgreSQL 16 (أحدث إصدار مستقر - 2025)

```bash
# إضافة مستودع PostgreSQL الرسمي
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# إضافة مفتاح التوقيع (طريقة 2025 المحدثة)
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc

# تحديث وتثبيت PostgreSQL 16
sudo apt update
sudo apt install postgresql-16 postgresql-contrib-16 -y

# التحقق من الحالة
sudo systemctl status postgresql
sudo systemctl enable postgresql
```

**ملاحظة:** PostgreSQL 16 يتضمن تحسينات أمنية هامة خاصة في PUBLIC schema privileges.

### 2. تأمين PostgreSQL (معايير 2025)

```bash
# الدخول كمستخدم postgres
sudo -u postgres psql

# داخل PostgreSQL، قم بما يلي:
```

```sql
-- تغيير كلمة مرور postgres بتشفير
ALTER USER postgres WITH ENCRYPTED PASSWORD 'كلمة_مرور_قوية_جداً';

-- إنشاء قاعدة بيانات للبوت
CREATE DATABASE telegram_bot_db;

-- إنشاء مستخدم خاص بالبوت (بدون صلاحيات SUPERUSER)
CREATE USER bot_user WITH ENCRYPTED PASSWORD 'كلمة_مرور_قوية_أخرى';

-- منع الوصول العام للقاعدة (مهم للأمان)
REVOKE ALL ON DATABASE telegram_bot_db FROM PUBLIC;

-- منح الصلاحيات للمستخدم المحدد فقط
GRANT CONNECT ON DATABASE telegram_bot_db TO bot_user;
GRANT ALL PRIVILEGES ON DATABASE telegram_bot_db TO bot_user;

-- الاتصال بالقاعدة لإعداد صلاحيات Schema
\c telegram_bot_db

-- إلغاء صلاحيات PUBLIC schema (تحسين أمان PostgreSQL 15+)
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- منح الصلاحيات الكاملة على Schema للمستخدم
GRANT ALL ON SCHEMA public TO bot_user;

-- الخروج
\q
```

### 3. تكوين PostgreSQL للاتصالات المحلية (معايير أمان 2025)

```bash
# تعديل ملف pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

**التكوين الآمن (استبدل كل المحتوى بهذا):**
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# المستخدم postgres - اتصال محلي فقط بـ peer
local   all             postgres                                peer

# المستخدم bot_user - اتصال محلي مع كلمة مرور
local   telegram_bot_db bot_user                                scram-sha-256
host    telegram_bot_db bot_user        127.0.0.1/32            scram-sha-256
host    telegram_bot_db bot_user        ::1/128                 scram-sha-256

# ⚠️ لا تستخدم أبداً في الإنتاج:
# host  all             all             0.0.0.0/0               trust     ❌ خطر!
# host  all             all             0.0.0.0/0               md5       ❌ ضعيف!

# استخدم scram-sha-256 دائماً (الأقوى في 2025)
```

**ملاحظات مهمة:**
- `scram-sha-256`: أقوى طريقة مصادقة (أفضل من md5)
- `peer`: يستخدم اسم مستخدم النظام (للاتصالات المحلية)
- `trust`: **خطير جداً** - يسمح بالدخول بدون كلمة مرور

```bash
# تعديل postgresql.conf للأمان
sudo nano /etc/postgresql/16/main/postgresql.conf
```

**التعديلات الموصى بها:**
```
# الاستماع على localhost فقط (للأمان)
listen_addresses = 'localhost'

# زيادة الاتصالات المتزامنة إذا لزم الأمر
max_connections = 100

# تحسين الأداء
shared_buffers = 256MB
effective_cache_size = 1GB
```

```bash
# إعادة تشغيل PostgreSQL
sudo systemctl restart postgresql
```

### 4. إنشاء الجداول المطلوبة

```bash
# الاتصال بقاعدة البيانات
sudo -u postgres psql -d telegram_bot_db
```

```sql
-- إنشاء جدول facebook_accounts
CREATE TABLE facebook_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول contacts
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس لتسريع البحث
CREATE INDEX idx_facebook_phone ON facebook_accounts(phone);
CREATE INDEX idx_contacts_phone ON contacts(phone);

-- منح الصلاحيات للمستخدم
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bot_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bot_user;

-- الخروج
\q
```

---

## تثبيت phpMyAdmin

### 1. تثبيت Apache و PHP

```bash
# تثبيت Apache
sudo apt install apache2 -y

# تثبيت PHP والإضافات المطلوبة
sudo apt install php php-mbstring php-zip php-gd php-json php-curl php-pgsql -y
```

### 2. تثبيت phpPgAdmin (بديل phpMyAdmin لـ PostgreSQL)

```bash
# تثبيت phpPgAdmin
sudo apt install phppgadmin -y

# تعديل ملف الإعداد
sudo nano /etc/apache2/conf-available/phppgadmin.conf
```

**تعديل الملف للسماح بالوصول:**
```apache
# السماح بالوصول من جميع العناوين (غير موصى به للإنتاج)
# Require all granted

# أو السماح من IP محدد فقط (موصى به)
<Directory /usr/share/phppgadmin>
    Require ip YOUR_IP_ADDRESS
    Require ip 127.0.0.1
</Directory>
```

```bash
# تفعيل الإعداد
sudo a2enconf phppgadmin

# إعادة تشغيل Apache
sudo systemctl restart apache2
```

### 3. تأمين phpPgAdmin

```bash
# إنشاء مصادقة HTTP Basic
sudo htpasswd -c /etc/phppgadmin/.htpasswd admin
# سيطلب منك إدخال كلمة المرور

# تعديل ملف الإعداد
sudo nano /etc/apache2/conf-available/phppgadmin.conf
```

**إضافة المصادقة:**
```apache
<Directory /usr/share/phppgadmin>
    AuthType Basic
    AuthName "Restricted Access"
    AuthUserFile /etc/phppgadmin/.htpasswd
    Require valid-user
    
    Require ip YOUR_IP_ADDRESS
    Require ip 127.0.0.1
</Directory>
```

```bash
# إعادة التشغيل
sudo systemctl restart apache2
```

**الوصول إلى phpPgAdmin:**
```
http://your_server_ip/phppgadmin
```

### 4. تثبيت phpMyAdmin (اختياري - للمستقبل إذا احتجت MySQL)

```bash
# تثبيت MySQL أولاً (اختياري)
sudo apt install mysql-server -y
sudo mysql_secure_installation

# تثبيت phpMyAdmin
sudo apt install phpmyadmin -y

# اختر apache2 عند السؤال
# اختر Yes لإعداد قاعدة البيانات
# أدخل كلمة مرور قوية

# تفعيل الإضافات المطلوبة
sudo phpenmod mbstring

# إعادة تشغيل Apache
sudo systemctl restart apache2
```

**تأمين phpMyAdmin:**
```bash
# إنشاء ملف .htaccess
sudo nano /etc/apache2/conf-available/phpmyadmin.conf
```

**إضافة:**
```apache
<Directory /usr/share/phpmyadmin>
    Options FollowSymLinks
    DirectoryIndex index.php
    AllowOverride All
    
    AuthType Basic
    AuthName "Restricted Files"
    AuthUserFile /etc/phpmyadmin/.htpasswd
    Require valid-user
</Directory>
```

```bash
# إنشاء ملف كلمات المرور
sudo htpasswd -c /etc/phpmyadmin/.htpasswd admin

# إعادة التشغيل
sudo systemctl restart apache2
```

---

## نشر البوت

### 1. إنشاء مجلد المشروع

```bash
# إنشاء مجلد للمشاريع
sudo mkdir -p /var/www/bots
sudo chown -R botadmin:botadmin /var/www/bots
cd /var/www/bots
```

### 2. رفع الكود أو استنساخه

**الطريقة الأولى: استنساخ من Git (موصى به)**
```bash
# إذا كان المشروع على GitHub
git clone https://github.com/your-username/your-bot-repo.git telegram-bot
cd telegram-bot
```

**الطريقة الثانية: رفع الملفات يدوياً**
```bash
# من جهازك المحلي، استخدم scp
scp -P 2222 -r /path/to/local/project botadmin@your_server_ip:/var/www/bots/telegram-bot
```

### 3. تثبيت المكتبات

```bash
cd /var/www/bots/telegram-bot

# تثبيت المكتبات
npm install

# بناء المشروع (إذا لزم الأمر)
npm run build
```

### 4. إعداد متغيرات البيئة

```bash
# إنشاء ملف .env
nano .env
```

**محتوى ملف `.env`:**
```bash
# اتصال قاعدة البيانات
DATABASE_URL="postgresql://bot_user:كلمة_مرور_قوية_أخرى@localhost:5432/telegram_bot_db"

# معلومات بوت Telegram
TELEGRAM_BOT_TOKEN="your_telegram_bot_token_here"

# مفاتيح AI (حسب ما تستخدم)
OPENAI_API_KEY="your_openai_api_key"
GROQ_API_KEY="your_groq_api_key"

# إعدادات البيئة
NODE_ENV="production"

# بورت التشغيل
PORT=5000

# URL الخاص بالبوت (للـ webhooks)
BOT_URL="https://yourdomain.com"
```

```bash
# تأمين ملف .env
chmod 600 .env
```

### 5. اختبار التشغيل

```bash
# تشغيل تجريبي
npm run dev

# إذا عمل بنجاح، أوقفه بـ Ctrl+C
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
```

### 2. إعداد Reverse Proxy للبوت

```bash
# إنشاء ملف إعداد للبوت
sudo nano /etc/nginx/sites-available/telegram-bot
```

**محتوى الملف:**
```nginx
upstream telegram_bot {
    server 127.0.0.1:5000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # حماية من clickjacking
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # تحديد حجم الطلبات
    client_max_body_size 10M;
    
    # Logs
    access_log /var/log/nginx/telegram-bot.access.log;
    error_log /var/log/nginx/telegram-bot.error.log;
    
    location / {
        proxy_pass http://telegram_bot;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # حماية الملفات الحساسة
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

### 3. تأمين Nginx إضافياً

```bash
# تعديل الإعداد الرئيسي
sudo nano /etc/nginx/nginx.conf
```

**إضافة/تعديل:**
```nginx
http {
    # إخفاء إصدار Nginx
    server_tokens off;
    
    # حدود الأمان
    client_body_buffer_size 1K;
    client_header_buffer_size 1k;
    client_max_body_size 10M;
    large_client_header_buffers 2 1k;
    
    # Timeouts
    client_body_timeout 10;
    client_header_timeout 10;
    keepalive_timeout 5 5;
    send_timeout 10;
    
    # حماية من DDoS
    limit_req_zone $binary_remote_addr zone=one:10m rate=30r/m;
    limit_req zone=one burst=5 nodelay;
    
    # باقي الإعدادات...
}
```

```bash
# إعادة التحميل
sudo systemctl reload nginx
```

---

## تثبيت شهادة SSL

### 1. تثبيت Certbot

```bash
# تثبيت Certbot و plugin الخاص بـ Nginx
sudo apt install certbot python3-certbot-nginx -y
```

### 2. الحصول على شهادة SSL

```bash
# احصل على شهادة SSL مجانية من Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# اتبع التعليمات:
# - أدخل بريدك الإلكتروني
# - وافق على شروط الخدمة
# - اختر إعادة التوجيه التلقائية إلى HTTPS (خيار 2)
```

### 3. اختبار التجديد التلقائي

```bash
# اختبار التجديد
sudo certbot renew --dry-run

# Certbot سيجدد الشهادة تلقائياً عبر cron
```

### 4. تحسين إعدادات SSL

```bash
# تعديل ملف الإعداد
sudo nano /etc/nginx/sites-available/telegram-bot
```

**إضافة إعدادات SSL المحسّنة (معايير 2025):**

أولاً، إنشاء Diffie-Hellman parameters:
```bash
# إنشاء DH parameters لتحسين الأمان (يستغرق 5 دقائق)
sudo openssl dhparam -out /etc/nginx/dhparam.pem 4096
```

**ملف إعداد Nginx الكامل المحدث:**
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

# HTTPS Server - التكوين الآمن لعام 2025
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # ========== شهادات SSL ==========
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;
    
    # ========== إعدادات SSL/TLS الحديثة (2025) ==========
    ssl_protocols TLSv1.2 TLSv1.3;  # TLS 1.3 للأداء والأمان الأفضل
    ssl_prefer_server_ciphers off;  # دع المتصفح يختار الأفضل في TLS 1.3
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';
    
    # DH Parameters
    ssl_dhparam /etc/nginx/dhparam.pem;
    
    # SSL Session
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;  # تحسين الخصوصية
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # ========== رؤوس الأمان (Security Headers 2025) ==========
    
    # HSTS - إجبار HTTPS لمدة سنة مع subdirectories
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # منع Clickjacking
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # منع MIME-type sniffing
    add_header X-Content-Type-Options "nosniff" always;
    
    # XSS Protection (تم تعطيله - موصى به في 2025)
    add_header X-XSS-Protection "0" always;
    
    # Content Security Policy (عدّل حسب احتياجاتك)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;
    
    # Referrer Policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Permissions Policy (جديد في 2025 - بديل Feature-Policy)
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
    
    # إخفاء إصدار Nginx
    server_tokens off;
    
    # ========== حدود الحماية ==========
    client_body_buffer_size 1K;
    client_header_buffer_size 1k;
    client_max_body_size 10M;
    large_client_header_buffers 2 1k;
    
    # Rate Limiting (حماية من DDoS)
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
    
    # ========== Proxy Configuration ==========
    location / {
        proxy_pass http://telegram_bot;
        proxy_http_version 1.1;
        
        # WebSocket Support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Forward Client Info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Timeouts
        proxy_read_timeout 240s;
        proxy_connect_timeout 75s;
        
        # Disable buffering for real-time apps
        proxy_buffering off;
        proxy_redirect off;
        
        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }
    
    # حماية الملفات المخفية
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Logs
    access_log /var/log/nginx/telegram-bot.access.log;
    error_log /var/log/nginx/telegram-bot.error.log warn;
}
```

**ملاحظات مهمة عن التحديثات:**
- ✅ **TLS 1.3**: أسرع وأكثر أماناً من TLS 1.2
- ✅ **Permissions-Policy**: بديل حديث لـ Feature-Policy
- ✅ **X-XSS-Protection = 0**: تعطيل الفلتر القديم (موصى به 2025)
- ✅ **ssl_prefer_server_ciphers = off**: أفضل لـ TLS 1.3
- ✅ **ssl_session_tickets = off**: تحسين الخصوصية
- ✅ **Rate Limiting**: حماية من هجمات DDoS
```

```bash
# إعادة تحميل Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## إعداد PM2

### 1. تثبيت PM2

```bash
# تثبيت PM2 عالمياً
sudo npm install -g pm2

# التحقق من التثبيت
pm2 --version
```

### 2. إعداد PM2 لتشغيل البوت

```bash
cd /var/www/bots/telegram-bot

# إنشاء ملف إعداد PM2
nano ecosystem.config.js
```

**محتوى `ecosystem.config.js`:**
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

### 3. تشغيل البوت بـ PM2

```bash
# تشغيل باستخدام ملف الإعداد
pm2 start ecosystem.config.js

# عرض الحالة
pm2 status

# عرض السجلات
pm2 logs

# عرض سجلات تطبيق محدد
pm2 logs telegram-bot

# إعادة التشغيل
pm2 restart telegram-bot

# إيقاف
pm2 stop telegram-bot

# حذف من PM2
pm2 delete telegram-bot
```

### 4. إعداد PM2 للتشغيل التلقائي عند بدء النظام

```bash
# حفظ قائمة العمليات الحالية
pm2 save

# إنشاء startup script
pm2 startup systemd

# سينشئ PM2 أمر، قم بتشغيله (مثال):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u botadmin --hp /home/botadmin

# تأكيد الحفظ مرة أخرى
pm2 save
```

### 5. مراقبة PM2

```bash
# عرض Dashboard تفاعلي
pm2 monit

# عرض معلومات مفصلة
pm2 show telegram-bot

# تحديث PM2 (لاحقاً)
pm2 update
```

---

## إعداد Telegram Webhook

### 1. ضبط الـ webhook للبوت

```bash
# استخدم curl لضبط webhook
curl -X POST "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/webhooks/telegram/action",
    "allowed_updates": ["message"]
  }'
```

**أو استخدم السكريبت الموجود:**
```bash
cd /var/www/bots/telegram-bot

# تعديل السكريبت
nano scripts/setup-telegram-webhook.sh
```

**محتوى السكريبت:**
```bash
#!/bin/bash

BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
WEBHOOK_URL="${BOT_URL}/webhooks/telegram/action"

if [ -z "$BOT_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN not set"
    exit 1
fi

if [ -z "$BOT_URL" ]; then
    echo "Error: BOT_URL not set"
    exit 1
fi

echo "Setting webhook to: $WEBHOOK_URL"

curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"allowed_updates\": [\"message\"]
  }"

echo ""
echo "Webhook set successfully!"
```

```bash
# منح صلاحيات التنفيذ
chmod +x scripts/setup-telegram-webhook.sh

# تحميل المتغيرات وتشغيل السكريبت
source .env
./scripts/setup-telegram-webhook.sh
```

### 2. التحقق من الـ webhook

```bash
# التحقق من حالة webhook
curl "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getWebhookInfo"
```

---

## المراقبة والصيانة

### 1. مراقبة السجلات

```bash
# سجلات PM2
pm2 logs --lines 100

# سجلات Nginx
sudo tail -f /var/log/nginx/telegram-bot.access.log
sudo tail -f /var/log/nginx/telegram-bot.error.log

# سجلات PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# سجلات النظام
sudo journalctl -u nginx -f
sudo journalctl -u postgresql -f
```

### 2. إعداد مراقبة الأداء

```bash
# تثبيت htop لمراقبة الموارد
sudo apt install htop -y

# تشغيل htop
htop

# تثبيت netdata لمراقبة شاملة (اختياري)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# الوصول إلى netdata
# http://your_server_ip:19999
```

### 3. النسخ الاحتياطي للقاعدة

**إنشاء سكريبت النسخ الاحتياطي:**
```bash
nano ~/backup-db.sh
```

**محتوى السكريبت:**
```bash
#!/bin/bash

# إعدادات
DB_NAME="telegram_bot_db"
DB_USER="bot_user"
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# إنشاء مجلد النسخ الاحتياطي إذا لم يكن موجوداً
mkdir -p $BACKUP_DIR

# أخذ النسخة الاحتياطية
export PGPASSWORD='كلمة_مرور_قوية_أخرى'
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# حذف النسخ الاحتياطية الأقدم من 30 يوم
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

```bash
# منح صلاحيات التنفيذ
chmod +x ~/backup-db.sh

# إضافة إلى cron للتشغيل اليومي
crontab -e
```

**أضف السطر التالي:**
```
0 2 * * * /home/botadmin/backup-db.sh >> /home/botadmin/backup.log 2>&1
```

### 4. تحديثات الصيانة الدورية

```bash
# تحديث النظام شهرياً
sudo apt update && sudo apt upgrade -y

# تحديث Node.js packages
cd /var/www/bots/telegram-bot
npm update

# التحقق من المكتبات القديمة
npm outdated

# التحقق من الثغرات الأمنية
npm audit
npm audit fix
```

### 5. إعداد تنبيهات

**تثبيت أداة للتنبيهات (اختياري):**
```bash
# مثال: إرسال تنبيه عند توقف الخدمة
nano ~/check-service.sh
```

```bash
#!/bin/bash

SERVICE="telegram-bot"

if ! pm2 status | grep -q "$SERVICE.*online"; then
    # إعادة تشغيل الخدمة
    pm2 restart $SERVICE
    
    # إرسال تنبيه (مثال: عبر curl لـ webhook)
    curl -X POST "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/sendMessage" \
      -d "chat_id={YOUR_CHAT_ID}" \
      -d "text=⚠️ تحذير: تم إعادة تشغيل خدمة $SERVICE"
fi
```

```bash
chmod +x ~/check-service.sh

# إضافة إلى cron كل 5 دقائق
crontab -e
```

```
*/5 * * * * /home/botadmin/check-service.sh
```

---

## أوامر مفيدة للصيانة اليومية

### إدارة PM2
```bash
pm2 status                    # عرض حالة جميع التطبيقات
pm2 restart all               # إعادة تشغيل الكل
pm2 logs --lines 50           # عرض آخر 50 سطر من السجلات
pm2 monit                     # مراقبة الأداء
pm2 flush                     # مسح السجلات
```

### إدارة Nginx
```bash
sudo nginx -t                 # اختبار الإعدادات
sudo systemctl reload nginx   # إعادة تحميل الإعدادات
sudo systemctl restart nginx  # إعادة تشغيل كاملة
```

### إدارة PostgreSQL
```bash
sudo systemctl status postgresql       # حالة الخدمة
sudo -u postgres psql -d telegram_bot_db  # الدخول للقاعدة
```

### مراقبة الموارد
```bash
htop                          # مراقبة CPU و RAM
df -h                         # مساحة القرص
free -h                       # الذاكرة المتاحة
netstat -tulpn                # المنافذ المفتوحة
```

---

## استكشاف الأخطاء وحلها

### المشكلة: البوت لا يستجيب

**الحلول:**
```bash
# 1. التحقق من حالة PM2
pm2 status

# 2. عرض السجلات للأخطاء
pm2 logs telegram-bot --lines 100

# 3. التحقق من الاتصال بقاعدة البيانات
sudo -u postgres psql -d telegram_bot_db -c "SELECT 1;"

# 4. التحقق من webhook
curl "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getWebhookInfo"

# 5. إعادة تشغيل كل شيء
pm2 restart all
```

### المشكلة: خطأ في الاتصال بقاعدة البيانات

```bash
# التحقق من عمل PostgreSQL
sudo systemctl status postgresql

# التحقق من الاتصال
psql -U bot_user -d telegram_bot_db -h localhost

# مراجعة سجلات PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### المشكلة: Nginx يعرض 502 Bad Gateway

```bash
# التحقق من أن البوت يعمل
pm2 status

# التحقق من البورت
netstat -tulpn | grep 5000

# مراجعة سجلات Nginx
sudo tail -f /var/log/nginx/telegram-bot.error.log

# إعادة تشغيل كل شيء
pm2 restart telegram-bot
sudo systemctl restart nginx
```

---

## نصائح أمان إضافية

1. **غيّر كلمات المرور بانتظام**
   ```bash
   # تغيير كلمة مرور PostgreSQL
   sudo -u postgres psql -c "ALTER USER bot_user WITH PASSWORD 'كلمة_مرور_جديدة';"
   ```

2. **راقب محاولات الدخول الفاشلة**
   ```bash
   sudo grep "Failed password" /var/log/auth.log | tail -20
   ```

3. **تحديث SSL Certificates**
   ```bash
   sudo certbot renew
   ```

4. **مراجعة Firewall Rules**
   ```bash
   sudo ufw status numbered
   ```

5. **فحص الثغرات الأمنية**
   ```bash
   sudo rkhunter --check
   sudo clamscan -r /var/www/bots/telegram-bot
   ```

---

## خاتمة

الآن لديك بوت Telegram مثبت بشكل احترافي على سيرفر Ubuntu مع:

✅ إعدادات أمان عالية  
✅ PostgreSQL محمي ومُحسّن  
✅ phpPgAdmin للإدارة السهلة  
✅ Nginx كـ Reverse Proxy  
✅ شهادة SSL مجانية  
✅ PM2 لإدارة العمليات  
✅ نسخ احتياطية تلقائية  
✅ مراقبة وتنبيهات  

**للدعم الفني:**
- راجع السجلات أولاً
- تحقق من المتغيرات البيئية
- تأكد من تحديث جميع المكونات

**روابط مفيدة:**
- [Mastra Documentation](https://mastra.ai/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

## اختبار الأمان والجودة

بعد الانتهاء من التثبيت، اختبر أمان سيرفرك باستخدام هذه الأدوات:

### 1. اختبار SSL/TLS
```bash
# SSL Labs - الأداة الأشهر لفحص SSL
# زر: https://www.ssllabs.com/ssltest/
# أدخل: yourdomain.com
# الهدف: الحصول على تقييم A+
```

### 2. اختبار Security Headers
```bash
# Security Headers Check
# زر: https://securityheaders.com
# أدخل: https://yourdomain.com
# الهدف: الحصول على تقييم A
```

### 3. اختبار Content Security Policy
```bash
# CSP Evaluator
# زر: https://csp-evaluator.withgoogle.com
# الصق CSP header الخاص بك
```

### 4. اختبار الثغرات الأمنية
```bash
# فحص المنافذ المفتوحة
sudo nmap -sV localhost

# فحص الثغرات في المكتبات
cd /var/www/bots/telegram-bot
npm audit

# إصلاح الثغرات البسيطة
npm audit fix

# فحص rootkits
sudo rkhunter --check

# فحص الفيروسات
sudo clamscan -r /var/www/bots/telegram-bot
```

### 5. اختبار الأداء والأمان معاً
```bash
# استخدام Mozilla Observatory
# زر: https://observatory.mozilla.org
# أدخل: yourdomain.com
# الهدف: الحصول على درجة A+
```

---

## قائمة التحقق النهائية

قبل وضع السيرفر في الإنتاج، تأكد من:

### الأمان الأساسي
- [ ] تم تغيير SSH port من 22
- [ ] تم تعطيل root login
- [ ] تم تفعيل SSH key authentication
- [ ] تم تثبيت وتفعيل UFW firewall
- [ ] تم تثبيت وإعداد Fail2Ban
- [ ] تم تفعيل automatic security updates

### قاعدة البيانات
- [ ] تم تغيير كلمة مرور postgres
- [ ] تم إنشاء مستخدم خاص بالبوت (ليس superuser)
- [ ] تم استخدام scram-sha-256 في pg_hba.conf
- [ ] تم تقييد listen_addresses على localhost فقط
- [ ] تم إلغاء صلاحيات PUBLIC schema
- [ ] تم إعداد النسخ الاحتياطي التلقائي

### الويب والشبكة
- [ ] تم تثبيت شهادة SSL من Let's Encrypt
- [ ] تم الحصول على تقييم A+ في SSL Labs
- [ ] تم إعداد جميع Security Headers
- [ ] تم تفعيل HTTP/2
- [ ] تم إعداد Rate Limiting
- [ ] تم إخفاء إصدار Nginx (server_tokens off)
- [ ] تم تفعيل HSTS

### البوت والتطبيق
- [ ] تم تثبيت PM2 وإعداد auto-restart
- [ ] تم تثبيت PM2 startup script
- [ ] تم إعداد Telegram webhook بشكل صحيح
- [ ] تم اختبار البوت والتأكد من عمله
- [ ] تم إعداد ملف .env بجميع المتغيرات
- [ ] تم تأمين ملف .env (chmod 600)
- [ ] تم اختبار npm audit وإصلاح الثغرات

### المراقبة والصيانة
- [ ] تم إعداد سجلات PM2
- [ ] تم إعداد سجلات Nginx
- [ ] تم إعداد النسخ الاحتياطي التلقائي
- [ ] تم إعداد cron jobs للصيانة
- [ ] تم اختبار استعادة النسخة الاحتياطية

---

## أوامر سريعة للرجوع إليها

### إعادة تشغيل الخدمات
```bash
# إعادة تشغيل كل شيء
sudo systemctl restart postgresql nginx
pm2 restart all

# التحقق من الحالة
sudo systemctl status postgresql nginx
pm2 status
```

### مراقبة السجلات
```bash
# PM2
pm2 logs --lines 100

# Nginx
sudo tail -f /var/log/nginx/telegram-bot.error.log

# PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# نظام
sudo journalctl -xe
```

### فحص الموارد
```bash
# استخدام CPU والذاكرة
htop

# مساحة القرص
df -h

# الذاكرة
free -h

# المنافذ المفتوحة
sudo netstat -tulpn | grep LISTEN
```

### النسخ الاحتياطي والاستعادة
```bash
# نسخ احتياطي يدوي
sudo -u postgres pg_dump telegram_bot_db > backup_$(date +%Y%m%d).sql

# استعادة النسخة
sudo -u postgres psql telegram_bot_db < backup_20251113.sql

# نسخ ملفات البوت
tar -czf bot_backup_$(date +%Y%m%d).tar.gz /var/www/bots/telegram-bot
```

---

## الدعم والمساعدة

### المشاكل الشائعة وحلولها

**المشكلة: البوت لا يرد على الرسائل**
```bash
# 1. تحقق من PM2
pm2 status
pm2 logs telegram-bot --lines 50

# 2. تحقق من webhook
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

# 3. تحقق من Nginx
sudo nginx -t
sudo tail -f /var/log/nginx/telegram-bot.error.log

# 4. تحقق من قاعدة البيانات
sudo -u postgres psql -d telegram_bot_db -c "SELECT 1;"
```

**المشكلة: SSL Certificate لا يعمل**
```bash
# تجديد الشهادة
sudo certbot renew --force-renewal

# إعادة تشغيل Nginx
sudo systemctl restart nginx

# فحص الشهادة
sudo certbot certificates
```

**المشكلة: نفاد المساحة**
```bash
# فحص المساحة
df -h

# حذف السجلات القديمة
sudo journalctl --vacuum-time=7d

# تنظيف PM2 logs
pm2 flush

# حذف الحزم غير المستخدمة
sudo apt autoremove
sudo apt clean
```

---

## موارد مفيدة

### الوثائق الرسمية
- **Node.js**: https://nodejs.org/en/docs/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Nginx**: https://nginx.org/en/docs/
- **PM2**: https://pm2.keymetrics.io/docs/
- **Mastra**: https://mastra.ai/docs
- **Telegram Bot API**: https://core.telegram.org/bots/api

### أدوات الأمان
- **SSL Labs Test**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com
- **Mozilla Observatory**: https://observatory.mozilla.org
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com

### المجتمعات العربية
- مجموعات Telegram للدعم الفني
- منتديات Stack Overflow بالعربية
- قنوات YouTube للشروحات

---

**تم إنشاء هذا الدليل بمعايير الأمان لعام 2025**  
**تاريخ آخر تحديث:** نوفمبر 2025  
**الإصدار:** 2.0

**ملاحظة هامة:** هذا الدليل يتبع أفضل ممارسات الأمان الحديثة بما في ذلك:
- TLS 1.3
- PostgreSQL 16 مع scram-sha-256
- Node.js 20 LTS
- Security Headers الحديثة (Permissions-Policy, CSP)
- Rate Limiting متقدم
- تشفير SSL/TLS محسّن

تأكد من مراجعة الدليل بشكل دوري للحصول على التحديثات الأمنية الجديدة.

