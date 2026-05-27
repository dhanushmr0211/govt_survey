import { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Edit2, Save } from 'lucide-react';
import { confirmPole } from '../services/poleSurveyService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import API_BASE_URL from '../../../config/api';
import { isMobileEditRestricted } from '../utils/mobileRestrictions';

export const PoleInspectModal = ({ pole: initialPole, onClose, onSuccess }) => {
  const [pole, setPole] = useState(initialPole);
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const isAutofillUser = (user?.email || '').toLowerCase() === 'pratheekar1997@gmail.com' || (user?.email || '').toLowerCase() === 'pratheekar1997gmail.com';
  const activeProject = useAuthStore((state) => state.activeProject);
  const projectId = activeProject?.id;
  const isTgpl = activeProject?.project_type === 'TGPL_SURVEY' || String(activeProject?.id) === '3';
  const canEdit = user?.role === 'MASTER_ADMIN' || 
    (activeProject?.section_i && pole?.status === 'pending') || 
    (activeProject?.section_j && pole?.status === 'confirmed');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    ...initialPole,
    pole_number: initialPole.pole_number || initialPole.identifier
  });
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPole(initialPole);
      setFormData({
        ...initialPole,
        pole_number: initialPole.pole_number || initialPole.identifier
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [initialPole]);

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

  const confirmMutation = useMutation({
    mutationFn: () => confirmPole(projectId, pole.id),
    onSuccess: () => {
      onSuccess();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isRestricted = !isTgpl && isMobileEditRestricted();
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
          } else if (value === 'Mini Mast') {
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
        } else if (name === 'light_type') {
          const valLower = String(value || '').toLowerCase();
          if (valLower === 'led') {
            updated.light_capacity = '40W';
          } else if (valLower === 'cfl') {
            updated.light_capacity = '5W-25W';
          } else if (valLower === 'tube light') {
            updated.light_capacity = '40W';
          } else if (valLower === 'svl') {
            updated.light_capacity = '250';
          } else if (valLower === 'mini mast') {
            updated.light_capacity = '150';
          } else if (valLower === 'high mast') {
            updated.light_capacity = '200';
          }
        }
      }
      
      return updated;
    });
  };

  const renderField = (label, name, value, options = null) => {
    const isRestricted = !isTgpl && isMobileEditRestricted();
    const MOBILE_ALLOWED = new Set(['ward_number', 'switch_point_id', 'switch_point_number', 'pole_number', 'road_type', 'road_width']);
    const isDisabled = isRestricted && !MOBILE_ALLOWED.has(name);

    if (!isEditing) {
      return (
        <div className="flex justify-between border-b border-gray-50 py-1">
          <span className="text-gray-500">{label}:</span>
          <span className="font-medium">{value || 'N/A'}</span>
        </div>
      );
    }

    if (options) {
      return (
        <div className="flex flex-col border-b border-gray-50 py-1">
          <span className="text-xs text-gray-500">{label}:</span>
          <select
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
            disabled={isDisabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex flex-col border-b border-gray-50 py-1">
        <span className="text-xs text-gray-500">{label}:</span>
        <input
          type="text"
          name={name}
          value={formData[name] || ''}
          onChange={handleChange}
          disabled={isDisabled}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Inspect Pole #{pole.pole_number || 'N/A'}</h2>
            <p className="text-sm text-gray-500">ULB: {pole.ulb_name || 'N/A'} | Role: {user?.role || 'N/A'}</p>
          </div>
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Side: Details */}
            <div className="lg:w-1/3 space-y-6 overflow-y-auto max-h-[70vh] pr-2">
              
              {/* Switch Point Details */}
              {!isTgpl && (
                <div>
                  <h3 className="font-bold text-primary border-b pb-2 mb-3 text-base">Switch Point Details</h3>
                  <div className="space-y-2">
                    {renderField('Ward Number', 'ward_number', pole.ward_number)}
                    {renderField('Switch Point Number', 'switch_point_number', pole.switch_point_number)}
                    {renderField('Switch Point Type', 'switch_point_type', pole.switch_point_type, ['DP', 'MCB', 'SWITCH', 'HOOK'])}
                    {renderField('Does Meter Exists', 'meter_exists', pole.meter_exists ? 'YES' : 'NO', ['YES', 'NO'])}
                    {renderField('Meter Type', 'meter_type', pole.meter_type, ['1P', '3P'])}
                    {renderField('Meter RR Number', 'meter_rr_number', pole.meter_rr_number)}
                    {renderField('Meter Serial Number', 'meter_serial_number', pole.meter_serial_number)}
                    {renderField('Meter Condition', 'meter_condition', pole.meter_condition, ['working', 'not working', 'missing'])}
                  </div>
                </div>
              )}

              {/* Pole Details */}
              <div>
                <h3 className="font-bold text-primary border-b pb-2 mb-3 text-base">{isTgpl ? 'TGPL Pole Details' : 'Pole Details'}</h3>
                <div className="space-y-2">
                  {isTgpl ? (
                    <>
                      {renderField('Ward No#', 'ward_number', pole.ward_number)}
                      {renderField('DTC No', 'dtc_number', pole.dtc_number)}
                      {renderField('DTC Capacity', 'dtc_capacity', pole.dtc_capacity)}
                      {renderField('CCMS No', 'ccms_number', pole.ccms_number)}
                      {renderField('Meter Type', 'meter_type', pole.meter_type, ['1P', '3P'])}
                      {renderField('RR Number', 'meter_rr_number', pole.meter_rr_number)}
                      {renderField('Serial Number', 'meter_serial_number', pole.meter_serial_number)}
                      {renderField('Meter Dim. Status', 'meter_dimensional_status', pole.meter_dimensional_status, ['Working', 'not working', 'missing', 'door lock', 'no meter'])}
                      {renderField('Conductor Type', 'conductor_type', pole.conductor_type, ['ABC', 'ACSR', 'UG'])}
                      {renderField('Pole No#', 'pole_number', pole.pole_number)}
                      {renderField('Pole Type', 'pole_type', pole.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                      {renderField('Height', 'pole_height', pole.pole_height, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                      {renderField('Distance', 'pole_to_pole_distance', pole.pole_to_pole_distance)}
                      {renderField('ARM Type', 'arm_type', pole.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                      {renderField('ARM Status', 'arm_status', pole.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                      {renderField('Present ARM No#', 'present_arm_no', pole.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                      {renderField('Present ARM Length', 'present_arm_length', pole.present_arm_length, ['0', '1', '1.5', '2', '2.5'])}
                      {renderField('Lights Count', 'how_many_lights_in_pole', pole.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                      {renderField('Mounting Height', 'light_mounting_height', pole.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                      {renderField('Light Type', 'light_type', pole.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                      {renderField('Capacity', 'light_capacity', pole.light_capacity, ['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'])}
                      {renderField('Working', 'light_working_status', pole.light_working_status, ['yes', 'no'])}
                      {renderField('Road Cat', 'road_category', pole.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                      {renderField('Road Type', 'road_type', pole.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                      {renderField('Road Width', 'road_width_mtrs', pole.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                      {renderField('Earthing', 'pole_earthing_exists', pole.pole_earthing_exists, ['YES', 'NO'])}
                      
                      <div className="border-b pb-1 mt-3 mb-2 font-bold text-primary text-sm">Proposal Form</div>
                      {renderField('Req ARM No', 'req_arm_number', pole.req_arm_number)}
                      {renderField('Req ARM Length', 'req_arm_length', pole.req_arm_length)}
                      {renderField('Req LED Lights No', 'req_led_lights_no', pole.req_led_lights_no)}
                      {renderField('Req LED Wattage', 'req_led_wattage', pole.req_led_wattage)}
                      {renderField('Req Dedicated Wire', 'req_dedicated_wire', pole.req_dedicated_wire)}
                    </>
                  ) : (
                    <>
                      {renderField('Ward No#', 'ward_number', pole.ward_number)}
                      {renderField('Switch point No#', 'switch_point_number', pole.switch_point_number)}
                      {renderField('Conductor Type', 'conductor_type', pole.conductor_type, ['ABC', 'ACSR', 'UG'])}
                      {renderField('Pole No#', 'pole_number', pole.pole_number)}
                      {renderField('Pole Type', 'pole_type', pole.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                      {renderField('Pole Height (mtrs)', 'pole_height_mtrs', pole.pole_height_mtrs, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                      {renderField('Pole Condition', 'pole_condition', pole.pole_condition, ['Good', 'defective', 'missing'])}
                      {renderField('Pole To Pole Distance', 'pole_to_pole_distance_mtrs', pole.pole_to_pole_distance_mtrs)}
                      {renderField('ARM Type', 'arm_type', pole.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                      {renderField('ARM Status', 'arm_status', pole.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                      {renderField('Present ARM No#', 'present_arm_no', pole.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                      {renderField('Present ARM Length', 'present_arm_length_mtrs', pole.present_arm_length_mtrs, ['0', '1', '1.5', '2', '2.5'])}
                      {renderField('Lights in Pole', 'how_many_lights_in_pole', pole.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                      {renderField('Light Mounting Height', 'light_mounting_height', pole.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                      {renderField('Light Type', 'light_type', pole.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                      {renderField('Light Capacity', 'light_capacity', pole.light_capacity, ['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'])}
                      {renderField('Light Working Status', 'light_working_status', pole.light_working_status, ['yes', 'no'])}
                      {renderField('Road Category', 'road_category', pole.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                      {renderField('Road Type', 'road_type', pole.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                      {renderField('Road Width', 'road_width_mtrs', pole.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                      {renderField('Pole Earthing Exists', 'pole_earthing_exists', pole.pole_earthing_exists, ['YES', 'NO'])}
                    </>
                  )}
                </div>
              </div>

              {/* GPS Coordinates */}
              <div>
                <h3 className="font-bold text-primary border-b pb-2 mb-3 text-base">GPS Coordinates</h3>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-gray-50 py-1">
                    <span className="text-gray-500 text-xs">Latitude:</span>
                    <span className="font-medium text-sm">{pole.latitude || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 py-1">
                    <span className="text-gray-500 text-xs">Longitude:</span>
                    <span className="font-medium text-sm">{pole.longitude || 'N/A'}</span>
                  </div>
                  {pole.latitude && pole.longitude && (
                    <div className="pt-2">
                      <a
                        href={`https://www.google.com/maps?q=${pole.latitude},${pole.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-all w-full justify-center shadow-sm"
                      >
                        📍 Open in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Images */}
            <div className={`lg:w-2/3 grid grid-cols-1 ${isTgpl ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
              {(isTgpl ? [0, 1] : [0, 1, 2]).map((index) => {
                const img = images[index];
                return (
                  <div key={index} className="bg-gray-50 h-[65vh] rounded-lg flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 overflow-hidden">
                    {loadingImages ? (
                      <span>Loading images...</span>
                    ) : img ? (
                      <img src={img.signed_url} alt={`Survey ${index + 1}`} className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <span className="text-sm font-semibold">Image {index + 1}</span>
                        <span className="text-xs">
                          {isTgpl
                            ? (index === 0 ? 'Pole View 1' : 'Pole View 2')
                            : (index === 0 ? 'Switch Point / Meter' : index === 1 ? 'Pole View' : 'Light / Bracket View')}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => console.log('Raise Issue')}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm"
          >
            <AlertTriangle size={16} />
            <span>Raise Issue</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            {isEditing ? (
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isLoading}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saveMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            ) : (
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isLoading}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                <Check size={16} />
                <span>{confirmMutation.isLoading ? 'Confirming...' : 'Confirm'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
