/**
 * This service simulates the backend CQF builder and operations.
 * In a real scenario, these functions would make fetch() calls to the backend API.
 */

// Simulating a backend store map: tableName -> Set<string>
const mockBackendStore: Map<string, Set<string>> = new Map();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const buildCQF = async (tableName: string, keys: string[]): Promise<{ success: boolean; message: string }> => {
  await delay(1500); // Simulate network latency
  
  // Initialize the "filter" in our mock backend
  mockBackendStore.set(tableName, new Set(keys));
  
  return {
    success: true,
    message: `CQF built successfully for ${tableName} with ${keys.length} keys.`
  };
};

export const searchCQF = async (tableName: string, key: string): Promise<{ found: boolean }> => {
  await delay(300); // Fast lookup
  const set = mockBackendStore.get(tableName);
  if (!set) throw new Error("Filter not built for this table");
  
  return { found: set.has(key) };
};

export const insertCQF = async (tableName: string, key: string): Promise<{ success: boolean }> => {
  await delay(500);
  const set = mockBackendStore.get(tableName);
  if (!set) throw new Error("Filter not built for this table");
  
  set.add(key);
  return { success: true };
};

export const deleteCQF = async (tableName: string, key: string): Promise<{ success: boolean }> => {
  await delay(500);
  const set = mockBackendStore.get(tableName);
  if (!set) throw new Error("Filter not built for this table");
  
  const deleted = set.delete(key);
  return { success: deleted };
};

// Helper to generate text file content
export const generatePKFileContent = (keys: string[]): string => {
  return keys.join('\n');
};