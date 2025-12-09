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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Database size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">إدارة البيانات</h1>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
          onClick={() => setShowCreateTableModal(true)}
        >
          <Plus size={18} />
          جدول جديد
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex gap-6">
        {/* Tables Sidebar */}
        <div className="w-64 flex-shrink-0 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-400">الجداول ({tablesData?.tables?.length || 0})</h3>
          </div>
          <div className="p-2 max-h-[500px] overflow-y-auto">
            {tablesData?.tables?.map((table: string) => (
              <button
                key={table}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-right transition-colors ${
                  selectedTable === table
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
                onClick={() => handleSelectTable(table)}
              >
                <Table size={16} />
                <span className="truncate">{table}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          {!selectedTable ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-500">
              <Database size={48} className="mb-4 opacity-50" />
              <p>اختر جدول من القائمة لعرض البيانات</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <h2 className="text-lg font-semibold text-white">{selectedTable}</h2>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm transition-colors"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={16} />
                    إضافة صف
                  </button>
                  <button
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm transition-colors"
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload size={16} />
                    استيراد CSV
                  </button>
                </div>
              </div>

              {structureLoading || dataLoading ? (
                <div className="flex justify-center p-12">
                  <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700/30">
                          {structureData?.columns?.map((col: { name: string }) => (
                            <th key={col.name} className="text-right text-xs font-medium text-slate-500 px-4 py-3">{col.name}</th>
                          ))}
                          <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData?.data?.length === 0 ? (
                          <tr>
                            <td colSpan={(structureData?.columns?.length || 0) + 1} className="px-4 py-12 text-center text-slate-500">
                              لا توجد بيانات
                            </td>
                          </tr>
                        ) : (
                          tableData?.data?.map((row: Record<string, unknown>, index: number) => (
                            <tr key={index} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                              {structureData?.columns?.map((col: { name: string }) => (
                                <td key={col.name} className="px-4 py-3 text-sm text-slate-300 max-w-[200px] truncate">
                                  {row[col.name] === null ? (
                                    <span className="text-slate-600 italic">NULL</span>
                                  ) : typeof row[col.name] === 'object' ? (
                                    JSON.stringify(row[col.name])
                                  ) : (
                                    String(row[col.name] ?? '')
                                  )}
                                </td>
                              ))}
                              <td className="px-4 py-3">
                                <button
                                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
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
                    <div className="flex items-center justify-center gap-4 p-4 border-t border-slate-700/30">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <span className="text-slate-400 text-sm">
                        صفحة {page} من {tableData.pagination.totalPages}
                      </span>
                      <button
                        disabled={page >= tableData.pagination.totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="p-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Add Row Modal */}
      {showAddModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white">إضافة صف جديد</h3>
              <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors" onClick={() => setShowAddModal(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {structureData?.columns?.map((col: { name: string; type: string; extra: string; nullable: boolean }) => (
                <div key={col.name} className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    {col.name}
                    <span className="text-xs text-slate-500">({col.type})</span>
                    {col.extra.includes('auto_increment') && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">تلقائي</span>
                    )}
                  </label>
                  {!col.extra.includes('auto_increment') && (
                    <input
                      type="text"
                      value={newRowData[col.name] || ''}
                      onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                      placeholder={col.nullable ? 'اختياري' : 'مطلوب'}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl py-2 px-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700/50">
              <button className="flex-1 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-colors" onClick={() => setShowAddModal(false)}>إلغاء</button>
              <button className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50" onClick={handleAddRow} disabled={insertData.isPending}>
                {insertData.isPending ? 'جاري الإضافة...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Table Modal */}
      {showCreateTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateTableModal(false)}>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white">إنشاء جدول جديد</h3>
              <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors" onClick={() => setShowCreateTableModal(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">اسم الجدول</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="مثال: products"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl py-2 px-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-300">الأعمدة</h4>
                  <button className="flex items-center gap-1 px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm transition-colors" onClick={addColumn}>
                    <Plus size={14} />
                    إضافة عمود
                  </button>
                </div>
                <div className="space-y-3">
                  {newTableColumns.map((col, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 bg-slate-700/30 rounded-xl p-3">
                      <input
                        type="text"
                        placeholder="اسم العمود"
                        value={col.name}
                        onChange={(e) => updateColumn(index, 'name', e.target.value)}
                        className="flex-1 min-w-[120px] bg-slate-700/50 border border-slate-600/50 rounded-lg py-2 px-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                      />
                      <select
                        value={col.type}
                        onChange={(e) => updateColumn(index, 'type', e.target.value)}
                        className="bg-slate-700/50 border border-slate-600/50 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                      >
                        {MYSQL_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={col.primary}
                          onChange={(e) => updateColumn(index, 'primary', e.target.checked)}
                          className="rounded"
                        />
                        مفتاح
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={col.autoIncrement}
                          onChange={(e) => updateColumn(index, 'autoIncrement', e.target.checked)}
                          className="rounded"
                        />
                        تلقائي
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={col.nullable}
                          onChange={(e) => updateColumn(index, 'nullable', e.target.checked)}
                          className="rounded"
                        />
                        فارغ
                      </label>
                      {newTableColumns.length > 1 && (
                        <button className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors" onClick={() => removeColumn(index)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700/50">
              <button className="flex-1 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-colors" onClick={() => setShowCreateTableModal(false)}>إلغاء</button>
              <button className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50" onClick={handleCreateTable} disabled={createTable.isPending || !newTableName}>
                {createTable.isPending ? 'جاري الإنشاء...' : 'إنشاء الجدول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)}>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-emerald-400" />
                <h3 className="text-xl font-bold text-white">استيراد من CSV</h3>
              </div>
              <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors" onClick={() => setShowImportModal(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-600/50 rounded-xl">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={20} />
                  اختر ملف CSV
                </button>
                {csvData.length > 0 && (
                  <span className="mt-3 text-emerald-400">{csvData.length} صف جاهز للاستيراد</span>
                )}
              </div>

              {csvHeaders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">ربط الأعمدة</h4>
                  <p className="text-xs text-slate-500 mb-4">اختر عمود الجدول المناسب لكل عمود في ملف CSV</p>
                  <div className="space-y-2">
                    {csvHeaders.map(header => (
                      <div key={header} className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
                        <span className="flex-1 text-sm text-white font-mono">{header}</span>
                        <span className="text-slate-500">←</span>
                        <select
                          value={columnMapping[header] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                          className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
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
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">معاينة البيانات (أول 5 صفوف)</h4>
                  <div className="overflow-x-auto bg-slate-700/30 rounded-xl">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-600/30">
                          {csvHeaders.map(h => (
                            <th key={h} className="text-right text-xs font-medium text-slate-500 px-3 py-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-slate-700/20">
                            {csvHeaders.map(h => (
                              <td key={h} className="px-3 py-2 text-xs text-slate-300">{String(row[h] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700/50">
              <button className="flex-1 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-colors" onClick={() => setShowImportModal(false)}>إلغاء</button>
              <button
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50"
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
