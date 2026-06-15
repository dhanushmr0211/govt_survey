import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import API_BASE_URL from '../../../config/api';
import { offlineDb } from '../../../db/offlineDb';
import { getCurrentLocation } from '../../../shared/utils/geolocation';
import { useAuthStore } from '../../../store/authStore';
import { InAppCamera } from '../../../shared/components/InAppCamera';
import { Camera } from 'lucide-react';

export const InstallationForm = ({ ward, onBack }) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const activeProject = useAuthStore((state) => state.activeProject);
  const projectId = activeProject?.id || 3;

  const [formData, setFormData] = useState({
    ccms_number: '',
    pole_number: '',
    how_many_lights: '0',
    light_type: '',
    light_capacity: '',
    light_type_2: '',
    light_capacity_2: '',
    light_type_3: '',
    light_capacity_3: '',
    light_type_4: '',
    light_capacity_4: '',
    light_type_5: '',
    light_capacity_5: '',
  });

  const [isCustomCcms, setIsCustomCcms] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [photos, setPhotos] = useState({ image1: null, image2: null });
  const [compressing, setCompressing] = useState({ image1: false, image2: false });
  const [cameraTarget, setCameraTarget] = useState(null);

  const isCompressing = compressing.image1 || compressing.image2;

  // Fetch CCMS list in this ward
  const { data: ccmsList = [], isLoading: isLoadingCcms } = useQuery({
    queryKey: ['ccmsList', ward.id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_BASE_URL}/projects/${projectId}/pole-survey/ccms?ulb_id=${ward.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data.ccms || [];
    },
    enabled: !!ward.id,
  });

  // Autofill latest CCMS
  useEffect(() => {
    if (ccmsList.length > 0) {
      setFormData((prev) => ({
        ...prev,
        ccms_number: ccmsList[0].ccms_number,
      }));
      setIsCustomCcms(false);
    } else {
      setIsCustomCcms(true);
    }
  }, [ccmsList]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCcmsDropdownChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCcms(true);
      setFormData((prev) => ({ ...prev, ccms_number: '' }));
    } else {
      setIsCustomCcms(false);
      setFormData((prev) => ({ ...prev, ccms_number: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!formData.ccms_number) {
      alert('CCMS number is required.');
      return;
    }
    if (!formData.pole_number) {
      alert('Pole number is required.');
      return;
    }

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

    const lightCount = Number(formData.how_many_lights);

    const payload = {
      ward_id: ward.id,
      ward_number: ward.name,
      survey_type: 'installation',
      ccms_number: formData.ccms_number.trim(),
      pole_number: formData.pole_number.trim(),
      how_many_lights_in_pole: formData.how_many_lights,
      latitude: coords.latitude,
      longitude: coords.longitude,
      project_id: projectId,
      created_by: user?.id,
      // Light 1
      light_type: lightCount >= 1 ? formData.light_type : '',
      light_capacity: lightCount >= 1 ? formData.light_capacity : '',
      // Light 2
      light_type_2: lightCount >= 2 ? formData.light_type_2 : '',
      light_capacity_2: lightCount >= 2 ? formData.light_capacity_2 : '',
      // Light 3
      light_type_3: lightCount >= 3 ? formData.light_type_3 : '',
      light_capacity_3: lightCount >= 3 ? formData.light_capacity_3 : '',
      // Light 4
      light_type_4: lightCount >= 4 ? formData.light_type_4 : '',
      light_capacity_4: lightCount >= 4 ? formData.light_capacity_4 : '',
      // Light 5
      light_type_5: lightCount >= 5 ? formData.light_type_5 : '',
      light_capacity_5: lightCount >= 5 ? formData.light_capacity_5 : '',
    };

    const imageFiles = Object.values(photos)
      .filter(Boolean)
      .map(file => ({ file, type: 'pole' }));

    try {
      const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/pole-survey/pole`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const poleId = res.data.id;
      if (poleId && imageFiles.length > 0) {
        setStatusText('Uploading photos...');
        for (let i = 0; i < imageFiles.length; i++) {
          const img = imageFiles[i];
          const formDataUpload = new FormData();
          formDataUpload.append('file', img.file);
          formDataUpload.append('entity_type', 'pole');
          formDataUpload.append('entity_id', poleId);
          await axios.post(
            `${API_BASE_URL}/projects/${projectId}/pole-survey/files`,
            formDataUpload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }

      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['my-stats']);
      alert('Installation pole submitted successfully!');
      
      // Reset images
      setPhotos({ image1: null, image2: null });
      
      // Keep ward/CCMS, reset pole fields
      setFormData((prev) => ({
        ccms_number: prev.ccms_number,
        pole_number: '',
        how_many_lights: '0',
        light_type: '',
        light_capacity: '',
        light_type_2: '',
        light_capacity_2: '',
        light_type_3: '',
        light_capacity_3: '',
        light_type_4: '',
        light_capacity_4: '',
        light_type_5: '',
        light_capacity_5: '',
      }));
    } catch (error) {
      console.error('Error submitting installation:', error);

      // Handle Offline / Network Error
      if (!navigator.onLine || error.code === 'ERR_NETWORK' || !error.response) {
        try {
          await offlineDb.submissions.add({
            type: 'pole',
            data: payload,
            images: imageFiles,
            status: 'pending',
            createdAt: Date.now(),
            projectId,
            ulbId: ward.id,
            wardNumber: ward.name,
          });
          alert('No internet connection. Submission saved locally and will upload automatically when you have signal.');
          
          // Reset images
          setPhotos({ image1: null, image2: null });

          // Keep ward/CCMS, reset pole fields
          setFormData((prev) => ({
            ccms_number: prev.ccms_number,
            pole_number: '',
            how_many_lights: '0',
            light_type: '',
            light_capacity: '',
            light_type_2: '',
            light_capacity_2: '',
            light_type_3: '',
            light_capacity_3: '',
            light_type_4: '',
            light_capacity_4: '',
            light_type_5: '',
            light_capacity_5: '',
          }));
          return;
        } catch (dbErr) {
          console.error('Failed to save offline:', dbErr);
          alert('Failed to save submission locally. Please check your storage.');
        }
      } else {
        alert(error.response?.data?.message || 'Error submitting installation');
      }
    } finally {
      setUploading(false);
      setStatusText('');
    }
  };

  const lightOptions = ['NEW LED', 'OLD LED'];
  const capacityOptions = ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'];

  const renderLightFields = (num) => {
    return (
      <div key={num} className="p-3 border border-gray-100 rounded-lg bg-gray-50/50 space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Light {num} Details</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-xs">Type</label>
            <select
              name={num === 1 ? 'light_type' : `light_type_${num}`}
              value={formData[num === 1 ? 'light_type' : `light_type_${num}`]}
              onChange={handleChange}
              className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Select Type</option>
              {lightOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-xs">Capacity</label>
            <select
              name={num === 1 ? 'light_capacity' : `light_capacity_${num}`}
              value={formData[num === 1 ? 'light_capacity' : `light_capacity_${num}`]}
              onChange={handleChange}
              className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Select Capacity</option>
              {capacityOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 max-h-[72vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-3 mb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Installation Form</h2>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{ward.name}</p>
        </div>
        <button type="button" onClick={onBack} className="text-sm font-semibold text-primary hover:text-primary-dark">Back</button>
      </div>

      <div className="space-y-4 text-sm">
        {/* CCMS Number */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">CCMS Number</label>
          {isLoadingCcms ? (
            <div className="h-9 w-full bg-gray-50 animate-pulse rounded border border-gray-200"></div>
          ) : isCustomCcms ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="ccms_number"
                  placeholder="Enter CCMS Number"
                  value={formData.ccms_number}
                  onChange={handleChange}
                  className="flex-1 p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  required
                />
                {ccmsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCcms(false);
                      if (ccmsList.length > 0) {
                        setFormData((prev) => ({ ...prev, ccms_number: ccmsList[0].ccms_number }));
                      }
                    }}
                    className="px-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-semibold text-gray-600"
                  >
                    Select Existing
                  </button>
                )}
              </div>
            </div>
          ) : (
            <select
              value={formData.ccms_number}
              onChange={handleCcmsDropdownChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium"
              required
            >
              {ccmsList.map((sp) => (
                <option key={sp.id} value={sp.ccms_number}>
                  {sp.ccms_number}
                </option>
              ))}
              <option value="__custom__">+ Enter Custom CCMS Number</option>
            </select>
          )}
        </div>

        {/* Pole Number */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Pole Number</label>
          <input
            type="text"
            name="pole_number"
            placeholder="Enter Pole Number"
            value={formData.pole_number}
            onChange={handleChange}
            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            required
          />
        </div>

        {/* How Many Lights */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">How Many Lights</label>
          <select
            name="how_many_lights"
            value={formData.how_many_lights}
            onChange={handleChange}
            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            required
          >
            {['0', '1', '2', '3', '4', '5'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Dynamic Light Fields */}
        {Number(formData.how_many_lights) > 0 && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {Array.from({ length: Number(formData.how_many_lights) }, (_, i) => i + 1).map((num) =>
              renderLightFields(num)
            )}
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="block text-gray-700 font-semibold mb-1">Photos</label>
          {[1, 2].map((num) => (
            <div key={num} className="border border-gray-200 p-3 rounded-xl flex flex-col gap-1.5 bg-gray-50/30">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Image Slot {num}</span>
              
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
                <span className="text-xs text-amber-600 animate-pulse font-semibold mt-1">Compressing image...</span>
              )}
              {photos[`image${num}`] && !compressing[`image${num}`] && (
                <div className="flex items-center justify-between bg-green-50 border border-green-100 p-2 rounded-lg mt-1">
                  <span className="text-xs text-green-700 truncate font-semibold">Selected: {photos[`image${num}`].name}</span>
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => ({ ...prev, [`image${num}`]: null }))}
                    className="text-red-500 hover:text-red-700 text-xs font-bold ml-2"
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
          className="w-full bg-primary text-white p-3.5 rounded-xl font-bold hover:bg-primary-dark transition-all mt-6 shadow-md shadow-primary/20 disabled:opacity-60 text-sm"
        >
          {statusText ? statusText : uploading ? 'Submitting...' : isCompressing ? 'Compressing image...' : 'Submit Installation'}
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
