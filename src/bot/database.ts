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

export const PAYMENT_CONFIG = {
  FREE_SEARCHES: 10,
  MONTHLY_SEARCH_LIMIT: 50,
  PACKAGES: {
    regular: {
      '1month': { stars: 50, months: 1, discount: 0 },
      '3months': { stars: 135, months: 3, discount: 10 },
      '6months': { stars: 240, months: 6, discount: 20 },
      '12months': { stars: 420, months: 12, discount: 30 },
    },
    vip: {
      '1month': { stars: 100, months: 1, discount: 0 },
      '3months': { stars: 270, months: 3, discount: 10 },
      '6months': { stars: 480, months: 6, discount: 20 },
      '12months': { stars: 840, months: 12, discount: 30 },
    },
  },
  REFERRAL_BONUS: {
    REFERRER_FREE_SEARCHES: 3,
    REFEREE_DISCOUNT_PERCENT: 10,
  },
};

export const TERMS_AND_CONDITIONS = {
  version: '1.0',
  lastUpdated: '2024-12-06',
  text: `
📜 <b>بنود وشروط الاستخدام</b>

1️⃣ <b>الغرض من البوت:</b>
هذا البوت مصمم حصرياً لأغراض مكافحة الاحتيال والأعمال المشروعة فقط.

2️⃣ <b>الاستخدام المسموح:</b>
• التحقق من هوية المتصلين لمنع الاحتيال
• حماية نفسك وعملك من المحتالين
• الأغراض القانونية والمشروعة فقط

3️⃣ <b>الاستخدام الممنوع:</b>
• التجسس أو المطاردة
• الابتزاز أو التهديد
• أي استخدام غير قانوني

4️⃣ <b>إخلاء المسؤولية:</b>
<b>المطورون والقائمون على هذا البوت غير مسؤولين عن أي استخدام خاطئ أو غير قانوني للمعلومات المقدمة.</b>

المستخدم وحده يتحمل المسؤولية الكاملة عن طريقة استخدامه للبيانات.

5️⃣ <b>الخصوصية:</b>
• نحتفظ بسجل البحث لتحسين الخدمة
• لا نشارك بياناتك مع أطراف ثالثة

⚠️ <b>تنبيه:</b> باستخدامك هذا البوت، أنت توافق على هذه الشروط وتتعهد باستخدامه للأغراض المشروعة فقط.
`,
};

export type PackageDuration = '1month' | '3months' | '6months' | '12months';
export type SubscriptionType = 'vip' | 'regular';

export function getPackageDetails(type: SubscriptionType, duration: PackageDuration) {
  return PAYMENT_CONFIG.PACKAGES[type][duration];
}

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

