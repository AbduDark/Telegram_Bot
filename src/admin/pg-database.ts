import { Pool } from 'pg';

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

console.log('🔌 [PG Admin] Initializing PostgreSQL connection pool');

export async function getTables(): Promise<string[]> {
  console.log('📊 [PG Admin] Fetching all tables...');
  
  try {
    const result = await pgPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log(`✅ [PG Admin] Found ${tables.length} tables`);
    return tables;
  } catch (error) {
    console.error('❌ [PG Admin] Error fetching tables:', error);
    throw error;
  }
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  maxLength: number | null;
}

export async function getTableStructure(tableName: string): Promise<ColumnInfo[]> {
  console.log(`📊 [PG Admin] Fetching structure for table: ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    const result = await pgPool.query(`
      SELECT 
        c.column_name as name,
        c.data_type as type,
        c.is_nullable = 'YES' as nullable,
        c.column_default as default_value,
        c.character_maximum_length as max_length,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku 
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 
          AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = $1 AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `, [safeTableName]);
    
    const columns = result.rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable,
      defaultValue: row.default_value,
      isPrimaryKey: row.is_primary_key,
      maxLength: row.max_length
    }));
    
    console.log(`✅ [PG Admin] Found ${columns.length} columns in table ${tableName}`);
    return columns;
  } catch (error) {
    console.error(`❌ [PG Admin] Error fetching structure for ${tableName}:`, error);
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
  console.log(`📊 [PG Admin] Fetching data for table: ${tableName}, page: ${page}, limit: ${limit}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const offset = (page - 1) * limit;
    
    const countResult = await pgPool.query(
      `SELECT COUNT(*) as total FROM "${safeTableName}"`
    );
    const total = parseInt(countResult.rows[0].total);
    
    const dataResult = await pgPool.query(
      `SELECT * FROM "${safeTableName}" LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    console.log(`✅ [PG Admin] Found ${dataResult.rows.length} rows (total: ${total})`);
    return { rows: dataResult.rows, total };
  } catch (error) {
    console.error(`❌ [PG Admin] Error fetching data for ${tableName}:`, error);
    throw error;
  }
}

export async function createTable(
  tableName: string, 
  columns: { name: string; type: string; nullable: boolean; defaultValue?: string }[]
): Promise<void> {
  console.log(`📊 [PG Admin] Creating table: ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    const columnDefs = columns.map(col => {
      const safeColName = col.name.replace(/[^a-zA-Z0-9_]/g, '');
      let def = `"${safeColName}" ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      return def;
    }).join(', ');
    
    await pgPool.query(`CREATE TABLE "${safeTableName}" (${columnDefs})`);
    console.log(`✅ [PG Admin] Table created: ${tableName}`);
  } catch (error) {
    console.error(`❌ [PG Admin] Error creating table ${tableName}:`, error);
    throw error;
  }
}

export async function dropTable(tableName: string): Promise<void> {
  console.log(`🗑️ [PG Admin] Dropping table: ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    await pgPool.query(`DROP TABLE IF EXISTS "${safeTableName}" CASCADE`);
    console.log(`✅ [PG Admin] Table dropped: ${tableName}`);
  } catch (error) {
    console.error(`❌ [PG Admin] Error dropping table ${tableName}:`, error);
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
  console.log(`📊 [PG Admin] Adding column ${columnName} to table ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeColumnName = columnName.replace(/[^a-zA-Z0-9_]/g, '');
    
    let sql = `ALTER TABLE "${safeTableName}" ADD COLUMN "${safeColumnName}" ${columnType}`;
    if (!nullable) sql += ' NOT NULL';
    if (defaultValue) sql += ` DEFAULT ${defaultValue}`;
    
    await pgPool.query(sql);
    console.log(`✅ [PG Admin] Column added: ${columnName} to ${tableName}`);
  } catch (error) {
    console.error(`❌ [PG Admin] Error adding column ${columnName}:`, error);
    throw error;
  }
}

export async function dropColumn(tableName: string, columnName: string): Promise<void> {
  console.log(`🗑️ [PG Admin] Dropping column ${columnName} from table ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeColumnName = columnName.replace(/[^a-zA-Z0-9_]/g, '');
    
    await pgPool.query(`ALTER TABLE "${safeTableName}" DROP COLUMN "${safeColumnName}"`);
    console.log(`✅ [PG Admin] Column dropped: ${columnName} from ${tableName}`);
  } catch (error) {
    console.error(`❌ [PG Admin] Error dropping column ${columnName}:`, error);
    throw error;
  }
}

export async function renameColumn(
  tableName: string, 
  oldName: string, 
  newName: string
): Promise<void> {
  console.log(`📊 [PG Admin] Renaming column ${oldName} to ${newName} in ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeOldName = oldName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeNewName = newName.replace(/[^a-zA-Z0-9_]/g, '');
    
    await pgPool.query(
      `ALTER TABLE "${safeTableName}" RENAME COLUMN "${safeOldName}" TO "${safeNewName}"`
    );
    console.log(`✅ [PG Admin] Column renamed: ${oldName} to ${newName}`);
  } catch (error) {
    console.error(`❌ [PG Admin] Error renaming column:`, error);
    throw error;
  }
}

export async function insertRow(tableName: string, data: TableRow): Promise<TableRow> {
  console.log(`📊 [PG Admin] Inserting row into ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const columns = Object.keys(data).map(k => `"${k.replace(/[^a-zA-Z0-9_]/g, '')}"`);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);
    
    const result = await pgPool.query(
      `INSERT INTO "${safeTableName}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    
    console.log(`✅ [PG Admin] Row inserted into ${tableName}`);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ [PG Admin] Error inserting row:`, error);
    throw error;
  }
}

export async function updateRow(
  tableName: string, 
  primaryKeyColumn: string,
  primaryKeyValue: any,
  data: TableRow
): Promise<TableRow> {
  console.log(`📊 [PG Admin] Updating row in ${tableName} where ${primaryKeyColumn} = ${primaryKeyValue}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safePkColumn = primaryKeyColumn.replace(/[^a-zA-Z0-9_]/g, '');
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      updates.push(`"${safeKey}" = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    values.push(primaryKeyValue);
    
    const result = await pgPool.query(
      `UPDATE "${safeTableName}" SET ${updates.join(', ')} WHERE "${safePkColumn}" = $${paramIndex} RETURNING *`,
      values
    );
    
    console.log(`✅ [PG Admin] Row updated in ${tableName}`);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ [PG Admin] Error updating row:`, error);
    throw error;
  }
}

export async function deleteRow(
  tableName: string, 
  primaryKeyColumn: string,
  primaryKeyValue: any
): Promise<void> {
  console.log(`🗑️ [PG Admin] Deleting row from ${tableName} where ${primaryKeyColumn} = ${primaryKeyValue}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safePkColumn = primaryKeyColumn.replace(/[^a-zA-Z0-9_]/g, '');
    
    await pgPool.query(
      `DELETE FROM "${safeTableName}" WHERE "${safePkColumn}" = $1`,
      [primaryKeyValue]
    );
    
    console.log(`✅ [PG Admin] Row deleted from ${tableName}`);
  } catch (error) {
    console.error(`❌ [PG Admin] Error deleting row:`, error);
    throw error;
  }
}

export async function executeSql(sql: string): Promise<{ rows: any[]; rowCount: number }> {
  console.log(`📊 [PG Admin] Executing SQL query`);
  
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
    
    const result = await pgPool.query(sql);
    console.log(`✅ [PG Admin] SQL executed, rows affected: ${result.rowCount}`);
    return { rows: result.rows || [], rowCount: result.rowCount || 0 };
  } catch (error) {
    console.error(`❌ [PG Admin] Error executing SQL:`, error);
    throw error;
  }
}

export async function importCsv(
  tableName: string, 
  csvData: string, 
  delimiter: string = ','
): Promise<{ imported: number; errors: string[] }> {
  console.log(`📊 [PG Admin] Importing CSV data into ${tableName}`);
  
  try {
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }
    
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const errors: string[] = [];
    let imported = 0;
    
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      
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
          
          const columns = headers.map(h => `"${h.replace(/[^a-zA-Z0-9_]/g, '')}"`);
          const placeholders = values.map((_, idx) => `$${idx + 1}`);
          
          await client.query(
            `INSERT INTO "${safeTableName}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
            values
          );
          imported++;
        } catch (rowError: any) {
          errors.push(`Row ${i}: ${rowError.message}`);
        }
      }
      
      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
    
    console.log(`✅ [PG Admin] CSV import complete: ${imported} rows imported, ${errors.length} errors`);
    return { imported, errors };
  } catch (error) {
    console.error(`❌ [PG Admin] Error importing CSV:`, error);
    throw error;
  }
}

export { pgPool };
