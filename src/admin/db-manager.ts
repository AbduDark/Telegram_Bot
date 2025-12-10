import { dbPool } from '../bot/database';

console.log('🔌 [DB Manager] Initializing MySQL database manager');

export async function getTables(): Promise<string[]> {
  console.log('📊 [DB Manager] Fetching all tables...');
  
  try {
    const [tables]: any = await dbPool.query('SHOW TABLES');
    const tableNames = tables.map((row: any) => Object.values(row)[0] as string);
    console.log(`✅ [DB Manager] Found ${tableNames.length} tables`);
    return tableNames;
  } catch (error) {
    console.error('❌ [DB Manager] Error fetching tables:', error);
    throw error;
  }
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  defaultValue: string | null;
  extra: string;
}

export async function getTableStructure(tableName: string): Promise<ColumnInfo[]> {
  console.log(`📊 [DB Manager] Fetching structure for table: ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const [columns]: any = await dbPool.query(`DESCRIBE \`${safeTableName}\``);
    
    const columnDetails = columns.map((col: any) => ({
      name: col.Field,
      type: col.Type,
      nullable: col.Null === 'YES',
      key: col.Key,
      defaultValue: col.Default,
      extra: col.Extra
    }));
    
    console.log(`✅ [DB Manager] Found ${columnDetails.length} columns in table ${tableName}`);
    return columnDetails;
  } catch (error) {
    console.error(`❌ [DB Manager] Error fetching structure for ${tableName}:`, error);
    throw error;
  }
}

export interface TableRow {
  [key: string]: any;
}

