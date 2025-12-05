/**
 * Database Configuration
 * Single unified database for all users
 * 
 * IMPORTANT: All users (VIP and Regular) use the same database.
 * - Regular users: Search only in facebook_accounts table
 * - VIP users: Search in all available tables (facebook_accounts, contacts, etc.)
 * - User subscriptions are stored in user_subscriptions table
 */

import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Table Configuration
 * Define which tables each user type can access
 */
export const TABLE_CONFIG = {
  REGULAR_TABLES: ['facebook_accounts'],
  VIP_TABLES: ['facebook_accounts', 'contacts'],
} as const;

// Single Database Configuration
export const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'telegram_bot',
  user: process.env.DB_USER || 'bot_user',
  password: process.env.DB_PASSWORD || '',
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

// Single connection pool for all users
export const dbPool = createPool(dbConfig);

/**
 * Check if a user is VIP with active subscription
 * Checks both is_active flag and subscription_end date
 */
export async function isVIPUser(telegramUserId: number): Promise<boolean> {
  try {
    const [rows] = await dbPool.query(
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
 * This is the centralized source of truth for all subscription types
 */
export async function hasActiveSubscription(telegramUserId: number): Promise<{hasSubscription: boolean, subscriptionType: string}> {
  try {
    const isVIP = await isVIPUser(telegramUserId);
    if (isVIP) {
      return { hasSubscription: true, subscriptionType: 'vip' };
    }
    
    const [rows] = await dbPool.query(
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
    const [rows]: any = await dbPool.query(
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
 */
export async function renewSubscription(telegramUserId: number, subscriptionType: 'vip' | 'regular', months: number = 1) {
  try {
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + months);
    
    const [result]: any = await dbPool.query(
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
 */
export async function cancelSubscription(telegramUserId: number, subscriptionType?: 'vip' | 'regular') {
  try {
    let query = `UPDATE user_subscriptions 
                 SET is_active = FALSE, subscription_end = NOW(), updated_at = NOW()
                 WHERE telegram_user_id = ?`;
    let params: any[] = [telegramUserId];
    
    if (subscriptionType) {
      query += ` AND subscription_type = ?`;
      params.push(subscriptionType);
    }
    
    const [result]: any = await dbPool.query(query, params);
    
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
 */
export async function addSubscription(
  telegramUserId: number, 
  username: string, 
  subscriptionType: 'vip' | 'regular',
  months: number = 1
) {
  try {
    if (subscriptionType !== 'vip' && subscriptionType !== 'regular') {
      console.error('Invalid subscription type:', subscriptionType);
      return { success: false, error: 'Invalid subscription type. Must be vip or regular.' };
    }
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    
    const [result]: any = await dbPool.query(
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
 * Get available tables for a user based on subscription type
 */
export function getTablesForUser(subscriptionType: 'vip' | 'regular'): readonly string[] {
  return subscriptionType === 'vip' ? TABLE_CONFIG.VIP_TABLES : TABLE_CONFIG.REGULAR_TABLES;
}

/**
 * Free Searches Configuration
 */
export const FREE_SEARCHES_CONFIG = {
  MAX_FREE_SEARCHES: 5,
} as const;

/**
 * Get user's free searches count
 */
export async function getFreeSearchesCount(telegramUserId: number): Promise<number> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT search_count FROM user_free_searches WHERE telegram_user_id = ?`,
      [telegramUserId]
    );
    
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].search_count;
    }
    return 0;
  } catch (error) {
    console.error('Error getting free searches count:', error);
    return 0;
  }
}

/**
 * Check if user has free searches remaining
 */
export async function hasFreeSsearchesRemaining(telegramUserId: number): Promise<{hasRemaining: boolean, used: number, remaining: number}> {
  const used = await getFreeSearchesCount(telegramUserId);
  const remaining = Math.max(0, FREE_SEARCHES_CONFIG.MAX_FREE_SEARCHES - used);
  return {
    hasRemaining: remaining > 0,
    used,
    remaining
  };
}

/**
 * Increment user's free search count
 */
export async function incrementFreeSearchCount(telegramUserId: number): Promise<{success: boolean, newCount: number}> {
  try {
    await dbPool.query(
      `INSERT INTO user_free_searches (telegram_user_id, search_count, last_search_at)
       VALUES (?, 1, NOW())
       ON DUPLICATE KEY UPDATE 
       search_count = search_count + 1,
       last_search_at = NOW()`,
      [telegramUserId]
    );
    
    const newCount = await getFreeSearchesCount(telegramUserId);
    return { success: true, newCount };
  } catch (error) {
    console.error('Error incrementing free search count:', error);
    return { success: false, newCount: 0 };
  }
}

/**
 * Check if user can perform a search (has subscription OR has free searches)
 */
export async function canUserSearch(telegramUserId: number): Promise<{
  canSearch: boolean;
  reason: 'subscription' | 'free_trial' | 'no_access';
  subscriptionType?: string;
  freeSearchesRemaining?: number;
}> {
  const subscription = await hasActiveSubscription(telegramUserId);
  
  if (subscription.hasSubscription) {
    return {
      canSearch: true,
      reason: 'subscription',
      subscriptionType: subscription.subscriptionType
    };
  }
  
  const freeSearches = await hasFreeSsearchesRemaining(telegramUserId);
  
  if (freeSearches.hasRemaining) {
    return {
      canSearch: true,
      reason: 'free_trial',
      freeSearchesRemaining: freeSearches.remaining
    };
  }
  
  return {
    canSearch: false,
    reason: 'no_access',
    freeSearchesRemaining: 0
  };
}

/**
 * Payment Configuration
 */
export const PAYMENT_CONFIG = {
  REGULAR_SUBSCRIPTION_STARS: 100,
  VIP_SUBSCRIPTION_STARS: 250,
  SUBSCRIPTION_PERIOD_DAYS: 30,
} as const;

/**
 * Store payment record
 */
export async function storePaymentRecord(
  telegramUserId: number,
  username: string,
  paymentChargeId: string,
  subscriptionType: 'vip' | 'regular',
  starsAmount: number
): Promise<{success: boolean}> {
  try {
    await dbPool.query(
      `INSERT INTO payment_records 
       (telegram_user_id, username, telegram_payment_charge_id, subscription_type, stars_amount, payment_date)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [telegramUserId, username, paymentChargeId, subscriptionType, starsAmount]
    );
    return { success: true };
  } catch (error) {
    console.error('Error storing payment record:', error);
    return { success: false };
  }
}

/**
 * Get payment record by charge ID (for refunds)
 */
export async function getPaymentByChargeId(chargeId: string) {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT * FROM payment_records WHERE telegram_payment_charge_id = ?`,
      [chargeId]
    );
    
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error getting payment record:', error);
    return null;
  }
}
