// Legacy compatibility shim. The project now uses storageClient which proxies to the backend (Pinata + Algorand).
// Keep this file to avoid breaking imports; re-export from storageClient.
import storage from './storageClient';

console.warn('Using legacy base44Client shim; please update imports to use src/api/storageClient.ts');

export const base44: any = storage;
export default base44;
