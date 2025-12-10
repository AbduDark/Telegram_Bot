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

export async function handleUserDetails(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  const userId = c.req.param('id');
  console.log(`📨 [Admin API] GET /admin/users/${userId} - Admin: ${admin.username}`);
  
  try {
    const [users]: any = await dbPool.query(
      `SELECT telegram_user_id, username, subscription_type, subscription_start, 
              subscription_end, is_active, free_searches_used, bonus_searches,
              terms_accepted, created_at, updated_at
       FROM user_subscriptions WHERE telegram_user_id = ?`,
      [userId]
    );
    
    if (!Array.isArray(users) || users.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const [searches]: any = await dbPool.query(
      `SELECT id, search_query, search_type, results_count, created_at
       FROM search_history WHERE telegram_user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    
    const [referrals]: any = await dbPool.query(
      `SELECT COUNT(*) as count FROM referrals WHERE referrer_telegram_id = ?`,
      [userId]
    );
    
    return c.json({
      user: users[0],
      recentSearches: searches,
      referralCount: referrals[0]?.count || 0
    });
  } catch (error) {
    console.error('❌ [Admin API] User details error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleUpdateSubscription(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  const userId = c.req.param('id');
  console.log(`📨 [Admin API] PUT /admin/users/${userId}/subscription - Admin: ${admin.username}`);
  
  try {
    const { action, months, subscription_type } = await c.req.json();
    
    if (action === 'extend') {
      const monthsToAdd = months || 1;
      await dbPool.query(
        `UPDATE user_subscriptions 
         SET subscription_end = DATE_ADD(COALESCE(subscription_end, NOW()), INTERVAL ? MONTH),
             subscription_type = COALESCE(?, subscription_type),
             is_active = TRUE,
             updated_at = NOW()
         WHERE telegram_user_id = ?`,
        [monthsToAdd, subscription_type, userId]
      );
      console.log(`✅ [Admin API] Extended subscription for ${userId} by ${monthsToAdd} months`);
    } else if (action === 'cancel') {
      await dbPool.query(
        `UPDATE user_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE telegram_user_id = ?`,
        [userId]
      );
      console.log(`✅ [Admin API] Cancelled subscription for ${userId}`);
    }
    
    return c.json({ success: true, message: `Subscription ${action}ed successfully` });
  } catch (error) {
    console.error('❌ [Admin API] Update subscription error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleAddFreeSearches(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  const userId = c.req.param('id');
  console.log(`📨 [Admin API] PUT /admin/users/${userId}/free-searches - Admin: ${admin.username}`);
  
  try {
    const { count } = await c.req.json();
    
    await dbPool.query(
      `UPDATE user_subscriptions SET bonus_searches = bonus_searches + ?, updated_at = NOW() WHERE telegram_user_id = ?`,
      [count, userId]
    );
    
    console.log(`✅ [Admin API] Added ${count} free searches to ${userId}`);
    return c.json({ success: true, message: `Added ${count} free searches` });
  } catch (error) {
    console.error('❌ [Admin API] Add free searches error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleTableStructure(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  const tableName = c.req.param('name');
  console.log(`📨 [Admin API] GET /admin/tables/${tableName}/structure - Admin: ${admin.username}`);
  
  try {
    const [columns]: any = await dbPool.query(`DESCRIBE \`${tableName}\``);
    return c.json({ columns });
  } catch (error) {
    console.error('❌ [Admin API] Table structure error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleTableData(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  const tableName = c.req.param('name');
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = (page - 1) * limit;
  
  console.log(`📨 [Admin API] GET /admin/tables/${tableName}/data - Admin: ${admin.username}`);
  
  try {
    const [countResult]: any = await dbPool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    const total = countResult[0]?.count || 0;
    
    const [rows]: any = await dbPool.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limit, offset]);
    
    return c.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('❌ [Admin API] Table data error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleInsertData(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  const tableName = c.req.param('name');
  console.log(`📨 [Admin API] POST /admin/tables/${tableName}/data - Admin: ${admin.username}`);
  
  try {
    const { data: rowData } = await c.req.json();
    const columns = Object.keys(rowData);
    const values = Object.values(rowData);
    const placeholders = columns.map(() => '?').join(', ');
    
    await dbPool.query(
      `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    console.log(`✅ [Admin API] Inserted row into ${tableName}`);
    return c.json({ success: true, message: 'Row inserted successfully' });
  } catch (error) {
    console.error('❌ [Admin API] Insert data error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleCreateTable(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  console.log(`📨 [Admin API] POST /admin/tables/create - Admin: ${admin.username}`);
  
  try {
    const { tableName, columns } = await c.req.json();
    
    const columnDefs = columns.map((col: any) => {
      let def = `\`${col.name}\` ${col.type}`;
      if (col.primary) def += ' PRIMARY KEY';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (!col.nullable && !col.primary) def += ' NOT NULL';
      if (col.default !== undefined) def += ` DEFAULT '${col.default}'`;
      return def;
    }).join(', ');
    
    await dbPool.query(`CREATE TABLE \`${tableName}\` (${columnDefs}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    
    console.log(`✅ [Admin API] Created table ${tableName}`);
    return c.json({ success: true, message: `Table ${tableName} created successfully` });
  } catch (error) {
    console.error('❌ [Admin API] Create table error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleImportCSV(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  const tableName = c.req.param('name');
  console.log(`📨 [Admin API] POST /admin/tables/${tableName}/import-csv - Admin: ${admin.username}`);
  
  try {
    const { rows, columnMapping } = await c.req.json();
    let insertedCount = 0;
    
    for (const row of rows) {
      const mappedRow: Record<string, any> = {};
      if (columnMapping) {
        for (const [csvCol, dbCol] of Object.entries(columnMapping)) {
          mappedRow[dbCol as string] = row[csvCol];
        }
      } else {
        Object.assign(mappedRow, row);
      }
      
      const columns = Object.keys(mappedRow);
      const values = Object.values(mappedRow);
      const placeholders = columns.map(() => '?').join(', ');
      
      await dbPool.query(
        `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
        values
      );
      insertedCount++;
    }
    
    console.log(`✅ [Admin API] Imported ${insertedCount} rows into ${tableName}`);
    return c.json({ success: true, message: `Imported ${insertedCount} rows`, count: insertedCount });
  } catch (error) {
    console.error('❌ [Admin API] Import CSV error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleDeleteRow(c: Context) {
  const admin = await verifyAdminToken(c);
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);
  
  const tableName = c.req.param('name');
  const rowId = c.req.param('id');
  console.log(`📨 [Admin API] DELETE /admin/tables/${tableName}/data/${rowId} - Admin: ${admin.username}`);
  
  try {
    const [columns]: any = await dbPool.query(`DESCRIBE \`${tableName}\``);
    const primaryKey = columns.find((col: any) => col.Key === 'PRI')?.Field || 'id';
    
    await dbPool.query(`DELETE FROM \`${tableName}\` WHERE \`${primaryKey}\` = ?`, [rowId]);
    
    console.log(`✅ [Admin API] Deleted row ${rowId} from ${tableName}`);
    return c.json({ success: true, message: 'Row deleted successfully' });
  } catch (error) {
    console.error('❌ [Admin API] Delete row error:', error);
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
