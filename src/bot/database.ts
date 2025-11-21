import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG = {
  host: process.env.VIP_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.VIP_DB_PORT || process.env.DB_PORT || '3306', 10),
  user: process.env.VIP_DB_USER || process.env.DB_USER,
  password: process.env.VIP_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.VIP_DB_NAME || process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false,
};

if (!DB_CONFIG.user || !DB_CONFIG.password || !DB_CONFIG.database) {
  console.error('❌ [Database] Missing required environment variables:');
  if (!DB_CONFIG.user) console.error('   - VIP_DB_USER or DB_USER');
  if (!DB_CONFIG.password) console.error('   - VIP_DB_PASSWORD or DB_PASSWORD');
  if (!DB_CONFIG.database) console.error('   - VIP_DB_NAME or DB_NAME');
  console.error('\nPlease configure these in your .env file.');
  process.exit(1);
}

export const dbPool = mysql.createPool(DB_CONFIG);

export const vipPool = dbPool;
export const facebookPool = dbPool;
export const contactsPool = dbPool;

interface SubscriptionResult {
  hasSubscription: boolean;
  subscriptionType?: 'vip' | 'regular';
}

interface SubscriptionDetails {
  telegram_user_id: number;
  username: string | null;
  subscription_type: 'vip' | 'regular';
  subscription_start: Date;
  subscription_end: Date | null;
  is_active: boolean;
}

export async function hasActiveSubscription(telegramUserId: number): Promise<SubscriptionResult> {
  try {
    const [rows] = await dbPool.query<any[]>(
      `SELECT subscription_type 
       FROM user_subscriptions 
       WHERE telegram_user_id = ? 
       AND is_active = TRUE 
       AND (subscription_end IS NULL OR subscription_end > NOW())
       LIMIT 1`,
      [telegramUserId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return {
        hasSubscription: true,
        subscriptionType: rows[0].subscription_type as 'vip' | 'regular'
      };
    }

    return { hasSubscription: false };
  } catch (error) {
    console.error('❌ [Database] Error checking subscription:', error);
    throw error;
  }
}

export async function getSubscriptionDetails(telegramUserId: number): Promise<SubscriptionDetails | null> {
  try {
    const [rows] = await dbPool.query<any[]>(
      `SELECT telegram_user_id, username, subscription_type, subscription_start, subscription_end, is_active
       FROM user_subscriptions 
       WHERE telegram_user_id = ?
       LIMIT 1`,
      [telegramUserId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0] as SubscriptionDetails;
    }

    return null;
  } catch (error) {
    console.error('❌ [Database] Error getting subscription details:', error);
    throw error;
  }
}

export async function testConnections(): Promise<void> {
  try {
    const [rows] = await dbPool.query('SELECT 1 as test');
    console.log('✅ [Database] Database connected successfully');
    
    const [tables] = await dbPool.query<any[]>('SHOW TABLES');
    const tableNames = tables.map((row: any) => Object.values(row)[0]);
    
    const requiredTables = ['user_subscriptions', 'facebook_accounts', 'contacts'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.warn(`⚠️  [Database] Missing tables: ${missingTables.join(', ')}`);
      console.warn('   Some features may not work correctly.');
    } else {
      console.log(`✅ [Database] All required tables present`);
    }
    
  } catch (error) {
    console.error('❌ [Database] Connection test failed:', error);
    console.error('\nCannot start server without database connection.');
    console.error('Please check your .env configuration and ensure MySQL is running.\n');
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await dbPool.end();
  console.log('📴 [Database] Connection closed');
});
