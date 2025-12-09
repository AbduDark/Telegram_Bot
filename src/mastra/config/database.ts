/**
 * Database Configuration
 * Single unified database for all users
 * 
 * IMPORTANT: All users (VIP, Regular, and Free) use the same database.
 * - All users can search in all available tables (facebook_accounts, contacts, etc.)
 * - Free users get 10 free searches
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
  REGULAR_TABLES: ['facebook_accounts', 'contacts'],
  VIP_TABLES: ['facebook_accounts', 'contacts'],
} as const;

/**
 * Get database configuration at runtime (lazy evaluation)
 * This ensures environment variables are read at runtime, not bundle time
 */
export function getDbConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    host: process.env.VIP_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.VIP_DB_PORT || process.env.DB_PORT || '3306'),
    database: process.env.VIP_DB_NAME || process.env.DB_NAME || 'telegram_bot',
    user: process.env.VIP_DB_USER || process.env.DB_USER || 'bot_user',
    password: process.env.VIP_DB_PASSWORD || process.env.DB_PASSWORD || '',
  };
  return config;
}

// Legacy export for backwards compatibility
export const dbConfig: DatabaseConfig = {
  host: process.env.VIP_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.VIP_DB_PORT || process.env.DB_PORT || '3306'),
  database: process.env.VIP_DB_NAME || process.env.DB_NAME || 'telegram_bot',
  user: process.env.VIP_DB_USER || process.env.DB_USER || 'bot_user',
  password: process.env.VIP_DB_PASSWORD || process.env.DB_PASSWORD || '',
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

// Lazy pool instance - initialized on first access
let _dbPool: ReturnType<typeof createPool> | null = null;

/**
 * Get database pool (lazy initialization)
 * This ensures environment variables are read at runtime
 */
export function getDbPool() {
  if (!_dbPool) {
    const config = getDbConfig();
    console.log('🔌 [Database] Initializing connection pool to:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
    });
    _dbPool = createPool(config);
  }
  return _dbPool;
}

// Legacy export - uses lazy getter
export const dbPool = {
  query: (...args: Parameters<ReturnType<typeof createPool>['query']>) => getDbPool().query(...args),
  execute: (...args: Parameters<ReturnType<typeof createPool>['execute']>) => getDbPool().execute(...args),
  getConnection: () => getDbPool().getConnection(),
  end: () => _dbPool?.end(),
};

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
  MAX_FREE_SEARCHES: 10,
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
 * Payment Configuration with Multiple Packages
 * Discounts: 3 months = 10%, 6 months = 20%, 12 months = 30%
 */
export const PAYMENT_CONFIG = {
  REGULAR_SUBSCRIPTION_STARS: 50,
  VIP_SUBSCRIPTION_STARS: 100,
  SUBSCRIPTION_PERIOD_DAYS: 30,
  FREE_SEARCHES: 10,
  MONTHLY_SEARCH_LIMIT: 50,
  
  PACKAGES: {
    regular: {
      '1month': { months: 1, stars: 50, discount: 0 },
      '3months': { months: 3, stars: 135, discount: 10 },
      '6months': { months: 6, stars: 240, discount: 20 },
      '12months': { months: 12, stars: 420, discount: 30 },
    },
    vip: {
      '1month': { months: 1, stars: 100, discount: 0 },
      '3months': { months: 3, stars: 270, discount: 10 },
      '6months': { months: 6, stars: 480, discount: 20 },
      '12months': { months: 12, stars: 840, discount: 30 },
    },
  },
  
  REFERRAL_BONUS: {
    REFERRER_FREE_SEARCHES: 3,
    REFEREE_DISCOUNT_PERCENT: 10,
  },
} as const;

export type PackageDuration = '1month' | '3months' | '6months' | '12months';
export type SubscriptionType = 'vip' | 'regular';

/**
 * Get package details by type and duration
 */
export function getPackageDetails(subscriptionType: SubscriptionType, duration: PackageDuration) {
  return PAYMENT_CONFIG.PACKAGES[subscriptionType][duration];
}

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

/**
 * ==========================================
 * REFERRAL SYSTEM FUNCTIONS
 * ==========================================
 */

/**
 * Generate a unique referral code for a user
 */