export async function addSubscription(
  telegramUserId: number,
  username: string,
  subscriptionType: 'vip' | 'regular',
  months: number = 1
): Promise<{ success: boolean; endDate?: Date; error?: string }> {
  try {
    const [existing]: any = await dbPool.query(
      `SELECT subscription_end FROM user_subscriptions WHERE telegram_user_id = ? AND is_active = TRUE`,
      [telegramUserId]
    );

    let startDate = new Date();
    if (Array.isArray(existing) && existing.length > 0 && existing[0].subscription_end) {
      const currentEnd = new Date(existing[0].subscription_end);
      if (currentEnd > startDate) {
        startDate = currentEnd;
      }
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    await dbPool.query(
      `INSERT INTO user_subscriptions (telegram_user_id, username, subscription_type, subscription_start, subscription_end, is_active)
       VALUES (?, ?, ?, NOW(), ?, TRUE)
       ON DUPLICATE KEY UPDATE 
         subscription_type = VALUES(subscription_type),
         subscription_end = ?,
         is_active = TRUE,
         updated_at = NOW()`,
      [telegramUserId, username, subscriptionType, endDate, endDate]
    );

    console.log(`✅ [Database] Subscription added: ${telegramUserId} - ${subscriptionType} - ${months} months`);
    return { success: true, endDate };
  } catch (error) {
    console.error('❌ [Database] Error adding subscription:', error);
    return { success: false, error: String(error) };
  }
}

export async function registerNewUser(telegramUserId: number, username: string): Promise<{ success: boolean; isNew: boolean }> {
  try {
    const [existing]: any = await dbPool.query(
      `SELECT telegram_user_id FROM user_subscriptions WHERE telegram_user_id = ?`,
      [telegramUserId]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return { success: true, isNew: false };
    }

    await dbPool.query(
      `INSERT INTO user_subscriptions (telegram_user_id, username, free_searches_used, is_active, created_at)
       VALUES (?, ?, 0, FALSE, NOW())`,
      [telegramUserId, username]
    );

    console.log(`✅ [Database] New user registered: ${telegramUserId} (${username}) with 5 free searches`);
    return { success: true, isNew: true };
  } catch (error) {
    console.error('❌ [Database] Error registering new user:', error);
    return { success: false, isNew: false };
  }
}

export async function getFreeSearchesRemaining(telegramUserId: number): Promise<number> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT free_searches_used FROM user_subscriptions WHERE telegram_user_id = ?`,
      [telegramUserId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const used = rows[0].free_searches_used || 0;
      return Math.max(0, PAYMENT_CONFIG.FREE_SEARCHES - used);
    }

    return PAYMENT_CONFIG.FREE_SEARCHES;
  } catch (error) {
    console.error('❌ [Database] Error getting free searches:', error);
    return 0;
  }
}

export async function useFreeSearch(telegramUserId: number, username: string): Promise<{ success: boolean; remaining: number }> {
  try {
    const remaining = await getFreeSearchesRemaining(telegramUserId);

    if (remaining <= 0) {
      return { success: false, remaining: 0 };
    }

    await dbPool.query(
      `INSERT INTO user_subscriptions (telegram_user_id, username, free_searches_used, is_active)
       VALUES (?, ?, 1, FALSE)
       ON DUPLICATE KEY UPDATE free_searches_used = free_searches_used + 1`,
      [telegramUserId, username]
    );

    return { success: true, remaining: remaining - 1 };
  } catch (error) {
    console.error('❌ [Database] Error using free search:', error);
    return { success: false, remaining: 0 };
  }
}

export async function generateReferralCode(telegramUserId: number, username: string): Promise<string> {
  try {
    const [existing]: any = await dbPool.query(
      `SELECT referral_code FROM user_referrals WHERE telegram_user_id = ?`,
      [telegramUserId]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return existing[0].referral_code;
    }

    const code = `REF${telegramUserId.toString().slice(-6)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await dbPool.query(
      `INSERT INTO user_referrals (telegram_user_id, username, referral_code, total_referrals, bonus_searches, created_at)
       VALUES (?, ?, ?, 0, 0, NOW())`,
      [telegramUserId, username, code]
    );

    console.log(`✅ [Database] Referral code generated: ${code} for user ${telegramUserId}`);
    return code;
  } catch (error) {
    console.error('❌ [Database] Error generating referral code:', error);
    throw error;
  }
}

export async function applyReferralCode(
  telegramUserId: number,
  username: string,
  referralCode: string
): Promise<{ success: boolean; message: string; discountPercent?: number }> {
  try {
    const [referrer]: any = await dbPool.query(
      `SELECT telegram_user_id, username FROM user_referrals WHERE referral_code = ?`,
      [referralCode]
    );

    if (!Array.isArray(referrer) || referrer.length === 0) {
      return { success: false, message: 'كود الإحالة غير صالح' };
    }

    const referrerId = referrer[0].telegram_user_id;

    if (referrerId === telegramUserId) {
      return { success: false, message: 'لا يمكنك استخدام كود الإحالة الخاص بك' };
    }

    const [existingUse]: any = await dbPool.query(
      `SELECT id FROM referral_uses WHERE referred_user_id = ?`,
      [telegramUserId]
    );

    if (Array.isArray(existingUse) && existingUse.length > 0) {
      return { success: false, message: 'لقد استخدمت كود إحالة من قبل' };
    }

    await dbPool.query(
      `INSERT INTO referral_uses (referral_code, referrer_id, referred_user_id, referred_username, discount_used, subscription_granted, created_at)
       VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())`,
      [referralCode, referrerId, telegramUserId, username]
    );

    await dbPool.query(
      `UPDATE user_referrals SET total_referrals = total_referrals + 1 WHERE telegram_user_id = ?`,
      [referrerId]
    );

    console.log(`✅ [Database] Referral code applied: ${referralCode} by user ${telegramUserId}`);
    return {
      success: true,
      message: `تم تطبيق كود الإحالة بنجاح! ستحصل على خصم ${PAYMENT_CONFIG.REFERRAL_BONUS.REFEREE_DISCOUNT_PERCENT}% على اشتراكك الأول`,
      discountPercent: PAYMENT_CONFIG.REFERRAL_BONUS.REFEREE_DISCOUNT_PERCENT
    };
  } catch (error) {
    console.error('❌ [Database] Error applying referral code:', error);
    return { success: false, message: 'حدث خطأ أثناء تطبيق كود الإحالة' };
  }
}

