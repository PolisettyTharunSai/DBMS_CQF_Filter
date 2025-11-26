import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Database, FileText, Search, Trash2, Plus, Download, Cpu, HardDrive, Table as TableIcon } from 'lucide-react';
import { initDatabase, getTables, getPrimaryKeys, getTableData, resetDatabase } from './services/dbService';
import { buildCQF, searchCQF, insertCQF, deleteCQF, generatePKFileContent } from './services/cqfService';
import { TableInfo, TableData } from './types';
import { Button } from './components/Button';
import { LoadingOverlay } from './components/LoadingOverlay';

// --- Sub-components defined here for single-file constraint simplicity or split if needed. 
// Given the prompt asks for a robust structure, I've split generic UI components but will keep domain-specific layout logic here 
// to avoid too many tiny files in the XML output.

function App() {
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [tableData, setTableData] = useState<TableData>({ columns: [], rows: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // CQF State
  const [cqfBuiltTables, setCqfBuiltTables] = useState<Set<string>>(new Set());
  const [cqfConsole, setCqfConsole] = useState<string[]>([]);
  const [searchKey, setSearchKey] = useState('');
  const [cqfOperationLoading, setCqfOperationLoading] = useState(false);

  // File Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage(`Parsing ${file.name}...`);
    resetDatabase();
    setTables([]);
    setSelectedTable(null);
    setCqfBuiltTables(new Set());
    setCqfConsole([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      await initDatabase(arrayBuffer);
      const extractedTables = getTables();
      setTables(extractedTables);
      setIsDbLoaded(true);
      if (extractedTables.length > 0) {
        handleSelectTable(extractedTables[0]);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to load database. Please ensure it is a valid SQLite file.");
    } finally {
      setIsLoading(false);
    }
  };

  // Table Selection Handler
  const handleSelectTable = useCallback((table: TableInfo) => {
    setSelectedTable(table);
    // Fetch preview data
    const data = getTableData(table.name);
    setTableData(data);
    setCqfConsole([]); // Clear console on switch
  }, []);

  // Download PKs
  const handleDownloadPKs = () => {
    if (!selectedTable || !selectedTable.pkColumn) return;
    
    setIsLoading(true);
    setLoadingMessage('Extracting Primary Keys...');
    
    // Defer to allow UI update
    setTimeout(() => {
      const keys = getPrimaryKeys(selectedTable.name, selectedTable.pkColumn!);
      const content = generatePKFileContent(keys);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable.name}_pks.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsLoading(false);
    }, 100);
  };

  // Build CQF
  const handleBuildCQF = async () => {
    if (!selectedTable || !selectedTable.pkColumn) return;

    setIsLoading(true);
    setLoadingMessage('Building CQF in Backend...');

    try {
      const keys = getPrimaryKeys(selectedTable.name, selectedTable.pkColumn!);
      const response = await buildCQF(selectedTable.name, keys);
      
      if (response.success) {
        setCqfBuiltTables(prev => new Set(prev).add(selectedTable.name));
        addToConsole(`[SYSTEM] ${response.message}`);
      }
    } catch (error) {
      addToConsole(`[ERROR] Failed to build CQF: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // CQF Operations
  const addToConsole = (msg: string) => {
    setCqfConsole(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const performCqfAction = async (action: 'search' | 'insert' | 'delete') => {
    if (!selectedTable || !searchKey) return;
    
    setCqfOperationLoading(true);
    try {
      if (action === 'search') {
        const res = await searchCQF(selectedTable.name, searchKey);
        addToConsole(res.found ? `Search '${searchKey}': FOUND` : `Search '${searchKey}': NOT FOUND`);
      } else if (action === 'insert') {
        await insertCQF(selectedTable.name, searchKey);
        addToConsole(`Insert '${searchKey}': SUCCESS`);
      } else if (action === 'delete') {
        const res = await deleteCQF(selectedTable.name, searchKey);
        addToConsole(res.success ? `Delete '${searchKey}': SUCCESS` : `Delete '${searchKey}': FAILED (Not found)`);
      }
    } catch (error: any) {
      addToConsole(`[ERROR] ${error.message}`);
    } finally {
      setCqfOperationLoading(false);
      setSearchKey('');
    }
  };

  const isCqfReady = selectedTable ? cqfBuiltTables.has(selectedTable.name) : false;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {isLoading && <LoadingOverlay message={loadingMessage} />}

      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-400" />
            CQF Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">DB Parser & Filter Builder</p>
        </div>

        <div className="p-4 border-b border-slate-800">
          <label className="block text-sm font-medium text-slate-400 mb-2">Database Source</label>
          <div className="relative">
            <input 
              type="file" 
              accept=".db,.sqlite,.sqlite3" 
              onChange={handleFileUpload} 
              className="hidden" 
              id="db-upload"
            />
            <label 
              htmlFor="db-upload" 
              className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 hover:text-blue-400 transition-colors"
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-5 h-5" />
                <span className="text-xs font-medium">Upload .db file</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Tables Found {tables.length > 0 && `(${tables.length})`}
          </h2>
          {tables.length === 0 ? (
            <div className="text-sm text-slate-600 italic text-center py-8">
              No tables loaded
            </div>
          ) : (
            <ul className="space-y-1">
              {tables.map(table => (
                <li key={table.name}>
                  <button
                    onClick={() => handleSelectTable(table)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedTable?.name === table.name 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-4 h-4 opacity-70" />
                    <span className="truncate flex-1 text-left">{table.name}</span>
                    {cqfBuiltTables.has(table.name) && (
                      <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" title="CQF Active"></div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="p-4 bg-slate-950 text-xs text-slate-500 text-center">
          Powered by SQL.js & React
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {!selectedTable ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
              <Database className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-600">No Table Selected</h2>
            <p className="mt-2 text-slate-500 max-w-md text-center">
              Upload a database and select a table from the sidebar to inspect data and build filters.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{selectedTable.name}</h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-200 px-2 py-1 rounded">
                      <Database className="w-3 h-3" />
                      {selectedTable.rowCount.toLocaleString()} rows
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded ${selectedTable.pkColumn ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      <HardDrive className="w-3 h-3" />
                      PK: {selectedTable.pkColumn || "None detected"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Export Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Key Extraction
                  </h3>
                  <p className="text-sm text-slate-600 mb-6 flex-1">
                    Extract all values from the primary key column (<b>{selectedTable.pkColumn || 'N/A'}</b>) into a plain text file.
                  </p>
                  <Button 
                    onClick={handleDownloadPKs} 
                    disabled={!selectedTable.pkColumn}
                    variant="secondary"
                    icon={<Download className="w-4 h-4" />}
                    className="w-full justify-center"
                  >
                    Download .txt
                  </Button>
                </div>

                {/* Filter Builder Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-500" />
                    CQF Builder
                  </h3>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-2">
                      Build an approximate membership query filter using the backend engine.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      Status: 
                      {isCqfReady ? (
                         <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Active</span>
                      ) : (
                         <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Not Built</span>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleBuildCQF} 
                    disabled={!selectedTable.pkColumn || isCqfReady}
                    variant="primary"
                    className="w-full justify-center mt-4"
                  >
                    {isCqfReady ? 'Filter Ready' : 'Build Filter'}
                  </Button>
                </div>
              </div>

              {/* CQF Operations Playground */}
              {isCqfReady && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Filter Operations</h3>
                    <span className="text-xs font-mono text-slate-500">Backend: Connected</span>
                  </div>
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Primary Key Value</label>
                        <input 
                          type="text" 
                          value={searchKey}
                          onChange={(e) => setSearchKey(e.target.value)}
                          placeholder="Enter key..."
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          onClick={() => performCqfAction('search')} 
                          disabled={!searchKey || cqfOperationLoading} 
                          variant="secondary"
                          className="text-xs"
                          icon={<Search className="w-3 h-3" />}
                        >
                          Search
                        </Button>
                        <Button 
                          onClick={() => performCqfAction('insert')} 
                          disabled={!searchKey || cqfOperationLoading} 
                          variant="secondary"
                          className="text-xs"
                          icon={<Plus className="w-3 h-3" />}
                        >
                          Insert
                        </Button>
                        <Button 
                          onClick={() => performCqfAction('delete')} 
                          disabled={!searchKey || cqfOperationLoading} 
                          variant="secondary"
                          className="text-xs text-red-600 hover:bg-red-50 border-red-200"
                          icon={<Trash2 className="w-3 h-3" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="lg:col-span-2 bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-y-auto max-h-48 shadow-inner">
                      {cqfConsole.length === 0 && <span className="text-slate-600 select-none">Waiting for operations...</span>}
                      {cqfConsole.map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table View */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800">Table Contents</h3>
                  <span className="text-xs text-slate-500">Showing first 100 rows</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        {tableData.columns.map((col, idx) => (
                          <th key={idx} className={`px-6 py-3 font-semibold text-slate-700 ${col === selectedTable.pkColumn ? 'bg-blue-50 text-blue-700' : ''}`}>
                            {col}
                            {col === selectedTable.pkColumn && <span className="ml-1 text-[10px] uppercase tracking-wide opacity-75">(PK)</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tableData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={tableData.columns.length} className="px-6 py-8 text-center text-slate-500 italic">
                            No data available
                          </td>
                        </tr>
                      ) : (
                        tableData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className={`px-6 py-3 text-slate-600 ${tableData.columns[cIdx] === selectedTable.pkColumn ? 'font-medium text-slate-900 bg-blue-50/30' : ''}`}>
                                {cell === null ? <span className="text-slate-400 italic">NULL</span> : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;