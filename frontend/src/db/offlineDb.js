import Dexie from 'dexie';

export const offlineDb = new Dexie('PRElectricalsOfflineDB');

offlineDb.version(1).stores({
  submissions: '++id, type, status, createdAt, projectId, ulbId, wardNumber'
});

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const inferImageKeys = (submission) => {
  const explicitKeys = submission?.images?.map((image, index) => image?.fieldName || image?.slot || image?.imageFieldName).filter(Boolean);
  if (explicitKeys && explicitKeys.length > 0) {
    return explicitKeys;
  }

  const isInstallation = submission?.data?.survey_type === 'installation';
  if (submission?.type === 'switch_point') {
    return ['image_url_1', 'image_url_2'];
  }
  if (isInstallation) {
    return ['image_url_1', 'image_url_2'];
  }
  return ['image_url_1', 'image_url_2', 'image_url_3'];
};

const buildImageStatus = (submission) => {
  const keys = inferImageKeys(submission);
  const status = {};
  keys.forEach((key, index) => {
    status[key] = Boolean(submission?.uploadedImageCount && index < Number(submission.uploadedImageCount));
  });
  if (submission?.imageUploadStatus && typeof submission.imageUploadStatus === 'object') {
    return { ...status, ...submission.imageUploadStatus };
  }
  return status;
};

offlineDb.version(2).stores({
  submissions: '++id, &offlineSubmissionId, type, status, createdAt, syncedAt, projectId, ulbId, wardNumber'
}).upgrade(async (tx) => {
  await tx.table('submissions').toCollection().modify((submission) => {
    submission.offlineSubmissionId = submission.offlineSubmissionId || randomId();
    submission.serverEntityId = submission.serverEntityId || null;
    submission.imageUploadStatus = buildImageStatus(submission);
    submission.retryCount = Number(submission.retryCount || 0);
    submission.lastRetryAt = submission.lastRetryAt || null;
    submission.lastError = submission.lastError || submission.errorMessage || null;
    submission.errorMessage = submission.errorMessage || null;
    submission.syncedAt = submission.syncedAt || null;
    submission.uploadedImageCount = Number(submission.uploadedImageCount || 0);
  });
});

/**
 * Submissions table schema:
 * - id: auto-increment
 * - offlineSubmissionId: globally unique UUID for idempotent backend retries
 * - type: 'pole' | 'switch_point'
 * - data: object (all form fields)
 * - images: array of { file: Blob, type: string }
 * - status: 'pending' | 'syncing' | 'failed'
 * - errorMessage: string (optional)
 * - lastError: string (optional)
 * - retryCount: number
 * - lastRetryAt: timestamp (optional)
 * - serverEntityId: number (optional)
 * - imageUploadStatus: object keyed by image_url_1/image_url_2/image_url_3 (or equivalent)
 * - createdAt: timestamp
 * - syncedAt: timestamp (optional)
 * - projectId: number
 * - ulbId: number
 * - wardNumber: string
 */