export async function getReferralStats(telegramUserId: number): Promise<{
  referralCode: string;
  totalReferrals: number;
  bonusSearches: number;
} | null> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT referral_code, total_referrals, bonus_searches FROM user_referrals WHERE telegram_user_id = ?`,
      [telegramUserId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return {
        referralCode: rows[0].referral_code,
        totalReferrals: rows[0].total_referrals,
        bonusSearches: rows[0].bonus_searches
      };
    }

    return null;
  } catch (error) {
    console.error('❌ [Database] Error getting referral stats:', error);
    return null;
  }
}

export async function grantReferralBonus(referrerId: number): Promise<{ success: boolean }> {
  try {
    await dbPool.query(
      `UPDATE user_referrals 
       SET bonus_searches = bonus_searches + ?, updated_at = NOW()
       WHERE telegram_user_id = ?`,
      [PAYMENT_CONFIG.REFERRAL_BONUS.REFERRER_FREE_SEARCHES, referrerId]
    );

    console.log(`✅ [Database] Referral bonus granted to ${referrerId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ [Database] Error granting referral bonus:', error);
    return { success: false };
  }
}

export async function useBonusSearch(telegramUserId: number): Promise<{ success: boolean; remaining: number }> {
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
    console.error('❌ [Database] Error using bonus search:', error);
    return { success: false, remaining: 0 };
  }
}

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
    console.error('❌ [Database] Error checking referral discount:', error);
    return { hasDiscount: false, discountPercent: 0 };
  }
}

export async function markReferralDiscountUsed(telegramUserId: number): Promise<{ success: boolean }> {
  try {
    await dbPool.query(
      `UPDATE referral_uses SET discount_used = TRUE WHERE referred_user_id = ?`,
      [telegramUserId]
    );
    return { success: true };
  } catch (error) {
    console.error('❌ [Database] Error marking discount used:', error);
    return { success: false };
  }
}

export async function saveSearchHistory(
  telegramUserId: number,
  searchQuery: string,
  searchType: 'phone' | 'facebook_id',
  resultsCount: number
): Promise<{ success: boolean }> {
  try {
    await dbPool.query(
      `INSERT INTO search_history (telegram_user_id, search_query, search_type, results_count, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [telegramUserId, searchQuery, searchType, resultsCount]
    );

    await dbPool.query(
      `DELETE FROM search_history 
       WHERE telegram_user_id = ? 
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM search_history 
           WHERE telegram_user_id = ? 
           ORDER BY created_at DESC 
           LIMIT 10
         ) as recent
       )`,
      [telegramUserId, telegramUserId]
    );

    return { success: true };
  } catch (error) {
    console.error('❌ [Database] Error saving search history:', error);
    return { success: false };
  }
}

export async function getSearchHistory(telegramUserId: number, limit: number = 10): Promise<Array<{
  searchQuery: string;
  searchType: string;
  resultsCount: number;
  createdAt: Date;
}>> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT search_query as searchQuery, search_type as searchType, results_count as resultsCount, created_at as createdAt
       FROM search_history 
       WHERE telegram_user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [telegramUserId, limit]
    );

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('❌ [Database] Error getting search history:', error);
    return [];
  }
}

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
    console.error('❌ [Database] Error getting expiring subscriptions:', error);
    return [];
  }
}

export async function markNotificationSent(telegramUserId: number): Promise<{ success: boolean }> {
  try {
    await dbPool.query(
      `UPDATE user_subscriptions SET notification_sent_at = NOW() WHERE telegram_user_id = ?`,
      [telegramUserId]
    );
    return { success: true };
  } catch (error) {
    console.error('❌ [Database] Error marking notification sent:', error);
    return { success: false };
  }
}

export async function hasAcceptedTerms(telegramUserId: number): Promise<boolean> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT terms_accepted, terms_version FROM user_subscriptions WHERE telegram_user_id = ?`,
      [telegramUserId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].terms_accepted === true || rows[0].terms_accepted === 1;
    }
    return false;
  } catch (error) {
    console.error('❌ [Database] Error checking terms acceptance:', error);
    return false;
  }
}

