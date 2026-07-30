import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import API_BASE_URL from '../../../config/api';
import { offlineDb } from '../../../db/offlineDb';
import { offlineSyncService } from '../services/offlineSyncService';
import { getCurrentLocation } from '../../../shared/utils/geolocation';
import { InAppCamera } from '../../../shared/components/InAppCamera';
import { Camera } from 'lucide-react';

export const SwitchPointForm = ({ ulb, onBack }) => {
  const queryClient = useQueryClient();
  const isBallari = (ulb?.district_name || '').toLowerCase().includes('ballari');
  const [formData, setFormData] = useState({
    ward_number: '',
    switch_point_number: '',
    switch_point_type: '',
    meter_exists: '',
    meter_type: '',
    meter_rr_number: '',
    meter_serial_number: '',
    meter_condition: '',
  });
  const [photos, setPhotos] = useState({ image1: null, image2: null });
  const [compressing, setCompressing] = useState({ image1: false, image2: false });
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [cameraTarget, setCameraTarget] = useState(null);

  const isCompressing = compressing.image1 || compressing.image2;

  const createOfflineSubmissionId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const buildImageFiles = () => Object.entries(photos)
    .filter(([, file]) => Boolean(file))
    .map(([fieldName, file]) => ({ fieldName, file, type: 'switch_point' }));

  const buildInitialImageStatus = (imageFiles) => imageFiles.reduce((acc, image) => {
    acc[image.fieldName] = false;
    return acc;
  }, {});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const projectId = 2;
    setUploading(true);
    setStatusText('Capturing GPS location...');

    let coords;
    try {
      coords = await getCurrentLocation();
    } catch (err) {
      console.error('GPS error:', err);
      alert(err.message || 'Failed to capture GPS location. Please check location permissions.');
      setUploading(false);
      setStatusText('');
      return;
    }

    setStatusText('Submitting...');

    // Ballari District: Images are compulsory
    if (isBallari) {
      const hasImages = Object.values(photos).some(Boolean);
      if (!hasImages) {
        alert('Please capture at least one photo for this switch point (compulsory for Ballari district).');
        setUploading(false);
        setStatusText('');
        return;
      }
    }

    const isMeterYes = formData.meter_exists === 'yes';
    const offlineSubmissionId = createOfflineSubmissionId();
    const payload = {
      ...formData,
      ulb_id: ulb.id,
      meter_exists: isMeterYes,
      meter_type: isMeterYes ? formData.meter_type : null,
      meter_condition: isMeterYes ? formData.meter_condition : null,
      meter_rr_number: isMeterYes ? formData.meter_rr_number : null,
      meter_serial_number: isMeterYes ? formData.meter_serial_number : null,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    const imageFiles = buildImageFiles();
    const localRowPayload = {
      type: 'switch_point',
      offlineSubmissionId,
      data: { ...payload, offline_submission_id: offlineSubmissionId },
      images: imageFiles,
      imageUploadStatus: buildInitialImageStatus(imageFiles),
      status: 'pending',
      retryCount: 0,
      lastRetryAt: null,
      lastError: null,
      errorMessage: null,
      serverEntityId: null,
      uploadedImageCount: 0,
      createdAt: Date.now(),
      syncedAt: null,
      projectId,
      ulbId: ulb.id,
      wardNumber: formData.ward_number
    };
    const offlineRowId = await offlineDb.submissions.add(localRowPayload);

    try {
      // Step 1: Create the switch point record
      const startTotal = performance.now();
      const startRecord = performance.now();
      const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/pole-survey/switch-point`, {
        ...payload,
        offline_submission_id: offlineSubmissionId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`⏱️ Switch Point record creation: ${(performance.now() - startRecord).toFixed(2)}ms`);

      const switchPointId = res.data.id;
      await offlineDb.submissions.update(offlineRowId, {
        status: 'syncing',
        serverEntityId: switchPointId,
        lastRetryAt: Date.now(),
        lastError: null,
        errorMessage: null,
      });

      // Step 2: Upload selected photos to Cloud Storage
      if (switchPointId && imageFiles.length > 0) {
        const imageStatus = { ...localRowPayload.imageUploadStatus };
        const startAllImages = performance.now();
        for (let i = 0; i < imageFiles.length; i++) {
          const img = imageFiles[i];
          const startSingleImage = performance.now();
          const formDataUpload = new FormData();
          formDataUpload.append('file', img.file);
          formDataUpload.append('entity_type', 'switch_point');
          formDataUpload.append('entity_id', switchPointId);
          await axios.post(
            `${API_BASE_URL}/projects/${projectId}/pole-survey/files`,
            formDataUpload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          imageStatus[img.fieldName] = true;
          await offlineDb.submissions.update(offlineRowId, {
            imageUploadStatus: imageStatus,
            lastUploadedAt: Date.now(),
          });
          console.log(`⏱️ Image ${i + 1} upload: ${(performance.now() - startSingleImage).toFixed(2)}ms`);
        }
        console.log(`⏱️ Total images upload (${imageFiles.length}): ${(performance.now() - startAllImages).toFixed(2)}ms`);
      }

      await offlineDb.submissions.update(offlineRowId, {
        status: 'synced',
        syncedAt: Date.now(),
        lastError: null,
        errorMessage: null,
      });
      await offlineSyncService.cleanupSyncedRows();

      console.log(`🚀 Total submission time: ${(performance.now() - startTotal).toFixed(2)}ms`);
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['my-stats']);
      alert('Switch Point submitted successfully!');
      onBack();
    } catch (error) {
      console.error('Error creating switch point:', error);

      await offlineDb.submissions.update(offlineRowId, {
        status: 'failed',
        retryCount: 1,
        lastRetryAt: Date.now(),
        lastError: error.response?.data?.message || error.message || 'Error creating switch point',
        errorMessage: error.response?.data?.message || error.message || 'Error creating switch point',
      });
      alert(!navigator.onLine || error.code === 'ERR_NETWORK' || !error.response
        ? 'No internet connection. Submission saved locally and will upload automatically when you have signal.'
        : (error.response?.data?.message || 'Error creating switch point'));
      if (!navigator.onLine || error.code === 'ERR_NETWORK' || !error.response) {
        onBack();
      }
    } finally {
      setUploading(false);
      setStatusText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Create Switch Point</h2>
        <button type="button" onClick={onBack} className="text-sm text-gray-500">Back</button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Ward Number</label>
          <input type="text" name="ward_number" value={formData.ward_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-1">Switch Point Number</label>
          <input type="text" name="switch_point_number" value={formData.switch_point_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-1">Switch Point Type</label>
          <select name="switch_point_type" value={formData.switch_point_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select Type</option>
            <option value="DP">DP</option>
            <option value="MCB">MCB</option>
            <option value="SWITCH">SWITCH</option>
            <option value="HOOK">HOOK</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-1">Does Meter Exist?</label>
          <select name="meter_exists" value={formData.meter_exists} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        
        {formData.meter_exists === 'yes' && (
          <>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Type</label>
              <select name="meter_type" value={formData.meter_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
                <option value="">Select Meter Type</option>
                <option value="1P">1P</option>
                <option value="3P">3P</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter RR Number</label>
              <input type="text" name="meter_rr_number" value={formData.meter_rr_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Serial Number</label>
              <input type="text" name="meter_serial_number" value={formData.meter_serial_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Condition</label>
              <select name="meter_condition" value={formData.meter_condition} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
                <option value="">Select Condition</option>
                <option value="working">Working</option>
                <option value="not working">Not Working</option>
                <option value="missing">Missing</option>
              </select>
            </div>
          </>
        )}

         <div className="space-y-2">
           <label className="block text-gray-700 font-medium mb-1">Photos {isBallari && '(Compulsory)'}</label>
           
           {[1, 2].map((num) => (
             <div key={num} className="border border-gray-200 p-2 rounded flex flex-col gap-1.5">
               <span className="text-sm font-medium text-gray-600">Image Slot {num}</span>
               
               <div className="flex flex-wrap items-center gap-2 mt-1">
                 <button
                   type="button"
                   onClick={() => setCameraTarget(num)}
                   className="bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                 >
                   <Camera size={14} /> Take Photo
                 </button>
               </div>

               {compressing[`image${num}`] && (
                 <span className="text-xs text-amber-600 animate-pulse font-medium">Compressing image...</span>
               )}
               {photos[`image${num}`] && !compressing[`image${num}`] && (
                 <div className="flex items-center justify-between bg-green-50 border border-green-100 p-1.5 rounded mt-1">
                   <span className="text-xs text-green-700 truncate font-medium">Selected: {photos[`image${num}`].name}</span>
                   <button
                     type="button"
                     onClick={() => setPhotos(prev => ({ ...prev, [`image${num}`]: null }))}
                     className="text-red-500 hover:text-red-700 text-xs font-semibold ml-2"
                   >
                     ✕
                   </button>
                 </div>
               )}
             </div>
           ))}
         </div>

         <button
           type="submit"
           disabled={uploading || isCompressing}
           className="w-full bg-primary text-white p-3 rounded-lg font-medium hover:bg-primary-dark transition-colors mt-4 disabled:opacity-60"
         >
           {statusText ? statusText : uploading ? 'Submitting...' : isCompressing ? 'Compressing image...' : 'Submit Switch Point'}
         </button>
       </div>

       {cameraTarget && (
         <InAppCamera
           onClose={() => setCameraTarget(null)}
           onCapture={async (file) => {
             const num = cameraTarget;
             setCameraTarget(null);
             if (!file) return;

             setCompressing(prev => ({ ...prev, [`image${num}`]: true }));
             
             const options = {
               maxSizeMB: 0.4,
               maxWidthOrHeight: 1600,
               useWebWorker: true,
               fileType: 'image/jpeg',
               initialQuality: 0.75,
             };

             try {
               console.log(`Original size from camera for Slot ${num}: ${(file.size / 1024).toFixed(2)} KB`);
               const compressedFile = await imageCompression(file, options);
               console.log(`Compressed size from camera for Slot ${num}: ${(compressedFile.size / 1024).toFixed(2)} KB`);
               
               const fileName = `camera_slot_${num}_${Date.now()}_compressed.jpg`;
               const renamedFile = new File([compressedFile], fileName, { type: 'image/jpeg' });
               
               setPhotos(prev => ({ ...prev, [`image${num}`]: renamedFile }));
             } catch (error) {
               console.error(`Compression error for Slot ${num}:`, error);
               alert(`Failed to compress image in Slot ${num}. Using original.`);
               setPhotos(prev => ({ ...prev, [`image${num}`]: file }));
             } finally {
               setCompressing(prev => ({ ...prev, [`image${num}`]: false }));
             }
           }}
         />
       )}
     </form>
  );
};
