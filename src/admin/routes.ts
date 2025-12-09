import { Router, Request, Response } from 'express';
import { dbPool } from '../bot/database';
import {
  createAdminTables,
  getAdminByUsername,
  getAdminById,
  validateAdminPassword,
  updateLastLogin,
  getAllSettings,
  setSetting
} from './database';
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  refreshToken,
  AuthenticatedRequest
} from './auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  console.log('📨 [Admin API] POST /admin/login');
  
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ [Admin API] Missing username or password');
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    console.log(`🔐 [Admin API] Login attempt for: ${username}`);

    const result = await validateAdminPassword(username, password);

    if (!result.valid || !result.admin) {
      console.log(`❌ [Admin API] Invalid credentials for: ${username}`);
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    await updateLastLogin(result.admin.id);

    const token = generateToken(result.admin.id, result.admin.username, result.admin.role);
    const refresh = generateRefreshToken(result.admin.id, result.admin.username, result.admin.role);

    console.log(`✅ [Admin API] Login successful for: ${username}`);

    res.json({
      success: true,
      token,
      refreshToken: refresh,
      admin: {
        id: result.admin.id,
        username: result.admin.username,
        role: result.admin.role
      }
    });
  } catch (error) {
    console.error('❌ [Admin API] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  console.log('📨 [Admin API] POST /admin/refresh');
  
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const result = refreshToken(token);

    if (!result.success) {
      res.status(401).json({ error: result.error });
      return;
    }

    res.json({ success: true, token: result.newToken });
  } catch (error) {
    console.error('❌ [Admin API] Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] GET /admin/me - Admin: ${req.admin?.username}`);
  
  try {
    if (!req.admin) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const admin = await getAdminById(req.admin.adminId);

    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    res.json({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      created_at: admin.created_at,
      last_login: admin.last_login
    });
  } catch (error) {
    console.error('❌ [Admin API] Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] GET /admin/stats - Admin: ${req.admin?.username}`);
  
  try {
    const [totalUsersResult]: any = await dbPool.query(
      'SELECT COUNT(*) as count FROM user_subscriptions'
    );
    const totalUsers = totalUsersResult[0]?.count || 0;
    console.log(`📊 [Admin API] Total users: ${totalUsers}`);

    const [activeSubsResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM user_subscriptions 
       WHERE is_active = TRUE AND (subscription_end IS NULL OR subscription_end > NOW())`
    );
    const activeSubscriptions = activeSubsResult[0]?.count || 0;
    console.log(`📊 [Admin API] Active subscriptions: ${activeSubscriptions}`);

    const [subTypesResult]: any = await dbPool.query(
      `SELECT subscription_type, COUNT(*) as count FROM user_subscriptions 
       WHERE is_active = TRUE AND (subscription_end IS NULL OR subscription_end > NOW())
       GROUP BY subscription_type`
    );
    
    let estimatedRevenue = 0;
    for (const row of subTypesResult) {
      if (row.subscription_type === 'vip') {
        estimatedRevenue += row.count * 100;
      } else if (row.subscription_type === 'regular') {
        estimatedRevenue += row.count * 50;
      }
    }
    console.log(`📊 [Admin API] Estimated revenue (Stars): ${estimatedRevenue}`);

    const [searchesTodayResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM search_history 
       WHERE DATE(created_at) = CURDATE()`
    );
    const searchesToday = searchesTodayResult[0]?.count || 0;
    console.log(`📊 [Admin API] Searches today: ${searchesToday}`);

    const [newUsersResult]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM user_subscriptions 
       WHERE DATE(created_at) = CURDATE()`
    );
    const newUsersToday = newUsersResult[0]?.count || 0;

    const [totalSearchesResult]: any = await dbPool.query(
      'SELECT COUNT(*) as count FROM search_history'
    );
    const totalSearches = totalSearchesResult[0]?.count || 0;

    res.json({
      totalUsers,
      activeSubscriptions,
      estimatedRevenue,
      searchesToday,
      newUsersToday,
      totalSearches,
      subscriptionBreakdown: subTypesResult
    });
  } catch (error) {
    console.error('❌ [Admin API] Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] GET /admin/users - Admin: ${req.admin?.username}`);
  
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    console.log(`📊 [Admin API] Users query - page: ${page}, limit: ${limit}, search: "${search}"`);

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

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ [Admin API] Users list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  console.log(`📨 [Admin API] GET /admin/users/${userId} - Admin: ${req.admin?.username}`);
  
  try {
    const [userResult]: any = await dbPool.query(
      `SELECT telegram_user_id, username, subscription_type, subscription_start, 
              subscription_end, is_active, free_searches_used, bonus_searches,
              referral_code, referred_by, terms_accepted, created_at, updated_at
       FROM user_subscriptions 
       WHERE telegram_user_id = ?`,
      [userId]
    );

    if (!userResult || userResult.length === 0) {
      console.log(`⚠️ [Admin API] User not found: ${userId}`);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult[0];

    const [searchHistory]: any = await dbPool.query(
      `SELECT search_query, search_type, results_count, created_at
       FROM search_history 
       WHERE telegram_user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const [referralInfo]: any = await dbPool.query(
      `SELECT referral_code, total_referrals, bonus_searches 
       FROM user_referrals 
       WHERE telegram_user_id = ?`,
      [userId]
    );

    console.log(`✅ [Admin API] User details retrieved: ${userId}`);

    res.json({
      user,
      searchHistory,
      referral: referralInfo[0] || null
    });
  } catch (error) {
    console.error('❌ [Admin API] User details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/subscription', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  console.log(`📨 [Admin API] PUT /admin/users/${userId}/subscription - Admin: ${req.admin?.username}`);
  
  try {
    const { action, months, subscription_type } = req.body;

    if (action === 'extend') {
      if (!months || months < 1) {
        res.status(400).json({ error: 'Months must be at least 1' });
        return;
      }

      console.log(`📝 [Admin API] Extending subscription for user ${userId} by ${months} months`);

      const [current]: any = await dbPool.query(
        'SELECT subscription_end FROM user_subscriptions WHERE telegram_user_id = ?',
        [userId]
      );

      let startDate = new Date();
      if (current[0]?.subscription_end && new Date(current[0].subscription_end) > startDate) {
        startDate = new Date(current[0].subscription_end);
      }

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);

      await dbPool.query(
        `UPDATE user_subscriptions 
         SET subscription_end = ?, 
             subscription_type = COALESCE(?, subscription_type, 'regular'),
             is_active = TRUE,
             updated_at = NOW()
         WHERE telegram_user_id = ?`,
        [endDate, subscription_type, userId]
      );

      console.log(`✅ [Admin API] Subscription extended for user ${userId} until ${endDate}`);

      res.json({ success: true, message: 'Subscription extended', newEndDate: endDate });
    } else if (action === 'cancel') {
      console.log(`📝 [Admin API] Canceling subscription for user ${userId}`);

      await dbPool.query(
        `UPDATE user_subscriptions 
         SET is_active = FALSE, updated_at = NOW()
         WHERE telegram_user_id = ?`,
        [userId]
      );

      console.log(`✅ [Admin API] Subscription canceled for user ${userId}`);

      res.json({ success: true, message: 'Subscription canceled' });
    } else {
      res.status(400).json({ error: 'Invalid action. Use "extend" or "cancel"' });
    }
  } catch (error) {
    console.error('❌ [Admin API] Subscription update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/free-searches', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  console.log(`📨 [Admin API] PUT /admin/users/${userId}/free-searches - Admin: ${req.admin?.username}`);
  
  try {
    const { count } = req.body;

    if (typeof count !== 'number' || count < 0) {
      res.status(400).json({ error: 'Count must be a non-negative number' });
      return;
    }

    console.log(`📝 [Admin API] Setting free searches for user ${userId} to reset by ${count}`);

    await dbPool.query(
      `UPDATE user_subscriptions 
       SET free_searches_used = GREATEST(0, free_searches_used - ?),
           updated_at = NOW()
       WHERE telegram_user_id = ?`,
      [count, userId]
    );

    await dbPool.query(
      `UPDATE user_referrals 
       SET bonus_searches = bonus_searches + ?,
           updated_at = NOW()
       WHERE telegram_user_id = ?`,
      [count, userId]
    );

    console.log(`✅ [Admin API] Added ${count} bonus searches for user ${userId}`);

    res.json({ success: true, message: `Added ${count} bonus searches` });
  } catch (error) {
    console.error('❌ [Admin API] Free searches update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/subscriptions', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] GET /admin/subscriptions - Admin: ${req.admin?.username}`);
  
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const type = req.query.type as string;
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

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    console.log(`📊 [Admin API] Subscriptions query - status: ${status}, type: ${type}`);

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

    console.log(`✅ [Admin API] Found ${subscriptions.length} subscriptions (total: ${total})`);

    res.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ [Admin API] Subscriptions list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/referrals', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] GET /admin/referrals - Admin: ${req.admin?.username}`);
  
  try {
    const [totalReferralsResult]: any = await dbPool.query(
      'SELECT SUM(total_referrals) as total FROM user_referrals'
    );
    const totalReferrals = totalReferralsResult[0]?.total || 0;

    const [topReferrersResult]: any = await dbPool.query(
      `SELECT ur.telegram_user_id, ur.username, ur.referral_code, 
              ur.total_referrals, ur.bonus_searches, ur.created_at
       FROM user_referrals ur
       ORDER BY ur.total_referrals DESC
       LIMIT 20`
    );

    const [recentReferralsResult]: any = await dbPool.query(
      `SELECT ru.referral_code, ru.referrer_id, ru.referred_user_id, 
              ru.referred_username, ru.discount_used, ru.subscription_granted, ru.created_at
       FROM referral_uses ru
       ORDER BY ru.created_at DESC
       LIMIT 50`
    );

    const [bonusSearchesResult]: any = await dbPool.query(
      'SELECT SUM(bonus_searches) as total FROM user_referrals'
    );
    const totalBonusSearches = bonusSearchesResult[0]?.total || 0;

    console.log(`✅ [Admin API] Referral stats - total: ${totalReferrals}, bonus: ${totalBonusSearches}`);

    res.json({
      totalReferrals,
      totalBonusSearches,
      topReferrers: topReferrersResult,
      recentReferrals: recentReferralsResult
    });
  } catch (error) {
    console.error('❌ [Admin API] Referrals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/settings', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] GET /admin/settings - Admin: ${req.admin?.username}`);
  
  try {
    const settings = await getAllSettings();
    console.log(`✅ [Admin API] Retrieved ${settings.length} settings`);
    res.json({ settings });
  } catch (error) {
    console.error('❌ [Admin API] Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] PUT /admin/settings - Admin: ${req.admin?.username}`);
  
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Settings object is required' });
      return;
    }

    const adminId = req.admin?.adminId;

    for (const [key, value] of Object.entries(settings)) {
      console.log(`📝 [Admin API] Updating setting: ${key}`);
      await setSetting(key, String(value), adminId);
    }

    console.log(`✅ [Admin API] Updated ${Object.keys(settings).length} settings`);
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('❌ [Admin API] Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search-history', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] GET /admin/search-history - Admin: ${req.admin?.username}`);
  
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const searchType = req.query.type as string;
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

    console.log(`✅ [Admin API] Found ${history.length} search history entries (total: ${total})`);

    res.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ [Admin API] Search history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DATA MANAGEMENT ROUTES ====================

router.get('/tables', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] GET /admin/tables - Admin: ${req.admin?.username}`);
  console.log(`🔍 [Admin API] Fetching list of all database tables...`);
  
  try {
    const [tables]: any = await dbPool.query('SHOW TABLES');
    
    const tableNames = tables.map((row: any) => Object.values(row)[0]);
    console.log(`✅ [Admin API] Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
    
    res.json({ tables: tableNames });
  } catch (error) {
    console.error('❌ [Admin API] Get tables error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tables/:name/structure', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const tableName = req.params.name;
  console.log(`📨 [Admin API] GET /admin/tables/${tableName}/structure - Admin: ${req.admin?.username}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (safeTableName !== tableName) {
      console.log(`⚠️ [Admin API] Table name sanitized from "${tableName}" to "${safeTableName}"`);
    }
    
    console.log(`🔍 [Admin API] Fetching structure for table: ${safeTableName}`);
    const [columns]: any = await dbPool.query(`DESCRIBE \`${safeTableName}\``);
    
    const columnDetails = columns.map((col: any) => ({
      name: col.Field,
      type: col.Type,
      nullable: col.Null === 'YES',
      key: col.Key,
      default: col.Default,
      extra: col.Extra
    }));
    
    console.log(`✅ [Admin API] Table ${safeTableName} has ${columns.length} columns: ${columnDetails.map((c: any) => c.name).join(', ')}`);
    
    res.json({ 
      tableName: safeTableName,
      columns: columnDetails
    });
  } catch (error: any) {
    console.error('❌ [Admin API] Get table structure error:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log(`⚠️ [Admin API] Table not found: ${tableName}`);
      res.status(404).json({ error: 'Table not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.get('/tables/:name/data', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const tableName = req.params.name;
  console.log(`📨 [Admin API] GET /admin/tables/${tableName}/data - Admin: ${req.admin?.username}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    
    const [countResult]: any = await dbPool.query(`SELECT COUNT(*) as count FROM \`${safeTableName}\``);
    const total = countResult[0]?.count || 0;
    
    const [rows]: any = await dbPool.query(`SELECT * FROM \`${safeTableName}\` LIMIT ? OFFSET ?`, [limit, offset]);
    
    console.log(`✅ [Admin API] Retrieved ${rows.length} rows from ${tableName} (total: ${total})`);
    
    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('❌ [Admin API] Get table data error:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).json({ error: 'Table not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/tables/:name/data', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const tableName = req.params.name;
  console.log(`📨 [Admin API] POST /admin/tables/${tableName}/data - Admin: ${req.admin?.username}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const { data } = req.body;
    
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'Data object is required' });
      return;
    }
    
    const columns = Object.keys(data).map(k => `\`${k.replace(/[^a-zA-Z0-9_]/g, '')}\``);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    const query = `INSERT INTO \`${safeTableName}\` (${columns.join(', ')}) VALUES (${placeholders})`;
    console.log(`📝 [Admin API] Inserting data into ${tableName}: ${columns.join(', ')}`);
    
    const [result]: any = await dbPool.query(query, values);
    
    console.log(`✅ [Admin API] Inserted row into ${tableName} (ID: ${result.insertId})`);
    
    res.json({ 
      success: true, 
      message: 'Data inserted successfully',
      insertId: result.insertId 
    });
  } catch (error: any) {
    console.error('❌ [Admin API] Insert data error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/tables/create', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`📨 [Admin API] POST /admin/tables/create - Admin: ${req.admin?.username}`);
  
  try {
    const { tableName, columns } = req.body;
    
    if (!tableName || !columns || !Array.isArray(columns) || columns.length === 0) {
      res.status(400).json({ error: 'Table name and columns array are required' });
      return;
    }
    
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    const columnDefs = columns.map((col: any) => {
      const safeName = col.name.replace(/[^a-zA-Z0-9_]/g, '');
      let def = `\`${safeName}\` ${col.type}`;
      if (col.primary) def += ' PRIMARY KEY';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (!col.nullable && !col.primary) def += ' NOT NULL';
      if (col.default !== undefined && col.default !== '') def += ` DEFAULT '${col.default}'`;
      return def;
    });
    
    const query = `CREATE TABLE IF NOT EXISTS \`${safeTableName}\` (
      ${columnDefs.join(',\n      ')}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
    
    console.log(`📝 [Admin API] Creating table: ${safeTableName}`);
    
    await dbPool.query(query);
    
    console.log(`✅ [Admin API] Table ${safeTableName} created successfully`);
    
    res.json({ 
      success: true, 
      message: `Table ${safeTableName} created successfully` 
    });
  } catch (error: any) {
    console.error('❌ [Admin API] Create table error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/tables/:name/import-csv', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const tableName = req.params.name;
  console.log(`📨 [Admin API] POST /admin/tables/${tableName}/import-csv - Admin: ${req.admin?.username}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const { rows, columnMapping } = req.body;
    
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'Rows array is required' });
      return;
    }
    
    console.log(`📝 [Admin API] Importing ${rows.length} rows into ${tableName}`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        let data = row;
        
        if (columnMapping) {
          data = {};
          for (const [csvCol, dbCol] of Object.entries(columnMapping)) {
            if (dbCol && row[csvCol] !== undefined) {
              data[dbCol as string] = row[csvCol];
            }
          }
        }
        
        const columns = Object.keys(data).map(k => `\`${k.replace(/[^a-zA-Z0-9_]/g, '')}\``);
        const values = Object.values(data);
        const placeholders = values.map(() => '?').join(', ');
        
        if (columns.length > 0) {
          const query = `INSERT INTO \`${safeTableName}\` (${columns.join(', ')}) VALUES (${placeholders})`;
          await dbPool.query(query, values);
          successCount++;
        }
      } catch (err: any) {
        errorCount++;
        if (errors.length < 5) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }
    }
    
    console.log(`✅ [Admin API] CSV import complete: ${successCount} success, ${errorCount} errors`);
    
    res.json({ 
      success: true, 
      message: `Imported ${successCount} rows successfully`,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('❌ [Admin API] CSV import error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.delete('/tables/:name/data/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const tableName = req.params.name;
  const id = req.params.id;
  console.log(`📨 [Admin API] DELETE /admin/tables/${tableName}/data/${id} - Admin: ${req.admin?.username}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    console.log(`🔍 [Admin API] Looking up primary key for table: ${safeTableName}`);
    
    const [columns]: any = await dbPool.query(`DESCRIBE \`${safeTableName}\``);
    const primaryKeyColumn = columns.find((col: any) => col.Key === 'PRI');
    
    if (!primaryKeyColumn) {
      console.log(`⚠️ [Admin API] No primary key found for table: ${safeTableName}`);
      res.status(400).json({ error: 'Table has no primary key - cannot delete by ID' });
      return;
    }
    
    const primaryKey = primaryKeyColumn.Field;
    console.log(`📝 [Admin API] Deleting from ${safeTableName} where ${primaryKey} = ${id}`);
    
    const [result]: any = await dbPool.query(
      `DELETE FROM \`${safeTableName}\` WHERE \`${primaryKey}\` = ?`,
      [id]
    );
    
    if (result.affectedRows > 0) {
      console.log(`✅ [Admin API] Successfully deleted row from ${safeTableName} where ${primaryKey}=${id}`);
      res.json({ success: true, message: 'Row deleted successfully' });
    } else {
      console.log(`⚠️ [Admin API] Row not found in ${safeTableName} where ${primaryKey}=${id}`);
      res.status(404).json({ error: 'Row not found' });
    }
  } catch (error: any) {
    console.error('❌ [Admin API] Delete row error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;

export async function initializeAdminRoutes(): Promise<void> {
  console.log('🚀 [Admin API] Initializing admin routes...');
  await createAdminTables();
  console.log('✅ [Admin API] Admin routes initialized');
}
