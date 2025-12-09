import { useState, useRef, type ChangeEvent } from 'react';
import { useTables, useTableStructure, useTableData, useInsertData, useCreateTable, useImportCSV, useDeleteRow } from '../api/hooks';
import { Database, Plus, Upload, Trash2, ChevronLeft, ChevronRight, X, Table, FileSpreadsheet } from 'lucide-react';

interface ColumnDef {
  name: string;
  type: string;
  primary: boolean;
  autoIncrement: boolean;
  nullable: boolean;
  default: string;
}

const MYSQL_TYPES = [
  'INT',
  'BIGINT',
  'VARCHAR(255)',
  'VARCHAR(100)',
  'VARCHAR(50)',
  'TEXT',
  'LONGTEXT',
  'BOOLEAN',
  'TINYINT(1)',
  'DECIMAL(10,2)',
  'FLOAT',
  'DOUBLE',
  'DATE',
  'DATETIME',
  'TIMESTAMP',
  'TIME',
  'ENUM',
  'JSON',
];

export default function DataManagement() {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [newTableName, setNewTableName] = useState('');
  const [newTableColumns, setNewTableColumns] = useState<ColumnDef[]>([
    { name: 'id', type: 'INT', primary: true, autoIncrement: true, nullable: false, default: '' }
  ]);
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tablesData, isLoading: tablesLoading } = useTables();
  const { data: structureData, isLoading: structureLoading } = useTableStructure(selectedTable);
  const { data: tableData, isLoading: dataLoading } = useTableData(selectedTable, page, 50);
  const insertData = useInsertData();
  const createTable = useCreateTable();
  const importCSV = useImportCSV();
  const deleteRow = useDeleteRow();

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(1);
    setNewRowData({});
  };

  const handleAddRow = async () => {
    if (!selectedTable) return;
    try {
      await insertData.mutateAsync({ tableName: selectedTable, data: newRowData });
      setShowAddModal(false);
      setNewRowData({});
    } catch (error: unknown) {
      const err = error as Error;
      alert('خطأ: ' + err.message);
    }
  };

  const handleCreateTable = async () => {
    if (!newTableName || newTableColumns.length === 0) return;
    try {
      await createTable.mutateAsync({ tableName: newTableName, columns: newTableColumns });
      setShowCreateTableModal(false);
      setNewTableName('');
      setNewTableColumns([{ name: 'id', type: 'INT', primary: true, autoIncrement: true, nullable: false, default: '' }]);
    } catch (error: unknown) {
      const err = error as Error;
      alert('خطأ: ' + err.message);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert('ملف CSV فارغ أو لا يحتوي على بيانات');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      setCsvHeaders(headers);

      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const row: Record<string, unknown> = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });
      setCsvData(rows);

      const mapping: Record<string, string> = {};
      headers.forEach(h => {
        const matchingCol = structureData?.columns?.find(
          (c: { name: string }) => c.name.toLowerCase() === h.toLowerCase()
        );
        mapping[h] = matchingCol?.name || '';
      });
      setColumnMapping(mapping);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = async () => {
    if (!selectedTable || csvData.length === 0) return;
    try {
      const result = await importCSV.mutateAsync({
        tableName: selectedTable,
        rows: csvData,
        columnMapping,
      });
      alert(`تم استيراد ${result.successCount} صف بنجاح${result.errorCount > 0 ? `\nفشل ${result.errorCount} صف` : ''}`);
      setShowImportModal(false);
      setCsvData([]);
      setCsvHeaders([]);
      setColumnMapping({});
    } catch (error: unknown) {
      const err = error as Error;
      alert('خطأ: ' + err.message);
    }
  };

  const handleDeleteRow = async (id: string | number) => {
    if (!selectedTable) return;
    if (!confirm('هل أنت متأكد من حذف هذا الصف؟')) return;
    try {
      await deleteRow.mutateAsync({ tableName: selectedTable, id });
    } catch (error: unknown) {
      const err = error as Error;
      alert('خطأ: ' + err.message);
    }
  };

  const addColumn = () => {
    setNewTableColumns([...newTableColumns, { name: '', type: 'VARCHAR(255)', primary: false, autoIncrement: false, nullable: true, default: '' }]);
  };

  const removeColumn = (index: number) => {
    setNewTableColumns(newTableColumns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof ColumnDef, value: string | boolean) => {
    const updated = [...newTableColumns];
    updated[index] = { ...updated[index], [field]: value };
    setNewTableColumns(updated);
  };

  const getRowId = (row: Record<string, unknown>) => {
    const primaryKey = structureData?.columns?.find((c: { key: string }) => c.key === 'PRI')?.name || 'id';
    return row[primaryKey] as string | number;
  };

  if (tablesLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="data-management-page">
      <div className="page-header">
        <h1 className="page-title">
          <Database size={24} />
          إدارة البيانات
        </h1>
        <button className="btn-primary" onClick={() => setShowCreateTableModal(true)}>
          <Plus size={18} />
          جدول جديد
        </button>
      </div>

      <div className="data-layout">
        <div className="tables-sidebar">
          <h3>الجداول ({tablesData?.tables?.length || 0})</h3>
          <div className="tables-list">
            {tablesData?.tables?.map((table: string) => (
              <button
                key={table}
                className={`table-item ${selectedTable === table ? 'active' : ''}`}
                onClick={() => handleSelectTable(table)}
              >
                <Table size={16} />
                {table}
              </button>
            ))}
          </div>
        </div>

        <div className="table-content">
          {!selectedTable ? (
            <div className="empty-state">
              <Database size={48} />
              <p>اختر جدول من القائمة لعرض البيانات</p>
            </div>
          ) : (
            <>
              <div className="table-header">
                <h2>{selectedTable}</h2>
                <div className="table-actions">
                  <button className="btn-secondary" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} />
                    إضافة صف
                  </button>
                  <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                    <Upload size={16} />
                    استيراد CSV
                  </button>
                </div>
              </div>

              {structureLoading || dataLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner" />
                </div>
              ) : (
                <>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {structureData?.columns?.map((col: { name: string }) => (
                            <th key={col.name}>{col.name}</th>
                          ))}
                          <th>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData?.data?.length === 0 ? (
                          <tr>
                            <td colSpan={(structureData?.columns?.length || 0) + 1} className="empty-cell">
                              لا توجد بيانات
                            </td>
                          </tr>
                        ) : (
                          tableData?.data?.map((row: Record<string, unknown>, index: number) => (
                            <tr key={index}>
                              {structureData?.columns?.map((col: { name: string }) => (
                                <td key={col.name}>
                                  {row[col.name] === null ? (
                                    <span className="null-value">NULL</span>
                                  ) : typeof row[col.name] === 'object' ? (
                                    JSON.stringify(row[col.name])
                                  ) : (
                                    String(row[col.name] ?? '')
                                  )}
                                </td>
                              ))}
                              <td>
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDeleteRow(getRowId(row))}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {tableData?.pagination && tableData.pagination.totalPages > 1 && (
                    <div className="pagination">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        <ChevronRight size={18} />
                      </button>
                      <span>
                        صفحة {page} من {tableData.pagination.totalPages}
                      </span>
                      <button
                        disabled={page >= tableData.pagination.totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        <ChevronLeft size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showAddModal && selectedTable && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة صف جديد</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {structureData?.columns?.map((col: { name: string; type: string; extra: string; nullable: boolean }) => (
                <div key={col.name} className="form-group">
                  <label>
                    {col.name}
                    <span className="col-type">({col.type})</span>
                    {col.extra.includes('auto_increment') && <span className="auto-badge">تلقائي</span>}
                  </label>
                  {!col.extra.includes('auto_increment') && (
                    <input
                      type="text"
                      value={newRowData[col.name] || ''}
                      onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                      placeholder={col.nullable ? 'اختياري' : 'مطلوب'}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={handleAddRow} disabled={insertData.isPending}>
                {insertData.isPending ? 'جاري الإضافة...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateTableModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTableModal(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إنشاء جدول جديد</h3>
              <button className="close-btn" onClick={() => setShowCreateTableModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>اسم الجدول</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="مثال: products"
                />
              </div>
              <div className="columns-section">
                <div className="columns-header">
                  <h4>الأعمدة</h4>
                  <button className="btn-small" onClick={addColumn}>
                    <Plus size={14} />
                    إضافة عمود
                  </button>
                </div>
                {newTableColumns.map((col, index) => (
                  <div key={index} className="column-row">
                    <input
                      type="text"
                      placeholder="اسم العمود"
                      value={col.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                    />
                    <select
                      value={col.type}
                      onChange={(e) => updateColumn(index, 'type', e.target.value)}
                    >
                      {MYSQL_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={col.primary}
                        onChange={(e) => updateColumn(index, 'primary', e.target.checked)}
                      />
                      مفتاح
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={col.autoIncrement}
                        onChange={(e) => updateColumn(index, 'autoIncrement', e.target.checked)}
                      />
                      تلقائي
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={col.nullable}
                        onChange={(e) => updateColumn(index, 'nullable', e.target.checked)}
                      />
                      فارغ
                    </label>
                    {newTableColumns.length > 1 && (
                      <button className="remove-btn" onClick={() => removeColumn(index)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateTableModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={handleCreateTable} disabled={createTable.isPending || !newTableName}>
                {createTable.isPending ? 'جاري الإنشاء...' : 'إنشاء الجدول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && selectedTable && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileSpreadsheet size={20} />
                استيراد من CSV
              </h3>
              <button className="close-btn" onClick={() => setShowImportModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="upload-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button className="btn-upload" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={20} />
                  اختر ملف CSV
                </button>
                {csvData.length > 0 && (
                  <span className="file-info">{csvData.length} صف جاهز للاستيراد</span>
                )}
              </div>

              {csvHeaders.length > 0 && (
                <div className="mapping-section">
                  <h4>ربط الأعمدة</h4>
                  <p className="mapping-hint">اختر عمود الجدول المناسب لكل عمود في ملف CSV</p>
                  <div className="mapping-grid">
                    {csvHeaders.map(header => (
                      <div key={header} className="mapping-row">
                        <span className="csv-col">{header}</span>
                        <span className="arrow">←</span>
                        <select
                          value={columnMapping[header] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                        >
                          <option value="">-- تجاهل --</option>
                          {structureData?.columns?.map((col: { name: string }) => (
                            <option key={col.name} value={col.name}>{col.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {csvData.length > 0 && (
                <div className="preview-section">
                  <h4>معاينة البيانات (أول 5 صفوف)</h4>
                  <div className="table-container small">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {csvHeaders.map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {csvHeaders.map(h => (
                              <td key={h}>{String(row[h] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowImportModal(false)}>إلغاء</button>
              <button
                className="btn-primary"
                onClick={handleImportCSV}
                disabled={importCSV.isPending || csvData.length === 0}
              >
                {importCSV.isPending ? 'جاري الاستيراد...' : `استيراد ${csvData.length} صف`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
