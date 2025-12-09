# دليل التثبيت على نظام لينكس

هذا الدليل الشامل يشرح كيفية تثبيت وتشغيل لوحة تحكم البوت على خادم لينكس (Ubuntu/Debian).

## المتطلبات الأساسية

### 1. متطلبات الخادم
- نظام Ubuntu 20.04 LTS أو أحدث (أو Debian 10+)
- ذاكرة RAM: 2GB على الأقل (يُفضل 4GB)
- مساحة تخزين: 20GB على الأقل
- صلاحيات root أو sudo

### 2. المتطلبات البرمجية
- Node.js 20 أو أحدث
- MySQL 8.0 أو MariaDB 10.5+
- Nginx (للإنتاج)
- PM2 (لإدارة العمليات)
- Git

---

## الخطوة 1: تحديث النظام

```bash
sudo apt update && sudo apt upgrade -y
```

---

## الخطوة 2: تثبيت Node.js 20

```bash
# تثبيت curl إذا لم يكن موجوداً
sudo apt install -y curl

# إضافة مستودع NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# تثبيت Node.js
sudo apt install -y nodejs

# التحقق من التثبيت
node --version
npm --version
```

---

## الخطوة 3: تثبيت MySQL

```bash
# تثبيت MySQL Server
sudo apt install -y mysql-server

# تأمين التثبيت
sudo mysql_secure_installation

# الدخول إلى MySQL
sudo mysql

# إنشاء قاعدة البيانات والمستخدم
CREATE DATABASE telegram_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'botuser'@'localhost' IDENTIFIED BY 'كلمة_مرور_قوية';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'botuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## الخطوة 4: تثبيت Nginx

```bash
# تثبيت Nginx
sudo apt install -y nginx

# تفعيل Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# التحقق من حالة Nginx
sudo systemctl status nginx
```

---

## الخطوة 5: تثبيت PM2

```bash
# تثبيت PM2 عالمياً
sudo npm install -g pm2

# تفعيل PM2 عند إقلاع النظام
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

---

## الخطوة 6: استنساخ المشروع

```bash
# الانتقال إلى مجلد التطبيقات
cd /var/www

# استنساخ المشروع
sudo git clone https://github.com/your-username/telegram-bot.git

# تغيير الملكية
sudo chown -R $USER:$USER telegram-bot

# الدخول للمجلد
cd telegram-bot
```

---

## الخطوة 7: تثبيت الاعتماديات

### تثبيت اعتماديات الخادم الرئيسي

```bash
# تثبيت الاعتماديات
npm install

# تثبيت اعتماديات لوحة التحكم
cd admin-panel
npm install
cd ..
```

---

## الخطوة 8: إعداد ملف البيئة

```bash
# إنشاء ملف البيئة
cp .env.example .env

# تحرير الملف
nano .env
```

### محتوى ملف .env

```env
# إعدادات قاعدة البيانات
DATABASE_URL=mysql://botuser:كلمة_مرور_قوية@localhost:3306/telegram_bot

# إعدادات بوت تليجرام
TELEGRAM_BOT_TOKEN=your_bot_token_here

# إعدادات JWT للوحة التحكم
JWT_SECRET=سلسلة_عشوائية_طويلة_وآمنة
JWT_REFRESH_SECRET=سلسلة_عشوائية_أخرى_طويلة_وآمنة

# إعدادات المسؤول الافتراضي
ADMIN_USERNAME=admin
ADMIN_PASSWORD=كلمة_مرور_قوية_للمسؤول

# إعدادات الخادم
PORT=5000
NODE_ENV=production

# رابط الموقع (للإنتاج)
APP_URL=https://your-domain.com
```

---

## الخطوة 9: بناء لوحة التحكم

```bash
# بناء لوحة التحكم للإنتاج
cd admin-panel
npm run build
cd ..
```

---

## الخطوة 10: إعداد Nginx

### إنشاء ملف تكوين Nginx

```bash
sudo nano /etc/nginx/sites-available/telegram-bot
```

