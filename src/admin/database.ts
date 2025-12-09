import bcrypt from 'bcryptjs';
import { dbPool } from '../bot/database';

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'superadmin';
  created_at: Date;
  last_login: Date | null;
}

export interface BotSetting {
  key: string;
  value: string;
  updated_at: Date;
  updated_by: number | null;
}

export async function createAdminTables(): Promise<void> {
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
    console.log('✅ [Admin DB] admin_users table created/verified');

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT NULL,
        FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ [Admin DB] bot_settings table created/verified');

    console.log('✅ [Admin DB] All admin tables ready');
  } catch (error) {
    console.error('❌ [Admin DB] Error creating admin tables:', error);
    throw error;
  }
}

export async function getAdminByUsername(username: string): Promise<AdminUser | null> {
  console.log(`🔍 [Admin DB] Looking up admin: ${username}`);
  
  try {
    const [rows]: any = await dbPool.query(
      'SELECT id, username, password_hash, role, created_at, last_login FROM admin_users WHERE username = ?',
      [username]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      console.log(`✅ [Admin DB] Found admin: ${username}`);
      return rows[0] as AdminUser;
    }

    console.log(`⚠️ [Admin DB] Admin not found: ${username}`);
    return null;
  } catch (error) {
    console.error('❌ [Admin DB] Error getting admin by username:', error);
    throw error;
  }
}

export async function getAdminById(id: number): Promise<AdminUser | null> {
  console.log(`🔍 [Admin DB] Looking up admin by ID: ${id}`);
  
  try {
    const [rows]: any = await dbPool.query(
      'SELECT id, username, password_hash, role, created_at, last_login FROM admin_users WHERE id = ?',
      [id]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      console.log(`✅ [Admin DB] Found admin ID: ${id}`);
      return rows[0] as AdminUser;
    }

    console.log(`⚠️ [Admin DB] Admin ID not found: ${id}`);
    return null;
  } catch (error) {
    console.error('❌ [Admin DB] Error getting admin by ID:', error);
    throw error;
  }
}

export async function createAdmin(
  username: string,
  password: string,
  role: 'admin' | 'superadmin' = 'admin'
): Promise<{ success: boolean; adminId?: number; error?: string }> {
  console.log(`📝 [Admin DB] Creating admin: ${username} with role: ${role}`);
  
  try {
    const existing = await getAdminByUsername(username);
    if (existing) {
      console.log(`⚠️ [Admin DB] Admin already exists: ${username}`);
      return { success: false, error: 'Admin username already exists' };
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    console.log(`🔐 [Admin DB] Password hashed for: ${username}`);

    const [result]: any = await dbPool.query(
      'INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, password_hash, role]
    );

    console.log(`✅ [Admin DB] Admin created: ${username} (ID: ${result.insertId})`);
    return { success: true, adminId: result.insertId };
  } catch (error) {
    console.error('❌ [Admin DB] Error creating admin:', error);
    return { success: false, error: String(error) };
  }
}

export async function validateAdminPassword(username: string, password: string): Promise<{
  valid: boolean;
  admin?: AdminUser;
}> {
  console.log(`🔐 [Admin DB] Validating password for: ${username}`);
  
  try {
    const admin = await getAdminByUsername(username);
    if (!admin) {
      console.log(`❌ [Admin DB] Admin not found: ${username}`);
      return { valid: false };
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (isValid) {
      console.log(`✅ [Admin DB] Password valid for: ${username}`);
      return { valid: true, admin };
    } else {
      console.log(`❌ [Admin DB] Invalid password for: ${username}`);
      return { valid: false };
    }
  } catch (error) {
    console.error('❌ [Admin DB] Error validating password:', error);
    return { valid: false };
  }
}

export async function updateLastLogin(adminId: number): Promise<void> {
  console.log(`📝 [Admin DB] Updating last login for admin ID: ${adminId}`);
  
  try {
    await dbPool.query(
      'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
      [adminId]
    );
    console.log(`✅ [Admin DB] Last login updated for admin ID: ${adminId}`);
  } catch (error) {
    console.error('❌ [Admin DB] Error updating last login:', error);
    throw error;
  }
}

export async function getSetting(key: string): Promise<string | null> {
  console.log(`🔍 [Admin DB] Getting setting: ${key}`);
  
  try {
    const [rows]: any = await dbPool.query(
      'SELECT value FROM bot_settings WHERE `key` = ?',
      [key]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      console.log(`✅ [Admin DB] Found setting: ${key}`);
      return rows[0].value;
    }

    console.log(`⚠️ [Admin DB] Setting not found: ${key}`);
    return null;
  } catch (error) {
    console.error('❌ [Admin DB] Error getting setting:', error);
    throw error;
  }
}

export async function setSetting(key: string, value: string, updatedBy?: number): Promise<void> {
  console.log(`📝 [Admin DB] Setting: ${key} = ${value.substring(0, 50)}...`);
  
  try {
    await dbPool.query(
      `INSERT INTO bot_settings (\`key\`, value, updated_by) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)`,
      [key, value, updatedBy || null]
    );
    console.log(`✅ [Admin DB] Setting saved: ${key}`);
  } catch (error) {
    console.error('❌ [Admin DB] Error setting value:', error);
    throw error;
  }
}

export async function getAllSettings(): Promise<BotSetting[]> {
  console.log('📊 [Admin DB] Getting all settings');
  
  try {
    const [rows]: any = await dbPool.query(
      'SELECT `key`, value, updated_at, updated_by FROM bot_settings ORDER BY `key`'
    );

    console.log(`✅ [Admin DB] Retrieved ${rows.length} settings`);
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('❌ [Admin DB] Error getting all settings:', error);
    throw error;
  }
}

export async function deleteSetting(key: string): Promise<boolean> {
  console.log(`🗑️ [Admin DB] Deleting setting: ${key}`);
  
  try {
    const [result]: any = await dbPool.query(
      'DELETE FROM bot_settings WHERE `key` = ?',
      [key]
    );

    if (result.affectedRows > 0) {
      console.log(`✅ [Admin DB] Setting deleted: ${key}`);
      return true;
    }
    
    console.log(`⚠️ [Admin DB] Setting not found for deletion: ${key}`);
    return false;
  } catch (error) {
    console.error('❌ [Admin DB] Error deleting setting:', error);
    throw error;
  }
}
