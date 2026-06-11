import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Edit2, Save, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import imageCompression from 'browser-image-compression';
import API_BASE_URL from '../../../config/api';
import { isMobileEditRestricted } from '../utils/mobileRestrictions';

const getAutoRoadCategory = (roadType, roadWidthStr) => {
  if (!roadType) return null;
  const typeUpper = roadType.toUpperCase();
  const width = Number(roadWidthStr);

  if (typeUpper.includes('GALLI')) {
    return 'B2';
  }
  if (typeUpper.includes('RESIDENTIAL')) {
    if (!isNaN(width) && width > 0) {
      if (width <= 6) return 'B2';
      if (width === 8) return 'B1';
    }
  }
  if (typeUpper.includes('SUB MAIN')) {
    if (!isNaN(width) && width > 0) {
      if (width <= 8) return 'B1';
      if (width >= 10) return 'A2';
    }
  }
  if (typeUpper.includes('MAIN ROAD') || typeUpper === 'MAIN') {
    return 'A1';
  }
  return null;
};

export const WardDetailsView = ({ projectId, ulb, onBack, date = null, mode = 'exact', fromDate = null, toDate = null }) => {
  const token = localStorage.getItem('token');
  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null); // { type: 'switch_point' | 'pole', data: ... }
  const [selectedCcms, setSelectedCcms] = useState({ id: null, type: 'survey' });
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const [isEditing, setIsEditing] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAutofillUser = new Set([
    'pratheekar1997@gmail.com',
    'sinchudev3@gmail.com',
    'sameershaik99495@gmail.com',
    'usharanik209@gmail.com'
  ]).has((user?.email || '').toLowerCase());
  const activeProject = useAuthStore((state) => state.activeProject);
  const isTgpl = activeProject?.project_type === 'TGPL_SURVEY' || String(activeProject?.id) === '3' || String(projectId) === '3';
  const isIdeck = String(projectId) === '2' || activeProject?.project_type === 'IDECK_SURVEY';
  const canEditGPS = isEditing && isAutofillUser && isIdeck;
  const showDeleteButton = (user?.email || '').toLowerCase() === 'pratheekar1997@gmail.com' || (user?.email || '').toLowerCase() === 'prelectricals01@gmail.com';
  const canEdit = (user?.role === 'MASTER_ADMIN' || activeProject?.section_j) && !(isTgpl && selectedDetail?.type === 'switch_point');
  const [formData, setFormData] = useState({});
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [ulbs, setUlbs] = useState([]);

  useEffect(() => {
    const fetchUlbs = async () => {
      if (!projectId) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/structure`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUlbs(res.data.ulbs || []);
      } catch (err) {
        console.error("Failed to fetch project structure for ULBs:", err);
      }
    };
    fetchUlbs();
  }, [projectId, token]);

  const { data: wards = [], isLoading: isLoadingWards } = useQuery({
    queryKey: ['wardSummary', ulb.ulb_id, date, mode, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (mode) params.append('mode', mode);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/summary/ulbs/${ulb.ulb_id}/wards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.summary || [];
    },
  });

  const { data: details = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ['wardDetails', ulb.ulb_id, selectedWard, date, mode, fromDate, toDate],
    queryFn: async () => {
      if (!selectedWard) return [];
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (mode) params.append('mode', mode);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/summary/ulbs/${ulb.ulb_id}/wards/${selectedWard}/details?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.details || [];
    },
    enabled: !!selectedWard,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isBallari = (ulb?.district_name || '').toLowerCase().includes('ballari');
      const isRestricted = !isTgpl && !isBallari && isMobileEditRestricted();
      const MOBILE_ALLOWED = new Set(['ward_number', 'switch_point_id', 'switch_point_number', 'pole_number', 'road_type', 'road_width']);
      
      let sanitized = { ...formData };
      if (isRestricted) {
        Object.keys(sanitized).forEach((k) => {
          if (!MOBILE_ALLOWED.has(k)) sanitized[k] = '';
        });
      }

      const surveyPath = isTgpl ? 'tgpl-survey' : 'pole-survey';
      const endpoint = selectedDetail.type === 'switch_point'
        ? `${API_BASE_URL}/projects/${projectId}/pole-survey/switch-points/${selectedDetail.data.id}`
        : `${API_BASE_URL}/projects/${projectId}/${surveyPath}/poles/${selectedDetail.data.pole_id || selectedDetail.data.id}`;
      
      const res = await axios.patch(endpoint, sanitized, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['wardDetails']);
      queryClient.invalidateQueries(['wardSummary']);
      queryClient.invalidateQueries(['poles']);
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['user-submissions']);
      addToast('Changes saved successfully!', 'success');
      setIsEditing(false);
      const updatedEntity = data?.switchPoint || data?.pole;
      if (updatedEntity) {
        setSelectedDetail(prev => ({
          ...prev,
          data: {
            ...prev.data,
            ...updatedEntity
          }
        }));
        setFormData(prev => ({
          ...prev,
          ...updatedEntity,
          pole_number: updatedEntity.pole_number || updatedEntity.identifier || prev.pole_number
        }));
      }
    },
    onError: (error) => {
      addToast(error.response?.data?.message || 'Error saving changes', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const type = selectedDetail.type;
      const id = type === 'switch_point' ? selectedDetail.data.id : selectedDetail.data.pole_id;
      const endpoint = isTgpl
        ? `${API_BASE_URL}/projects/${projectId}/tgpl-survey/poles/${id}`
        : `${API_BASE_URL}/projects/${projectId}/pole-survey/submissions/${id}?type=${type}`;
      const res = await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wardDetails']);
      queryClient.invalidateQueries(['wardSummary']);
      addToast('Submission deleted successfully!', 'success');
      setSelectedDetail(null);
      setIsEditing(false);
    },
    onError: (err) => {
      console.error('Delete error:', err);
      addToast(err.response?.data?.message || 'Failed to delete submission', 'error');
    }
  });

  const handleSave = async () => {
    const targetUlbId = formData.ulb_id;
    const targetWard = formData.ward_number;
    const targetSpNum = isTgpl ? formData.ccms_number : formData.switch_point_number;

    const currentUlbId = ulb.ulb_id;
    const currentWard = selectedDetail.data.ward_number;
    const currentSpNum = isTgpl ? selectedDetail.data.ccms_number : selectedDetail.data.switch_point_number;

    const locationChanged =
      Number(targetUlbId) !== Number(currentUlbId) ||
      targetWard !== currentWard ||
      targetSpNum !== currentSpNum;

    if (locationChanged) {
      try {
        const id = selectedDetail.type === 'switch_point' ? selectedDetail.data.id : selectedDetail.data.pole_id;
        const res = await axios.post(
          `${API_BASE_URL}/projects/${projectId}/pole-survey/validate-move`,
          {
            type: selectedDetail.type,
            id: id,
            ulb_id: targetUlbId,
            ward_number: targetWard,
            switch_point_number: targetSpNum,
            ccms_number: isTgpl ? targetSpNum : undefined
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (res.data.shouldWarn) {
          if (!window.confirm(res.data.message)) {
            return;
          }
        }
      } catch (err) {
        console.error("Move validation failed:", err);
        addToast(err.response?.data?.message || 'Move validation failed. Please try again.', 'error');
        return;
      }
    }

    saveMutation.mutate();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Auto-fill rules (only for pratheekar1997@gmail.com)
      if (isAutofillUser) {
        if (name === 'pole_type') {
          if (value === 'RCC' || value === 'PSC') {
            updated.pole_height_mtrs = '9';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'NO';
          } else if (value === 'High Mast') {
            updated.pole_height_mtrs = '16';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
            updated.light_mounting_height = 'high mast';
            updated.light_type = 'high mast';
            updated.light_capacity = '200W';
          } else if (value === 'Mini Mast') {
            updated.pole_height_mtrs = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
            updated.light_mounting_height = 'mini mast';
            updated.light_type = 'mini mast';
            updated.light_capacity = '150W';
          } else if (value === 'Tubular') {
            updated.pole_height_mtrs = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
          } else if (value === 'Spun') {
            updated.pole_height_mtrs = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'NO';
          } else if (value === 'Octoganal') {
            updated.pole_height_mtrs = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
          }
        } else if (name === 'arm_type') {
          if (value === 'empty/not present') {
            updated.arm_status = 'empty/not present';
            updated.present_arm_length_mtrs = '0';
            updated.present_arm_no = '0';
          }
        } else if (name === 'how_many_lights_in_pole') {
          if (value === '0') {
            updated.light_type = 'empty';
            updated.light_capacity = '0W';
            updated.light_type_2 = 'empty';
            updated.light_capacity_2 = '0W';
          } else if (value === '1') {
            updated.light_type_2 = 'empty';
            updated.light_capacity_2 = '0W';
          }
        } else if (name === 'light_type') {
          const valLower = String(value || '').toLowerCase();
          if (valLower === 'led') {
            updated.light_capacity = '40W';
          } else if (valLower === 'cfl') {
            updated.light_capacity = '5W-25W';
          } else if (valLower === 'tube light') {
            updated.light_capacity = '40W';
          } else if (valLower === 'svl') {
            updated.light_capacity = '250W';
          } else if (valLower === 'mini mast') {
            updated.light_capacity = '150W';
          } else if (valLower === 'high mast') {
            updated.light_capacity = '200W';
          } else if (valLower === 'empty') {
            updated.light_capacity = '0W';
          } else if (valLower === 'bulb') {
            updated.light_capacity = '40W';
          }
        } else if (name === 'light_type_2') {
          const valLower = String(value || '').toLowerCase();
          if (valLower === 'led') {
            updated.light_capacity_2 = '40W';
          } else if (valLower === 'cfl') {
            updated.light_capacity_2 = '5W-25W';
          } else if (valLower === 'tube light') {
            updated.light_capacity_2 = '40W';
          } else if (valLower === 'svl') {
            updated.light_capacity_2 = '250W';
          } else if (valLower === 'mini mast') {
            updated.light_capacity_2 = '150W';
          } else if (valLower === 'high mast') {
            updated.light_capacity_2 = '200W';
          } else if (valLower === 'empty') {
            updated.light_capacity_2 = '0W';
          } else if (valLower === 'bulb') {
            updated.light_capacity_2 = '40W';
          }
        }
        if (name === 'road_type' || name === 'road_width_mtrs') {
          const autoCategory = getAutoRoadCategory(updated.road_type, updated.road_width_mtrs);
          if (autoCategory) {
            updated.road_category = autoCategory;
          }
        }
      }
      
      return updated;
    });
  };

  useEffect(() => {
    if (isTgpl && wards.length > 0 && !selectedWard) {
      setSelectedWard(wards[0].ward_number);
    }
  }, [isTgpl, wards, selectedWard]);

  useEffect(() => {
    const fetchImages = async () => {
      if (!selectedDetail) return;
      setLoadingImages(true);
      try {
        const id = selectedDetail.type === 'switch_point' ? selectedDetail.data.id : selectedDetail.data.pole_id;
        const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=${selectedDetail.type}&entity_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setImages(res.data.files || []);
      } catch (err) {
        console.error('Error fetching images:', err);
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, [selectedDetail, projectId, token]);

  const handleDeleteImage = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}/pole-survey/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setImages(prev => prev.filter(img => img.id !== fileId));
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image');
    }
  };

  const handleUploadNewImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Image too large. Please choose a smaller image.");
      return;
    }

    const options = {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.75,
    };

    try {
      console.log(`Original size: ${(file.size / 1024).toFixed(2)} KB`);
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed size: ${(compressedFile.size / 1024).toFixed(2)} KB`);
      
      const fileName = file.name.split('.')[0] + '_compressed.jpg';
      const renamedFile = new File([compressedFile], fileName, { type: 'image/jpeg' });

      const id = selectedDetail.type === 'switch_point' ? selectedDetail.data.id : selectedDetail.data.pole_id;
      
      const formData = new FormData();
      formData.append('file', renamedFile);
      formData.append('entity_type', selectedDetail.type);
      formData.append('entity_id', id);

      await axios.post(`${API_BASE_URL}/projects/${projectId}/pole-survey/files`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refetch images to get the signed URL correctly
      const refreshRes = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=${selectedDetail.type}&entity_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setImages(refreshRes.data.files || []);
      
      alert('Image uploaded successfully!');
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
    }
  };

  const renderField = (label, name, value, options = null) => {
    const isBallari = (ulb?.district_name || '').toLowerCase().includes('ballari');
    const isRestricted = !isTgpl && !isBallari && isMobileEditRestricted();
    const MOBILE_ALLOWED = new Set(['pole_number', 'latitude', 'longitude', 'is_working', 'is_metered', 'remarks']);
    const isDisabled = isRestricted && !MOBILE_ALLOWED.has(name);

    if (!isEditing) {
      return (
        <div>
          <p className="text-gray-500">{label}</p>
          <p className="font-medium">{value || 'N/A'}</p>
        </div>
      );
    }

    if (options) {
      return (
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <select
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
            disabled={isDisabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <input
          type="text"
          name={name}
          value={formData[name] || ''}
          onChange={handleChange}
          disabled={isDisabled}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    );
  };

  // Group details by switch point / CCMS
  const switchPoints = useMemo(() => {
    return details.reduce((acc, item) => {
      const spId = isTgpl ? item.ccms_id : item.switch_point_id;
      if (!spId) return acc;
      if (!acc[spId]) {
        acc[spId] = {
          id: spId,
          switch_point_number: isTgpl ? item.ccms_number : item.switch_point_number,
          switch_point_type: isTgpl ? 'CCMS' : item.switch_point_type,
          meter_exists: item.meter_exists,
          meter_type: item.meter_type,
          meter_rr_number: item.meter_rr_number,
          meter_serial_number: item.meter_serial_number,
          meter_condition: item.meter_condition,
          ward_number: item.ward_number,
          sp_confirmed_by_name: item.sp_confirmed_by_name,
          sp_confirmed_at: item.sp_confirmed_at,
          sp_created_by_name: item.sp_created_by_name,
          sp_created_at: item.sp_created_at,
          latitude: item.sp_latitude,
          longitude: item.sp_longitude,
          poles: [],
        };
      }
      if (item.pole_id) {
        acc[spId].poles.push({
          ...item,
          latitude: item.pole_latitude,
          longitude: item.pole_longitude,
        });
      }
      return acc;
    }, {});
  }, [details, isTgpl]);

  const surveySwitchPoints = useMemo(() => {
    if (!isTgpl) return {};
    return details.reduce((acc, item) => {
      if (item.survey_type === 'installation') return acc;
      const spId = item.ccms_number || 'NO_CCMS';
      if (!acc[spId]) {
        acc[spId] = {
          id: spId,
          switch_point_number: item.ccms_number,
          poles: [],
        };
      }
      if (item.pole_id) {
        acc[spId].poles.push({
          ...item,
          latitude: item.pole_latitude,
          longitude: item.pole_longitude,
        });
      }
      return acc;
    }, {});
  }, [details, isTgpl]);

  const installationSwitchPoints = useMemo(() => {
    if (!isTgpl) return {};
    return details.reduce((acc, item) => {
      if (item.survey_type !== 'installation') return acc;
      const spId = item.ccms_number || 'NO_CCMS';
      if (!acc[spId]) {
        acc[spId] = {
          id: spId,
          switch_point_number: item.ccms_number,
          poles: [],
        };
      }
      if (item.pole_id) {
        acc[spId].poles.push({
          ...item,
          latitude: item.pole_latitude,
          longitude: item.pole_longitude,
        });
      }
      return acc;
    }, {});
  }, [details, isTgpl]);

  useEffect(() => {
    if (isTgpl) {
      const surveyList = Object.values(surveySwitchPoints);
      const instList = Object.values(installationSwitchPoints);
      if (surveyList.length > 0) {
        if (!selectedCcms.id || (selectedCcms.type === 'survey' && !surveySwitchPoints[selectedCcms.id]) || (selectedCcms.type === 'installation' && !installationSwitchPoints[selectedCcms.id])) {
          setSelectedCcms({ id: surveyList[0].id, type: 'survey' });
        }
      } else if (instList.length > 0) {
        if (!selectedCcms.id || (selectedCcms.type === 'survey' && !surveySwitchPoints[selectedCcms.id]) || (selectedCcms.type === 'installation' && !installationSwitchPoints[selectedCcms.id])) {
          setSelectedCcms({ id: instList[0].id, type: 'installation' });
        }
      } else {
        setSelectedCcms({ id: null, type: 'survey' });
      }
    }
  }, [isTgpl, surveySwitchPoints, installationSwitchPoints, selectedCcms]);

  return (
    <div className="premium-panel overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-full p-2 hover:bg-slate-100 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Ward Wise Summary</h2>
            <p className="text-sm text-slate-500">{ulb?.ulb_name || ulb?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* CCMS List (for TGPL) or Ward List (for standard) */}
      <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-4">
        {isTgpl ? (
          isLoadingDetails ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-white"></div>
              ))}
            </div>
          ) : Object.values(surveySwitchPoints).length === 0 && Object.values(installationSwitchPoints).length === 0 ? (
            <div className="py-4 text-center text-slate-500 text-sm">No CCMS units found in this ward.</div>
          ) : (
            <div className="space-y-4">
              {/* Survey Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Survey</h4>
                {Object.values(surveySwitchPoints).length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-2">No survey CCMS units found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {Object.values(surveySwitchPoints).map((sp) => (
                      <button
                        key={sp.id}
                        onClick={() => setSelectedCcms({ id: sp.id, type: 'survey' })}
                        className={`rounded-lg border p-3 text-center transition ${selectedCcms.id === sp.id && selectedCcms.type === 'survey' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <p className="text-xs text-slate-500">CCMS</p>
                        <p className="text-base font-bold truncate max-w-full" title={sp.switch_point_number || 'No CCMS'}>
                          {sp.switch_point_number || 'No CCMS'}
                        </p>
                        <p className="text-xs text-slate-500">{sp.poles.length} Poles</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Installation Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Installation</h4>
                {Object.values(installationSwitchPoints).length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-2">No installation CCMS units found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {Object.values(installationSwitchPoints).map((sp) => (
                      <button
                        key={sp.id}
                        onClick={() => setSelectedCcms({ id: sp.id, type: 'installation' })}
                        className={`rounded-lg border p-3 text-center transition ${selectedCcms.id === sp.id && selectedCcms.type === 'installation' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <p className="text-xs text-slate-500">CCMS</p>
                        <p className="text-base font-bold truncate max-w-full" title={sp.switch_point_number || 'No CCMS'}>
                          {sp.switch_point_number || 'No CCMS'}
                        </p>
                        <p className="text-xs text-slate-500">{sp.poles.length} Poles</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {isLoadingWards ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-white"></div>
              ))
            ) : (
              wards.map((ward) => (
                <button
                  key={ward.ward_number}
                  onClick={() => setSelectedWard(ward.ward_number)}
                  className={`rounded-lg border p-3 text-center transition ${selectedWard === ward.ward_number ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <p className="text-xs text-slate-500">Ward</p>
                  <p className="text-lg font-bold">{ward.ward_number}</p>
                  <p className="text-xs text-slate-500">{ward.total_poles} Poles</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Ward Details */}
      {!selectedWard ? (
        <div className="py-20 text-center text-slate-500">Select a ward to view details</div>
      ) : (
        <div className="p-5">
          {isLoadingDetails ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {isTgpl ? (
                (() => {
                  const sp = selectedCcms.type === 'installation' 
                    ? installationSwitchPoints[selectedCcms.id] 
                    : surveySwitchPoints[selectedCcms.id];
                  if (!sp) {
                    return (
                      <div className="py-20 text-center text-slate-500">
                        {isLoadingDetails ? 'Loading details...' : 'Select a CCMS card to view poles'}
                      </div>
                    );
                  }
                  return (
                    <div key={`${sp.id}_${selectedCcms.type}`} className="rounded-lg border border-slate-150 overflow-hidden mb-6 bg-white shadow-sm">
                      {/* CCMS Header */}
                      <div className="bg-slate-50 p-4 border-b border-slate-150 flex justify-between items-center">
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {selectedCcms.type === 'installation' ? 'CCMS Unit (Installation)' : 'CCMS Unit (Survey)'}
                          </span>
                          <h3 className="text-base font-bold text-slate-950">CCMS No: {sp.switch_point_number || 'No CCMS'}</h3>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="premium-table text-sm">
                          <thead>
                            {selectedCcms.type === 'installation' ? (
                              <tr>
                                <th>Pole No</th>
                                <th>How Many Lights</th>
                                <th>Light 1 Type (Capacity)</th>
                                <th>Light 2 Type (Capacity)</th>
                                <th>Light 3 Type (Capacity)</th>
                                <th>Action</th>
                              </tr>
                            ) : (
                              <tr>
                                <th>Pole No</th>
                                <th>Type</th>
                                <th>DTC No</th>
                                <th>Light 1 Type</th>
                                <th>Light 2 Type</th>
                                <th>Status</th>
                                <th>Action</th>
                              </tr>
                            )}
                          </thead>
                          <tbody>
                            {sp.poles.map((pole) => (
                              <tr key={pole.pole_id}>
                                <td className="font-semibold text-slate-950">{pole.pole_number}</td>
                                {selectedCcms.type === 'installation' ? (
                                  <>
                                    <td>{pole.how_many_lights_in_pole || '0'}</td>
                                    <td>{pole.light_type ? `${pole.light_type} (${pole.light_capacity || 'N/A'})` : 'N/A'}</td>
                                    <td>{pole.light_type_2 ? `${pole.light_type_2} (${pole.light_capacity_2 || 'N/A'})` : 'N/A'}</td>
                                    <td>{pole.light_type_3 ? `${pole.light_type_3} (${pole.light_capacity_3 || 'N/A'})` : 'N/A'}</td>
                                  </>
                                ) : (
                                  <>
                                    <td>{pole.pole_type || 'N/A'}</td>
                                    <td>{pole.dtc_number || 'N/A'}</td>
                                    <td>{pole.light_type || 'N/A'}</td>
                                    <td>{pole.light_type_2 || 'N/A'}</td>
                                    <td>
                                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${pole.light_working_status === 'yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {pole.light_working_status === 'yes' ? 'Working' : 'Not Working'}
                                      </span>
                                    </td>
                                  </>
                                )}
                                <td>
                                  <button 
                                    onClick={() => {
                                      setSelectedDetail({ type: 'pole', data: pole });
                                      setFormData({ 
                                        ...pole,
                                        ulb_id: ulb.ulb_id,
                                        pole_number: pole.pole_number || pole.identifier
                                      });
                                      setIsEditing(false);
                                    }}
                                    className="font-semibold text-primary hover:text-primary-dark"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {sp.poles.length === 0 && (
                              <tr>
                                <td colSpan={selectedCcms.type === 'installation' ? 6 : 7} className="text-center text-slate-500">
                                  No poles under this CCMS.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              ) : (
                Object.values(switchPoints).map((sp) => (
                  <div key={sp.id} className="rounded-lg border border-slate-150 overflow-hidden">
                    {/* Switch Point Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-150 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Switch Point</span>
                        <h3 className="text-base font-bold text-slate-950">SP #{sp.switch_point_number}</h3>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div><span className="text-slate-500">Type:</span> <span className="font-semibold text-slate-700">{sp.switch_point_type || 'N/A'}</span></div>
                        <div><span className="text-slate-500">Meter:</span> <span className="font-semibold text-slate-700">{sp.meter_exists ? 'Yes' : 'No'}</span></div>
                        <button 
                          onClick={() => {
                            setSelectedDetail({ type: 'switch_point', data: sp });
                            setFormData({ 
                              ...sp,
                              ulb_id: ulb.ulb_id
                            });
                            setIsEditing(false);
                          }}
                          className="font-semibold text-primary hover:text-primary-dark"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    {/* Poles Table */}
                    <div className="overflow-x-auto">
                      <table className="premium-table text-sm">
                        <thead>
                          <tr>
                            <th>Pole No</th>
                            <th>Type</th>
                            <th>Condition</th>
                            <th>Light Type</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sp.poles.map((pole) => (
                            <tr key={pole.pole_id}>
                              <td className="font-semibold text-slate-950">{pole.pole_number}</td>
                              <td>{pole.pole_type}</td>
                              <td>{pole.pole_condition}</td>
                              <td>{pole.light_type}</td>
                              <td>
                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${pole.light_working_status === 'yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  {pole.light_working_status === 'yes' ? 'Working' : 'Not Working'}
                                </span>
                              </td>
                              <td>
                                <button 
                                  onClick={() => {
                                    setSelectedDetail({ type: 'pole', data: pole });
                                    setFormData({ 
                                      ...pole,
                                      ulb_id: ulb.ulb_id,
                                      pole_number: pole.pole_number || pole.identifier
                                    });
                                    setIsEditing(false);
                                  }}
                                  className="font-semibold text-primary hover:text-primary-dark"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                          {sp.poles.length === 0 && (
                            <tr><td colSpan="6" className="text-center text-slate-500">No poles under this switch point.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
              {Object.values(switchPoints).length === 0 && (
                <div className="py-10 text-center text-slate-500">
                  {isTgpl ? 'No CCMS units found in this ward.' : 'No switch points found in this ward.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDetail.type === 'switch_point' ? (isTgpl ? 'CCMS Details' : 'Switch Point Details') : 'Pole Details'}
              </h3>
              <div className="flex items-center gap-4">
                {canEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium text-sm"
                  >
                    <Edit2 size={16} />
                    <span>Edit</span>
                  </button>
                )}
                <button onClick={() => { setSelectedDetail(null); setIsEditing(false); }} className="text-gray-500 hover:text-gray-700">Close</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-sm flex-1 overflow-y-auto">
              {/* Left Side: Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Created By</p>
                    <p className="font-semibold text-slate-900">
                      {selectedDetail.type === 'switch_point'
                        ? (selectedDetail.data.sp_created_by_name || selectedDetail.data.user_name || 'N/A')
                        : (selectedDetail.data.pole_created_by_name || selectedDetail.data.user_name || 'N/A')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Created At</p>
                    <p className="font-semibold text-slate-900 text-xs">
                      {(() => {
                        const dateVal = selectedDetail.type === 'switch_point'
                          ? (selectedDetail.data.sp_created_at || selectedDetail.data.created_at)
                          : (selectedDetail.data.pole_created_at || selectedDetail.data.created_at);
                        return dateVal ? new Date(dateVal).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Confirmed By</p>
                    <p className="font-semibold text-slate-900">
                      {selectedDetail.type === 'switch_point'
                        ? (selectedDetail.data.sp_confirmed_by_name || 'N/A')
                        : (selectedDetail.data.pole_confirmed_by_name || 'N/A')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Confirmed At</p>
                    <p className="font-semibold text-slate-900 text-xs">
                      {(() => {
                        const dateVal = selectedDetail.type === 'switch_point'
                          ? selectedDetail.data.sp_confirmed_at
                          : selectedDetail.data.pole_confirmed_at;
                        return dateVal ? new Date(dateVal).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
                      })()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">ULB</p>
                    {isEditing ? (
                      <select
                        name="ulb_id"
                        value={formData.ulb_id || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const selectedUlb = ulbs.find(u => String(u.id) === String(val));
                          setFormData(prev => ({
                            ...prev,
                            ulb_id: val ? Number(val) : '',
                            ulb_name: selectedUlb ? selectedUlb.name : '',
                            ward_id: isTgpl && val ? Number(val) : prev.ward_id,
                            ward_number: isTgpl && selectedUlb ? selectedUlb.name : prev.ward_number
                          }));
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
                      >
                        <option value="">Select ULB...</option>
                        {ulbs.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-semibold text-slate-900">{ulb?.ulb_name || ulb?.name || 'N/A'}</p>
                    )}
                  </div>
                </div>
 
                <div className="border-t pt-2 mt-2">
                  <p className="font-semibold text-gray-700 mb-2">Technical Details</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {selectedDetail.type === 'switch_point' ? (
                      isTgpl ? (
                        <>
                          {renderField('Ward No', 'ward_number', selectedDetail.data.ward_number)}
                          {renderField('CCMS No', 'switch_point_number', selectedDetail.data.switch_point_number)}
                          {renderField('Meter Type', 'meter_type', selectedDetail.data.meter_type, ['1P', '3P'])}
                          {renderField('RR Number', 'meter_rr_number', selectedDetail.data.meter_rr_number)}
                          {renderField('Serial Number', 'meter_serial_number', selectedDetail.data.meter_serial_number)}
                          {renderField('Meter Dim. Status', 'meter_condition', selectedDetail.data.meter_condition, ['Working', 'not working', 'missing', 'door lock', 'no meter'])}
                        </>
                      ) : (
                        <>
                          {renderField('Ward No', 'ward_number', selectedDetail.data.ward_number)}
                          {renderField('Switch Point No', 'switch_point_number', selectedDetail.data.switch_point_number)}
                          {renderField('Type', 'switch_point_type', selectedDetail.data.switch_point_type, ['DP', 'MCB', 'SWITCH', 'HOOK'])}
                          {renderField('Meter Exists', 'meter_exists', selectedDetail.data.meter_exists ? 'Yes' : 'No', ['YES', 'NO'])}
                          {renderField('Meter Type', 'meter_type', selectedDetail.data.meter_type, ['1P', '3P'])}
                          {renderField('RR Number', 'meter_rr_number', selectedDetail.data.meter_rr_number)}
                          {renderField('Serial Number', 'meter_serial_number', selectedDetail.data.meter_serial_number)}
                          {renderField('Meter Condition', 'meter_condition', selectedDetail.data.meter_condition, ['working', 'not working', 'missing'])}
                        </>
                      )
                    ) : isTgpl ? (
                      selectedDetail.data.survey_type === 'installation' ? (
                        <>
                          {renderField('Ward No', 'ward_number', selectedDetail.data.ward_number)}
                          {renderField('CCMS No', 'ccms_number', selectedDetail.data.ccms_number)}
                          {renderField('Pole No', 'pole_number', selectedDetail.data.pole_number)}
                          {renderField('Lights Count', 'how_many_lights_in_pole', selectedDetail.data.how_many_lights_in_pole, ['0', '1', '2', '3', '4', '5'])}
                          {Number(formData.how_many_lights_in_pole || selectedDetail.data.how_many_lights_in_pole) >= 1 && (
                            <>
                              {renderField('Light 1 Type', 'light_type', selectedDetail.data.light_type, ['NEW LED', 'OLD LED'])}
                              {renderField('Light 1 Capacity', 'light_capacity', selectedDetail.data.light_capacity, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                            </>
                          )}
                          {Number(formData.how_many_lights_in_pole || selectedDetail.data.how_many_lights_in_pole) >= 2 && (
                            <>
                              {renderField('Light 2 Type', 'light_type_2', selectedDetail.data.light_type_2, ['NEW LED', 'OLD LED'])}
                              {renderField('Light 2 Capacity', 'light_capacity_2', selectedDetail.data.light_capacity_2, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                            </>
                          )}
                          {Number(formData.how_many_lights_in_pole || selectedDetail.data.how_many_lights_in_pole) >= 3 && (
                            <>
                              {renderField('Light 3 Type', 'light_type_3', selectedDetail.data.light_type_3, ['NEW LED', 'OLD LED'])}
                              {renderField('Light 3 Capacity', 'light_capacity_3', selectedDetail.data.light_capacity_3, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                            </>
                          )}
                          {Number(formData.how_many_lights_in_pole || selectedDetail.data.how_many_lights_in_pole) >= 4 && (
                            <>
                              {renderField('Light 4 Type', 'light_type_4', selectedDetail.data.light_type_4, ['NEW LED', 'OLD LED'])}
                              {renderField('Light 4 Capacity', 'light_capacity_4', selectedDetail.data.light_capacity_4, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                            </>
                          )}
                          {Number(formData.how_many_lights_in_pole || selectedDetail.data.how_many_lights_in_pole) >= 5 && (
                            <>
                              {renderField('Light 5 Type', 'light_type_5', selectedDetail.data.light_type_5, ['NEW LED', 'OLD LED'])}
                              {renderField('Light 5 Capacity', 'light_capacity_5', selectedDetail.data.light_capacity_5, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {renderField('Ward No', 'ward_number', selectedDetail.data.ward_number)}
                          {renderField('DTC No', 'dtc_number', selectedDetail.data.dtc_number)}
                          {renderField('DTC Capacity', 'dtc_capacity', selectedDetail.data.dtc_capacity)}
                          {renderField('CCMS No', 'ccms_number', selectedDetail.data.ccms_number)}
                          {renderField('Meter Type', 'meter_type', selectedDetail.data.meter_type, ['1P', '3P'])}
                          {renderField('RR Number', 'meter_rr_number', selectedDetail.data.meter_rr_number)}
                          {renderField('Serial Number', 'meter_serial_number', selectedDetail.data.meter_serial_number)}
                          {renderField('Meter Dim. Status', 'meter_dimensional_status', selectedDetail.data.meter_dimensional_status, ['Working', 'not working', 'missing', 'door lock', 'no meter'])}
                          {renderField('Conductor Type', 'conductor_type', selectedDetail.data.conductor_type, ['ABC', 'ACSR', 'UG'])}
                          {renderField('Pole No', 'pole_number', selectedDetail.data.pole_number)}
                          {renderField('Pole Type', 'pole_type', selectedDetail.data.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                          {renderField('Height', 'pole_height', selectedDetail.data.pole_height, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                          {renderField('Distance', 'pole_to_pole_distance', selectedDetail.data.pole_to_pole_distance, ['10', '20', '25', '30'])}
                          {renderField('ARM Type', 'arm_type', selectedDetail.data.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                          {renderField('ARM Status', 'arm_status', selectedDetail.data.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                          {renderField('Present ARM No', 'present_arm_no', selectedDetail.data.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                          {renderField('Present ARM Length', 'present_arm_length', selectedDetail.data.present_arm_length, ['0', '1', '1.5', '2', '2.5'])}
                          {renderField('Lights Count', 'how_many_lights_in_pole', selectedDetail.data.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                          {renderField('Mounting Height', 'light_mounting_height', selectedDetail.data.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                          {renderField('Light 1 Type', 'light_type', selectedDetail.data.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                          {renderField('Light 1 Capacity', 'light_capacity', selectedDetail.data.light_capacity, ['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'])}
                          {renderField('Light 2 Type', 'light_type_2', selectedDetail.data.light_type_2, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                          {renderField('Light 2 Capacity', 'light_capacity_2', selectedDetail.data.light_capacity_2, ['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'])}
                          {renderField('Working', 'light_working_status', selectedDetail.data.light_working_status, ['yes', 'no'])}
                          {renderField('Road Cat', 'road_category', selectedDetail.data.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                          {renderField('Road Type', 'road_type', selectedDetail.data.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                          {renderField('Road Width', 'road_width_mtrs', selectedDetail.data.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '10', '12', '16', '18', '20', '24', '25', '30'])}
                          {renderField('Earthing', 'pole_earthing_exists', selectedDetail.data.pole_earthing_exists, ['YES', 'NO'])}
                          
                          <div className="col-span-3 border-t pt-2 mt-2 font-semibold text-gray-700">Proposal Form</div>
                          {renderField('Req ARM No', 'req_arm_number', selectedDetail.data.req_arm_number, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])}
                          {renderField('Req ARM Length', 'req_arm_length', selectedDetail.data.req_arm_length, ['0', '1.0', '1.5', '2', '2.5'])}
                          {renderField('Req LED Lights No', 'req_led_lights_no', selectedDetail.data.req_led_lights_no, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])}
                          {renderField('Req LED Wattage', 'req_led_wattage', selectedDetail.data.req_led_wattage, ['400W', '250W', '200W', '150W', '120W', '90W', '65W', '40W', '5-25W', '0W'])}
                          {renderField('Req Dedicated Wire', 'req_dedicated_wire', selectedDetail.data.req_dedicated_wire, ['yes', 'no'])}
                        </>
                      )
                    ) : (
                      <>
                        {renderField('Ward No', 'ward_number', selectedDetail.data.ward_number)}
                        {renderField('Switch Point No', 'switch_point_number', selectedDetail.data.switch_point_number)}
                        {renderField('Conductor Type', 'conductor_type', selectedDetail.data.conductor_type, ['ABC', 'ACSR', 'UG'])}
                        {renderField('Pole No', 'pole_number', selectedDetail.data.pole_number)}
                        {renderField('Pole Type', 'pole_type', selectedDetail.data.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                        {renderField('Height', 'pole_height_mtrs', selectedDetail.data.pole_height_mtrs, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Condition', 'pole_condition', selectedDetail.data.pole_condition, ['Good', 'defective', 'missing'])}
                        {renderField('Distance', 'pole_to_pole_distance_mtrs', selectedDetail.data.pole_to_pole_distance_mtrs, ['10', '20', '25', '30'])}
                        {renderField('ARM Type', 'arm_type', selectedDetail.data.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                        {renderField('ARM Status', 'arm_status', selectedDetail.data.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                        {renderField('Present ARM No', 'present_arm_no', selectedDetail.data.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                        {renderField('Present ARM Length', 'present_arm_length_mtrs', selectedDetail.data.present_arm_length_mtrs, ['0', '1', '1.5', '2', '2.5'])}
                        {renderField('Lights Count', 'how_many_lights_in_pole', selectedDetail.data.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                        {renderField('Mounting Height', 'light_mounting_height', selectedDetail.data.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                        {renderField('Light 1 Type', 'light_type', selectedDetail.data.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                        {renderField('Light 1 Capacity', 'light_capacity', selectedDetail.data.light_capacity, ['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'])}
                        {renderField('Light 2 Type', 'light_type_2', selectedDetail.data.light_type_2, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                        {renderField('Light 2 Capacity', 'light_capacity_2', selectedDetail.data.light_capacity_2, ['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'])}
                        {renderField('Working', 'light_working_status', selectedDetail.data.light_working_status, ['yes', 'no'])}
                        {renderField('Road Cat', 'road_category', selectedDetail.data.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                        {renderField('Road Type', 'road_type', selectedDetail.data.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                        {renderField('Road Width', 'road_width_mtrs', selectedDetail.data.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '10', '12', '16', '18', '20', '24', '25', '30'])}
                        {renderField('Earthing', 'pole_earthing_exists', selectedDetail.data.pole_earthing_exists, ['YES', 'NO'])}
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <p className="font-semibold text-gray-700 mb-2">GPS Coordinates</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500 text-xs">Latitude</p>
                      {canEditGPS ? (
                        <input
                          type="text"
                          name="latitude"
                          value={formData.latitude || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
                        />
                      ) : (
                        <p className="font-medium text-sm">{selectedDetail.data.latitude || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Longitude</p>
                      {canEditGPS ? (
                        <input
                          type="text"
                          name="longitude"
                          value={formData.longitude || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
                        />
                      ) : (
                        <p className="font-medium text-sm">{selectedDetail.data.longitude || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                  {selectedDetail.data.latitude && selectedDetail.data.longitude && (
                    <div className="mt-3">
                      <a
                        href={`https://www.google.com/maps?q=${selectedDetail.data.latitude},${selectedDetail.data.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-all justify-center shadow-sm"
                      >
                        📍 Open in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {/* Right Side: Images */}
              <div className="space-y-2">
                <p className="font-semibold text-gray-700">Images</p>
                {loadingImages ? (
                  <div className="bg-gray-50 h-64 flex items-center justify-center text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                    <p>Loading images...</p>
                  </div>
                ) : images.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {images.map((img) => (
                      <div key={img.id} className="border border-gray-100 rounded-lg overflow-hidden relative">
                        <img
                          src={img.signed_url}
                          alt="Survey"
                          className="w-full h-auto object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/400x300?text=Failed+to+Load';
                          }}
                        />
                        <p className="text-xs text-gray-400 p-1 text-center">{new Date(img.uploaded_at).toLocaleString()}</p>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 shadow-lg"
                            title="Delete Image"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 h-64 flex items-center justify-center text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-1">No images found for this submission.</p>
                    </div>
                  </div>
                )}

                {/* Upload New Photo (Only in Edit Mode) */}
                {isEditing && (
                  <div className="border-2 border-dashed border-primary/30 p-4 rounded-lg bg-primary/5 text-center mt-2">
                    <p className="text-xs font-medium text-primary mb-2">Upload New Photo (Gallery)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadNewImage}
                      className="text-xs"
                    />
                    <p className="text-xs text-gray-400 mt-1">Will be compressed automatically</p>
                  </div>
                )}
              </div>
            </div>
              
            <div className="flex justify-end gap-2 mt-6 border-t pt-4">
              {showDeleteButton && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this submission?')) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-semibold mr-auto"
                >
                  <Trash2 size={16} />
                  <span>{deleteMutation.isLoading ? 'Deleting...' : 'Delete Submission'}</span>
                </button>
              )}
              <button
                onClick={() => { setSelectedDetail(null); setIsEditing(false); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-semibold"
              >
                Cancel
              </button>
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
                >
                  <Save size={16} />
                  <span>{saveMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