### محتوى ملف التكوين

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # إعادة التوجيه إلى HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # شهادات SSL (سيتم إنشاؤها بواسطة Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # إعدادات SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # مجلد لوحة التحكم
    root /var/www/telegram-bot/admin-panel/dist;
    index index.html;

    # لوحة التحكم (React SPA)
    location /admin-panel {
        try_files $uri $uri/ /index.html;
    }

    # API الخلفية
    location /admin {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API البوت
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook تليجرام
    location /webhook {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # الصفحة الرئيسية
    location / {
        try_files $uri $uri/ /index.html;
    }

    # حماية الملفات الحساسة
    location ~ /\. {
        deny all;
    }

    # سجلات الأخطاء
    error_log /var/log/nginx/telegram-bot-error.log;
    access_log /var/log/nginx/telegram-bot-access.log;
}
```

### تفعيل الموقع

```bash
# إنشاء رابط رمزي
sudo ln -s /etc/nginx/sites-available/telegram-bot /etc/nginx/sites-enabled/

# إزالة الموقع الافتراضي
sudo rm /etc/nginx/sites-enabled/default

# اختبار التكوين
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx
```

---

## الخطوة 11: تثبيت شهادة SSL

```bash
# تثبيت Certbot
sudo apt install -y certbot python3-certbot-nginx

# الحصول على شهادة SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# التجديد التلقائي
sudo certbot renew --dry-run
```

---

## الخطوة 12: تشغيل التطبيق باستخدام PM2

### إنشاء ملف تكوين PM2

```bash
nano ecosystem.config.js
```

### محتوى ملف ecosystem.config.js

```javascript
module.exports = {
  apps: [
    {
      name: 'telegram-bot-api',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/telegram-bot',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/telegram-bot-error.log',
      out_file: '/var/log/pm2/telegram-bot-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
```

### تشغيل التطبيق

```bash
# إنشاء مجلد السجلات
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# تشغيل التطبيق
pm2 start ecosystem.config.js

# حفظ قائمة العمليات
pm2 save

# عرض حالة التطبيق
pm2 status
pm2 logs telegram-bot-api
```

---

## الخطوة 13: إعداد جدار الحماية

```bash
# تثبيت UFW
sudo apt install -y ufw

# السماح بـ SSH
sudo ufw allow ssh

# السماح بـ HTTP و HTTPS
sudo ufw allow 80
sudo ufw allow 443

# تفعيل جدار الحماية
sudo ufw enable

# التحقق من الحالة
sudo ufw status
```

---

## الخطوة 14: إعداد Webhook لتليجرام

```bash
# تشغيل سكربت إعداد Webhook
./scripts/setup-telegram-webhook.sh
```

أو يدوياً:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/webhook/telegram"}'
```

---

## الخطوة 15: إنشاء حساب المسؤول

عند تشغيل التطبيق لأول مرة، سيتم إنشاء حساب المسؤول تلقائياً باستخدام بيانات الاعتماد في ملف .env.

للتحقق:
```bash
# الدخول إلى MySQL
mysql -u botuser -p telegram_bot

# التحقق من جدول المسؤولين
SELECT id, username, role FROM admin_users;
```

---

## استكشاف الأخطاء وإصلاحها

### مشكلة: التطبيق لا يعمل

```bash
# التحقق من سجلات PM2
pm2 logs telegram-bot-api

# التحقق من حالة التطبيق
pm2 status

# إعادة تشغيل التطبيق
pm2 restart telegram-bot-api
```

### مشكلة: خطأ في قاعدة البيانات

```bash
# التحقق من حالة MySQL
sudo systemctl status mysql

# التحقق من الاتصال
mysql -u botuser -p telegram_bot -e "SELECT 1"
```

### مشكلة: Nginx لا يعمل

```bash
# التحقق من حالة Nginx
sudo systemctl status nginx

# التحقق من سجلات الأخطاء
sudo tail -f /var/log/nginx/telegram-bot-error.log

# اختبار التكوين
sudo nginx -t
```

### مشكلة: لوحة التحكم لا تعمل

```bash
# التحقق من بناء لوحة التحكم
ls -la /var/www/telegram-bot/admin-panel/dist

# إعادة بناء لوحة التحكم
cd /var/www/telegram-bot/admin-panel
npm run build
```

---

## التحديثات

### تحديث الكود

```bash
cd /var/www/telegram-bot

# سحب التحديثات
git pull origin main

# تثبيت الاعتماديات الجديدة
npm install

# إعادة بناء لوحة التحكم
cd admin-panel && npm install && npm run build && cd ..

# إعادة تشغيل التطبيق
pm2 restart telegram-bot-api
```

---

## النسخ الاحتياطي

### نسخ احتياطي لقاعدة البيانات

```bash
# إنشاء مجلد النسخ الاحتياطي
mkdir -p /var/backups/telegram-bot

# نسخ احتياطي يومي
mysqldump -u botuser -p telegram_bot > /var/backups/telegram-bot/backup_$(date +%Y%m%d).sql
```

### جدولة النسخ الاحتياطي التلقائي

```bash
# تحرير crontab
crontab -e

# إضافة المهمة (كل يوم الساعة 3 صباحاً)
0 3 * * * mysqldump -u botuser -pكلمة_المرور telegram_bot > /var/backups/telegram-bot/backup_$(date +\%Y\%m\%d).sql
```

---

## الأمان

### توصيات أمنية

1. **تغيير كلمات المرور الافتراضية**: تأكد من تغيير جميع كلمات المرور
2. **تحديث النظام بانتظام**: `sudo apt update && sudo apt upgrade`
3. **استخدام مفاتيح SSH**: بدلاً من كلمات المرور
4. **تفعيل Fail2ban**: لحماية من هجمات القوة الغاشمة

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

5. **مراجعة السجلات بانتظام**: 
```bash
sudo tail -f /var/log/auth.log
pm2 logs
```

---

## المراقبة

### مراقبة التطبيق

```bash
# عرض حالة PM2
pm2 monit

# عرض استخدام الموارد
pm2 status
pm2 info telegram-bot-api
```

### مراقبة الخادم

```bash
# استخدام htop
sudo apt install -y htop
htop

# مراقبة استخدام القرص
df -h

# مراقبة الذاكرة
free -h
```

---

## الدعم

في حالة وجود مشاكل أو استفسارات:
1. راجع سجلات الأخطاء
2. تحقق من إعدادات ملف .env
3. تأكد من أن جميع الخدمات تعمل (MySQL, Nginx, PM2)

---

## ملخص الأوامر المهمة

```bash
# إدارة التطبيق
pm2 start ecosystem.config.js    # تشغيل
pm2 stop telegram-bot-api        # إيقاف
pm2 restart telegram-bot-api     # إعادة تشغيل
pm2 logs telegram-bot-api        # عرض السجلات
pm2 status                       # عرض الحالة

# إدارة Nginx
sudo systemctl start nginx       # تشغيل
sudo systemctl stop nginx        # إيقاف
sudo systemctl restart nginx     # إعادة تشغيل
sudo nginx -t                    # اختبار التكوين

# إدارة MySQL
sudo systemctl start mysql       # تشغيل
sudo systemctl stop mysql        # إيقاف
sudo systemctl restart mysql     # إعادة تشغيل
```