export async function getTableData(
  tableName: string, 
  page: number = 1, 
  limit: number = 50
): Promise<{ rows: TableRow[]; total: number }> {
  console.log(`📊 [DB Manager] Fetching data for table: ${tableName}, page: ${page}, limit: ${limit}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const offset = (page - 1) * limit;
    
    const [countResult]: any = await dbPool.query(
      `SELECT COUNT(*) as total FROM \`${safeTableName}\``
    );
    const total = countResult[0]?.total || 0;
    
    const [rows]: any = await dbPool.query(
      `SELECT * FROM \`${safeTableName}\` LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    console.log(`✅ [DB Manager] Found ${rows.length} rows (total: ${total})`);
    return { rows, total };
  } catch (error) {
    console.error(`❌ [DB Manager] Error fetching data for ${tableName}:`, error);
    throw error;
  }
}

export async function createTable(
  tableName: string, 
  columns: { name: string; type: string; nullable: boolean; defaultValue?: string; primaryKey?: boolean; autoIncrement?: boolean }[]
): Promise<void> {
  console.log(`📊 [DB Manager] Creating table: ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    const columnDefs = columns.map(col => {
      const safeColName = col.name.replace(/[^a-zA-Z0-9_]/g, '');
      let def = `\`${safeColName}\` ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (col.defaultValue !== undefined && col.defaultValue !== null) {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      if (col.primaryKey) def += ' PRIMARY KEY';
      return def;
    }).join(', ');
    
    await dbPool.query(`CREATE TABLE \`${safeTableName}\` (${columnDefs}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log(`✅ [DB Manager] Table created: ${tableName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error creating table ${tableName}:`, error);
    throw error;
  }
}

export async function dropTable(tableName: string): Promise<void> {
  console.log(`🗑️ [DB Manager] Dropping table: ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    await dbPool.query(`DROP TABLE IF EXISTS \`${safeTableName}\``);
    console.log(`✅ [DB Manager] Table dropped: ${tableName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error dropping table ${tableName}:`, error);
    throw error;
  }
}

export async function renameTable(oldName: string, newName: string): Promise<void> {
  console.log(`📊 [DB Manager] Renaming table ${oldName} to ${newName}`);
  
  try {
    const safeOldName = oldName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeNewName = newName.replace(/[^a-zA-Z0-9_]/g, '');
    await dbPool.query(`RENAME TABLE \`${safeOldName}\` TO \`${safeNewName}\``);
    console.log(`✅ [DB Manager] Table renamed: ${oldName} to ${newName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error renaming table:`, error);
    throw error;
  }
}

export async function addColumn(
  tableName: string, 
  columnName: string, 
  columnType: string, 
  nullable: boolean = true,
  defaultValue?: string
): Promise<void> {
  console.log(`📊 [DB Manager] Adding column ${columnName} to table ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeColumnName = columnName.replace(/[^a-zA-Z0-9_]/g, '');
    
    let sql = `ALTER TABLE \`${safeTableName}\` ADD COLUMN \`${safeColumnName}\` ${columnType}`;
    if (!nullable) sql += ' NOT NULL';
    if (defaultValue !== undefined && defaultValue !== null) {
      sql += ` DEFAULT ${defaultValue}`;
    }
    
    await dbPool.query(sql);
    console.log(`✅ [DB Manager] Column added: ${columnName} to ${tableName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error adding column ${columnName}:`, error);
    throw error;
  }
}

export async function dropColumn(tableName: string, columnName: string): Promise<void> {
  console.log(`🗑️ [DB Manager] Dropping column ${columnName} from table ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeColumnName = columnName.replace(/[^a-zA-Z0-9_]/g, '');
    
    await dbPool.query(`ALTER TABLE \`${safeTableName}\` DROP COLUMN \`${safeColumnName}\``);
    console.log(`✅ [DB Manager] Column dropped: ${columnName} from ${tableName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error dropping column ${columnName}:`, error);
    throw error;
  }
}

export async function modifyColumn(
  tableName: string, 
  columnName: string,
  newType: string,
  nullable: boolean = true,
  defaultValue?: string
): Promise<void> {
  console.log(`📊 [DB Manager] Modifying column ${columnName} in ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeColumnName = columnName.replace(/[^a-zA-Z0-9_]/g, '');
    
    let sql = `ALTER TABLE \`${safeTableName}\` MODIFY COLUMN \`${safeColumnName}\` ${newType}`;
    if (!nullable) sql += ' NOT NULL';
    if (defaultValue !== undefined && defaultValue !== null) {
      sql += ` DEFAULT ${defaultValue}`;
    }
    
    await dbPool.query(sql);
    console.log(`✅ [DB Manager] Column modified: ${columnName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error modifying column:`, error);
    throw error;
  }
}

export async function renameColumn(
  tableName: string, 
  oldName: string, 
  newName: string,
  columnType: string
): Promise<void> {
  console.log(`📊 [DB Manager] Renaming column ${oldName} to ${newName} in ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeOldName = oldName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeNewName = newName.replace(/[^a-zA-Z0-9_]/g, '');
    
    await dbPool.query(
      `ALTER TABLE \`${safeTableName}\` CHANGE \`${safeOldName}\` \`${safeNewName}\` ${columnType}`
    );
    console.log(`✅ [DB Manager] Column renamed: ${oldName} to ${newName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error renaming column:`, error);
    throw error;
  }
}

export async function insertRow(tableName: string, data: TableRow): Promise<TableRow> {
  console.log(`📊 [DB Manager] Inserting row into ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const columns = Object.keys(data).map(k => `\`${k.replace(/[^a-zA-Z0-9_]/g, '')}\``);
    const values = Object.values(data);
    const placeholders = values.map(() => '?');
    
    const [result]: any = await dbPool.query(
      `INSERT INTO \`${safeTableName}\` (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );
    
    console.log(`✅ [DB Manager] Row inserted into ${tableName}, ID: ${result.insertId}`);
    return { ...data, id: result.insertId };
  } catch (error) {
    console.error(`❌ [DB Manager] Error inserting row:`, error);
    throw error;
  }
}

export async function updateRow(
  tableName: string, 
  primaryKeyColumn: string,
  primaryKeyValue: any,
  data: TableRow
): Promise<void> {
  console.log(`📊 [DB Manager] Updating row in ${tableName} where ${primaryKeyColumn} = ${primaryKeyValue}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safePkColumn = primaryKeyColumn.replace(/[^a-zA-Z0-9_]/g, '');
    
    const updates: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      updates.push(`\`${safeKey}\` = ?`);
      values.push(value);
    }
    
    values.push(primaryKeyValue);
    
    await dbPool.query(
      `UPDATE \`${safeTableName}\` SET ${updates.join(', ')} WHERE \`${safePkColumn}\` = ?`,
      values
    );
    
    console.log(`✅ [DB Manager] Row updated in ${tableName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error updating row:`, error);
    throw error;
  }
}

