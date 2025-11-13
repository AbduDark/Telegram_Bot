#!/usr/bin/env node

/**
 * Telegram Phone Lookup Bot - Setup Script
 * سكريبت سهل لإعداد البوت من الصفر
 */

const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log('\n🤖 ═══════════════════════════════════════════════════');
console.log('   إعداد بوت البحث عن أرقام الهاتف - Telegram Bot');
console.log('═══════════════════════════════════════════════════\n');

async function setup() {
  const config = {};

  try {
    // ========== Telegram Bot Token ==========
    console.log('📱 إعدادات بوت Telegram\n');
    config.TELEGRAM_BOT_TOKEN = await question('أدخل Telegram Bot Token: ');
    
    // ========== Database VIP ==========
    console.log('\n💎 إعدادات قاعدة بيانات VIP (المشتركين المميزين)\n');
    config.VIP_DB_HOST = await question('VIP Database Host [localhost]: ') || 'localhost';
    config.VIP_DB_PORT = await question('VIP Database Port [3306]: ') || '3306';
    config.VIP_DB_NAME = await question('VIP Database Name [telegram_bot_vip]: ') || 'telegram_bot_vip';
    config.VIP_DB_USER = await question('VIP Database User [bot_user]: ') || 'bot_user';
    config.VIP_DB_PASSWORD = await question('VIP Database Password: ');
    
    // ========== Database Regular ==========
    console.log('\n👥 إعدادات قاعدة بيانات عادية (المشتركين العاديين)\n');
    config.REGULAR_DB_HOST = await question('Regular Database Host [localhost]: ') || 'localhost';
    config.REGULAR_DB_PORT = await question('Regular Database Port [3306]: ') || '3306';
    config.REGULAR_DB_NAME = await question('Regular Database Name [telegram_bot_regular]: ') || 'telegram_bot_regular';
    config.REGULAR_DB_USER = await question('Regular Database User [bot_user]: ') || 'bot_user';
    config.REGULAR_DB_PASSWORD = await question('Regular Database Password: ');
    
    // ========== AI API Keys ==========
    console.log('\n🤖 إعدادات AI (اختياري - اضغط Enter للتخطي)\n');
    config.OPENAI_API_KEY = await question('OpenAI API Key (اختياري): ') || '';
    config.GROQ_API_KEY = await question('Groq API Key (اختياري): ') || '';
    
    // ========== Server Settings ==========
    console.log('\n⚙️ إعدادات السيرفر\n');
    config.PORT = await question('Port للتشغيل [5000]: ') || '5000';
    config.BOT_URL = await question('URL البوت (للـ webhook) [https://yourdomain.com]: ') || 'https://yourdomain.com';
    config.NODE_ENV = 'production';
    
    // ========== Create .env file ==========
    console.log('\n📝 إنشاء ملف .env...');
    
    const envContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${config.TELEGRAM_BOT_TOKEN}

# VIP Database (للمشتركين المميزين)
VIP_DB_HOST=${config.VIP_DB_HOST}
VIP_DB_PORT=${config.VIP_DB_PORT}
VIP_DB_NAME=${config.VIP_DB_NAME}
VIP_DB_USER=${config.VIP_DB_USER}
VIP_DB_PASSWORD=${config.VIP_DB_PASSWORD}
VIP_DATABASE_URL=mysql://${config.VIP_DB_USER}:${config.VIP_DB_PASSWORD}@${config.VIP_DB_HOST}:${config.VIP_DB_PORT}/${config.VIP_DB_NAME}

# Regular Database (للمشتركين العاديين)
REGULAR_DB_HOST=${config.REGULAR_DB_HOST}
REGULAR_DB_PORT=${config.REGULAR_DB_PORT}
REGULAR_DB_NAME=${config.REGULAR_DB_NAME}
REGULAR_DB_USER=${config.REGULAR_DB_USER}
REGULAR_DB_PASSWORD=${config.REGULAR_DB_PASSWORD}
REGULAR_DATABASE_URL=mysql://${config.REGULAR_DB_USER}:${config.REGULAR_DB_PASSWORD}@${config.REGULAR_DB_HOST}:${config.REGULAR_DB_PORT}/${config.REGULAR_DB_NAME}

# AI API Keys (اختياري)
OPENAI_API_KEY=${config.OPENAI_API_KEY}
GROQ_API_KEY=${config.GROQ_API_KEY}

# Server Configuration
PORT=${config.PORT}
BOT_URL=${config.BOT_URL}
NODE_ENV=${config.NODE_ENV}

# Mastra Configuration
DATABASE_URL=\${VIP_DATABASE_URL}
`;
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ تم إنشاء ملف .env');
    
    // ========== Setup Databases ==========
    console.log('\n🗄️ إعداد قواعد البيانات...\n');
    const setupDB = await question('هل تريد إنشاء الجداول تلقائياً؟ (y/n) [y]: ') || 'y';
    
    if (setupDB.toLowerCase() === 'y') {
      console.log('\n⏳ جاري إنشاء الجداول...');
      
      // VIP Database
      try {
        console.log('\n💎 إنشاء جداول قاعدة VIP...');
        await createDatabaseTables({
          host: config.VIP_DB_HOST,
          port: config.VIP_DB_PORT,
          database: config.VIP_DB_NAME,
          user: config.VIP_DB_USER,
          password: config.VIP_DB_PASSWORD
        }, 'VIP');
      } catch (error) {
        console.error('❌ خطأ في إنشاء جداول VIP:', error.message);
      }
      
      // Regular Database
      try {
        console.log('\n👥 إنشاء جداول قاعدة Regular...');
        await createDatabaseTables({
          host: config.REGULAR_DB_HOST,
          port: config.REGULAR_DB_PORT,
          database: config.REGULAR_DB_NAME,
          user: config.REGULAR_DB_USER,
          password: config.REGULAR_DB_PASSWORD
        }, 'Regular');
      } catch (error) {
        console.error('❌ خطأ في إنشاء جداول Regular:', error.message);
      }
    }
    
    // ========== VIP Users Management ==========
    console.log('\n👑 إعداد المستخدمين المميزين (VIP)\n');
    await setupVIPUsers(config);
    
    // ========== Install Dependencies ==========
    console.log('\n📦 تثبيت المكتبات...');
    const installDeps = await question('هل تريد تثبيت npm packages؟ (y/n) [y]: ') || 'y';
    
    if (installDeps.toLowerCase() === 'y') {
      try {
        console.log('⏳ جاري تثبيت المكتبات...');
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ تم تثبيت المكتبات بنجاح');
      } catch (error) {
        console.error('❌ خطأ في تثبيت المكتبات:', error.message);
      }
    }
    
    // ========== Final Instructions ==========
    console.log('\n\n🎉 ═══════════════════════════════════════════════════');
    console.log('   تم الإعداد بنجاح! ✅');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📋 الخطوات التالية:\n');
    console.log('1. تأكد من صحة البيانات في ملف .env');
    console.log('2. شغّل البوت باستخدام: npm run dev');
    console.log('3. أو استخدم PM2: pm2 start ecosystem.config.js');
    console.log('4. راجع ملف vip-users.json لإدارة المستخدمين المميزين');
    console.log('\n📚 لمزيد من التفاصيل، راجع: docs/UBUNTU_DEPLOYMENT_GUIDE.md\n');
    
  } catch (error) {
    console.error('\n❌ حدث خطأ:', error.message);
  } finally {
    rl.close();
  }
}

async function createDatabaseTables(dbConfig, dbType) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Create facebook_accounts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS facebook_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        facebook_id VARCHAR(255),
        name VARCHAR(255),
        phone VARCHAR(50),
        facebook_url VARCHAR(500),
        email VARCHAR(255),
        location VARCHAR(255),
        job VARCHAR(255),
        gender VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_facebook_id (facebook_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log(`   ✅ تم إنشاء جدول facebook_accounts في ${dbType}`);
    
    // Create contacts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        address TEXT,
        phone VARCHAR(50),
        phone2 VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_phone2 (phone2)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log(`   ✅ تم إنشاء جدول contacts في ${dbType}`);
    
    // Create user_subscriptions table (for VIP tracking)
    if (dbType === 'VIP') {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          telegram_user_id BIGINT NOT NULL UNIQUE,
          username VARCHAR(255),
          first_name VARCHAR(255),
          subscription_type ENUM('vip', 'regular') DEFAULT 'regular',
          subscription_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          subscription_end TIMESTAMP NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_telegram_user_id (telegram_user_id),
          INDEX idx_subscription_type (subscription_type),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log(`   ✅ تم إنشاء جدول user_subscriptions في ${dbType}`);
    }
    
  } finally {
    await connection.end();
  }
}

async function setupVIPUsers(config) {
  const addVIP = await question('هل تريد إضافة مستخدمين VIP الآن؟ (y/n) [n]: ') || 'n';
  
  const vipUsers = [];
  
  if (addVIP.toLowerCase() === 'y') {
    console.log('\n📝 أدخل Telegram User IDs للمستخدمين المميزين (اضغط Enter مرتين للانتهاء)\n');
    
    while (true) {
      const userId = await question('Telegram User ID (أو Enter للانتهاء): ');
      if (!userId) break;
      
      const username = await question('Username (اختياري): ') || '';
      const notes = await question('ملاحظات (اختياري): ') || '';
      
      vipUsers.push({
        telegram_user_id: parseInt(userId),
        username: username,
        subscription_type: 'vip',
        notes: notes,
        added_at: new Date().toISOString()
      });
      
      console.log('✅ تمت الإضافة\n');
    }
  }
  
  // Save to vip-users.json
  fs.writeFileSync('vip-users.json', JSON.stringify(vipUsers, null, 2));
  console.log(`✅ تم حفظ ${vipUsers.length} مستخدم VIP في ملف vip-users.json`);
  
  // Insert into database if we have VIP users and database is set up
  if (vipUsers.length > 0) {
    try {
      const connection = await mysql.createConnection({
        host: config.VIP_DB_HOST,
        port: config.VIP_DB_PORT,
        database: config.VIP_DB_NAME,
        user: config.VIP_DB_USER,
        password: config.VIP_DB_PASSWORD
      });
      
      for (const user of vipUsers) {
        await connection.query(
          `INSERT INTO user_subscriptions (telegram_user_id, username, subscription_type, is_active) 
           VALUES (?, ?, 'vip', TRUE)
           ON DUPLICATE KEY UPDATE subscription_type = 'vip', is_active = TRUE`,
          [user.telegram_user_id, user.username]
        );
      }
      
      await connection.end();
      console.log('✅ تم إضافة المستخدمين المميزين إلى قاعدة البيانات');
    } catch (error) {
      console.log('⚠️ لم يتم إضافة المستخدمين لقاعدة البيانات (يمكن إضافتهم لاحقاً)');
    }
  }
}

// Run setup
setup();
