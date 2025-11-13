/**
 * Database Configuration
 * Manages connections to VIP and Regular databases
 */

import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// VIP Database Configuration
export const vipDbConfig: DatabaseConfig = {
  host: process.env.VIP_DB_HOST || 'localhost',
  port: parseInt(process.env.VIP_DB_PORT || '3306'),
  database: process.env.VIP_DB_NAME || 'telegram_bot_vip',
  user: process.env.VIP_DB_USER || 'bot_user',
  password: process.env.VIP_DB_PASSWORD || '',
};

// Regular Database Configuration
export const regularDbConfig: DatabaseConfig = {
  host: process.env.REGULAR_DB_HOST || 'localhost',
  port: parseInt(process.env.REGULAR_DB_PORT || '3306'),
  database: process.env.REGULAR_DB_NAME || 'telegram_bot_regular',
  user: process.env.REGULAR_DB_USER || 'bot_user',
  password: process.env.REGULAR_DB_PASSWORD || '',
};

/**
 * Create a database connection
 */
export async function createConnection(config: DatabaseConfig) {
  return await mysql.createConnection(config);
}

/**
 * Create a connection pool for better performance
 */
export function createPool(config: DatabaseConfig) {
  return mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

// Connection pools
export const vipPool = createPool(vipDbConfig);
export const regularPool = createPool(regularDbConfig);

/**
 * Check if a user is VIP
 */
export async function isVIPUser(telegramUserId: number): Promise<boolean> {
  try {
    const [rows] = await vipPool.query(
      `SELECT is_active FROM user_subscriptions 
       WHERE telegram_user_id = ? AND subscription_type = 'vip' AND is_active = TRUE`,
      [telegramUserId]
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.error('Error checking VIP status:', error);
    return false;
  }
}

/**
 * Get the appropriate database pool based on user type
 */
export function getDatabaseForUser(isVIP: boolean) {
  return isVIP ? vipPool : regularPool;
}
