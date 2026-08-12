import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { CcmsForm } from '../components/CcmsForm';
import { SwitchPointForm } from '../components/SwitchPointForm';
import { PoleForm } from '../components/PoleForm';
import { useAuthStore } from '../../../store/authStore';
import { useUserStats } from '../../../shared/hooks/useUserStats';
import { ArrowLeft } from 'lucide-react';
import API_BASE_URL from '../../../config/api';

export default function MobileSurvey() {
  const { logout, activeProject, clearActiveProject } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [formType, setFormType] = useState(null); // 'ccms', 'switch_point', 'pole'

  const projectId = activeProject?.id;

  const { data: wards = [] } = useQuery({
    queryKey: ['tgpl2-wards', searchTerm, projectId],
    queryFn: async () => {
      if (searchTerm.length < 1) return [];
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/wards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter matching wards locally
      return (res.data.ulbs || []).filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()));
    },
    enabled: searchTerm.length >= 1,
  });

  return (
    <div className="max-w-md mx-auto flex flex-col h-screen bg-gray-50">
      <header className="bg-white p-4 border-b border-gray-100 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={clearActiveProject} className="text-primary mr-1">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">PR ELECTRICALS</h1>
        </div>
        <button onClick={logout} className="text-sm text-red-500 font-medium px-2 py-1">Logout</button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-bold">TGPL-2 Mobile Survey</h2>
          <p className="text-xs text-teal-100 mt-0.5">Project ID: {projectId}</p>
        </div>

        {!selectedUlb ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Enter Ward Name</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. 15-Kammagondanahalli"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
            {wards.length > 0 && (
              <div className="bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {wards.map((w) => (
                  <div key={w.id} onClick={() => { setSelectedUlb(w); setSearchTerm(w.name); }} className="p-3 hover:bg-gray-50 cursor-pointer text-sm border-b">
                    {w.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border flex justify-between items-center shadow-sm">
              <div>
                <p className="text-xs text-gray-400">Selected Ward</p>
                <p className="font-semibold text-gray-900">{selectedUlb.name}</p>
              </div>
              <button onClick={() => { setSelectedUlb(null); setSearchTerm(''); setFormType(null); }} className="text-xs text-primary font-medium">Change</button>
            </div>

            {!formType ? (
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => setFormType('ccms')} className="p-4 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium text-gray-800 shadow-sm text-center">
                  CREATE CCMS POINT
                </button>
                <button onClick={() => setFormType('switch_point')} className="p-4 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium text-gray-800 shadow-sm text-center">
                  CREATE SWITCH POINT
                </button>
                <button onClick={() => setFormType('pole')} className="p-4 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium text-gray-800 shadow-sm text-center">
                  CREATE POLE
                </button>
              </div>
            ) : (
              <div>
                {formType === 'ccms' && <CcmsForm ulb={selectedUlb} projectId={projectId} onBack={() => setFormType(null)} />}
                {formType === 'switch_point' && <SwitchPointForm ulb={selectedUlb} projectId={projectId} onBack={() => setFormType(null)} />}
                {formType === 'pole' && <PoleForm ulb={selectedUlb} projectId={projectId} onBack={() => setFormType(null)} />}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
