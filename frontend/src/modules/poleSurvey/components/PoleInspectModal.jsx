import { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Edit2, Save, Trash2 } from 'lucide-react';
import { confirmPole } from '../services/poleSurveyService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
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

export const PoleInspectModal = ({ pole: initialPole, onClose, onSuccess }) => {
  const [pole, setPole] = useState(initialPole);
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const [isEditing, setIsEditing] = useState(false);
  const isAutofillUser = (user?.email || '').toLowerCase() === 'pratheekar1997@gmail.com' || (user?.email || '').toLowerCase() === 'pratheekar1997gmail.com';
  const activeProject = useAuthStore((state) => state.activeProject);
  const projectId = activeProject?.id;
  const isTgpl = activeProject?.project_type === 'TGPL_SURVEY' || String(activeProject?.id) === '3';
  const isIdeck = String(projectId) === '2' || activeProject?.project_type === 'IDECK_SURVEY';
  const canEditGPS = isEditing && isAutofillUser && isIdeck;
  const canEdit = user?.role === 'MASTER_ADMIN' || 
    (activeProject?.section_i && pole?.status === 'pending') || 
    (activeProject?.section_j && pole?.status === 'confirmed');
  const [formData, setFormData] = useState({
    ...initialPole,
    pole_number: initialPole.pole_number || initialPole.identifier
  });
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [ulbs, setUlbs] = useState([]);

  useEffect(() => {
    const fetchUlbs = async () => {
      if (!projectId) return;
      try {
        const token = useAuthStore.getState().token || localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/structure`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUlbs(data.ulbs || []);
        }
      } catch (err) {
        console.error("Failed to fetch project structure for ULBs:", err);
      }
    };
    fetchUlbs();
  }, [projectId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPole(initialPole);
      setFormData({
        ...initialPole,
        ulb_id: initialPole.ulb_id || ulbs.find(u => u.name === initialPole.ulb_name)?.id || '',
        pole_number: initialPole.pole_number || initialPole.identifier
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [initialPole, ulbs]);

  useEffect(() => {
    if (!projectId || !pole.id) return;
    const fetchImages = async () => {
      setLoadingImages(true);
      try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=pole&entity_id=${pole.id}`, {
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch images');
        const data = await response.json();
        setImages(data.files || []);
      } catch (err) {
        console.error('Error fetching images:', err);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, [pole.id, projectId]);

  const showDeleteButton = (user?.email || '').toLowerCase() === 'pratheekar1997@gmail.com' || (user?.email || '').toLowerCase() === 'prelectricals01@gmail.com';

  const confirmMutation = useMutation({
    mutationFn: () => confirmPole(projectId, pole.id),
    onSuccess: () => {
      onSuccess();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isTgpl
        ? `${API_BASE_URL}/projects/${projectId}/tgpl-survey/poles/${pole.id}`
        : `${API_BASE_URL}/projects/${projectId}/pole-survey/submissions/${pole.id}?type=pole`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token || localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to delete submission');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['poles']);
      queryClient.invalidateQueries(['submissions']);
      onSuccess();
    },
    onError: (err) => {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete submission');
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isBallari = (pole?.district_name || '').toLowerCase().includes('ballari');
      const isRestricted = !isTgpl && !isBallari && isMobileEditRestricted();
      const MOBILE_ALLOWED = new Set(['ward_number', 'switch_point_id', 'switch_point_number', 'pole_number', 'road_type', 'road_width']);
      
      let sanitized = { ...formData };
      if (isRestricted) {
        Object.keys(sanitized).forEach((k) => {
          if (!MOBILE_ALLOWED.has(k)) sanitized[k] = '';
        });
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/pole-survey/poles/${pole.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify(sanitized)
      });
      if (!response.ok) throw new Error('Failed to save changes');
      return response.json();
    },
    onSuccess: (data) => {
      setIsEditing(false);
      const updatedEntity = data?.pole;
      if (updatedEntity) {
        setPole(prev => ({
          ...prev,
          ...updatedEntity
        }));
        setFormData(prev => ({
          ...prev,
          ...updatedEntity,
          pole_number: updatedEntity.pole_number || updatedEntity.identifier || prev.pole_number
        }));
      }
      queryClient.invalidateQueries(['poles']);
    },
  });

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

  const renderField = (label, name, value, options = null) => {
    const isBallari = (pole?.district_name || '').toLowerCase().includes('ballari');
    const isRestricted = !isTgpl && !isBallari && isMobileEditRestricted();
    const MOBILE_ALLOWED = new Set(['pole_number', 'latitude', 'longitude', 'is_working', 'is_metered', 'remarks']);
    const isDisabled = isRestricted && !MOBILE_ALLOWED.has(name);

    if (!isEditing) {
      return (
        <div>
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">{label}</p>
          <p className="font-semibold text-slate-900">{value || 'N/A'}</p>
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Inspect Pole
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
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm flex-1 overflow-y-auto pr-1">
          {/* Left Side: Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Created By</p>
                <p className="font-semibold text-slate-900">{pole.user_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Created At</p>
                <p className="font-semibold text-slate-900 text-xs">
                  {pole.created_at ? new Date(pole.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Confirmed By</p>
                <p className="font-semibold text-slate-900">{pole.confirmed_by_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Confirmed At</p>
                <p className="font-semibold text-slate-900 text-xs">
                  {pole.confirmed_at ? new Date(pole.confirmed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Ward Number</p>
                <p className="font-semibold text-slate-900">{pole.ward_number}</p>
              </div>
              <div>
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
                  <p className="font-semibold text-slate-900">{pole.ulb_name || 'N/A'}</p>
                )}
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Identifier</p>
                <p className="font-semibold text-slate-900">{pole.pole_number || pole.identifier || 'N/A'}</p>
              </div>
            </div>

            <div className="border-t pt-2 mt-2">
              <p className="font-semibold text-gray-700 mb-2">Technical Details</p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {isTgpl && pole.survey_type === 'installation' ? (
                  <>
                    {renderField('Ward No', 'ward_number', pole.ward_number)}
                    {renderField('CCMS No', 'ccms_number', pole.ccms_number)}
                    {renderField('Pole No', 'pole_number', pole.pole_number)}
                    {renderField('Lights Count', 'how_many_lights_in_pole', pole.how_many_lights_in_pole, Array.from({length: 6}, (_, i) => String(i)))}
                    {Number(formData.how_many_lights_in_pole || pole.how_many_lights_in_pole || 0) >= 1 && (
                      <>
                        {renderField('Light 1 Type', 'light_type', pole.light_type, ['NEW LED', 'OLD LED'])}
                        {renderField('Light 1 Capacity', 'light_capacity', pole.light_capacity, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                      </>
                    )}
                    {Number(formData.how_many_lights_in_pole || pole.how_many_lights_in_pole || 0) >= 2 && (
                      <>
                        {renderField('Light 2 Type', 'light_type_2', pole.light_type_2, ['NEW LED', 'OLD LED'])}
                        {renderField('Light 2 Capacity', 'light_capacity_2', pole.light_capacity_2, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                      </>
                    )}
                    {Number(formData.how_many_lights_in_pole || pole.how_many_lights_in_pole || 0) >= 3 && (
                      <>
                        {renderField('Light 3 Type', 'light_type_3', pole.light_type_3, ['NEW LED', 'OLD LED'])}
                        {renderField('Light 3 Capacity', 'light_capacity_3', pole.light_capacity_3, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                      </>
                    )}
                    {Number(formData.how_many_lights_in_pole || pole.how_many_lights_in_pole || 0) >= 4 && (
                      <>
                        {renderField('Light 4 Type', 'light_type_4', pole.light_type_4, ['NEW LED', 'OLD LED'])}
                        {renderField('Light 4 Capacity', 'light_capacity_4', pole.light_capacity_4, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                      </>
                    )}
                    {Number(formData.how_many_lights_in_pole || pole.how_many_lights_in_pole || 0) >= 5 && (
                      <>
                        {renderField('Light 5 Type', 'light_type_5', pole.light_type_5, ['NEW LED', 'OLD LED'])}
                        {renderField('Light 5 Capacity', 'light_capacity_5', pole.light_capacity_5, ['40 W', '65 W', '90 W', '100 W', '150 W', '200 W', '240 W'])}
                      </>
                    )}
                  </>
                ) : isTgpl ? (
                  <>
                    {renderField('Ward No', 'ward_number', pole.ward_number)}
                    {renderField('DTC No', 'dtc_number', pole.dtc_number)}
                    {renderField('DTC Capacity', 'dtc_capacity', pole.dtc_capacity)}
                    {renderField('CCMS No', 'ccms_number', pole.ccms_number)}
                    {renderField('Meter Type', 'meter_type', pole.meter_type, ['1P', '3P'])}
                    {renderField('RR Number', 'meter_rr_number', pole.meter_rr_number)}
                    {renderField('Serial Number', 'meter_serial_number', pole.meter_serial_number)}
                    {renderField('Meter Dim. Status', 'meter_dimensional_status', pole.meter_dimensional_status, ['Working', 'not working', 'missing', 'door lock', 'no meter'])}
                    {renderField('Conductor Type', 'conductor_type', pole.conductor_type, ['ABC', 'ACSR', 'UG'])}
                    {renderField('Pole No', 'pole_number', pole.pole_number)}
                    {renderField('Pole Type', 'pole_type', pole.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                    {renderField('Height', 'pole_height', pole.pole_height, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                    {renderField('Distance', 'pole_to_pole_distance', pole.pole_to_pole_distance, ['10', '20', '25', '30'])}
                    {renderField('ARM Type', 'arm_type', pole.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                    {renderField('ARM Status', 'arm_status', pole.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                    {renderField('Present ARM No', 'present_arm_no', pole.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                    {renderField('Present ARM Length', 'present_arm_length', pole.present_arm_length, ['0', '1', '1.5', '2', '2.5'])}
                    {renderField('Lights Count', 'how_many_lights_in_pole', pole.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                    {renderField('Mounting Height', 'light_mounting_height', pole.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                    {renderField('Light 1 Type', 'light_type', pole.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                    {renderField('Light 1 Capacity', 'light_capacity', pole.light_capacity, ['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'])}
                    {renderField('Light 2 Type', 'light_type_2', pole.light_type_2, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                    {renderField('Light 2 Capacity', 'light_capacity_2', pole.light_capacity_2, ['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'])}
                    {renderField('Working', 'light_working_status', pole.light_working_status, ['yes', 'no'])}
                    {renderField('Road Cat', 'road_category', pole.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                    {renderField('Road Type', 'road_type', pole.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                    {renderField('Road Width', 'road_width_mtrs', pole.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '10', '12', '16', '18', '20', '24', '25', '30'])}
                    {renderField('Earthing', 'pole_earthing_exists', pole.pole_earthing_exists, ['YES', 'NO'])}
                    
                    <div className="col-span-3 border-t pt-2 mt-2 font-semibold text-gray-700">Proposal Form</div>
                    {renderField('Req ARM No', 'req_arm_number', pole.req_arm_number, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])}
                    {renderField('Req ARM Length', 'req_arm_length', pole.req_arm_length, ['0', '1.0', '1.5', '2', '2.5'])}
                    {renderField('Req LED Lights No', 'req_led_lights_no', pole.req_led_lights_no, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])}
                    {renderField('Req LED Wattage', 'req_led_wattage', pole.req_led_wattage, ['400W', '250W', '200W', '150W', '120W', '90W', '65W', '40W', '5-25W', '0W'])}
                    {renderField('Req Dedicated Wire', 'req_dedicated_wire', pole.req_dedicated_wire, ['yes', 'no'])}
                  </>
                ) : (
                  <>
                    {renderField('Ward No', 'ward_number', pole.ward_number)}
                    {renderField('Switch Point No', 'switch_point_number', pole.switch_point_number)}
                    {renderField('Conductor Type', 'conductor_type', pole.conductor_type, ['ABC', 'ACSR', 'UG'])}
                    {renderField('Pole No', 'pole_number', pole.pole_number)}
                    {renderField('Pole Type', 'pole_type', pole.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                    {renderField('Height', 'pole_height_mtrs', pole.pole_height_mtrs, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                    {renderField('Condition', 'pole_condition', pole.pole_condition, ['Good', 'defective', 'missing'])}
                    {renderField('Distance', 'pole_to_pole_distance_mtrs', pole.pole_to_pole_distance_mtrs, ['10', '20', '25', '30'])}
                    {renderField('ARM Type', 'arm_type', pole.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                    {renderField('ARM Status', 'arm_status', pole.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                    {renderField('Present ARM No', 'present_arm_no', pole.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                    {renderField('Present ARM Length', 'present_arm_length_mtrs', pole.present_arm_length_mtrs, ['0', '1', '1.5', '2', '2.5'])}
                    {renderField('Lights Count', 'how_many_lights_in_pole', pole.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                    {renderField('Mounting Height', 'light_mounting_height', pole.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                    {renderField('Light 1 Type', 'light_type', pole.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                    {renderField('Light 1 Capacity', 'light_capacity', pole.light_capacity, ['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'])}
                    {renderField('Light 2 Type', 'light_type_2', pole.light_type_2, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                    {renderField('Light 2 Capacity', 'light_capacity_2', pole.light_capacity_2, ['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'])}
                    {renderField('Working', 'light_working_status', pole.light_working_status, ['yes', 'no'])}
                    {renderField('Road Cat', 'road_category', pole.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                    {renderField('Road Type', 'road_type', pole.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                    {renderField('Road Width', 'road_width_mtrs', pole.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '10', '12', '16', '18', '20', '24', '25', '30'])}
                    {renderField('Earthing', 'pole_earthing_exists', pole.pole_earthing_exists, ['YES', 'NO'])}
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
                    <p className="font-medium text-sm">{pole.latitude || 'N/A'}</p>
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
                    <p className="font-medium text-sm">{pole.longitude || 'N/A'}</p>
                  )}
                </div>
              </div>
              {pole.latitude && pole.longitude && (
                <div className="mt-3">
                  <a
                    href={`https://www.google.com/maps?q=${pole.latitude},${pole.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-all justify-center shadow-sm w-full"
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
            ) : (isTgpl ? (pole.image_url_1 || pole.image_url_2) : (images && images.length > 0)) ? (
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {(isTgpl ? [0, 1] : [0, 1, 2]).map((index) => {
                  const imgCol = isTgpl ? pole[`image_url_${index + 1}`] : null;
                  const img = imgCol ? { signed_url: imgCol } : images[index];
                  if (!img) return null;
                  return (
                    <div key={index} className="border border-gray-100 rounded-lg overflow-hidden relative">
                      <img
                        src={img.signed_url}
                        alt="Survey"
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/400x300?text=Failed+to+Load';
                        }}
                      />
                      <p className="text-xs text-gray-400 p-1 text-center">
                        {isTgpl
                          ? (index === 0 ? 'Pole View 1' : 'Pole View 2')
                          : (index === 0 ? 'Switch Point / Meter' : index === 1 ? 'Pole View' : 'Light / Bracket View')}
                      </p>
                    </div>
                  );
                })}
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
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 border-t pt-4">
          <button
            onClick={() => console.log('Raise Issue')}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm"
          >
            <AlertTriangle size={16} />
            <span>Raise Issue</span>
          </button>
          <div className="flex gap-2">
            {showDeleteButton && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this submission?')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
              >
                <Trash2 size={16} />
                <span>{deleteMutation.isLoading ? 'Deleting...' : 'Delete Submission'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {isEditing ? (
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                <span>{saveMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            ) : (
              pole.status === 'pending' && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to confirm this submission?')) {
                      confirmMutation.mutate();
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>Confirm Submission</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
