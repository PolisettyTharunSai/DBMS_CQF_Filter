export interface TableInfo {
  name: string;
  rowCount: number;
  pkColumn: string | null;
  columns: string[];
}

export interface TableData {
  columns: string[];
  rows: any[][];
}

export interface CqfFilterState {
  isBuilt: boolean;
  itemCount: number;
  falsePositiveRate: number; // Simulated metric
  capacity: number;
}

export interface DbServiceError {
  message: string;
}

// Global definition for sql.js loaded via script tag
declare global {
  interface Window {
    initSqlJs: (config: { locateFile: (filename: string) => string }) => Promise<any>;
  }
}