export async function deleteRow(
  tableName: string, 
  primaryKeyColumn: string,
  primaryKeyValue: any
): Promise<void> {
  console.log(`🗑️ [DB Manager] Deleting row from ${tableName} where ${primaryKeyColumn} = ${primaryKeyValue}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safePkColumn = primaryKeyColumn.replace(/[^a-zA-Z0-9_]/g, '');
    
    await dbPool.query(
      `DELETE FROM \`${safeTableName}\` WHERE \`${safePkColumn}\` = ?`,
      [primaryKeyValue]
    );
    
    console.log(`✅ [DB Manager] Row deleted from ${tableName}`);
  } catch (error) {
    console.error(`❌ [DB Manager] Error deleting row:`, error);
    throw error;
  }
}

export async function executeSql(sql: string): Promise<{ rows: any[]; affectedRows: number }> {
  console.log(`📊 [DB Manager] Executing SQL query`);
  
  try {
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /TRUNCATE/i,
      /DROP\s+SCHEMA/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        throw new Error('This SQL operation is not allowed');
      }
    }
    
    const [result]: any = await dbPool.query(sql);
    
    if (Array.isArray(result)) {
      console.log(`✅ [DB Manager] SQL executed, returned ${result.length} rows`);
      return { rows: result, affectedRows: 0 };
    } else {
      console.log(`✅ [DB Manager] SQL executed, affected rows: ${result.affectedRows}`);
      return { rows: [], affectedRows: result.affectedRows || 0 };
    }
  } catch (error) {
    console.error(`❌ [DB Manager] Error executing SQL:`, error);
    throw error;
  }
}

export async function importCsv(
  tableName: string, 
  csvData: string, 
  delimiter: string = ','
): Promise<{ imported: number; errors: string[] }> {
  console.log(`📊 [DB Manager] Importing CSV data into ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }
    
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const errors: string[] = [];
    let imported = 0;
    
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(delimiter).map(v => {
            const trimmed = v.trim().replace(/^"|"$/g, '');
            return trimmed === '' ? null : trimmed;
          });
          
          if (values.length !== headers.length) {
            errors.push(`Row ${i}: Column count mismatch`);
            continue;
          }
          
          const columns = headers.map(h => `\`${h.replace(/[^a-zA-Z0-9_]/g, '')}\``);
          const placeholders = values.map(() => '?');
          
          await connection.query(
            `INSERT INTO \`${safeTableName}\` (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
            values
          );
          imported++;
        } catch (rowError: any) {
          errors.push(`Row ${i}: ${rowError.message}`);
        }
      }
      
      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }
    
    console.log(`✅ [DB Manager] CSV import complete: ${imported} rows imported, ${errors.length} errors`);
    return { imported, errors };
  } catch (error) {
    console.error(`❌ [DB Manager] Error importing CSV:`, error);
    throw error;
  }
}

export async function importSql(sqlStatements: string): Promise<{ executed: number; errors: string[] }> {
  console.log(`📊 [DB Manager] Importing SQL statements`);
  
  try {
    const statements = sqlStatements
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    const errors: string[] = [];
    let executed = 0;
    
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /DROP\s+SCHEMA/i
    ];
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      let isDangerous = false;
      for (const pattern of dangerousPatterns) {
        if (pattern.test(stmt)) {
          errors.push(`Statement ${i + 1}: Dangerous operation not allowed`);
          isDangerous = true;
          break;
        }
      }
      
      if (isDangerous) continue;
      
      try {
        await dbPool.query(stmt);
        executed++;
      } catch (stmtError: any) {
        errors.push(`Statement ${i + 1}: ${stmtError.message}`);
      }
    }
    
    console.log(`✅ [DB Manager] SQL import complete: ${executed} statements executed, ${errors.length} errors`);
    return { executed, errors };
  } catch (error) {
    console.error(`❌ [DB Manager] Error importing SQL:`, error);
    throw error;
  }
}