export function generateReferralCode(telegramUserId: number): string {
  const base = telegramUserId.toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF${base}${random}`;
}

/**
 * Create or get referral code for a user
 */
export async function getOrCreateReferralCode(telegramUserId: number, username: string): Promise<{success: boolean, code?: string, error?: any}> {
  try {
    const [existing]: any = await dbPool.query(
      `SELECT referral_code FROM user_referrals WHERE telegram_user_id = ?`,
      [telegramUserId]
    );
    
    if (Array.isArray(existing) && existing.length > 0) {
      return { success: true, code: existing[0].referral_code };
    }
    
    const code = generateReferralCode(telegramUserId);
    
    await dbPool.query(
      `INSERT INTO user_referrals (telegram_user_id, username, referral_code, bonus_searches, created_at)
       VALUES (?, ?, ?, 0, NOW())`,
      [telegramUserId, username, code]
    );
    
    return { success: true, code };
  } catch (error) {
    console.error('Error creating referral code:', error);
    return { success: false, error };
  }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(telegramUserId: number): Promise<{
  code: string;
  totalReferrals: number;
  successfulReferrals: number;
  bonusSearches: number;
} | null> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT referral_code, total_referrals, successful_referrals, bonus_searches 
       FROM user_referrals WHERE telegram_user_id = ?`,
      [telegramUserId]
    );
    
    if (Array.isArray(rows) && rows.length > 0) {
      return {
        code: rows[0].referral_code,
        totalReferrals: rows[0].total_referrals || 0,
        successfulReferrals: rows[0].successful_referrals || 0,
        bonusSearches: rows[0].bonus_searches || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return null;
  }
}

/**
 * Apply referral code (when new user uses a code)
 */
export async function applyReferralCode(
  newUserTelegramId: number, 
  newUserUsername: string, 
  referralCode: string
): Promise<{success: boolean, referrerId?: number, discount?: number, error?: string}> {
  try {
    const [referrer]: any = await dbPool.query(
      `SELECT telegram_user_id FROM user_referrals WHERE referral_code = ?`,
      [referralCode]
    );
    
    if (!Array.isArray(referrer) || referrer.length === 0) {
      return { success: false, error: 'كود الإحالة غير صالح' };
    }
    
    const referrerId = referrer[0].telegram_user_id;
    
    if (referrerId === newUserTelegramId) {
      return { success: false, error: 'لا يمكنك استخدام كود الإحالة الخاص بك' };
    }
    
    const [existingUse]: any = await dbPool.query(
      `SELECT id FROM referral_uses WHERE referred_user_id = ?`,
      [newUserTelegramId]
    );
    
    if (Array.isArray(existingUse) && existingUse.length > 0) {
      return { success: false, error: 'لقد استخدمت كود إحالة من قبل' };
    }
    
    await dbPool.query(
      `INSERT INTO referral_uses (referrer_id, referred_user_id, referred_username, referral_code, used_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [referrerId, newUserTelegramId, newUserUsername, referralCode]
    );
    
    await dbPool.query(
      `UPDATE user_referrals 
       SET total_referrals = total_referrals + 1, updated_at = NOW()
       WHERE telegram_user_id = ?`,
      [referrerId]
    );
    
    return { 
      success: true, 
      referrerId, 
      discount: PAYMENT_CONFIG.REFERRAL_BONUS.REFEREE_DISCOUNT_PERCENT 
    };
  } catch (error) {
    console.error('Error applying referral code:', error);
    return { success: false, error: 'حدث خطأ أثناء تطبيق كود الإحالة' };
  }
}

/**
 * Grant bonus to referrer when referred user subscribes
 */
export async function grantReferralBonus(referrerId: number): Promise<{success: boolean}> {
  try {
    await dbPool.query(
      `UPDATE user_referrals 
       SET successful_referrals = successful_referrals + 1,
           bonus_searches = bonus_searches + ?,
           updated_at = NOW()
       WHERE telegram_user_id = ?`,
      [PAYMENT_CONFIG.REFERRAL_BONUS.REFERRER_FREE_SEARCHES, referrerId]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error granting referral bonus:', error);
    return { success: false };
  }
}

/**
 * Use bonus search from referral rewards
 */
export async function useBonusSearch(telegramUserId: number): Promise<{success: boolean, remaining: number}> {
  try {
    const [current]: any = await dbPool.query(
      `SELECT bonus_searches FROM user_referrals WHERE telegram_user_id = ?`,
      [telegramUserId]
    );
    
    if (!Array.isArray(current) || current.length === 0 || current[0].bonus_searches <= 0) {
      return { success: false, remaining: 0 };
    }
    
    await dbPool.query(
      `UPDATE user_referrals SET bonus_searches = bonus_searches - 1, updated_at = NOW()
       WHERE telegram_user_id = ? AND bonus_searches > 0`,
      [telegramUserId]
    );
    
    return { success: true, remaining: current[0].bonus_searches - 1 };
  } catch (error) {
    console.error('Error using bonus search:', error);
    return { success: false, remaining: 0 };
  }
}

/**
 * Check if user has a pending referral discount
 */
export async function getUserReferralDiscount(telegramUserId: number): Promise<{
  hasDiscount: boolean;
  discountPercent: number;
  referralCode?: string;
}> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT referral_code, discount_used FROM referral_uses 
       WHERE referred_user_id = ? AND discount_used = FALSE`,
      [telegramUserId]
    );
    
    if (Array.isArray(rows) && rows.length > 0) {
      return {
        hasDiscount: true,
        discountPercent: PAYMENT_CONFIG.REFERRAL_BONUS.REFEREE_DISCOUNT_PERCENT,
        referralCode: rows[0].referral_code
      };
    }
    
    return { hasDiscount: false, discountPercent: 0 };
  } catch (error) {
    console.error('Error checking referral discount:', error);
    return { hasDiscount: false, discountPercent: 0 };
  }
}

