/**
 * Database Configuration
 * Manages connections to VIP and Regular databases
 * 
 * IMPORTANT: All user subscriptions (both VIP and Regular) are stored in the VIP database
 * in the user_subscriptions table. This centralizes subscription management.
 * The Regular database only stores Regular users' data (facebook_accounts, contacts).
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
 * Check if a user is VIP with active subscription
 * Checks both is_active flag and subscription_end date
 * 
 * NOTE: All subscriptions are stored in VIP database (user_subscriptions table)
 */
export async function isVIPUser(telegramUserId: number): Promise<boolean> {
  try {
    const [rows] = await vipPool.query(
      `SELECT is_active, subscription_end FROM user_subscriptions 
       WHERE telegram_user_id = ? 
       AND subscription_type = 'vip' 
       AND is_active = TRUE
       AND (subscription_end IS NULL OR subscription_end > NOW())`,
      [telegramUserId]
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.error('Error checking VIP status:', error);
    return false;
  }
}

/**
 * Check if a user has any active subscription (VIP or Regular)
 * 
 * NOTE: All subscriptions are stored in VIP database (user_subscriptions table)
 * This is the centralized source of truth for all subscription types
 */
export async function hasActiveSubscription(telegramUserId: number): Promise<{hasSubscription: boolean, subscriptionType: string}> {
  try {
    // Check VIP first
    const isVIP = await isVIPUser(telegramUserId);
    if (isVIP) {
      return { hasSubscription: true, subscriptionType: 'vip' };
    }
    
    // Check Regular subscription (also stored in VIP DB)
    const [rows] = await vipPool.query(
      `SELECT is_active, subscription_end FROM user_subscriptions 
       WHERE telegram_user_id = ? 
       AND subscription_type = 'regular' 
       AND is_active = TRUE
       AND (subscription_end IS NULL OR subscription_end > NOW())`,
      [telegramUserId]
    );
    
    if (Array.isArray(rows) && rows.length > 0) {
      return { hasSubscription: true, subscriptionType: 'regular' };
    }
    
    return { hasSubscription: false, subscriptionType: 'none' };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { hasSubscription: false, subscriptionType: 'none' };
  }
}

/**
 * Get subscription details for a user
 */
export async function getSubscriptionDetails(telegramUserId: number) {
  try {
    const [rows]: any = await vipPool.query(
      `SELECT telegram_user_id, username, subscription_type, subscription_start, 
              subscription_end, is_active, created_at
       FROM user_subscriptions 
       WHERE telegram_user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [telegramUserId]
    );
    
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return null;
  }
}

/**
 * Renew subscription for a user (monthly)
 * 
 * NOTE: All subscriptions are stored in VIP database (user_subscriptions table)
 */
export async function renewSubscription(telegramUserId: number, subscriptionType: 'vip' | 'regular', months: number = 1) {
  try {
    // Calculate new end date (current date + months)
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + months);
    
    const [result]: any = await vipPool.query(
      `UPDATE user_subscriptions 
       SET subscription_end = ?, is_active = TRUE, updated_at = NOW()
       WHERE telegram_user_id = ? AND subscription_type = ?`,
      [newEndDate, telegramUserId, subscriptionType]
    );
    
    if (result.affectedRows === 0) {
      return { 
        success: false, 
        error: 'No subscription found to renew. Use addSubscription instead.' 
      };
    }
    
    return { success: true, newEndDate, affectedRows: result.affectedRows };
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return { success: false, error };
  }
}

/**
 * Cancel subscription for a user (specific type)
 * 
 * NOTE: All subscriptions are stored in VIP database (user_subscriptions table)
 */
export async function cancelSubscription(telegramUserId: number, subscriptionType?: 'vip' | 'regular') {
  try {
    let query = `UPDATE user_subscriptions 
                 SET is_active = FALSE, subscription_end = NOW(), updated_at = NOW()
                 WHERE telegram_user_id = ?`;
    let params: any[] = [telegramUserId];
    
    // If subscriptionType is specified, only cancel that type
    if (subscriptionType) {
      query += ` AND subscription_type = ?`;
      params.push(subscriptionType);
    }
    
    const [result]: any = await vipPool.query(query, params);
    
    if (result.affectedRows === 0) {
      return { 
        success: false, 
        error: 'No active subscription found to cancel.' 
      };
    }
    
    return { success: true, affectedRows: result.affectedRows };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, error };
  }
}

/**
 * Add new subscription for a user
 * 
 * NOTE: All subscriptions are stored in VIP database (user_subscriptions table)
 */
export async function addSubscription(
  telegramUserId: number, 
  username: string, 
  subscriptionType: 'vip' | 'regular',
  months: number = 1
) {
  try {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    
    const [result]: any = await vipPool.query(
      `INSERT INTO user_subscriptions 
       (telegram_user_id, username, subscription_type, subscription_start, subscription_end, is_active) 
       VALUES (?, ?, ?, NOW(), ?, TRUE)
       ON DUPLICATE KEY UPDATE 
       username = VALUES(username),
       subscription_type = VALUES(subscription_type), 
       subscription_start = NOW(),
       subscription_end = VALUES(subscription_end), 
       is_active = TRUE,
       updated_at = NOW()`,
      [telegramUserId, username, subscriptionType, endDate]
    );
    
    return { 
      success: true, 
      endDate, 
      isNew: result.affectedRows === 1,
      affectedRows: result.affectedRows 
    };
  } catch (error) {
    console.error('Error adding subscription:', error);
    return { success: false, error };
  }
}

/**
 * Get the appropriate database pool based on user type
 */
export function getDatabaseForUser(isVIP: boolean) {
  return isVIP ? vipPool : regularPool;
}
