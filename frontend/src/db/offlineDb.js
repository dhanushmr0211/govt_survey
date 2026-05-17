import Dexie from 'dexie';

export const offlineDb = new Dexie('PRElectricalsOfflineDB');

offlineDb.version(1).stores({
  submissions: '++id, type, status, createdAt, projectId, ulbId, wardNumber'
});

/**
 * Submissions table schema:
 * - id: auto-increment
 * - type: 'pole' | 'switch_point'
 * - data: object (all form fields)
 * - images: array of { file: Blob, type: string }
 * - status: 'pending' | 'syncing' | 'failed'
 * - errorMessage: string (optional)
 * - createdAt: timestamp
 * - projectId: number
 * - ulbId: number
 * - wardNumber: string
 */
