import axios from 'axios';
import { offlineDb } from '../../../db/offlineDb';
import API_BASE_URL from '../../../config/api';

class OfflineSyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
  }

  start() {
    if (this.syncInterval) return;

    // Initial check
    this.sync();

    // Check every 30 seconds if online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.sync();
      }
    }, 30000);

    // Listen for online event
    window.addEventListener('online', () => this.sync());
  }

  async sync(force = false) {
    if (!navigator.onLine || this.isSyncing) return;

    const targetStatuses = force ? ['pending', 'failed'] : ['pending'];
    const pendingCount = await offlineDb.submissions
      .where('status')
      .anyOf(targetStatuses)
      .count();
    if (pendingCount === 0) return;

    this.isSyncing = true;
    console.log(`Starting sync of ${pendingCount} submissions (force: ${force})...`);

    try {
      const pendingSubmissions = await offlineDb.submissions
        .where('status')
        .anyOf(targetStatuses)
        .toArray();

      for (const sub of pendingSubmissions) {
        try {
          await offlineDb.submissions.update(sub.id, { status: 'syncing' });
          await this.uploadSubmission(sub);
          await offlineDb.submissions.delete(sub.id);
          console.log(`Successfully synced submission ${sub.id}`);
        } catch (err) {
          console.error(`Failed to sync submission ${sub.id}:`, err);
          await offlineDb.submissions.update(sub.id, { 
            status: 'failed', 
            errorMessage: err.message || 'Network error' 
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async uploadSubmission(sub) {
    const token = localStorage.getItem('token');
    console.log(`📡 Starting background upload for ${sub.type} (ID: ${sub.id})...`);
    
    const startTotal = performance.now();
    const startRecord = performance.now();
    // Step 1: Create the record (pole or switch_point)
    const endpoint = sub.type === 'switch_point' ? 'switch-point' : 'pole';
    const recordUrl = `${API_BASE_URL}/projects/${sub.projectId}/pole-survey/${endpoint}`;

    const res = await axios.post(recordUrl, sub.data, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`⏱️ [Sync] ${sub.type} creation: ${(performance.now() - startRecord).toFixed(2)}ms`);

    const entityId = res.data.id;

    // Step 2: Upload images one by one
    if (entityId && sub.images && sub.images.length > 0) {
      const startAllImages = performance.now();
      for (let i = 0; i < sub.images.length; i++) {
        const img = sub.images[i];
        const startSingleImage = performance.now();
        const formDataUpload = new FormData();
        formDataUpload.append('file', img.file);
        formDataUpload.append('entity_type', sub.type);
        formDataUpload.append('entity_id', entityId);

        await axios.post(
          `${API_BASE_URL}/projects/${sub.projectId}/pole-survey/files`,
          formDataUpload,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log(`⏱️ [Sync] Image ${i + 1} upload: ${(performance.now() - startSingleImage).toFixed(2)}ms`);
      }
      console.log(`⏱️ [Sync] Total images upload: ${(performance.now() - startAllImages).toFixed(2)}ms`);
    }
    console.log(`🚀 [Sync] Total time for ${sub.type}: ${(performance.now() - startTotal).toFixed(2)}ms`);
  }

  async getPendingCount() {
    return await offlineDb.submissions.where('status').equals('pending').count();
  }
}

export const offlineSyncService = new OfflineSyncService();
