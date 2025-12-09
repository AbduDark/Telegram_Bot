import { Context } from 'hono';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbPool } from './config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key-change-in-production';

interface JWTPayload {
  adminId: number;
  username: string;
  role: string;
}

async function verifyAdminToken(c: Context): Promise<JWTPayload | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function handleAdminLogin(c: Context) {
  console.log('📨 [Admin API] POST /admin/login');
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }
    
    const [rows]: any = await dbPool.query(
      'SELECT id, username, password_hash, role FROM admin_users WHERE username = ?',
      [username]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }
    
    const admin = rows[0];
    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValid) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }
    
    await dbPool.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id]);
    
    const token = jwt.sign(
      { adminId: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const refreshToken = jwt.sign(
      { adminId: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`✅ [Admin API] Login successful: ${username}`);
    
    return c.json({
      success: true,
      token,
      refreshToken,
      admin: { id: admin.id, username: admin.username, role: admin.role }
    });
  } catch (error) {
    console.error('❌ [Admin API] Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleAdminStats(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  console.log(`📨 [Admin API] GET /admin/stats - Admin: ${admin.username}`);
  
  try {
    const [totalUsersResult]: any = await dbPool.query('SELECT COUNT(*) as count FROM user_subscriptions');
    const totalUsers = totalUsersResult[0]?.count || 0;
    
    const [activeSubsResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM user_subscriptions 
       WHERE is_active = TRUE AND (subscription_end IS NULL OR subscription_end > NOW())`
    );
    const activeSubscriptions = activeSubsResult[0]?.count || 0;
    
    const [searchesTodayResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM search_history WHERE DATE(created_at) = CURDATE()`
    );
    const searchesToday = searchesTodayResult[0]?.count || 0;
    
    const [newUsersResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM user_subscriptions WHERE DATE(created_at) = CURDATE()`
    );
    const newUsersToday = newUsersResult[0]?.count || 0;
    
    const [totalSearchesResult]: any = await dbPool.query('SELECT COUNT(*) as count FROM search_history');
    const totalSearches = totalSearchesResult[0]?.count || 0;
    
    return c.json({
      totalUsers,
      activeSubscriptions,
      estimatedRevenue: activeSubscriptions * 75,
      searchesToday,
      newUsersToday,
      totalSearches
    });
  } catch (error) {
    console.error('❌ [Admin API] Stats error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleAdminUsers(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  console.log(`📨 [Admin API] GET /admin/users - Admin: ${admin.username}`);
  
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const search = c.req.query('search') || '';
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let queryParams: any[] = [];
    
    if (search) {
      whereClause = 'WHERE username LIKE ? OR telegram_user_id LIKE ?';
      queryParams = [`%${search}%`, `%${search}%`];
    }
    
    const [countResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM user_subscriptions ${whereClause}`,
      queryParams
    );
    const total = countResult[0]?.count || 0;
    
    const [users]: any = await dbPool.query(
      `SELECT telegram_user_id, username, subscription_type, subscription_start, 
              subscription_end, is_active, free_searches_used, bonus_searches,
              terms_accepted, created_at, updated_at
       FROM user_subscriptions ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );
    
    console.log(`✅ [Admin API] Found ${users.length} users (total: ${total})`);
    
    return c.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('❌ [Admin API] Users list error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleAdminTables(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  console.log(`📨 [Admin API] GET /admin/tables - Admin: ${admin.username}`);
  
  try {
    const [tables]: any = await dbPool.query('SHOW TABLES');
    const tableNames = tables.map((row: any) => Object.values(row)[0]);
    console.log(`✅ [Admin API] Found ${tableNames.length} tables`);
    return c.json({ tables: tableNames });
  } catch (error) {
    console.error('❌ [Admin API] Get tables error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleAdminMe(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  try {
    const [rows]: any = await dbPool.query(
      'SELECT id, username, role, created_at, last_login FROM admin_users WHERE id = ?',
      [admin.adminId]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return c.json({ error: 'Admin not found' }, 404);
    }
    
    return c.json(rows[0]);
  } catch (error) {
    console.error('❌ [Admin API] Get me error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleAdminSubscriptions(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  console.log(`📨 [Admin API] GET /admin/subscriptions - Admin: ${admin.username}`);
  
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const status = c.req.query('status');
    const type = c.req.query('type');
    const offset = (page - 1) * limit;
    
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    
    if (status === 'active') {
      whereConditions.push('is_active = TRUE AND (subscription_end IS NULL OR subscription_end > NOW())');
    } else if (status === 'expired') {
      whereConditions.push('subscription_end IS NOT NULL AND subscription_end <= NOW()');
    } else if (status === 'inactive') {
      whereConditions.push('is_active = FALSE');
    }
    
    if (type === 'vip' || type === 'regular') {
      whereConditions.push('subscription_type = ?');
      queryParams.push(type);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const [countResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM user_subscriptions ${whereClause}`,
      queryParams
    );
    const total = countResult[0]?.count || 0;
    
    const [subscriptions]: any = await dbPool.query(
      `SELECT telegram_user_id, username, subscription_type, subscription_start, 
              subscription_end, is_active, created_at
       FROM user_subscriptions ${whereClause}
       ORDER BY subscription_start DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );
    
    return c.json({
      subscriptions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('❌ [Admin API] Subscriptions list error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleAdminReferrals(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  console.log(`📨 [Admin API] GET /admin/referrals - Admin: ${admin.username}`);
  
  try {
    const [totalReferralsResult]: any = await dbPool.query('SELECT SUM(total_referrals) as total FROM user_referrals');
    const totalReferrals = totalReferralsResult[0]?.total || 0;
    
    const [topReferrersResult]: any = await dbPool.query(
      `SELECT telegram_user_id, username, referral_code, total_referrals, bonus_searches, created_at
       FROM user_referrals ORDER BY total_referrals DESC LIMIT 20`
    );
    
    const [bonusSearchesResult]: any = await dbPool.query('SELECT SUM(bonus_searches) as total FROM user_referrals');
    const totalBonusSearches = bonusSearchesResult[0]?.total || 0;
    
    return c.json({
      totalReferrals,
      totalBonusSearches,
      topReferrers: topReferrersResult
    });
  } catch (error) {
    console.error('❌ [Admin API] Referrals error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleAdminSearchHistory(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  console.log(`📨 [Admin API] GET /admin/search-history - Admin: ${admin.username}`);
  
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const searchType = c.req.query('type');
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let queryParams: any[] = [];
    
    if (searchType === 'phone' || searchType === 'facebook_id') {
      whereClause = 'WHERE sh.search_type = ?';
      queryParams = [searchType];
    }
    
    const [countResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM search_history sh ${whereClause}`,
      queryParams
    );
    const total = countResult[0]?.count || 0;
    
    const [history]: any = await dbPool.query(
      `SELECT sh.id, sh.telegram_user_id, sh.search_query, sh.search_type, 
              sh.results_count, sh.created_at, us.username
       FROM search_history sh
       LEFT JOIN user_subscriptions us ON sh.telegram_user_id = us.telegram_user_id
       ${whereClause}
       ORDER BY sh.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );
    
    return c.json({
      history,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('❌ [Admin API] Search history error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function initAdminDatabase() {
  console.log('📊 [Admin DB] Creating admin tables...');
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'superadmin') DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    const [existing]: any = await dbPool.query('SELECT id FROM admin_users WHERE username = ?', ['admin']);
    if (!Array.isArray(existing) || existing.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await dbPool.query(
        'INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)',
        ['admin', hash, 'superadmin']
      );
      console.log('✅ [Admin DB] Default admin created: admin / admin123');
    }
    
    console.log('✅ [Admin DB] Admin tables ready');
  } catch (error) {
    console.error('❌ [Admin DB] Error creating admin tables:', error);
  }
}
