import { X, Check, AlertTriangle } from 'lucide-react';
import { confirmPole } from '../services/poleSurveyService';
import { useMutation } from '@tanstack/react-query';

export const PoleInspectModal = ({ pole, onClose, onSuccess }) => {
  const projectId = 1; // Should be dynamic

  const mutation = useMutation({
    mutationFn: () => confirmPole(projectId, pole.id),
    onSuccess: () => {
      onSuccess();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Inspect Pole #{pole.pole_number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Ward Number</p>
              <p className="font-medium text-gray-900">{pole.ward_number}</p>
            </div>
            <div>
              <p className="text-gray-500">Coordinates</p>
              <p className="font-medium text-gray-900">{pole.latitude}, {pole.longitude}</p>
            </div>
            <div>
              <p className="text-gray-500">Condition</p>
              <p className="font-medium text-gray-900">{pole.pole_condition}</p>
            </div>
            <div>
              <p className="text-gray-500">Light Status</p>
              <p className="font-medium text-gray-900">{pole.light_working_status}</p>
            </div>
          </div>

          {/* Photo Grid Placeholder */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-100 h-24 rounded flex items-center justify-center text-gray-400 text-xs">Photo 1</div>
              <div className="bg-gray-100 h-24 rounded flex items-center justify-center text-gray-400 text-xs">Photo 2</div>
              <div className="bg-gray-100 h-24 rounded flex items-center justify-center text-gray-400 text-xs">Photo 3</div>
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
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isLoading}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <Check size={16} />
              <span>{mutation.isLoading ? 'Confirming...' : 'Confirm'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
