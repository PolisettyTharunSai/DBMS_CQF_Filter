import { TableInfo, TableData } from '../types';

let db: any = null;

export const initDatabase = async (fileBuffer: ArrayBuffer): Promise<void> => {
  if (!window.initSqlJs) {
    throw new Error("SQL.js not loaded");
  }

  const SQL = await window.initSqlJs({
    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });

  db = new SQL.Database(new Uint8Array(fileBuffer));
};

export const getTables = (): TableInfo[] => {
  if (!db) return [];

  const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if (result.length === 0) return [];

  const tables = result[0].values.map((row: any[]) => row[0]);
  
  return tables.map((tableName: string) => {
    // Get Row Count
    const countResult = db.exec(`SELECT COUNT(*) FROM "${tableName}"`);
    const rowCount = countResult[0].values[0][0];

    // Get Schema to find PK
    const schemaResult = db.exec(`PRAGMA table_info("${tableName}")`);
    const columns = schemaResult[0].values; // [cid, name, type, notnull, dflt_value, pk]
    
    // Find column where pk flag is 1
    const pkCol = columns.find((col: any[]) => col[5] === 1);
    const pkName = pkCol ? pkCol[1] : null;
    const allColNames = columns.map((col: any[]) => col[1]);

    return {
      name: tableName,
      rowCount: rowCount as number,
      pkColumn: pkName,
      columns: allColNames
    };
  });
};

export const getTableData = (tableName: string, limit: number = 100): TableData => {
  if (!db) return { columns: [], rows: [] };

  try {
    const result = db.exec(`SELECT * FROM "${tableName}" LIMIT ${limit}`);
    if (result.length === 0) return { columns: [], rows: [] };
    
    return {
      columns: result[0].columns,
      rows: result[0].values
    };
  } catch (e) {
    console.error("Error fetching table data", e);
    return { columns: [], rows: [] };
  }
};

export const getPrimaryKeys = (tableName: string, pkColumn: string): string[] => {
  if (!db) return [];
  try {
    const result = db.exec(`SELECT "${pkColumn}" FROM "${tableName}"`);
    if (result.length === 0) return [];
    // Flatten the array of arrays
    return result[0].values.map((row: any[]) => String(row[0]));
  } catch (e) {
    console.error("Error extracting PKs", e);
    return [];
  }
};

export const resetDatabase = () => {
  if (db) {
    db.close();
    db = null;
  }
};