import axios from 'axios';
import { offlineDb } from '../../../db/offlineDb';
import API_BASE_URL from '../../../config/api';

const createOfflineSubmissionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getImageKeys = (sub) => {
  if (Array.isArray(sub?.images) && sub.images.some((image) => image?.fieldName)) {
    return sub.images.map((image, index) => image?.fieldName || image?.slot || `image_url_${index + 1}`);
  }

  const isInstallation = sub?.data?.survey_type === 'installation';
  if (sub?.type === 'switch_point') {
    return ['image_url_1', 'image_url_2'];
  }
  if (isInstallation) {
    return ['image_url_1', 'image_url_2'];
  }
  return ['image_url_1', 'image_url_2', 'image_url_3'];
};

const normalizeImages = (sub) => {
  if (!Array.isArray(sub?.images) || sub.images.length === 0) return [];
  const keys = getImageKeys(sub);
  return sub.images.map((image, index) => ({
    fieldName: image?.fieldName || image?.slot || keys[index] || `image_url_${index + 1}`,
    file: image.file,
    type: image.type || sub.type,
  }));
};

const buildInitialImageStatus = (sub) => {
  const keys = getImageKeys(sub);
  const status = {};
  keys.forEach((key) => {
    status[key] = false;
  });
  if (sub?.imageUploadStatus && typeof sub.imageUploadStatus === 'object') {
    return { ...status, ...sub.imageUploadStatus };
  }
  if (typeof sub?.uploadedImageCount === 'number' && sub.uploadedImageCount > 0) {
    keys.slice(0, sub.uploadedImageCount).forEach((key) => {
      status[key] = true;
    });
  }
  return status;
};

class OfflineSyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.syncPromise = null;
    this.maxRetryCount = 10;
  }

  log(event, details = {}) {
    console.log('[OfflineSync]', event, details);
  }

  getNextRetryDelayMs(retryCount) {
    const baseDelay = 60 * 1000;
    const cappedExponent = Math.min(Math.max(Number(retryCount || 0), 0), 6);
    return baseDelay * (2 ** cappedExponent);
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
    if (!navigator.onLine) return;
    if (this.syncPromise) return this.syncPromise;

    const targetStatuses = ['pending', 'failed'];
    this.syncPromise = (async () => {
      const pendingCount = await offlineDb.submissions
        .where('status')
        .anyOf(targetStatuses)
        .count();
      if (pendingCount === 0) return;

      this.isSyncing = true;
      this.log('SYNC_START', { pendingCount, force });

      try {
        const pendingSubmissions = await offlineDb.submissions
          .where('status')
          .anyOf(targetStatuses)
          .toArray();

        for (const sub of pendingSubmissions) {
          const retryCount = Number(sub.retryCount || 0);
          if (!force && retryCount >= this.maxRetryCount) {
            this.log('SKIP_MAX_RETRY', { id: sub.id, offlineSubmissionId: sub.offlineSubmissionId, retryCount });
            continue;
          }

          const nextRetryAt = sub.nextRetryAt || 0;
          if (!force && nextRetryAt && Date.now() < nextRetryAt) {
            this.log('SKIP_BACKOFF', { id: sub.id, offlineSubmissionId: sub.offlineSubmissionId, nextRetryAt });
            continue;
          }

          try {
            const attemptCount = retryCount + 1;
            const delayMs = this.getNextRetryDelayMs(retryCount);
            await offlineDb.submissions.update(sub.id, {
              status: 'syncing',
              retryCount: attemptCount,
              lastRetryAt: Date.now(),
              nextRetryAt: Date.now() + delayMs,
              lastError: null,
            });
            this.log('STATE_CHANGE', {
              id: sub.id,
              offlineSubmissionId: sub.offlineSubmissionId,
              from: sub.status,
              to: 'syncing',
              retryCount: attemptCount,
            });
            await this.uploadSubmission(sub);
            await offlineDb.submissions.update(sub.id, {
              status: 'synced',
              errorMessage: null,
              lastError: null,
              nextRetryAt: null,
              syncedAt: Date.now(),
            });
            this.log('SYNC_COMPLETE', { id: sub.id, offlineSubmissionId: sub.offlineSubmissionId });
          } catch (err) {
            const message = err.message || 'Network error';
            this.log('SYNC_FAILED', {
              id: sub.id,
              offlineSubmissionId: sub.offlineSubmissionId,
              retryCount: Number(sub.retryCount || 0) + 1,
              error: message,
            });
            await offlineDb.submissions.update(sub.id, { 
              status: 'failed', 
              errorMessage: message,
              lastError: message,
              lastRetryAt: Date.now(),
              nextRetryAt: Date.now() + this.getNextRetryDelayMs(sub.retryCount || 0),
            });
          }
        }

        await this.cleanupSyncedRows();
      } finally {
        this.isSyncing = false;
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  async uploadSubmission(sub) {
    const token = localStorage.getItem('token');
    console.log(`📡 Starting background upload for ${sub.type} (ID: ${sub.id})...`);
    
    const startTotal = performance.now();
    const endpoint = sub.type === 'switch_point' ? 'switch-point' : 'pole';
    const recordUrl = `${API_BASE_URL}/projects/${sub.projectId}/pole-survey/${endpoint}`;

    const current = await offlineDb.submissions.get(sub.id) || sub;
    const offlineSubmissionId = current.offlineSubmissionId || createOfflineSubmissionId();
    const imageUploadStatus = buildInitialImageStatus({ ...current, offlineSubmissionId });
    const images = normalizeImages(current);

    if (!current.offlineSubmissionId) {
      await offlineDb.submissions.update(sub.id, { offlineSubmissionId });
    }

    let entityId = current.serverEntityId;

    // Step 1: Create the record only once. If we already created it earlier,
    // resume from the stored server entity id instead of creating a duplicate.
    if (!entityId) {
      const startRecord = performance.now();
      const res = await axios.post(recordUrl, {
        ...current.data,
        offline_submission_id: offlineSubmissionId,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      entityId = res.data.id;
      await offlineDb.submissions.update(sub.id, {
        serverEntityId: entityId,
        offlineSubmissionId,
        status: 'syncing',
      });
      console.log(`⏱️ [Sync] ${sub.type} creation: ${(performance.now() - startRecord).toFixed(2)}ms`);
    }

    // Step 2: Upload images one by one
    if (entityId && images.length > 0) {
      const startAllImages = performance.now();
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img?.file) {
          this.log('SKIP_EMPTY_IMAGE', { offlineSubmissionId, entityId, fieldName: img?.fieldName });
          continue;
        }
        if (imageUploadStatus[img.fieldName]) {
          this.log('SKIP_ALREADY_UPLOADED', { offlineSubmissionId, entityId, fieldName: img.fieldName });
          continue;
        }
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
        imageUploadStatus[img.fieldName] = true;
        await offlineDb.submissions.update(sub.id, {
          imageUploadStatus,
          lastUploadedAt: Date.now(),
        });
        this.log('IMAGE_UPLOADED', { offlineSubmissionId, entityId, fieldName: img.fieldName });
        console.log(`⏱️ [Sync] Image ${i + 1} upload: ${(performance.now() - startSingleImage).toFixed(2)}ms`);
      }
      console.log(`⏱️ [Sync] Total images upload: ${(performance.now() - startAllImages).toFixed(2)}ms`);
    }
    console.log(`🚀 [Sync] Total time for ${sub.type}: ${(performance.now() - startTotal).toFixed(2)}ms`);
  }

  async getPendingCount() {
    return await offlineDb.submissions.where('status').anyOf(['pending', 'failed']).count();
  }

  async cleanupSyncedRows(maxSyncedRows = 50) {
    const syncedRows = await offlineDb.submissions
      .where('status')
      .equals('synced')
      .sortBy('syncedAt');

    if (syncedRows.length <= maxSyncedRows) return;

    const rowsToDelete = syncedRows.slice(0, syncedRows.length - maxSyncedRows);
    await Promise.all(rowsToDelete.map((row) => offlineDb.submissions.delete(row.id)));
  }
}

export const offlineSyncService = new OfflineSyncService();