export async function acceptTerms(telegramUserId: number, username: string): Promise<{ success: boolean }> {
  try {
    await dbPool.query(
      `INSERT INTO user_subscriptions (telegram_user_id, username, terms_accepted, terms_version, terms_accepted_at, is_active, created_at)
       VALUES (?, ?, TRUE, ?, NOW(), FALSE, NOW())
       ON DUPLICATE KEY UPDATE 
         terms_accepted = TRUE,
         terms_version = VALUES(terms_version),
         terms_accepted_at = NOW()`,
      [telegramUserId, username, TERMS_AND_CONDITIONS.version]
    );

    console.log(`✅ [Database] Terms accepted by user ${telegramUserId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ [Database] Error accepting terms:', error);
    return { success: false };
  }
}

export async function getMonthlySearchCount(telegramUserId: number): Promise<number> {
  try {
    const [rows]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM search_history 
       WHERE telegram_user_id = ? 
       AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      [telegramUserId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].count || 0;
    }
    return 0;
  } catch (error) {
    console.error('❌ [Database] Error getting monthly search count:', error);
    return 0;
  }
}

export async function canPerformSearch(telegramUserId: number): Promise<{
  canSearch: boolean;
  reason: 'allowed' | 'limit_reached' | 'no_subscription';
  searchesUsed: number;
  searchesRemaining: number;
}> {
  try {
    const subscription = await hasActiveSubscription(telegramUserId);
    
    if (!subscription.hasSubscription) {
      const freeSearches = await getFreeSearchesRemaining(telegramUserId);
      if (freeSearches > 0) {
        return {
          canSearch: true,
          reason: 'allowed',
          searchesUsed: PAYMENT_CONFIG.FREE_SEARCHES - freeSearches,
          searchesRemaining: freeSearches
        };
      }
      return {
        canSearch: false,
        reason: 'no_subscription',
        searchesUsed: PAYMENT_CONFIG.FREE_SEARCHES,
        searchesRemaining: 0
      };
    }

    const monthlyCount = await getMonthlySearchCount(telegramUserId);
    const remaining = PAYMENT_CONFIG.MONTHLY_SEARCH_LIMIT - monthlyCount;
    
    if (remaining <= 0) {
      return {
        canSearch: false,
        reason: 'limit_reached',
        searchesUsed: monthlyCount,
        searchesRemaining: 0
      };
    }

    return {
      canSearch: true,
      reason: 'allowed',
      searchesUsed: monthlyCount,
      searchesRemaining: remaining
    };
  } catch (error) {
    console.error('❌ [Database] Error checking search permission:', error);
    return {
      canSearch: false,
      reason: 'no_subscription',
      searchesUsed: 0,
      searchesRemaining: 0
    };
  }
}

export async function testConnections(): Promise<void> {
  try {
    const [rows] = await dbPool.query('SELECT 1 as test');
    console.log('✅ [Database] Database connected successfully');
    
    const [tables] = await dbPool.query<any[]>('SHOW TABLES');
    const tableNames = tables.map((row: any) => Object.values(row)[0]);
    
    const requiredTables = ['user_subscriptions', 'facebook_accounts', 'contacts', 'user_referrals', 'referral_uses', 'search_history'];
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