/**
 * Mark referral discount as used
 */
export async function markReferralDiscountUsed(telegramUserId: number): Promise<{success: boolean}> {
  try {
    await dbPool.query(
      `UPDATE referral_uses SET discount_used = TRUE WHERE referred_user_id = ?`,
      [telegramUserId]
    );
    return { success: true };
  } catch (error) {
    console.error('Error marking discount used:', error);
    return { success: false };
  }
}

/**
 * ==========================================
 * SEARCH HISTORY FUNCTIONS
 * ==========================================
 */

export interface SearchHistoryEntry {
  id: number;
  searchQuery: string;
  searchType: 'phone' | 'facebook_id';
  resultsFound: number;
  searchedAt: Date;
}

/**
 * Save a search to history
 */
export async function saveSearchHistory(
  telegramUserId: number,
  searchQuery: string,
  searchType: 'phone' | 'facebook_id',
  resultsFound: number
): Promise<{success: boolean}> {
  try {
    await dbPool.query(
      `INSERT INTO search_history (telegram_user_id, search_query, search_type, results_found, searched_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [telegramUserId, searchQuery, searchType, resultsFound]
    );
    
    await dbPool.query(
      `DELETE FROM search_history 
       WHERE telegram_user_id = ? 
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM search_history 
           WHERE telegram_user_id = ? 
           ORDER BY searched_at DESC 
           LIMIT 10
         ) AS recent
       )`,
      [telegramUserId, telegramUserId]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error saving search history:', error);
    return { success: false };
  }
}

/**
 * Get user's search history (last 10 searches)
 */
export async function getSearchHistory(telegramUserId: number): Promise<SearchHistoryEntry[]> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT id, search_query as searchQuery, search_type as searchType, 
              results_found as resultsFound, searched_at as searchedAt
       FROM search_history 
       WHERE telegram_user_id = ?
       ORDER BY searched_at DESC
       LIMIT 10`,
      [telegramUserId]
    );
    
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
}

/**
 * Clear user's search history
 */
export async function clearSearchHistory(telegramUserId: number): Promise<{success: boolean, deletedCount: number}> {
  try {
    const [result]: any = await dbPool.query(
      `DELETE FROM search_history WHERE telegram_user_id = ?`,
      [telegramUserId]
    );
    
    return { success: true, deletedCount: result.affectedRows || 0 };
  } catch (error) {
    console.error('Error clearing search history:', error);
    return { success: false, deletedCount: 0 };
  }
}

/**
 * ==========================================
 * NOTIFICATION HELPER FUNCTIONS
 * ==========================================
 */

/**
 * Get users with subscriptions expiring in X days
 * Note: chat_id is stored when user first subscribes for notification purposes
 */
export async function getUsersWithExpiringSubscriptions(daysUntilExpiry: number = 3): Promise<Array<{
  telegramUserId: number;
  username: string;
  subscriptionType: string;
  subscriptionEnd: Date;
  chatId: number;
}>> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT telegram_user_id as telegramUserId, username, subscription_type as subscriptionType, 
              subscription_end as subscriptionEnd, telegram_user_id as chatId
       FROM user_subscriptions 
       WHERE is_active = TRUE 
       AND subscription_end IS NOT NULL
       AND subscription_end > NOW()
       AND subscription_end <= DATE_ADD(NOW(), INTERVAL ? DAY)
       AND (notification_sent_at IS NULL OR notification_sent_at < DATE_SUB(NOW(), INTERVAL 1 DAY))`,
      [daysUntilExpiry]
    );
    
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('Error getting expiring subscriptions:', error);
    return [];
  }
}

/**
 * Mark notification as sent for a user
 */
export async function markNotificationSent(telegramUserId: number): Promise<{success: boolean}> {
  try {
    await dbPool.query(
      `UPDATE user_subscriptions SET notification_sent_at = NOW() WHERE telegram_user_id = ?`,
      [telegramUserId]
    );
    return { success: true };
  } catch (error) {
    console.error('Error marking notification sent:', error);
    return { success: false };
  }
}
