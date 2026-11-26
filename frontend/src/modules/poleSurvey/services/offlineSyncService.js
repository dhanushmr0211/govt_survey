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

  if (sub?.type === 'ccms') {
    return ['bescom_meter_image_url', 'ccms_meter_image_url', 'ccms_box_image_url'];
  }
  const isInstallation = sub?.data?.survey_type === 'installation' || sub?.type === 'installation';
  if (sub?.type === 'switch_point') {
    return ['image_url_1', 'image_url_2'];
  }
  if (isInstallation) {
    return ['image_url_1', 'image_url_2', 'image_url_3'];
  }
  return ['image_url_1', 'image_url_2', 'image_url_3'];
};

const normalizeImages = (sub) => {
  if (!Array.isArray(sub?.images) || sub.images.length === 0) return [];
  const keys = getImageKeys(sub);
  return sub.images.map((image, index) => ({
    fieldName: image?.fieldName || keys[index] || `image_url_${index + 1}`,
    slot: image?.slot || (index + 1),
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
            const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Network error';
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
    const isTgpl = String(sub.projectId) === '3';
    let recordUrl = `${API_BASE_URL}/projects/${sub.projectId}/pole-survey/pole`;
    if (sub.type === 'switch_point') {
      recordUrl = `${API_BASE_URL}/projects/${sub.projectId}/pole-survey/switch-point`;
    } else if (sub.type === 'ccms') {
      recordUrl = isTgpl
        ? `${API_BASE_URL}/projects/${sub.projectId}/tgpl-survey/ccms`
        : `${API_BASE_URL}/projects/${sub.projectId}/pole-survey/pole`;
    }

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
      entityId = res.data?.id || res.data?.ccms?.id || res.data?.pole?.id;
      await offlineDb.submissions.update(sub.id, {
        serverEntityId: entityId,
        offlineSubmissionId,
        status: 'syncing',
      });
      console.log(`⏱️ [Sync] ${sub.type} creation: ${(performance.now() - startRecord).toFixed(2)}ms`);
    }

    // Step 2: Upload images one by one
    if (entityId && images.length > 0) {
      // Determine the correct file upload endpoint based on project/type
      const isTgpl = ['3', '4'].includes(String(sub.projectId));
      const fileUploadBase = isTgpl
        ? `${API_BASE_URL}/projects/${sub.projectId}/tgpl-survey/files`
        : `${API_BASE_URL}/projects/${sub.projectId}/pole-survey/files`;
      const fileCheckBase = `${API_BASE_URL}/projects/${sub.projectId}/pole-survey/files`;

      // Check server for already uploaded files to prevent duplicate image uploads on retry
      try {
        const existingFilesRes = await axios.get(
          `${fileCheckBase}?entity_type=${sub.type}&entity_id=${entityId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const serverFiles = Array.isArray(existingFilesRes.data?.files) ? existingFilesRes.data.files : [];
        if (serverFiles.length > 0) {
          // Match server files to our image keys by file_name or position
          const keys = getImageKeys(sub);
          for (const sf of serverFiles) {
            const matchedKey = sf.file_name && keys.includes(sf.file_name) ? sf.file_name : null;
            if (matchedKey) {
              imageUploadStatus[matchedKey] = true;
            }
          }
          // If no file_name match, fall back to positional mapping
          const matchedCount = Object.values(imageUploadStatus).filter(Boolean).length;
          if (matchedCount === 0 && serverFiles.length > 0) {
            keys.slice(0, serverFiles.length).forEach((key) => {
              imageUploadStatus[key] = true;
            });
          }
          await offlineDb.submissions.update(sub.id, { imageUploadStatus });
          this.log('SERVER_FILES_SYNCED', { offlineSubmissionId, entityId, matchedCount: Object.values(imageUploadStatus).filter(Boolean).length });
        }
      } catch (checkErr) {
        console.warn('Could not fetch existing server files for entity:', checkErr.message);
      }

      // Also check the CCMS record's direct image URL columns for already-uploaded images
      if (sub.type === 'ccms' && isTgpl) {
        try {
          const ccmsCheckRes = await axios.get(
            `${API_BASE_URL}/projects/${sub.projectId}/tgpl-survey/ccms/${entityId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          const ccmsRow = ccmsCheckRes.data?.ccms || ccmsCheckRes.data || {};
          if (ccmsRow.bescom_meter_image_url) imageUploadStatus['bescom_meter_image_url'] = true;
          if (ccmsRow.ccms_meter_image_url) imageUploadStatus['ccms_meter_image_url'] = true;
          if (ccmsRow.ccms_box_image_url) imageUploadStatus['ccms_box_image_url'] = true;
          await offlineDb.submissions.update(sub.id, { imageUploadStatus });
          this.log('CCMS_COLUMN_CHECK', { offlineSubmissionId, entityId, imageUploadStatus: { ...imageUploadStatus } });
        } catch (ccmsCheckErr) {
          console.warn('Could not check CCMS record for existing image URLs:', ccmsCheckErr.message);
        }
      }

      let anyImageFailed = false;
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
        formDataUpload.append('field_name', img.fieldName || '');
        formDataUpload.append('slot', img.slot || (i + 1));

        try {
          await axios.post(
            fileUploadBase,
            formDataUpload,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          imageUploadStatus[img.fieldName] = true;
          await offlineDb.submissions.update(sub.id, {
            imageUploadStatus: { ...imageUploadStatus },
            lastUploadedAt: Date.now(),
          });
          this.log('IMAGE_UPLOADED', { offlineSubmissionId, entityId, fieldName: img.fieldName });
          console.log(`⏱️ [Sync] Image ${i + 1} upload: ${(performance.now() - startSingleImage).toFixed(2)}ms`);
        } catch (imgErr) {
          anyImageFailed = true;
          this.log('IMAGE_UPLOAD_FAILED', {
            offlineSubmissionId, entityId, fieldName: img.fieldName,
            error: imgErr.response?.data?.message || imgErr.message,
          });
          console.error(`❌ [Sync] Image ${img.fieldName} upload failed:`, imgErr.message);
          // Continue to try remaining images instead of aborting entirely
        }
      }
      console.log(`⏱️ [Sync] Total images upload: ${(performance.now() - startAllImages).toFixed(2)}ms`);

      // If any image failed, throw to trigger retry rather than marking as synced
      if (anyImageFailed) {
        const failedFields = Object.entries(imageUploadStatus)
          .filter(([, v]) => !v).map(([k]) => k);
        throw new Error(`Image upload incomplete: ${failedFields.join(', ')} failed. Will retry.`);
      }
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
