import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  Database as DatabaseIcon,
  Table,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Download,
  RefreshCw,
  X,
  Save,
  FileText,
  Code,
  AlertTriangle
} from 'lucide-react'

interface Column {
  name: string
  type: string
  nullable: boolean
  key: string
  default: string | null
  extra: string
}

interface TableData {
  [key: string]: any
}

export default function DatabasePage() {
  const { admin } = useAuth()
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [data, setData] = useState<TableData[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'structure' | 'data' | 'import'>('data')
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRowData, setNewRowData] = useState<TableData>({})
  const [editingRow, setEditingRow] = useState<{ id: any; data: TableData } | null>(null)
  
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumn, setNewColumn] = useState({ name: '', type: 'VARCHAR(255)', nullable: true, defaultValue: '' })
  
  const [showCreateTable, setShowCreateTable] = useState(false)
  const [newTable, setNewTable] = useState({ name: '', columns: [{ name: 'id', type: 'INT', primary: true, autoIncrement: true, nullable: false, default: '' }] })
  
  const [importMode, setImportMode] = useState<'csv' | 'sql'>('csv')
  const [csvData, setCsvData] = useState('')
  const [sqlData, setSqlData] = useState('')
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'table' | 'row' | 'column'; id?: any; name?: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedTable) {
      fetchTableStructure()
      fetchTableData()
    }
  }, [selectedTable, pagination.page])

  const fetchTables = async () => {
    try {
      const res = await api.get('/admin/tables')
      setTables(res.data.tables || [])
    } catch (error) {
      console.error('Error fetching tables:', error)
    }
  }

  const fetchTableStructure = async () => {
    if (!selectedTable) return
    try {
      const res = await api.get(`/admin/tables/${selectedTable}/structure`)
      setColumns(res.data.columns || [])
    } catch (error) {
      console.error('Error fetching table structure:', error)
    }
  }

  const fetchTableData = async () => {
    if (!selectedTable) return
    setLoading(true)
    try {
      const res = await api.get(`/admin/tables/${selectedTable}/data`, {
        params: { page: pagination.page, limit: pagination.limit }
      })
      setData(res.data.data || [])
      setPagination(prev => ({ ...prev, ...res.data.pagination }))
    } catch (error) {
      console.error('Error fetching table data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRow = async () => {
    if (!selectedTable) return
    try {
      await api.post(`/admin/tables/${selectedTable}/data`, { data: newRowData })
      setShowAddRow(false)
      setNewRowData({})
      fetchTableData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error adding row')
    }
  }

  const handleUpdateRow = async () => {
    if (!selectedTable || !editingRow) return
    try {
      await api.put(`/admin/tables/${selectedTable}/data/${editingRow.id}`, { data: editingRow.data })
      setEditingRow(null)
      fetchTableData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating row')
    }
  }

  const handleDeleteRow = async (id: any) => {
    if (!selectedTable) return
    try {
      await api.delete(`/admin/tables/${selectedTable}/data/${id}`)
      setConfirmDelete(null)
      fetchTableData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting row')
    }
  }

  const handleAddColumn = async () => {
    if (!selectedTable) return
    try {
      await api.post(`/admin/tables/${selectedTable}/columns`, {
        name: newColumn.name,
        type: newColumn.type,
        nullable: newColumn.nullable,
        defaultValue: newColumn.defaultValue
      })
      setShowAddColumn(false)
      setNewColumn({ name: '', type: 'VARCHAR(255)', nullable: true, defaultValue: '' })
      fetchTableStructure()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error adding column')
    }
  }

  const handleDeleteColumn = async (columnName: string) => {
    if (!selectedTable) return
    try {
      await api.delete(`/admin/tables/${selectedTable}/columns/${columnName}`)
      setConfirmDelete(null)
      fetchTableStructure()
      fetchTableData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting column')
    }
  }

  const handleCreateTable = async () => {
    try {
      await api.post('/admin/tables/create', {
        tableName: newTable.name,
        columns: newTable.columns
      })
      setShowCreateTable(false)
      setNewTable({ name: '', columns: [{ name: 'id', type: 'INT', primary: true, autoIncrement: true, nullable: false, default: '' }] })
      fetchTables()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating table')
    }
  }

  const handleDeleteTable = async (tableName: string) => {
    try {
      await api.delete(`/admin/tables/${tableName}`)
      setConfirmDelete(null)
      setSelectedTable(null)
      setColumns([])
      setData([])
      fetchTables()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting table')
    }
  }

  const handleImportCsv = async () => {
    if (!selectedTable || !csvData) return
    try {
      const lines = csvData.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row: TableData = {}
        headers.forEach((h, i) => {
          row[h] = values[i] || ''
        })
        return row
      })
      
      const res = await api.post(`/admin/tables/${selectedTable}/import-csv`, { rows })
      setImportResult({ success: true, message: res.data.message })
      setCsvData('')
      fetchTableData()
    } catch (error: any) {
      setImportResult({ success: false, message: error.response?.data?.error || 'Error importing CSV' })
    }
  }

  const handleImportSql = async () => {
    if (!selectedTable || !sqlData) return
    try {
      const res = await api.post(`/admin/tables/${selectedTable}/import-sql`, { sql: sqlData })
      setImportResult({ success: true, message: res.data.message })
      setSqlData('')
      fetchTableData()
      fetchTableStructure()
    } catch (error: any) {
      setImportResult({ success: false, message: error.response?.data?.error || 'Error importing SQL' })
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (importMode === 'csv') {
        setCsvData(content)
      } else {
        setSqlData(content)
      }
    }
    reader.readAsText(file)
  }

  const getPrimaryKeyColumn = () => columns.find(c => c.key === 'PRI')?.name || 'id'

  const exportTableData = () => {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTable}_export.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DatabaseIcon className="w-8 h-8 text-gold-500" />
          <h1 className="text-2xl font-bold text-white">إدارة قاعدة البيانات</h1>
        </div>
        <button
          onClick={() => setShowCreateTable(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors font-bold"
        >
          <Plus className="w-5 h-5" />
          جدول جديد
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 bg-dark-400 rounded-xl p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">الجداول</h2>
            <button onClick={fetchTables} className="p-2 hover:bg-dark-300 rounded-lg">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          <div className="space-y-1">
            {tables.map(table => (
              <div
                key={table}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedTable === table ? 'bg-gold-500/20 text-gold-500' : 'hover:bg-dark-300 text-gray-300'
                }`}
                onClick={() => {
                  setSelectedTable(table)
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
              >
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4" />
                  <span className="text-sm">{table}</span>
                </div>
                {admin?.role === 'superadmin' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDelete({ type: 'table', name: table })
                    }}
                    className="p-1 hover:bg-red-900/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-9 bg-dark-400 rounded-xl p-4">
          {selectedTable ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-white">{selectedTable}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('data')}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        activeTab === 'data' ? 'bg-gold-500 text-black font-bold' : 'bg-dark-300 text-gray-400'
                      }`}
                    >
                      البيانات
                    </button>
                    <button
                      onClick={() => setActiveTab('structure')}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        activeTab === 'structure' ? 'bg-gold-500 text-black font-bold' : 'bg-dark-300 text-gray-400'
                      }`}
                    >
                      الهيكل
                    </button>
                    <button
                      onClick={() => setActiveTab('import')}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        activeTab === 'import' ? 'bg-gold-500 text-black font-bold' : 'bg-dark-300 text-gray-400'
                      }`}
                    >
                      استيراد
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {activeTab === 'data' && (
                    <>
                      <button
                        onClick={() => setShowAddRow(true)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة صف
                      </button>
                      <button
                        onClick={exportTableData}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500"
                      >
                        <Download className="w-4 h-4" />
                        تصدير
                      </button>
                    </>
                  )}
                  {activeTab === 'structure' && (
                    <button
                      onClick={() => setShowAddColumn(true)}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500"
                    >
                      <Plus className="w-4 h-4" />
                      عمود جديد
                    </button>
                  )}
                </div>
              </div>

              {activeTab === 'data' && (
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="w-8 h-8 text-gold-500 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dark-200">
                            {columns.map(col => (
                              <th key={col.name} className="text-right py-3 px-2 text-gray-400 font-medium">
                                {col.name}
                                {col.key === 'PRI' && <span className="text-gold-500 mr-1">*</span>}
                              </th>
                            ))}
                            <th className="text-right py-3 px-2 text-gray-400 font-medium w-24">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((row, idx) => {
                            const pkColumn = getPrimaryKeyColumn()
                            const rowId = row[pkColumn]
                            const isEditing = editingRow?.id === rowId
                            
                            return (
                              <tr key={idx} className="border-b border-dark-200 hover:bg-dark-300">
                                {columns.map(col => (
                                  <td key={col.name} className="py-2 px-2 text-gray-300">
                                    {isEditing && editingRow && col.key !== 'PRI' ? (
                                      <input
                                        type="text"
                                        value={editingRow.data[col.name] ?? ''}
                                        onChange={(e) => setEditingRow({
                                          id: editingRow.id,
                                          data: { ...editingRow.data, [col.name]: e.target.value }
                                        })}
                                        className="w-full bg-dark-500 border border-dark-200 rounded px-2 py-1 text-white text-sm"
                                      />
                                    ) : (
                                      <span className="truncate block max-w-xs" title={String(row[col.name] ?? '')}>
                                        {row[col.name] !== null ? String(row[col.name]).substring(0, 50) : <span className="text-gray-500">NULL</span>}
                                      </span>
                                    )}
                                  </td>
                                ))}
                                <td className="py-2 px-2">
                                  <div className="flex gap-1">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={handleUpdateRow}
                                          className="p-1 bg-green-600 rounded hover:bg-green-500"
                                        >
                                          <Save className="w-4 h-4 text-white" />
                                        </button>
                                        <button
                                          onClick={() => setEditingRow(null)}
                                          className="p-1 bg-gray-600 rounded hover:bg-gray-500"
                                        >
                                          <X className="w-4 h-4 text-white" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => setEditingRow({ id: rowId, data: { ...row } })}
                                          className="p-1 hover:bg-dark-200 rounded"
                                        >
                                          <Edit3 className="w-4 h-4 text-blue-400" />
                                        </button>
                                        <button
                                          onClick={() => setConfirmDelete({ type: 'row', id: rowId })}
                                          className="p-1 hover:bg-dark-200 rounded"
                                        >
                                          <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      
                      {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-sm text-gray-400">
                            صفحة {pagination.page} من {pagination.totalPages} ({pagination.total} صف)
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                              disabled={pagination.page <= 1}
                              className="px-3 py-1 bg-dark-300 rounded text-sm disabled:opacity-50"
                            >
                              السابق
                            </button>
                            <button
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                              disabled={pagination.page >= pagination.totalPages}
                              className="px-3 py-1 bg-dark-300 rounded text-sm disabled:opacity-50"
                            >
                              التالي
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'structure' && (
                <div className="space-y-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-200">
                        <th className="text-right py-3 px-2 text-gray-400">الاسم</th>
                        <th className="text-right py-3 px-2 text-gray-400">النوع</th>
                        <th className="text-right py-3 px-2 text-gray-400">يقبل NULL</th>
                        <th className="text-right py-3 px-2 text-gray-400">المفتاح</th>
                        <th className="text-right py-3 px-2 text-gray-400">القيمة الافتراضية</th>
                        <th className="text-right py-3 px-2 text-gray-400">إضافي</th>
                        <th className="text-right py-3 px-2 text-gray-400 w-20">حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map(col => (
                        <tr key={col.name} className="border-b border-dark-200 hover:bg-dark-300">
                          <td className="py-2 px-2 text-white font-medium">{col.name}</td>
                          <td className="py-2 px-2 text-blue-400">{col.type}</td>
                          <td className="py-2 px-2 text-gray-300">{col.nullable ? 'نعم' : 'لا'}</td>
                          <td className="py-2 px-2">
                            {col.key === 'PRI' && <span className="px-2 py-1 bg-gold-500/20 text-gold-500 rounded text-xs">PRIMARY</span>}
                            {col.key === 'UNI' && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">UNIQUE</span>}
                            {col.key === 'MUL' && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">INDEX</span>}
                          </td>
                          <td className="py-2 px-2 text-gray-400">{col.default ?? '-'}</td>
                          <td className="py-2 px-2 text-gray-400">{col.extra || '-'}</td>
                          <td className="py-2 px-2">
                            {admin?.role === 'superadmin' && col.key !== 'PRI' && (
                              <button
                                onClick={() => setConfirmDelete({ type: 'column', name: col.name })}
                                className="p-1 hover:bg-red-900/50 rounded"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'import' && (
                <div className="space-y-4">
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setImportMode('csv')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        importMode === 'csv' ? 'bg-gold-500 text-black font-bold' : 'bg-dark-300 text-gray-400'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                      CSV
                    </button>
                    <button
                      onClick={() => setImportMode('sql')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        importMode === 'sql' ? 'bg-gold-500 text-black font-bold' : 'bg-dark-300 text-gray-400'
                      }`}
                    >
                      <Code className="w-5 h-5" />
                      SQL
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept={importMode === 'csv' ? '.csv' : '.sql'}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                    >
                      <Upload className="w-5 h-5" />
                      رفع ملف {importMode.toUpperCase()}
                    </button>
                  </div>

                  {importMode === 'csv' ? (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">بيانات CSV (الصف الأول = أسماء الأعمدة)</label>
                      <textarea
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                        placeholder="column1,column2,column3&#10;value1,value2,value3&#10;value4,value5,value6"
                        className="w-full h-48 bg-dark-500 border border-dark-200 rounded-lg p-3 text-white text-sm font-mono"
                        dir="ltr"
                      />
                      <button
                        onClick={handleImportCsv}
                        disabled={!csvData}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                      >
                        استيراد CSV
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">أوامر SQL</label>
                      <textarea
                        value={sqlData}
                        onChange={(e) => setSqlData(e.target.value)}
                        placeholder="INSERT INTO table_name (col1, col2) VALUES ('val1', 'val2');&#10;UPDATE table_name SET col1 = 'value' WHERE id = 1;"
                        className="w-full h-48 bg-dark-500 border border-dark-200 rounded-lg p-3 text-white text-sm font-mono"
                        dir="ltr"
                      />
                      <button
                        onClick={handleImportSql}
                        disabled={!sqlData}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                      >
                        تنفيذ SQL
                      </button>
                    </div>
                  )}

                  {importResult && (
                    <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {importResult.message}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <DatabaseIcon className="w-16 h-16 mb-4 opacity-50" />
              <p>اختر جدول من القائمة</p>
            </div>
          )}
        </div>
      </div>

      {showAddRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-400 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">إضافة صف جديد</h3>
              <button onClick={() => setShowAddRow(false)} className="p-2 hover:bg-dark-300 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              {columns.filter(c => c.extra !== 'auto_increment').map(col => (
                <div key={col.name}>
                  <label className="block text-sm text-gray-400 mb-1">
                    {col.name} <span className="text-gray-500">({col.type})</span>
                    {!col.nullable && <span className="text-red-400 mr-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={newRowData[col.name] ?? ''}
                    onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                    className="w-full bg-dark-500 border border-dark-200 rounded-lg px-3 py-2 text-white"
                    placeholder={col.default ?? ''}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddRow(false)} className="px-4 py-2 bg-dark-300 text-gray-400 rounded-lg">
                إلغاء
              </button>
              <button onClick={handleAddRow} className="px-4 py-2 bg-gold-500 text-black font-bold rounded-lg">
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddColumn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-400 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">إضافة عمود جديد</h3>
              <button onClick={() => setShowAddColumn(false)} className="p-2 hover:bg-dark-300 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">اسم العمود</label>
                <input
                  type="text"
                  value={newColumn.name}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  className="w-full bg-dark-500 border border-dark-200 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">النوع</label>
                <select
                  value={newColumn.type}
                  onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                  className="w-full bg-dark-500 border border-dark-200 rounded-lg px-3 py-2 text-white"
                >
                  <option value="VARCHAR(255)">VARCHAR(255)</option>
                  <option value="INT">INT</option>
                  <option value="BIGINT">BIGINT</option>
                  <option value="TEXT">TEXT</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                  <option value="DATETIME">DATETIME</option>
                  <option value="DATE">DATE</option>
                  <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                  <option value="FLOAT">FLOAT</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newColumn.nullable}
                  onChange={(e) => setNewColumn({ ...newColumn, nullable: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-400">يقبل NULL</label>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">القيمة الافتراضية</label>
                <input
                  type="text"
                  value={newColumn.defaultValue}
                  onChange={(e) => setNewColumn({ ...newColumn, defaultValue: e.target.value })}
                  className="w-full bg-dark-500 border border-dark-200 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddColumn(false)} className="px-4 py-2 bg-dark-300 text-gray-400 rounded-lg">
                إلغاء
              </button>
              <button onClick={handleAddColumn} className="px-4 py-2 bg-gold-500 text-black font-bold rounded-lg">
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-400 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">إنشاء جدول جديد</h3>
              <button onClick={() => setShowCreateTable(false)} className="p-2 hover:bg-dark-300 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">اسم الجدول</label>
                <input
                  type="text"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  className="w-full bg-dark-500 border border-dark-200 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">الأعمدة</label>
                  <button
                    onClick={() => setNewTable({
                      ...newTable,
                      columns: [...newTable.columns, { name: '', type: 'VARCHAR(255)', primary: false, autoIncrement: false, nullable: true, default: '' }]
                    })}
                    className="text-sm text-gold-500 hover:text-gold-400"
                  >
                    + إضافة عمود
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newTable.columns.map((col, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-dark-500 rounded-lg">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => {
                          const cols = [...newTable.columns]
                          cols[idx].name = e.target.value
                          setNewTable({ ...newTable, columns: cols })
                        }}
                        placeholder="اسم العمود"
                        className="flex-1 bg-dark-400 border border-dark-200 rounded px-2 py-1 text-white text-sm"
                      />
                      <select
                        value={col.type}
                        onChange={(e) => {
                          const cols = [...newTable.columns]
                          cols[idx].type = e.target.value
                          setNewTable({ ...newTable, columns: cols })
                        }}
                        className="bg-dark-400 border border-dark-200 rounded px-2 py-1 text-white text-sm"
                      >
                        <option value="INT">INT</option>
                        <option value="BIGINT">BIGINT</option>
                        <option value="VARCHAR(255)">VARCHAR(255)</option>
                        <option value="TEXT">TEXT</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="DATETIME">DATETIME</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={col.primary}
                          onChange={(e) => {
                            const cols = [...newTable.columns]
                            cols[idx].primary = e.target.checked
                            setNewTable({ ...newTable, columns: cols })
                          }}
                        />
                        PK
                      </label>
                      <label className="flex items-center gap-1 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={col.autoIncrement}
                          onChange={(e) => {
                            const cols = [...newTable.columns]
                            cols[idx].autoIncrement = e.target.checked
                            setNewTable({ ...newTable, columns: cols })
                          }}
                        />
                        AI
                      </label>
                      {idx > 0 && (
                        <button
                          onClick={() => {
                            const cols = newTable.columns.filter((_, i) => i !== idx)
                            setNewTable({ ...newTable, columns: cols })
                          }}
                          className="p-1 hover:bg-red-900/50 rounded"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreateTable(false)} className="px-4 py-2 bg-dark-300 text-gray-400 rounded-lg">
                إلغاء
              </button>
              <button onClick={handleCreateTable} className="px-4 py-2 bg-gold-500 text-black font-bold rounded-lg">
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-400 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-lg font-bold text-white">تأكيد الحذف</h3>
            </div>
            <p className="text-gray-300 mb-6">
              {confirmDelete.type === 'table' && `هل أنت متأكد من حذف الجدول "${confirmDelete.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
              {confirmDelete.type === 'row' && 'هل أنت متأكد من حذف هذا الصف؟'}
              {confirmDelete.type === 'column' && `هل أنت متأكد من حذف العمود "${confirmDelete.name}"؟`}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-dark-300 text-gray-400 rounded-lg">
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'table') handleDeleteTable(confirmDelete.name!)
                  else if (confirmDelete.type === 'row') handleDeleteRow(confirmDelete.id)
                  else if (confirmDelete.type === 'column') handleDeleteColumn(confirmDelete.name!)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
